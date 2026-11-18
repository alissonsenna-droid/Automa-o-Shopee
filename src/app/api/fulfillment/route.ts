import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { createFulfillmentOrderSchema } from '@/lib/validations/fulfillment';

/**
 * Painel de Automação — fila de compras a fazer em marketplaces (Mercado
 * Livre, Shopee, TikTok Shop) pra cumprir pedidos pagos FORA deste sistema
 * (ex: Cartipanda). Reaproveita o mesmo enum de status da Central Pix
 * (supplier_order_status), mas em tabela própria: aqui não existe
 * offer_id/customer_id internos, só os dados crus necessários pra fazer a
 * compra (endereço, produto, marketplace).
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    let query = supabase.from('fulfillment_orders').select('*').order('created_at', { ascending: true });

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ fulfillment_orders: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const input = createFulfillmentOrderSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('fulfillment_orders')
      .insert({ ...input, product_url: input.product_url || null, customer_email: input.customer_email || null })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Já existe um pedido de automação com esse external_order_id.' }, { status: 409 });
      }
      throw error;
    }

    await logAudit({ userId, action: 'fulfillment_order.created', entity: 'fulfillment_orders', entityId: data.id });

    return NextResponse.json({ fulfillment_order: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
