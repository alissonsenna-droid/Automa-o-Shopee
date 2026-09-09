import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/auth';

/**
 * GET /api/orders/by-number/[orderNumber]?contact=email-ou-telefone
 *
 * Endpoint PÚBLICO usado pela página /pedido/[orderNumber]. Para evitar
 * enumeração de pedidos, exige que `contact` combine com o e-mail OU
 * telefone do cliente do pedido — sem isso, retorna 404 genérico mesmo que
 * o número do pedido exista.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await params;
    const { searchParams } = new URL(request.url);
    const contact = searchParams.get('contact')?.trim().toLowerCase();

    if (!contact) {
      return NextResponse.json({ error: 'Informe e-mail ou telefone para consultar o pedido.' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        `order_number, status, payment_status, created_at, tracking_code, tracking_url,
         offers(name, products(name, images)),
         customers!inner(email, phone),
         tracking(carrier, status, last_event, last_update)`,
      )
      .eq('order_number', orderNumber)
      .single();

    const customer = order?.customers as unknown as { email: string; phone: string } | undefined;
    const matches =
      !error &&
      order &&
      customer &&
      (customer.email.toLowerCase() === contact || customer.phone.replace(/\D/g, '') === contact.replace(/\D/g, ''));

    if (!matches) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    // Nunca expor customers/endereço completos aqui — só o necessário para o timeline.
    const { customers: _omit, ...publicOrder } = order as Record<string, unknown>;
    return NextResponse.json({ order: publicOrder });
  } catch (error) {
    return handleApiError(error);
  }
}
