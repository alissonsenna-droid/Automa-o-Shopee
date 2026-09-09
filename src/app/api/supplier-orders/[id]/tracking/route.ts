import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supplierOrderTrackingSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/supplier-orders/[id]/tracking
 * Insere/atualiza o rastreamento manualmente. Idempotente por natureza
 * (upsert por order_id) — chamar de novo só atualiza os campos.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = supplierOrderTrackingSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const { data: supplierOrder, error: findError } = await supabase
      .from('supplier_orders')
      .select('order_id')
      .eq('id', id)
      .single();
    if (findError || !supplierOrder) {
      return NextResponse.json({ error: 'Ordem de fornecedor não encontrada.' }, { status: 404 });
    }

    const { data: tracking, error } = await supabase
      .from('tracking')
      .upsert(
        {
          order_id: supplierOrder.order_id,
          carrier: input.carrier,
          tracking_code: input.tracking_code,
          tracking_url: input.tracking_url,
          status: input.status ?? 'shipped',
          last_event: input.status ?? 'Objeto postado',
          last_update: new Date().toISOString(),
        },
        { onConflict: 'order_id' },
      )
      .select('*')
      .single();
    if (error) throw error;

    await supabase
      .from('orders')
      .update({
        status: 'supplier_shipped',
        tracking_code: input.tracking_code,
        tracking_url: input.tracking_url,
      })
      .eq('id', supplierOrder.order_id);

    await supabase.from('supplier_orders').update({ status: 'shipped' }).eq('id', id);

    await logAudit({ userId, action: 'tracking.updated', entity: 'orders', entityId: supplierOrder.order_id, metadata: input });

    return NextResponse.json({ tracking });
  } catch (error) {
    return handleApiError(error);
  }
}
