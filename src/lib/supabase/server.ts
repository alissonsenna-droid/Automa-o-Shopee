import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Cliente Supabase para uso em Server Components / Route Handlers,
 * respeitando a sessão do usuário autenticado (RLS ativo).
 * Use para leituras/escritas feitas EM NOME do usuário logado no admin.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Chamado a partir de um Server Component sem permissão de escrita
            // de cookies — ok ignorar quando há middleware renovando a sessão.
          }
        },
      },
    },
  );
}
