import 'server-only';
import { AppmaxError, type AppmaxCreatePaymentInput, type AppmaxCreatePaymentResult } from './types';
import { mapPaymentStatus } from './mapStatus';

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

/**
 * Client ID e Client Secret gerados direto no painel da própria loja na
 * Appmax (Configurações → API → Credenciais → "Gerar credenciais").
 *
 * Confirmado contra a aba "Guia para IA" do painel Appmax (Novembro/2026):
 * é OAuth 2.0 client_credentials com um único par de credenciais por loja,
 * lido de variável de ambiente — não existe fluxo de "autorizar app" via
 * redirecionamento para este tipo de integração (esse fluxo mais complexo,
 * em src/lib/appmax/install.ts, é de um modelo de App Store/multi-merchant
 * que não se aplica aqui; mantido no código para referência futura, mas
 * não é o caminho usado por este cliente transacional).
 */
function getCredentials(): { apiKey: string; secret: string } {
  const apiKey = process.env.APPMAX_CLIENT_ID;
  const secret = process.env.APPMAX_CLIENT_SECRET;
  if (!apiKey || !secret) {
    throw new AppmaxError('APPMAX_CLIENT_ID / APPMAX_CLIENT_SECRET não configurados (gere em Appmax → API → Credenciais).');
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

/** Remove o prefixo `data:image/...;base64,` se vier incluso (ver nota no Pix abaixo). */
export function stripDataUriPrefix(value: string | undefined): string | undefined {
  if (!value) return value;
  const match = value.match(/^data:[^;]+;base64,(.*)$/s);
  return match ? match[1] : value;
}

/**
 * Cria o pedido + pagamento na Appmax.
 *
 * Fluxo confirmado contra docs.appmax.com.br/guides/exemplo-integracao:
 * criar cliente -> criar pedido vinculado ao customer_id -> efetuar
 * pagamento vinculado ao order_id + customer_id. Valores sempre em
 * centavos.
 *
 * O formato de resposta do Pix documentado ali (`data.pix.{qr_code,
 * emv_code, expires_at}`) NÃO bate com o que a API realmente devolve —
 * testado ao vivo em produção em 2026-11-17: `data.payment.{pix_qrcode,
 * pix_emv, pix_expiration_date}`, sem nenhum `data.order` na resposta do
 * pagamento. A doc está errada aqui; o teste ao vivo é a fonte de
 * verdade. Por precaução (e porque não há como testar cartão sem usar um
 * cartão real), a leitura do status depois do pagamento é tolerante a
 * ambos os formatos em vez de acessar `order.status` direto — um acesso
 * direto nessa chave inexistente foi exatamente o que quebrou o Pix.
 */
export async function createPayment(input: AppmaxCreatePaymentInput): Promise<AppmaxCreatePaymentResult> {
  const customerId = await createCustomer(input);

  const order = await appmaxFetch<{ data: { order: { id: number; status: string } } }>('/v1/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_id: customerId,
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
      data: {
        order?: { status?: string };
        payment?: { pix_qrcode?: string; pix_emv?: string; pix_expiration_date?: string };
        pix?: { qr_code?: string; emv_code?: string; expires_at?: string };
      };
    }>('/v1/payments/pix', {
      method: 'POST',
      body: JSON.stringify({
        order_id: orderId,
        payment_data: { pix: { document_number: input.customer.document } },
      }),
    });

    const qrCode = payment.data.payment?.pix_emv ?? payment.data.pix?.emv_code;
    const qrCodeBase64 = stripDataUriPrefix(payment.data.payment?.pix_qrcode ?? payment.data.pix?.qr_code);
    const expiresAt = payment.data.payment?.pix_expiration_date ?? payment.data.pix?.expires_at;

    return {
      providerOrderId: String(orderId),
      transactionId: String(orderId),
      status: mapPaymentStatus(payment.data.order?.status ?? order.data.order.status),
      pix: qrCode ? { qrCode, qrCodeBase64, expiresAt } : undefined,
      raw: { order: order.data.order, payment: payment.data },
    };
  }

  const { first_name, last_name } = splitName(input.customer.name);
  const payment = await appmaxFetch<{
    data: { order?: { status?: string }; payment?: { status?: string } };
  }>('/v1/payments/credit-card', {
    method: 'POST',
    body: JSON.stringify({
      order_id: orderId,
      customer_id: customerId,
      payment_data: {
        credit_card: {
          token: input.cardToken,
          holder_document_number: input.customer.document,
          holder_name: `${first_name} ${last_name}`,
          installments: input.installments ?? 1,
          soft_descriptor: input.softDescriptor ?? 'FAZZO',
        },
      },
    }),
  });

  return {
    providerOrderId: String(orderId),
    transactionId: String(orderId),
    status: mapPaymentStatus(payment.data.order?.status ?? payment.data.payment?.status ?? order.data.order.status),
    raw: { order: order.data.order, payment: payment.data },
  };
}

export async function getPayment(transactionId: string): Promise<{ status: string; raw: unknown }> {
  const data = await appmaxFetch<{ data: { order: { status: string } } }>(`/v1/orders/${transactionId}`, {
    method: 'GET',
  });
  return { status: data.data.order.status, raw: data };
}
