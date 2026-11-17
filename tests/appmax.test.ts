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

  it('mapeia a lista oficial completa de status de pedido (docs.appmax.com.br/guides/status-pedidos)', () => {
    expect(mapPaymentStatus('pendente')).toBe('aguardando_pagamento');
    expect(mapPaymentStatus('autorizado')).toBe('aguardando_pagamento');
    expect(mapPaymentStatus('aprovado')).toBe('pagamento_aprovado');
    expect(mapPaymentStatus('integrado')).toBe('pagamento_aprovado');
    expect(mapPaymentStatus('pendente_integracao')).toBe('pagamento_aprovado');
    expect(mapPaymentStatus('pendente_integracao_em_analise')).toBe('pagamento_aprovado');
    expect(mapPaymentStatus('cancelado')).toBe('pagamento_cancelado');
    expect(mapPaymentStatus('estornado')).toBe('pagamento_cancelado');
    expect(mapPaymentStatus('recusado_por_risco')).toBe('pagamento_recusado');
    expect(mapPaymentStatus('chargeback_em_tratativa')).toBe('pagamento_cancelado');
    expect(mapPaymentStatus('chargeback_em_disputa')).toBe('pagamento_cancelado');
    expect(mapPaymentStatus('chargeback_perdido')).toBe('pagamento_cancelado');
  });

  it('trata chargeback_vencido como pagamento aprovado (Appmax ganhou a disputa, crédito de volta)', () => {
    expect(mapPaymentStatus('chargeback_vencido')).toBe('pagamento_aprovado');
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
  it('extrai campos do envelope real de webhook do painel (docs.appmax.com.br/guides/webhooks-painel)', () => {
    const event = parseAppmaxWebhook({
      environment: 'production',
      event: 'OrderPaid',
      data: { id: 99042, status: 'aprovado', customer_id: 17 },
    });
    expect(event.eventType).toBe('OrderPaid');
    expect(event.transactionId).toBe('99042');
    expect(event.status).toBe('pagamento_aprovado');
  });

  it('não trata dois eventos diferentes do mesmo pedido como duplicados', () => {
    // Webhooks do painel não trazem nenhum id de evento único — só o id do
    // pedido, que se repete em vários eventos do mesmo ciclo de vida.
    // A chave de idempotência precisa incluir o tipo do evento também.
    const paid = parseAppmaxWebhook({ event: 'OrderPaid', data: { id: 99042, status: 'aprovado' } });
    const integrated = parseAppmaxWebhook({ event: 'OrderIntegrated', data: { id: 99042, status: 'aprovado' } });
    expect(paid.eventId).not.toBe(integrated.eventId);
  });

  it('gera o mesmo eventId para o mesmo payload (idempotência determinística em retries)', () => {
    const payload = { event: 'OrderPaid', data: { id: 'txn_2', status: 'pending' } };
    const a = parseAppmaxWebhook(payload);
    const b = parseAppmaxWebhook(payload);
    expect(a.eventId).toBe(b.eventId);
  });

  it('usa um fallback por hash só quando não há id algum no payload', () => {
    const a = parseAppmaxWebhook({ event: 'OrderPaid', data: { status: 'aprovado' } });
    const b = parseAppmaxWebhook({ event: 'OrderPaid', data: { status: 'aprovado' } });
    expect(a.eventId).toBe(b.eventId);
    expect(a.eventId).toMatch(/^fallback-/);
  });
});
