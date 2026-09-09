import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { productSchema } from '@/lib/validations/products';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (searchParams.get('active') != null) query = query.eq('active', searchParams.get('active') === 'true');
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ products: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const input = productSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('products').insert(input).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'product.created', entity: 'products', entityId: data.id });
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
