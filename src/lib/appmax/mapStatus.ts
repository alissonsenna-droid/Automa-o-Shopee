import type { PaymentStatus } from '@/types/database';

/**
 * Mapeia o status retornado pela Appmax para o enum interno do sistema.
 *
 * IMPORTANTE: os nomes de status exatos usados pela Appmax devem ser
 * confirmados na documentação/sandbox oficial (https://docs.appmax.com.br)
 * no momento da integração real — os valores abaixo cobrem os nomes mais
 * comuns encontrados na documentação pública e devem ser ajustados aqui,
 * neste único lugar, caso a Appmax use uma nomenclatura diferente.
 */
const STATUS_MAP: Record<string, PaymentStatus> = {
  pending: 'aguardando_pagamento',
  pendente: 'aguardando_pagamento',
  waiting_payment: 'aguardando_pagamento',
  authorized: 'pagamento_aprovado',
  paid: 'pagamento_aprovado',
  approved: 'pagamento_aprovado',
  aprovado: 'pagamento_aprovado',
  integrated: 'pagamento_aprovado',
  refused: 'pagamento_recusado',
  declined: 'pagamento_recusado',
  recusado: 'pagamento_recusado',
  cancelled: 'pagamento_cancelado',
  canceled: 'pagamento_cancelado',
  cancelado: 'pagamento_cancelado',
  chargeback: 'pagamento_cancelado',
  refunded: 'pagamento_cancelado',
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
