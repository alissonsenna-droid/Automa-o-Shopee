import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { landingPageSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('landing_pages')
      .select('*, offers(name, price, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ landing_pages: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const input = landingPageSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('landing_pages').insert(input).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'landing_page.created', entity: 'landing_pages', entityId: data.id });
    return NextResponse.json({ landing_page: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
