import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createCheckoutSessionSchema } from '@/lib/validations/checkout';
import { handleApiError } from '@/lib/auth';

/**
 * POST /api/checkout/session
 *
 * Qualquer landing page chama este endpoint com apenas o identificador da
 * oferta (offer_id ou offer_slug) + UTMs. O backend resolve preço/frete
 * reais a partir do banco — NUNCA confia em valores vindos da landing page.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = createCheckoutSessionSchema.parse(body);

    const supabase = createSupabaseAdminClient();
    const offerQuery = supabase.from('offers').select('*').eq('active', true);
    const { data: offer, error } = input.offer_id
      ? await offerQuery.eq('id', input.offer_id).maybeSingle()
      : await offerQuery.eq('slug', input.offer_slug as string).maybeSingle();

    if (error) throw error;
    if (!offer) {
      return NextResponse.json({ error: 'Oferta não encontrada ou inativa.' }, { status: 404 });
    }
    if (!offer.checkout_enabled) {
      return NextResponse.json({ error: 'Checkout desabilitado para esta oferta.' }, { status: 422 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .insert({
        offer_id: offer.id,
        quantity: input.quantity,
        price_snapshot: offer.price,
        shipping_snapshot: offer.shipping_price,
        utm_source: input.utm_source,
        utm_medium: input.utm_medium,
        utm_campaign: input.utm_campaign,
        utm_content: input.utm_content,
        utm_term: input.utm_term,
        fbclid: input.fbclid,
        gclid: input.gclid,
        ttclid: input.ttclid,
        referrer: input.referrer,
        landing_page_url: input.landing_page_url ?? offer.landing_page_url,
      })
      .select('id')
      .single();

    if (sessionError) throw sessionError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
    return NextResponse.json(
      { checkout_url: `${appUrl}/checkout/${session.id}`, session_id: session.id },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
