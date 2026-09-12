import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/checkout/redirect?offer_slug=...&utm_source=...
 *
 * Versão "link direto" de /api/checkout/session: em vez de a landing page
 * precisar fazer um fetch cross-origin (que exigiria CORS) e depois
 * redirecionar manualmente, o botão "Comprar" pode simplesmente apontar
 * para esta URL — é uma navegação normal do navegador (sem CORS), que cria
 * a checkout_session e já responde com um 302 para /checkout/[session].
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const offerId = searchParams.get('offer_id');
  const offerSlug = searchParams.get('offer_slug');
  const quantity = Number(searchParams.get('quantity') ?? '1') || 1;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  if (!offerId && !offerSlug) {
    return NextResponse.redirect(`${appUrl}/?erro=oferta_nao_informada`);
  }

  const supabase = createSupabaseAdminClient();
  const offerQuery = supabase.from('offers').select('*').eq('active', true);
  const { data: offer } = offerId
    ? await offerQuery.eq('id', offerId).maybeSingle()
    : await offerQuery.eq('slug', offerSlug as string).maybeSingle();

  if (!offer || !offer.checkout_enabled) {
    return NextResponse.redirect(`${appUrl}/?erro=oferta_indisponivel`);
  }

  const { data: session, error: sessionError } = await supabase
    .from('checkout_sessions')
    .insert({
      offer_id: offer.id,
      quantity,
      price_snapshot: offer.price,
      shipping_snapshot: offer.shipping_price,
      utm_source: searchParams.get('utm_source'),
      utm_medium: searchParams.get('utm_medium'),
      utm_campaign: searchParams.get('utm_campaign'),
      utm_content: searchParams.get('utm_content'),
      utm_term: searchParams.get('utm_term'),
      fbclid: searchParams.get('fbclid'),
      gclid: searchParams.get('gclid'),
      ttclid: searchParams.get('ttclid'),
      referrer: request.headers.get('referer'),
      landing_page_url: offer.landing_page_url,
    })
    .select('id')
    .single();

  if (sessionError || !session) {
    return NextResponse.redirect(`${appUrl}/?erro=falha_ao_iniciar_checkout`);
  }

  return NextResponse.redirect(`${appUrl}/checkout/${session.id}`);
}
