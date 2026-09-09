import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { parseAppmaxWebhook, validateWebhookSignature, orderStatusFromPaymentStatus } from '@/lib/appmax';
import { selectBestSupplier } from '@/lib/suppliers';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/webhooks/appmax
 *
 * Fluxo: valida assinatura -> identifica evento -> verifica idempotência
 * (unique constraint em webhook_events(provider, event_id)) -> localiza o
 * pagamento pelo transaction_id -> atualiza payment + order -> se aprovado,
 * cria a supplier_order (fornecedor é sempre acionado via
 * ManualSupplierProvider por padrão, sem automação de compra de terceiros).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const supabase = createSupabaseAdminClient();

  let signatureValid: boolean;
  try {
    signatureValid = validateWebhookSignature(rawBody, request.headers.get('x-appmax-signature'));
  } catch (error) {
    console.error('Webhook Appmax: erro ao validar assinatura', error);
    return NextResponse.json({ error: 'Configuração de webhook inválida.' }, { status: 500 });
  }

  if (!signatureValid) {
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const event = parseAppmaxWebhook(payload);

  // Idempotência: tenta inserir o evento; se já existir (provider+event_id),
  // o unique constraint falha e sabemos que já foi processado.
  const { error: insertError } = await supabase.from('webhook_events').insert({
    provider: 'appmax',
    event_id: event.eventId,
    event_type: event.eventType,
    payload,
    processed: false,
  });

  if (insertError) {
    if (insertError.code === '23505') {
      // unique_violation — evento duplicado, não reprocessa.
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }
    console.error('Webhook Appmax: falha ao registrar evento', insertError);
    return NextResponse.json({ error: 'Falha ao registrar evento.' }, { status: 500 });
  }

  try {
    const { data: payment } = await supabase
      .from('payments')
      .select('*, orders(*)')
      .eq('transaction_id', event.transactionId)
      .maybeSingle();

    if (!payment) {
      await markWebhookProcessed(supabase, event.eventId, 'Pagamento não encontrado para este transaction_id.');
      return NextResponse.json({ received: true, warning: 'payment_not_found' }, { status: 200 });
    }

    await supabase
      .from('payments')
      .update({ status: event.status, paid_at: event.status === 'pagamento_aprovado' ? new Date().toISOString() : null })
      .eq('id', payment.id);

    const newOrderStatus = orderStatusFromPaymentStatus(event.status);
    const order = payment.orders as { id: string; status: string };

    if (newOrderStatus) {
      await supabase
        .from('orders')
        .update({ payment_status: event.status, status: newOrderStatus === 'paid' ? 'paid' : newOrderStatus })
        .eq('id', order.id);
    }

    if (event.status === 'pagamento_aprovado') {
      await createSupplierOrderForPaidOrder(supabase, order.id);
    }

    await markWebhookProcessed(supabase, event.eventId);
    await logAudit({ action: 'webhook.appmax.processed', entity: 'orders', entityId: order.id, metadata: { eventType: event.eventType, status: event.status } });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook Appmax: erro ao processar', error);
    await markWebhookProcessed(supabase, event.eventId, error instanceof Error ? error.message : 'Erro desconhecido.');
    // Retornamos 200 mesmo em erro de processamento para a Appmax não ficar
    // reenviando indefinidamente; o erro fica registrado em webhook_events
    // para reprocessamento manual pelo painel (fila de ações pendentes).
    return NextResponse.json({ received: true, error: true }, { status: 200 });
  }
}

async function markWebhookProcessed(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  eventId: string,
  errorMessage?: string,
) {
  await supabase
    .from('webhook_events')
    .update({ processed: !errorMessage, processed_at: new Date().toISOString(), error_message: errorMessage ?? null })
    .eq('provider', 'appmax')
    .eq('event_id', eventId);
}

async function createSupplierOrderForPaidOrder(supabase: ReturnType<typeof createSupabaseAdminClient>, orderId: string) {
  // Idempotência: supplier_orders.order_id é unique — se já existe, não duplica.
  const { data: existing } = await supabase.from('supplier_orders').select('id').eq('order_id', orderId).maybeSingle();
  if (existing) return;

  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  const firstItem = items?.[0];
  if (!firstItem) return;

  const { data: candidates } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('product_id', firstItem.product_id);
  const best = selectBestSupplier(candidates ?? []);

  if (!best) {
    await supabase.from('orders').update({ status: 'problem', notes: 'Nenhum fornecedor com estoque disponível.' }).eq('id', orderId);
    return;
  }

  await supabase.from('supplier_orders').insert({
    order_id: orderId,
    supplier_id: best.supplier_id,
    status: 'pending',
    supplier_cost: best.supplier_cost * firstItem.quantity,
    notes: 'Ordem gerada automaticamente após pagamento aprovado — aguardando envio ao fornecedor (ver fila de ações pendentes).',
  });

  await supabase.from('orders').update({ status: 'supplier_pending' }).eq('id', orderId);
}
