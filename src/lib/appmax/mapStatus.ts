import type { PaymentStatus } from '@/types/database';

/**
 * Mapeia o status retornado pela Appmax para o enum interno do sistema.
 *
 * A lista oficial e completa de status de pedido (coluna "Status", os
 * valores reais retornados pela API — diferente do nome exibido no
 * painel) está em docs.appmax.com.br/guides/status-pedidos. As entradas
 * em português abaixo são essa lista inteira; as em inglês ficam mantidas
 * por tolerância, caso algum endpoint antigo ou webhook retorne variação.
 *
 * Duas decisões não óbvias, documentadas aqui porque fica fácil errar:
 * - `autorizado` (cartão autorizado pelo banco, aguardando análise
 *   antifraude) ainda NÃO é pagamento confirmado -> aguardando_pagamento.
 * - `chargeback_vencido` significa que a Appmax GANHOU a disputa e o
 *   lojista recebeu o crédito de volta (ver descrição oficial) -> apesar
 *   do nome ter "chargeback", é pagamento_aprovado, não cancelado.
 */
const STATUS_MAP: Record<string, PaymentStatus> = {
  pending: 'aguardando_pagamento',
  pendente: 'aguardando_pagamento',
  waiting_payment: 'aguardando_pagamento',
  autorizado: 'aguardando_pagamento', // autorizado pelo banco, mas ainda em análise antifraude
  authorized: 'pagamento_aprovado',
  paid: 'pagamento_aprovado',
  approved: 'pagamento_aprovado',
  aprovado: 'pagamento_aprovado',
  integrated: 'pagamento_aprovado',
  integrado: 'pagamento_aprovado',
  pendente_integracao: 'pagamento_aprovado', // já pago, só com pendência de cadastro/produto
  pendente_integracao_em_analise: 'pagamento_aprovado', // aprovado, estorno solicitado em análise manual
  chargeback_vencido: 'pagamento_aprovado', // disputa de chargeback GANHA pela Appmax — crédito de volta
  refused: 'pagamento_recusado',
  declined: 'pagamento_recusado',
  recusado: 'pagamento_recusado',
  recusado_por_risco: 'pagamento_recusado',
  cancelled: 'pagamento_cancelado',
  canceled: 'pagamento_cancelado',
  cancelado: 'pagamento_cancelado',
  chargeback: 'pagamento_cancelado',
  chargeback_em_tratativa: 'pagamento_cancelado',
  chargeback_em_disputa: 'pagamento_cancelado',
  chargeback_perdido: 'pagamento_cancelado',
  refunded: 'pagamento_cancelado',
  estornado: 'pagamento_cancelado',
  expired: 'pagamento_expirado',
  expirado: 'pagamento_expirado',
};

export function mapPaymentStatus(appmaxStatus: string): PaymentStatus {
  const normalized = appmaxStatus.trim().toLowerCase();
  return STATUS_MAP[normalized] ?? 'aguardando_pagamento';
}

/** Deriva o order_status resultante a partir de um payment_status novo. */
export function orderStatusFromPaymentStatus(status: PaymentStatus): 'paid' | 'pending_payment' | 'cancelled' | null {
  switch (status) {
    case 'pagamento_aprovado':
      return 'paid';
    case 'pagamento_recusado':
    case 'pagamento_cancelado':
    case 'pagamento_expirado':
      return 'cancelled';
    case 'aguardando_pagamento':
      return 'pending_payment';
    default:
      return null;
  }
}
