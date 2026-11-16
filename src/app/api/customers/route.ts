import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';

/**
 * GET /api/customers — listagem para o painel admin.
 * Clientes são criados pelo checkout (upsert por e-mail em /api/orders),
 * nunca manualmente aqui — por isso não há POST.
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let query = supabase.from('customers').select('*').order('created_at', { ascending: false }).limit(100);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ customers: data });
  } catch (error) {
    return handleApiError(error);
  }
}
