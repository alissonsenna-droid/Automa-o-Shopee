import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * GET /api/appmax/health-check
 *
 * URL de "validação / health check" exigida pela Appmax ao instalar o
 * aplicativo privado DropBR (appstore.appmax.com.br). O único requisito é
 * responder 2xx com um campo `external_id` em formato UUID, com um valor
 * DIFERENTE a cada chamada (não pode ser fixo) — por isso geramos um UUID
 * novo a cada requisição em vez de retornar um valor constante.
 */
export async function GET() {
  return NextResponse.json({ external_id: crypto.randomUUID() });
}
