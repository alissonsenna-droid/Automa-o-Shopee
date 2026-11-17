import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { updateOrderSchema } from '@/lib/validations/orders';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/** GET /api/orders/[id] — detalhe completo do pedido (uso do painel admin). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `*, customers(*), addresses(*), offers(*, products(*)), order_items(*), payments(*), supplier_orders(*), tracking(*)`,
      )
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/orders/[id] — atualização manual pelo admin (cancelar, marcar
 * reembolsado, anotar). Pedidos são criados pelo checkout; isso é só pra
 * exceção (cliente desistiu, estorno feito fora do sistema, etc.).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = updateOrderSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('orders').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'order.updated', entity: 'orders', entityId: id, metadata: input });
    return NextResponse.json({ order: data });
  } catch (error) {
    return handleApiError(error);
  }
}
