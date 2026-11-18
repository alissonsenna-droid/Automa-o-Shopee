import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireAdmin, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { updateFulfillmentOrderSchema } from '@/lib/validations/fulfillment';

/**
 * PATCH /api/fulfillment/[id] — marca como comprado (status "sent" +
 * supplier_cost/número do pedido no marketplace), reporta problema
 * (status "problem" + notes), ou qualquer outra atualização manual.
 * Mesma ideia da Central Pix: isso é a declaração do operador depois de
 * ter feito a compra de verdade no marketplace, não uma confirmação
 * automática — continua exigindo humano conferindo.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = updateFulfillmentOrderSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const { data: existing, error: findError } = await supabase.from('fulfillment_orders').select('id').eq('id', id).single();
    if (findError || !existing) {
      return NextResponse.json({ error: 'Pedido de automação não encontrado.' }, { status: 404 });
    }

    const { data, error } = await supabase.from('fulfillment_orders').update(input).eq('id', id).select('*').single();
    if (error) throw error;

    await logAudit({ userId, action: 'fulfillment_order.updated', entity: 'fulfillment_orders', entityId: id, metadata: input });

    return NextResponse.json({ fulfillment_order: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAdmin();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from('fulfillment_orders').delete().eq('id', id);
    if (error) throw error;

    await logAudit({ userId, action: 'fulfillment_order.deleted', entity: 'fulfillment_orders', entityId: id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
