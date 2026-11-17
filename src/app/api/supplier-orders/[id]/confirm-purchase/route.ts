import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/supplier-orders/[id]/confirm-purchase
 *
 * A declaração manual de "já comprei/paguei no fornecedor" — a peça que
 * faltava entre criar a supplier_order (status "pending", feito em
 * /api/orders/process) e ela de fato avançar. O ManualSupplierProvider só
 * registra a intenção de compra; é aqui que o operador confirma que
 * realizou a compra manualmente no marketplace, fora deste sistema.
 *
 * Isso NÃO é confirmação de pagamento verificada — é a declaração do
 * operador, igual ao "Já paguei" da seção 11 do prompt mestre: continua
 * exigindo um humano conferindo de verdade no marketplace antes de tratar
 * como garantido. Idempotente: só age quando o status ainda é "pending".
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { data: supplierOrder, error: findError } = await supabase.from('supplier_orders').select('*').eq('id', id).single();
    if (findError || !supplierOrder) {
      return NextResponse.json({ error: 'Ordem de fornecedor não encontrada.' }, { status: 404 });
    }

    if (supplierOrder.status !== 'pending') {
      return NextResponse.json({ supplier_order: supplierOrder, idempotent: true });
    }

    const note = `Compra declarada como feita manualmente pelo operador em ${new Date().toLocaleString('pt-BR')}.`;
    const { data: updated, error } = await supabase
      .from('supplier_orders')
      .update({ status: 'sent', notes: supplierOrder.notes ? `${supplierOrder.notes} ${note}` : note })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('orders').update({ status: 'supplier_ordered' }).eq('id', supplierOrder.order_id);

    await logAudit({ userId, action: 'supplier_order.purchase_confirmed', entity: 'supplier_orders', entityId: id });

    return NextResponse.json({ supplier_order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
