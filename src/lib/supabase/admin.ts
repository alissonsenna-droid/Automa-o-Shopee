import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase com a service_role key — ignora RLS.
 * USO EXCLUSIVO em Route Handlers / server-side (checkout público, webhook).
 * NUNCA importe este módulo em um Client Component ou exponha a service key
 * ao browser.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase service role não configurado (verifique .env).');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
