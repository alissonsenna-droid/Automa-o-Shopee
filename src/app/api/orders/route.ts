import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { submitCheckoutSchema } from '@/lib/validations/checkout';
import { createPayment, AppmaxError } from '@/lib/appmax';
import { selectBestSupplier } from '@/lib/suppliers';
import { generateOrderNumber, toCents } from '@/lib/utils';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/orders
 *
 * Finaliza uma checkout_session em um pedido real: cria/atualiza customer e
 * address, cria a order + order_items com os valores CONGELADOS na sessão
 * (nunca recalculados a partir de input do cliente), cria o pagamento na
 * Appmax e persiste o resultado.
 *
 * Idempotência: se a mesma checkout_session já gerou um pedido (order_id
 * preenchido) ou o mesmo idempotency_key já foi usado, retorna o pedido
 * existente em vez de criar um duplicado (ex: duplo clique no botão pagar).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = submitCheckoutSchema.parse(body);
    const supabase = createSupabaseAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*, offers(*, products(*))')
      .eq('id', input.session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sessão de checkout não encontrada.' }, { status: 404 });
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Sessão de checkout expirada.' }, { status: 410 });
    }

    // Idempotência: sessão já finalizada em um pedido.
    if (session.order_id) {
      const { data: existingOrder } = await supabase.from('orders').select('*').eq('id', session.order_id).single();
      return NextResponse.json({ order: existingOrder, idempotent: true }, { status: 200 });
    }

    // Idempotência adicional por chave explícita (proteção contra duplo submit
    // antes do session.order_id ser gravado, ex: requisições concorrentes).
    const { data: existingByKey } = await supabase
      .from('orders')
      .select('*')
      .eq('checkout_session_id', input.session_id)
      .maybeSingle();
    if (existingByKey) {
      return NextResponse.json({ order: existingByKey, idempotent: true }, { status: 200 });
    }

    const offer = session.offers as { price: number; shipping_price: number; discount: number; product_id: string; products: { id: string; name: string; sku: string | null; cost_price: number } };
    const product = offer.products;

    const subtotal = session.price_snapshot * session.quantity;
    const shipping = session.shipping_snapshot;
    const discount = offer.discount ?? 0;
    const total = Math.max(subtotal + shipping - discount, 0);

    // Upsert customer por e-mail.
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .upsert(
        {
          name: input.customer.name,
          email: input.customer.email.toLowerCase(),
          phone: input.customer.phone,
          cpf: input.customer.cpf,
        },
        { onConflict: 'email' },
      )
      .select('*')
      .single();
    if (customerError) throw customerError;

    const { data: address, error: addressError } = await supabase
      .from('addresses')
      .insert({ customer_id: customer.id, ...input.address })
      .select('*')
      .single();
    if (addressError) throw addressError;

    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        offer_id: session.offer_id,
        customer_id: customer.id,
        address_id: address.id,
        checkout_session_id: session.id,
        status: 'pending_payment',
        payment_status: 'aguardando_pagamento',
        subtotal,
        shipping,
        discount,
        total,
        utm_source: session.utm_source,
        utm_medium: session.utm_medium,
        utm_campaign: session.utm_campaign,
        utm_content: session.utm_content,
        utm_term: session.utm_term,
        fbclid: session.fbclid,
        gclid: session.gclid,
        ttclid: session.ttclid,
        referrer: session.referrer,
        landing_page_url: session.landing_page_url,
      })
      .select('*')
      .single();
    if (orderError) throw orderError;

    await supabase.from('checkout_sessions').update({ order_id: order.id }).eq('id', session.id);

    // Seleciona o melhor fornecedor disponível só para registrar o custo
    // estimado no pedido (a supplier_order de fato é criada após pagamento
    // aprovado, no webhook).
    const { data: supplierCandidates } = await supabase
      .from('supplier_products')
      .select('*')
      .eq('product_id', product.id);
    const bestSupplier = selectBestSupplier(supplierCandidates ?? []);
    const supplierCost = (bestSupplier?.supplier_cost ?? product.cost_price) * session.quantity;

    await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: product.id,
        supplier_product_id: bestSupplier?.id ?? null,
        quantity: session.quantity,
        unit_price: session.price_snapshot,
        supplier_cost: bestSupplier?.supplier_cost ?? product.cost_price,
        total: subtotal,
      });

    await supabase.from('orders').update({ supplier_cost: supplierCost }).eq('id', order.id);

    // Cria o pagamento na Appmax.
    let paymentResult;
    try {
      paymentResult = await createPayment({
        orderNumber,
        amountCents: toCents(total),
        method: input.payment.method,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
          document: input.customer.cpf,
        },
        address: input.address,
        items: [{ sku: product.sku ?? product.id, name: product.name, quantity: session.quantity, unitPriceCents: toCents(session.price_snapshot) }],
        installments: input.payment.method === 'credit_card' ? input.payment.installments : undefined,
        cardToken: input.payment.method === 'credit_card' ? input.payment.card_token : undefined,
      });
    } catch (paymentError) {
      await supabase
        .from('orders')
        .update({ payment_status: 'pagamento_recusado', status: 'problem' })
        .eq('id', order.id);
      const message = paymentError instanceof AppmaxError ? paymentError.message : 'Falha ao processar pagamento.';
      return NextResponse.json({ error: message, order_id: order.id }, { status: 402 });
    }

    await supabase.from('payments').insert({
      order_id: order.id,
      provider: 'appmax',
      transaction_id: paymentResult.transactionId,
      status: paymentResult.status,
      amount: total,
      payment_method: input.payment.method,
      raw_response: paymentResult.raw as Record<string, unknown>,
    });

    const { data: updatedOrder } = await supabase
      .from('orders')
      .update({
        payment_status: paymentResult.status,
        status: paymentResult.status === 'pagamento_aprovado' ? 'paid' : 'pending_payment',
      })
      .eq('id', order.id)
      .select('*')
      .single();

    await logAudit({ action: 'order.created', entity: 'orders', entityId: order.id, metadata: { orderNumber } });

    return NextResponse.json(
      { order: updatedOrder, pix: paymentResult.pix ?? null },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/** GET /api/orders — listagem para o painel admin (com filtros básicos). */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    let query = supabase.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false });

    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('payment_status');
    const offerId = searchParams.get('offer_id');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Math.min(Number(searchParams.get('page_size') ?? '25'), 100);

    if (status) query = query.eq('status', status);
    if (paymentStatus) query = query.eq('payment_status', paymentStatus);
    if (offerId) query = query.eq('offer_id', offerId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (search) query = query.or(`order_number.ilike.%${search}%,tracking_code.ilike.%${search}%`);

    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ orders: data, total: count, page, page_size: pageSize });
  } catch (error) {
    return handleApiError(error);
  }
}
