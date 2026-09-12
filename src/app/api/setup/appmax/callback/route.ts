import { NextRequest, NextResponse } from 'next/server';
import { completeAppmaxInstall } from '@/lib/appmax/install';

/**
 * GET /api/setup/appmax/callback
 *
 * Para onde a Appmax redireciona o navegador depois que o merchant
 * autoriza a instalação (url_callback enviado em /api/setup/appmax/start).
 * Troca o hash recebido pelas credenciais definitivas do merchant (etapa 4
 * do guia) e as salva em app_settings — nunca expostas na resposta.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hash =
    searchParams.get('token') ?? searchParams.get('hash') ?? searchParams.get('code') ?? searchParams.get('authorization_token');

  if (!hash) {
    return NextResponse.json(
      { error: 'Nenhum hash de autorização recebido no callback.', receivedParams: Object.fromEntries(searchParams) },
      { status: 400 },
    );
  }

  try {
    await completeAppmaxInstall(hash);
    return NextResponse.json({ ok: true, message: 'Instalação concluída — credenciais de merchant salvas.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Falha ao concluir instalação', details: error instanceof Error ? error.message : error },
      { status: 500 },
    );
  }
}
