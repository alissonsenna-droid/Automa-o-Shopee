import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { decideOrderProcessing } from '@/lib/processing/batch';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import type { SupplierProductRow } from '@/types/database';

const DEFAULT_MIN_MARGIN = 0.1; // 10% — usado se não houver configuração salva.
const DEFAULT_BATCH_LIMIT = 20;

/**
 * POST /api/orders/process
 *
 * "PROCESSAR PEDIDOS" — o botão central do prompt mestre (seção 10).
 * Pega pedidos pagos que ainda não têm fornecedor selecionado, escolhe o
 * melhor fornecedor disponível por item (ver lib/suppliers/selection) e só
 * cria a supplier_order quando a margem mínima configurada é respeitada.
 * Nenhuma compra é feita de verdade aqui — isso continua manual, pelo botão
 * "Enviar ao fornecedor" já existente na tela do pedido.
 *
 * Idempotente: só processa pedidos sem supplier_order ainda; rodar de novo
 * nunca duplica nem reprocessa o que já foi decidido.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit) || DEFAULT_BATCH_LIMIT, 100);

    const supabase = createSupabaseAdminClient();

    const { data: settingRow } = await supabase.from('system_settings').select('value').eq('key', 'processing').maybeSingle();
    const minMarginPercent = (settingRow?.value as { min_margin_percent?: number } | null)?.min_margin_percent;
    const minMargin = typeof minMarginPercent === 'number' ? minMarginPercent / 100 : DEFAULT_MIN_MARGIN;

    const { data: candidateOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, total, gateway_fee, other_costs, supplier_orders(id)')
      .eq('status', 'paid')
      .order('created_at', { ascending: true })
      .limit(limit * 3); // folga: alguns serão filtrados por já terem supplier_order
    if (ordersError) throw ordersError;

    const eligible = (candidateOrders ?? []).filter((o) => !o.supplier_orders || o.supplier_orders.length === 0).slice(0, limit);

    const results: Array<{ order_id: string; order_number: string; outcome: string; detail?: string }> = [];

    for (const order of eligible) {
      const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', order.id);
      const orderItems = items ?? [];

      const productIds = [...new Set(orderItems.map((i) => i.product_id))];
      const candidatesByProduct: Record<string, SupplierProductRow[]> = {};
      if (productIds.length > 0) {
        const { data: supplierProducts } = await supabase.from('supplier_products').select('*').in('product_id', productIds);
        for (const id of productIds) {
          candidatesByProduct[id] = (supplierProducts ?? []).filter((sp) => sp.product_id === id);
        }
      }

      const decision = decideOrderProcessing(
        { id: order.id, total: order.total, gateway_fee: order.gateway_fee, other_costs: order.other_costs, items: orderItems },
        candidatesByProduct,
        minMargin,
      );

      if (decision.outcome === 'ready') {
        const { error: insertError } = await supabase.from('supplier_orders').insert({
          order_id: order.id,
          supplier_id: decision.supplierId,
          status: 'pending',
          supplier_cost: decision.supplierCost,
        });
        if (insertError) {
          // unique(order_id): outra chamada concorrente já criou — trata como já processado, não como erro.
          results.push({ order_id: order.id, order_number: order.order_number, outcome: 'already_processed' });
          continue;
        }

        await supabase
          .from('orders')
          .update({ status: 'supplier_pending', supplier_cost: decision.supplierCost })
          .eq('id', order.id);

        await logAudit({
          userId,
          action: 'order.processed',
          entity: 'orders',
          entityId: order.id,
          metadata: { supplierId: decision.supplierId, supplierCost: decision.supplierCost, margin: decision.margin },
        });

        results.push({ order_id: order.id, order_number: order.order_number, outcome: 'ready' });
      } else if (decision.outcome === 'low_margin') {
        await supabase
          .from('orders')
          .update({ status: 'problem', notes: `Margem abaixo do mínimo: ${(decision.margin * 100).toFixed(1)}% < ${(minMargin * 100).toFixed(1)}%` })
          .eq('id', order.id);
        results.push({
          order_id: order.id,
          order_number: order.order_number,
          outcome: 'low_margin',
          detail: `${(decision.margin * 100).toFixed(1)}% (mínimo ${(minMargin * 100).toFixed(1)}%)`,
        });
      } else {
        const notes = decision.outcome === 'no_items' ? decision.reason : decision.reason;
        await supabase.from('orders').update({ status: 'problem', notes }).eq('id', order.id);
        results.push({ order_id: order.id, order_number: order.order_number, outcome: decision.outcome, detail: notes });
      }
    }

    return NextResponse.json({
      min_margin_percent: minMargin * 100,
      total_eligible_found: eligible.length,
      results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/orders/process — quantos pedidos pagos estão elegíveis agora, sem processar nada. */
export async function GET() {
  try {
    await requireStaff();
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from('orders').select('id, supplier_orders(id)').eq('status', 'paid');
    const eligibleCount = (data ?? []).filter((o) => !o.supplier_orders || o.supplier_orders.length === 0).length;
    return NextResponse.json({ eligible_count: eligibleCount });
  } catch (error) {
    return handleApiError(error);
  }
}
