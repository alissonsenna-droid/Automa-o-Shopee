import 'server-only';
import crypto from 'node:crypto';
import { AppmaxError, type AppmaxCreatePaymentInput, type AppmaxCreatePaymentResult } from './types';
import { mapPaymentStatus } from './mapStatus';

const SANDBOX_BASE_URL = 'https://api.sandboxappmax.com.br';
const PRODUCTION_BASE_URL = 'https://api.appmax.com.br';

function getBaseUrl(): string {
  return process.env.APPMAX_ENVIRONMENT === 'production' ? PRODUCTION_BASE_URL : SANDBOX_BASE_URL;
}

function getCredentials() {
  const apiKey = process.env.APPMAX_API_KEY;
  const secret = process.env.APPMAX_SECRET;
  if (!apiKey || !secret) {
    throw new AppmaxError('Credenciais da Appmax não configuradas (APPMAX_API_KEY / APPMAX_SECRET).');
  }
  return { apiKey, secret };
}

// Token OAuth2 fica em cache no processo (server) para evitar autenticar a
// cada chamada. Em produção com múltiplas instâncias, considere mover para
// um cache compartilhado (ex: tabela no Supabase ou Redis).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }

  const { apiKey, secret } = getCredentials();

  const res = await fetch(`${getBaseUrl()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: secret,
    }),
  });

  if (!res.ok) {
    throw new AppmaxError('Falha ao autenticar na Appmax', res.status, await safeJson(res));
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function appmaxFetch<T>(path: string, init: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    throw handleAppmaxError(res.status, await safeJson(res));
  }

  return (await res.json()) as T;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Normaliza qualquer erro de resposta da Appmax em um AppmaxError previsível. */
export function handleAppmaxError(statusCode: number, details: unknown): AppmaxError {
  const message =
    typeof details === 'object' && details !== null && 'message' in details
      ? String((details as { message?: unknown }).message)
      : `Erro na Appmax (HTTP ${statusCode})`;
  return new AppmaxError(message, statusCode, details);
}

/**
 * Cria o pedido + pagamento na Appmax.
 *
 * NOTA DE INTEGRAÇÃO: os endpoints/campos abaixo (`/v1/orders`,
 * `/v1/payments/pix`, `/v1/payments/credit-card`) seguem a estrutura pública
 * da documentação da Appmax (docs.appmax.com.br) vigente no momento em que
 * este código foi escrito. Antes de ir para produção, valide cada payload
 * contra a documentação/sandbox atual da sua conta Appmax — a Appmax pode
 * ajustar nomes de campos entre versões. Este arquivo é o ÚNICO lugar que
 * precisa mudar caso algo tenha sido renomeado.
 */
export async function createPayment(input: AppmaxCreatePaymentInput): Promise<AppmaxCreatePaymentResult> {
  const order = await appmaxFetch<{ id: string | number; status: string }>('/v1/orders', {
    method: 'POST',
    body: JSON.stringify({
      external_reference: input.orderNumber,
      products_value: input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        phone: input.customer.phone,
        document_number: input.customer.document,
      },
      shipping_address: {
        zipcode: input.address.cep,
        street: input.address.street,
        number: input.address.number,
        complement: input.address.complement ?? '',
        neighborhood: input.address.neighborhood,
        city: input.address.city,
        state: input.address.state,
      },
      products: input.items.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_value: item.unitPriceCents,
      })),
    }),
  });

  const path = input.method === 'pix' ? '/v1/payments/pix' : '/v1/payments/credit-card';
  const paymentBody: Record<string, unknown> =
    input.method === 'pix'
      ? { order_id: order.id, amount: input.amountCents }
      : {
          order_id: order.id,
          amount: input.amountCents,
          payment_data: {
            credit_card: {
              token: input.cardToken,
              holder_name: input.customer.name,
              holder_document_number: input.customer.document,
              installments: input.installments ?? 1,
              soft_descriptor: input.softDescriptor ?? 'DROPBR',
            },
          },
        };

  const payment = await appmaxFetch<{
    id: string | number;
    status: string;
    pix_qrcode?: string;
    pix_qrcode_base64?: string;
    pix_expiration?: string;
  }>(path, { method: 'POST', body: JSON.stringify(paymentBody) });

  return {
    providerOrderId: String(order.id),
    transactionId: String(payment.id),
    status: mapPaymentStatus(payment.status),
    pix: payment.pix_qrcode
      ? { qrCode: payment.pix_qrcode, qrCodeBase64: payment.pix_qrcode_base64, expiresAt: payment.pix_expiration }
      : undefined,
    raw: payment,
  };
}

export async function getPayment(transactionId: string): Promise<{ status: string; raw: unknown }> {
  const data = await appmaxFetch<{ status: string }>(`/v1/payments/${transactionId}`, { method: 'GET' });
  return { status: data.status, raw: data };
}

/**
 * Valida a assinatura HMAC de um webhook da Appmax usando
 * APPMAX_WEBHOOK_SECRET. Ajuste o algoritmo/header conforme a documentação
 * de "apphooks" da sua conta caso ela use um esquema diferente.
 */
export function validateWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.APPMAX_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppmaxError('APPMAX_WEBHOOK_SECRET não configurado.');
  }
  if (!signatureHeader) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
