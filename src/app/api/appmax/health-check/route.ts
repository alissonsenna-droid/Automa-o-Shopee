import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * GET|POST /api/appmax/health-check
 *
 * URL de "validação / health check" exigida pela Appmax ao instalar o
 * aplicativo privado DropBR (appstore.appmax.com.br). O único requisito é
 * responder 2xx com um campo `external_id` em formato UUID, com um valor
 * DIFERENTE a cada chamada (não pode ser fixo) — por isso geramos um UUID
 * novo a cada requisição em vez de retornar um valor constante.
 *
 * A Appmax chama essa URL via POST server-to-server durante o fluxo de
 * instalação (ver docs.appmax.com.br/guides/instalacao) — GET é mantido
 * também para permitir testar manualmente pelo navegador.
 */
function respond() {
  return NextResponse.json({ external_id: crypto.randomUUID() });
}

export async function GET() {
  return respond();
}

export async function POST() {
  return respond();
}
