import { describe, expect, it } from 'vitest';
import { mapPaymentStatus, orderStatusFromPaymentStatus } from '@/lib/appmax/mapStatus';
import { parseAppmaxWebhook } from '@/lib/appmax/webhook';

describe('mapPaymentStatus', () => {
  it('mapeia status conhecidos', () => {
    expect(mapPaymentStatus('approved')).toBe('pagamento_aprovado');
    expect(mapPaymentStatus('Recusado')).toBe('pagamento_recusado');
    expect(mapPaymentStatus('cancelled')).toBe('pagamento_cancelado');
    expect(mapPaymentStatus('expired')).toBe('pagamento_expirado');
  });

  it('cai em aguardando_pagamento para status desconhecido', () => {
    expect(mapPaymentStatus('algo-novo-da-appmax')).toBe('aguardando_pagamento');
  });
});

describe('orderStatusFromPaymentStatus', () => {
  it('deriva paid apenas de pagamento_aprovado', () => {
    expect(orderStatusFromPaymentStatus('pagamento_aprovado')).toBe('paid');
  });
  it('deriva cancelled de recusado/cancelado/expirado', () => {
    expect(orderStatusFromPaymentStatus('pagamento_recusado')).toBe('cancelled');
    expect(orderStatusFromPaymentStatus('pagamento_cancelado')).toBe('cancelled');
    expect(orderStatusFromPaymentStatus('pagamento_expirado')).toBe('cancelled');
  });
});

describe('parseAppmaxWebhook', () => {
  it('extrai campos de um payload padrão com data aninhado', () => {
    const event = parseAppmaxWebhook({
      id: 'evt_123',
      event: 'payment.updated',
      data: { id: 'txn_1', status: 'approved', external_reference: 'DB-ABC-123' },
    });
    expect(event.eventId).toBe('evt_123');
    expect(event.transactionId).toBe('txn_1');
    expect(event.status).toBe('pagamento_aprovado');
    expect(event.orderNumber).toBe('DB-ABC-123');
  });

  it('gera o mesmo eventId de fallback para o mesmo payload (idempotência determinística)', () => {
    const payload = { type: 'payment.updated', data: { payment_id: 'txn_2', status: 'pending' } };
    const a = parseAppmaxWebhook(payload);
    const b = parseAppmaxWebhook(payload);
    expect(a.eventId).toBe(b.eventId);
  });
});
