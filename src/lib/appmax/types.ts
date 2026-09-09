import type { PaymentMethod, PaymentStatus } from '@/types/database';

export interface AppmaxCustomerInput {
  name: string;
  email: string;
  phone: string;
  document: string; // CPF
}

export interface AppmaxAddressInput {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AppmaxCreatePaymentInput {
  orderNumber: string;
  amountCents: number;
  method: PaymentMethod;
  customer: AppmaxCustomerInput;
  address: AppmaxAddressInput;
  items: Array<{ sku: string; name: string; quantity: number; unitPriceCents: number }>;
  installments?: number;
  cardToken?: string; // apenas para credit_card — nunca aceitar PAN em texto puro
  softDescriptor?: string;
}

export interface AppmaxCreatePaymentResult {
  providerOrderId: string;
  transactionId: string;
  status: PaymentStatus;
  pix?: { qrCode: string; qrCodeBase64?: string; expiresAt?: string };
  raw: unknown;
}

export interface AppmaxWebhookEvent {
  eventId: string;
  eventType: string;
  transactionId: string;
  orderNumber?: string;
  status: PaymentStatus;
  raw: unknown;
}

export class AppmaxError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppmaxError';
  }
}
