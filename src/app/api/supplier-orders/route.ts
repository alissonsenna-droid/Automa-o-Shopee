import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';

/**
 * GET /api/supplier-orders — usado pela Central de Pagamentos (/admin/pix)
 * pra reunir, num lugar só, todas as compras a fornecedores que ainda
 * precisam de ação humana (comprar/pagar fora do sistema, ou reportar
 * problema).
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    let query = supabase
      .from('supplier_orders')
      .select('*, suppliers(name, platform), orders(order_number, total)')
      .order('created_at', { ascending: true });

    const status = searchParams.get('status');
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ supplier_orders: data });
  } catch (error) {
    return handleApiError(error);
  }
}
