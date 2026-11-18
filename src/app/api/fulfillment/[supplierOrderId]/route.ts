import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/fulfillment/[supplierOrderId]
 *
 * Usado pela extensão de navegador (fazzo-order-automation), não pelo painel
 * admin. Devolve os dados necessários para PREENCHER o checkout do
 * marketplace (nome, telefone, endereço, itens) — a extensão só lê; quem
 * aperta "pagar" é sempre um humano. Nenhuma automação de compra, login ou
 * bypass de proteção acontece a partir desta rota.
 *
 * Autenticação própria (não é sessão de admin): a extensão roda fora do
 * navegador logado no painel, então usa uma chave compartilhada de longa
 * duração via header `x-fulfillment-key`, comparada com
 * `FULFILLMENT_API_KEY`. Trocar essa chave revoga acesso de qualquer
 * extensão configurada com a chave antiga.
 *
 * Duas origens possíveis pro mesmo :id, sempre normalizadas pro mesmo
 * formato de resposta (a extensão não precisa saber a diferença):
 *   1) supplier_orders — pedido interno deste sistema (checkout Appmax).
 *   2) fulfillment_orders — pedido de uma loja/checkout externo (ex:
 *      Cartipanda, landing pages próprias), sem catálogo/cliente cadastrado
 *      aqui — ver painel /admin/automacao.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ supplierOrderId: string }> }) {
  const expectedKey = process.env.FULFILLMENT_API_KEY;
  if (!expectedKey) {
    return NextResponse.json({ error: 'FULFILLMENT_API_KEY não configurada no servidor.' }, { status: 500 });
  }

  const providedKey = request.headers.get('x-fulfillment-key');
  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 });
  }

  const { supplierOrderId: id } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: supplierOrder } = await supabase
    .from('supplier_orders')
    .select(
      `id, status, supplier_url,
       suppliers(name, platform),
       orders(order_number, customers(name, email, phone, cpf), addresses(cep, street, number, complement, neighborhood, city, state),
         order_items(quantity, products(name, sku)))`,
    )
    .eq('id', id)
    .maybeSingle();

  if (supplierOrder) {
    const order = Array.isArray(supplierOrder.orders) ? supplierOrder.orders[0] : supplierOrder.orders;
    const customer = order ? (Array.isArray(order.customers) ? order.customers[0] : order.customers) : null;
    const address = order ? (Array.isArray(order.addresses) ? order.addresses[0] : order.addresses) : null;
    const supplier = Array.isArray(supplierOrder.suppliers) ? supplierOrder.suppliers[0] : supplierOrder.suppliers;
    const items = (order?.order_items ?? []).map((item: { quantity: number; products: unknown }) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return { name: (product as { name?: string })?.name ?? '—', sku: (product as { sku?: string })?.sku ?? null, quantity: item.quantity };
    });

    if (!order || !customer || !address) {
      return NextResponse.json({ error: 'Pedido sem cliente/endereço vinculado — não é possível preencher checkout.' }, { status: 409 });
    }

    return NextResponse.json({
      supplierOrderId: supplierOrder.id,
      status: supplierOrder.status,
      platform: supplier?.platform ?? null,
      supplierUrl: supplierOrder.supplier_url,
      orderNumber: order.order_number,
      items,
      customer: { name: customer.name, phone: customer.phone, email: customer.email, cpf: customer.cpf },
      address: {
        cep: address.cep,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      },
    });
  }

  const { data: fulfillmentOrder } = await supabase.from('fulfillment_orders').select('*').eq('id', id).maybeSingle();

  if (!fulfillmentOrder) {
    return NextResponse.json({ error: 'Pedido não encontrado (nem interno, nem de automação).' }, { status: 404 });
  }

  return NextResponse.json({
    supplierOrderId: fulfillmentOrder.id,
    status: fulfillmentOrder.status,
    platform: fulfillmentOrder.marketplace,
    supplierUrl: fulfillmentOrder.product_url,
    orderNumber: fulfillmentOrder.external_order_id ?? fulfillmentOrder.id,
    items: [{ name: fulfillmentOrder.product_description, sku: null, quantity: fulfillmentOrder.quantity }],
    customer: {
      name: fulfillmentOrder.customer_name,
      phone: fulfillmentOrder.customer_phone,
      email: fulfillmentOrder.customer_email,
      cpf: fulfillmentOrder.customer_cpf,
    },
    address: {
      cep: fulfillmentOrder.address_cep,
      street: fulfillmentOrder.address_street,
      number: fulfillmentOrder.address_number,
      complement: fulfillmentOrder.address_complement,
      neighborhood: fulfillmentOrder.address_neighborhood,
      city: fulfillmentOrder.address_city,
      state: fulfillmentOrder.address_state,
    },
  });
}
