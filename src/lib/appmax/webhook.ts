import 'server-only';
import type { AppmaxWebhookEvent } from './types';
import { mapPaymentStatus } from './mapStatus';

/**
 * Faz o parse de um payload de webhook da Appmax para o formato interno.
 * Aceita algumas variações de nomenclatura de campos (event/type,
 * id/event_id, data.id/transaction_id) para robustez, já que o formato
 * exato deve ser confirmado contra a conta real (ver `apphooks`).
 */
export function parseAppmaxWebhook(payload: Record<string, unknown>): AppmaxWebhookEvent {
  const data = (payload.data as Record<string, unknown> | undefined) ?? payload;

  const eventId =
    (payload.id as string | undefined) ??
    (payload.event_id as string | undefined) ??
    (data.id as string | undefined) ??
    cryptoRandomFallback(payload);

  const eventType = (payload.event as string | undefined) ?? (payload.type as string | undefined) ?? 'unknown';

  const transactionId = String(
    (data.transaction_id as string | number | undefined) ??
      (data.payment_id as string | number | undefined) ??
      (data.id as string | number | undefined) ??
      '',
  );

  const orderNumber =
    (data.external_reference as string | undefined) ?? (data.order_external_reference as string | undefined);

  const status = mapPaymentStatus(String((data.status as string | undefined) ?? 'pending'));

  return { eventId: String(eventId), eventType, transactionId, orderNumber, status, raw: payload };
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
