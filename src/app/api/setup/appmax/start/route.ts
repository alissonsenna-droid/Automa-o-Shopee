import { NextResponse } from 'next/server';
import { startAppmaxInstall } from '@/lib/appmax/install';
import { AppmaxError } from '@/lib/appmax/types';

/**
 * GET /api/setup/appmax/start
 *
 * Inicia o fluxo de instalação/autorização da Appmax (etapas 1 e 2 do guia
 * "Instalação do aplicativo"): obtém o token do app, gera o hash de
 * autorização, e redireciona o navegador para a tela da Appmax onde o
 * merchant confirma a instalação. Ao autorizar, a Appmax redireciona de
 * volta para /api/setup/appmax/callback, que conclui a instalação.
 *
 * Rota de uso único/administrativo — não precisa ficar linkada em lugar
 * nenhum do site.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  try {
    const { redirectUrl } = await startAppmaxInstall({
      appUuid: '080b19d1-f136-4125-b159-5bdf9e0fc967',
      externalKey: 'dropbr-store-principal',
      urlCallback: `${appUrl}/api/setup/appmax/callback`,
    });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Falha ao iniciar instalação',
        message: error instanceof Error ? error.message : String(error),
        statusCode: error instanceof AppmaxError ? error.statusCode : undefined,
        details: error instanceof AppmaxError ? error.details : undefined,
      },
      { status: 500 },
    );
  }
}
