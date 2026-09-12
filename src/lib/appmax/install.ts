import 'server-only';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { AppmaxError } from './types';

/**
 * Fluxo de instalação/autorização do app na Appmax (ver docs.appmax.com.br/guides/instalacao).
 *
 * As credenciais em APPMAX_API_KEY/APPMAX_SECRET são as credenciais do APP
 * (só servem para POST /app/authorize e POST /app/client/generate). As
 * chamadas transacionais (/v1/customers, /v1/orders, /v1/payments/*)
 * exigem credenciais de MERCHANT, geradas ao final deste fluxo e
 * armazenadas na tabela app_settings — nunca em variável de ambiente,
 * porque são geradas em runtime pelo próprio servidor.
 */

const AUTH_BASE_URL = 'https://auth.appmax.com.br';

function isProduction(): boolean {
  return process.env.APPMAX_ENVIRONMENT === 'production';
}

function getApiBaseUrl(): string {
  return isProduction() ? 'https://api.appmax.com.br' : 'https://api.sandboxappmax.com.br';
}

function getAuthorizeRedirectBaseUrl(): string {
  return isProduction()
    ? 'https://admin.appmax.com.br/appstore/integration'
    : 'https://breakingcode.sandboxappmax.com.br/appstore/integration';
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Token de acesso do APP (não do merchant) — usado só nesta etapa de instalação. */
async function getAppAccessToken(): Promise<string> {
  const apiKey = process.env.APPMAX_API_KEY;
  const secret = process.env.APPMAX_SECRET;
  if (!apiKey || !secret) {
    throw new AppmaxError('APPMAX_API_KEY / APPMAX_SECRET (credenciais do app) não configuradas.');
  }

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
    throw new AppmaxError('Falha ao autenticar o APP na Appmax', res.status, await safeJson(res));
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Etapa 2: gera o hash de autorização e devolve a URL para onde o
 * merchant deve ser redirecionado para autorizar a instalação.
 */
export async function startAppmaxInstall(input: {
  appUuid: string;
  externalKey: string;
  urlCallback: string;
}): Promise<{ redirectUrl: string; hash: string }> {
  const appToken = await getAppAccessToken();

  const res = await fetch(`${getApiBaseUrl()}/app/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${appToken}` },
    body: JSON.stringify({
      app_id: input.appUuid,
      external_key: input.externalKey,
      url_callback: input.urlCallback,
    }),
  });

  if (!res.ok) {
    throw new AppmaxError('Falha ao autorizar instalação do app na Appmax', res.status, await safeJson(res));
  }

  const data = (await res.json()) as { data: { token: string } };
  const hash = data.data.token;

  return { redirectUrl: `${getAuthorizeRedirectBaseUrl()}/${hash}`, hash };
}

/**
 * Etapa 4: troca o hash (já autorizado pelo merchant) pelas credenciais
 * definitivas do merchant, e as persiste em app_settings. A Appmax faz o
 * health check server-to-server durante esta chamada (ver
 * /api/appmax/health-check), então a instalação só conclui se essa URL
 * já estiver publicada e respondendo — o que já está feito.
 */
export async function completeAppmaxInstall(hash: string): Promise<void> {
  const appToken = await getAppAccessToken();

  const res = await fetch(`${getApiBaseUrl()}/app/client/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${appToken}` },
    body: JSON.stringify({ token: hash }),
  });

  if (!res.ok) {
    throw new AppmaxError('Falha ao gerar credenciais de merchant na Appmax', res.status, await safeJson(res));
  }

  const data = (await res.json()) as { data: { client: { client_id: string; client_secret: string } } };
  const { client_id, client_secret } = data.data.client;

  const supabase = createSupabaseAdminClient();
  await supabase.from('app_settings').upsert([
    { key: 'appmax_merchant_client_id', value: client_id, updated_at: new Date().toISOString() },
    { key: 'appmax_merchant_client_secret', value: client_secret, updated_at: new Date().toISOString() },
  ]);
}

/** Lê as credenciais de merchant já instaladas (usado pelo client transacional). */
export async function getMerchantCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['appmax_merchant_client_id', 'appmax_merchant_client_secret']);

  const clientId = data?.find((r) => r.key === 'appmax_merchant_client_id')?.value;
  const clientSecret = data?.find((r) => r.key === 'appmax_merchant_client_secret')?.value;

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
