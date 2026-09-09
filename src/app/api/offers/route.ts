import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { offerSchema } from '@/lib/validations/offers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('offers').select('*, products(name, images)').order('created_at', { ascending: false });
    if (searchParams.get('active') != null) query = query.eq('active', searchParams.get('active') === 'true');
    if (searchParams.get('product_id')) query = query.eq('product_id', searchParams.get('product_id') as string);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ offers: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const input = offerSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('offers').insert(input).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'offer.created', entity: 'offers', entityId: data.id });
    return NextResponse.json({ offer: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
