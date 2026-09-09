import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';

/**
 * GET /api/tracking/[orderId] — uso interno/admin (exige staff autenticado).
 * A consulta pública e anti-enumeração para o cliente final é
 * GET /api/orders/by-number/[orderNumber]?contact=... (ver /pedido).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    await requireStaff();
    const { orderId } = await params;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('tracking').select('*').eq('order_id', orderId).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ tracking: data });
  } catch (error) {
    return handleApiError(error);
  }
}
