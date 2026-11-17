import 'server-only';
import type { AppmaxWebhookEvent } from './types';
import { mapPaymentStatus } from './mapStatus';

/**
 * Faz o parse de um payload de webhook da Appmax para o formato interno.
 *
 * Formato confirmado em docs.appmax.com.br/guides/webhooks-painel (os
 * "webhooks do painel", que é o que uma loja única como a Fazzo recebe —
 * diferente do envelope dos webhooks de Appstore):
 *   { "environment": "production", "event": "OrderPaid", "data": { "id": 99042, "status": "aprovado", ... } }
 *
 * Não existe nenhum id de evento único no payload — nem aqui nem nos
 * webhooks de Appstore. A própria Appmax recomenda (docs, "Boas Práticas")
 * deduplicar por `evento + id do recurso`, porque o mesmo pedido (data.id)
 * aparece em vários eventos diferentes ao longo do ciclo de vida (OrderPaid,
 * OrderIntegrated, etc.) — usar só o id do recurso trataria o 2º evento
 * legítimo como duplicata do 1º.
 */
export function parseAppmaxWebhook(payload: Record<string, unknown>): AppmaxWebhookEvent {
  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;

  const eventType = (payload.event as string | undefined) ?? (payload.type as string | undefined) ?? 'unknown';

  const resourceId = String(
    (data.transaction_id as string | number | undefined) ??
      (data.payment_id as string | number | undefined) ??
      (data.id as string | number | undefined) ??
      '',
  );

  const eventId = resourceId ? `${eventType}:${resourceId}` : cryptoRandomFallback(payload);

  const orderNumber =
    (data.external_reference as string | undefined) ?? (data.order_external_reference as string | undefined);

  const status = mapPaymentStatus(String((data.status as string | undefined) ?? 'pending'));

  return { eventId, eventType, transactionId: resourceId, orderNumber, status, raw: payload };
}

// Fallback determinístico para não quebrar idempotência se o payload não
// trouxer um id explícito (não deveria acontecer em produção).
function cryptoRandomFallback(payload: unknown): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return `fallback-${hash}`;
}
