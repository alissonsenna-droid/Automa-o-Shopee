import { NextResponse } from 'next/server';

/**
 * Endpoint de diagnóstico TEMPORÁRIO — faz a mesma chamada de autenticação
 * que o client real da Appmax faz, e devolve o status HTTP + corpo da
 * resposta da Appmax (nunca o client_id/secret usados). Remover depois de
 * resolvido.
 */
export async function GET() {
  const apiKey = process.env.APPMAX_API_KEY;
  const secret = process.env.APPMAX_SECRET;
  const env = process.env.APPMAX_ENVIRONMENT;
  const baseUrl = env === 'production' ? 'https://api.appmax.com.br' : 'https://api.sandboxappmax.com.br';

  if (!apiKey || !secret) {
    return NextResponse.json({ error: 'Credenciais não configuradas' }, { status: 500 });
  }

  const res = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: secret,
    }),
  });

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text().catch(() => null);
  }

  return NextResponse.json({
    baseUrl,
    httpStatus: res.status,
    httpStatusText: res.statusText,
    responseBody: body,
  });
}
