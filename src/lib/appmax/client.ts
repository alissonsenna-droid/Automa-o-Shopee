import 'server-only';
import crypto from 'node:crypto';
import { AppmaxError, type AppmaxCreatePaymentInput, type AppmaxCreatePaymentResult } from './types';
import { mapPaymentStatus } from './mapStatus';
import { getMerchantCredentials } from './install';

// Confirmado contra a documentação oficial (docs.appmax.com.br) em 2026-09-12:
// - Autenticação: domínio SEPARADO (auth.appmax.com.br), form-urlencoded.
// - Demais endpoints: api.appmax.com.br (ou api.sandboxappmax.com.br em sandbox),
//   sempre JSON com Bearer token.
const AUTH_BASE_URL = 'https://auth.appmax.com.br';
const SANDBOX_API_BASE_URL = 'https://api.sandboxappmax.com.br';
const PRODUCTION_API_BASE_URL = 'https://api.appmax.com.br';

function isProduction(): boolean {
  return process.env.APPMAX_ENVIRONMENT === 'production';
}

function getApiBaseUrl(): string {
  return isProduction() ? PRODUCTION_API_BASE_URL : SANDBOX_API_BASE_URL;
}

async function getCredentials() {
  // As chamadas transacionais (/v1/*) exigem credenciais de MERCHANT, não
  // as credenciais do app (APPMAX_API_KEY/SECRET) — ver src/lib/appmax/install.ts.
  const merchant = await getMerchantCredentials();
  if (!merchant) {
    throw new AppmaxError(
      'App ainda não instalado/autorizado na Appmax (sem credenciais de merchant). Acesse /api/setup/appmax/start para concluir a instalação.',
    );
  }
  return { apiKey: merchant.clientId, secret: merchant.clientSecret };
}

// Token OAuth2 fica em cache no processo (server) para evitar autenticar a
// cada chamada. Em produção com múltiplas instâncias, considere mover para
// um cache compartilhado (ex: tabela no Supabase ou Redis).
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }

  const { apiKey, secret } = await getCredentials();

  // A autenticação é sempre no domínio auth.appmax.com.br (não no domínio
  // da API), e o corpo é x-www-form-urlencoded — não JSON.
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: apiKey,
    client_secret: secret,
  });

  const res = await fetch(`${AUTH_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
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
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
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

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  const first_name = parts[0] ?? fullName;
  const last_name = parts.length > 1 ? parts.slice(1).join(' ') : first_name;
  return { first_name, last_name };
}

/**
 * Cria o cliente na Appmax (POST /v1/customers) e retorna o customer_id —
 * pré-requisito obrigatório para criar um pedido.
 */
async function createCustomer(input: AppmaxCreatePaymentInput): Promise<number> {
  const { first_name, last_name } = splitName(input.customer.name);

  const data = await appmaxFetch<{ data: { customer: { id: number } } }>('/v1/customers', {
    method: 'POST',
    body: JSON.stringify({
      first_name,
      last_name,
      email: input.customer.email,
      phone: input.customer.phone,
      document_number: input.customer.document,
      address: {
        postcode: input.address.cep,
        street: input.address.street,
        number: input.address.number,
        complement: input.address.complement ?? '',
        district: input.address.neighborhood,
        city: input.address.city,
        state: input.address.state,
      },
      // Sem o widget Appmax JS no checkout ainda, usamos o IP da requisição
      // (melhor esforço para antifraude) em vez do IP coletado pelo script.
      ip: input.customerIp ?? '0.0.0.0',
    }),
  });

  return data.data.customer.id;
}

/**
 * Cria o pedido + pagamento na Appmax.
 *
 * Fluxo real (confirmado em docs.appmax.com.br, 2026-09-12): criar cliente
 * -> criar pedido vinculado ao customer_id -> efetuar pagamento vinculado
 * ao order_id. Cartão de crédito ainda não teve o endpoint/payload exatos
 * confirmados contra a documentação — revisar antes de habilitar em produção.
 */
export async function createPayment(input: AppmaxCreatePaymentInput): Promise<AppmaxCreatePaymentResult> {
  const customerId = await createCustomer(input);

  const productsValue = input.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);

  const order = await appmaxFetch<{ data: { order: { id: number; status: string } } }>('/v1/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customerId,
      products_value: productsValue,
      discount_value: input.discountCents ?? 0,
      shipping_value: input.shippingCents ?? 0,
      products: input.items.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_value: item.unitPriceCents,
        type: 'physical',
      })),
    }),
  });

  const orderId = order.data.order.id;

  if (input.method === 'pix') {
    const payment = await appmaxFetch<{
      data: { payment: { pix_qrcode?: string; pix_emv?: string; pix_expiration_date?: string } };
    }>('/v1/payments/pix', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        payment_data: { pix: { document_number: input.customer.document } },
      }),
    });

    return {
      providerOrderId: String(orderId),
      transactionId: String(orderId),
      status: mapPaymentStatus(order.data.order.status),
      pix: payment.data.payment.pix_emv
        ? {
            qrCode: payment.data.payment.pix_emv,
            qrCodeBase64: payment.data.payment.pix_qrcode,
            expiresAt: payment.data.payment.pix_expiration_date,
          }
        : undefined,
      raw: { order: order.data.order, payment: payment.data.payment },
    };
  }

  // Cartão de crédito: endpoint/payload ainda não confirmados contra a
  // documentação oficial (ver comentário acima). Mantido como melhor esforço.
  const payment = await appmaxFetch<{ data: { payment: { id?: number; status?: string } } }>(
    '/v1/payments/credit-card',
    {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        payment_data: {
          credit_card: {
            token: input.cardToken,
            installments: input.installments ?? 1,
            soft_descriptor: input.softDescriptor ?? 'DROPBR',
          },
        },
      }),
    },
  );

  return {
    providerOrderId: String(orderId),
    transactionId: String(payment.data.payment.id ?? orderId),
    status: mapPaymentStatus(payment.data.payment.status ?? order.data.order.status),
    raw: { order: order.data.order, payment: payment.data.payment },
  };
}

export async function getPayment(transactionId: string): Promise<{ status: string; raw: unknown }> {
  const data = await appmaxFetch<{ data: { order: { status: string } } }>(`/v1/orders/${transactionId}`, {
    method: 'GET',
  });
  return { status: data.data.order.status, raw: data };
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
