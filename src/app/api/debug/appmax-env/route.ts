import { NextResponse } from 'next/server';

/**
 * Endpoint de diagnóstico TEMPORÁRIO — não expõe nenhum segredo, só o valor
 * (ou ausência) da variável APPMAX_ENVIRONMENT, para confirmar por que o
 * client da Appmax está batendo no sandbox em vez de produção. Remover
 * depois de resolvido.
 */
export async function GET() {
  const raw = process.env.APPMAX_ENVIRONMENT;
  return NextResponse.json({
    value: raw ?? null,
    length: raw?.length ?? 0,
    isExactlyProduction: raw === 'production',
    hasApiKey: Boolean(process.env.APPMAX_API_KEY),
    hasSecret: Boolean(process.env.APPMAX_SECRET),
    apiKeyLength: process.env.APPMAX_API_KEY?.length ?? 0,
  });
}
