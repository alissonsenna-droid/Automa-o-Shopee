'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Cliente Supabase para uso em Client Components (auth do painel admin). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
