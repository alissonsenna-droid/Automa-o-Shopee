import 'server-only';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database';

export class UnauthorizedError extends Error {}

/** Garante que a requisição vem de um usuário staff (admin ou operator) autenticado. */
export async function requireStaff(): Promise<{ userId: string; profile: Profile }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthorizedError('Não autenticado.');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile || !['admin', 'operator'].includes(profile.role)) {
    throw new UnauthorizedError('Sem permissão.');
  }

  return { userId: user.id, profile: profile as Profile };
}

export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const result = await requireStaff();
  if (result.profile.role !== 'admin') throw new UnauthorizedError('Requer perfil admin.');
  return result;
}

/** Helper padrão para transformar erros conhecidos em respostas HTTP. */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  console.error(error);
  const message = error instanceof Error ? error.message : 'Erro interno.';
  return NextResponse.json({ error: message }, { status: 500 });
}
