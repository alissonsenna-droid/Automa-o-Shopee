import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';

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
