import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { landingPageSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireAdmin, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = landingPageSchema.partial().parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('landing_pages').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'landing_page.updated', entity: 'landing_pages', entityId: id });
    return NextResponse.json({ landing_page: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAdmin();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('landing_pages').delete().eq('id', id);
    if (error) throw error;
    await logAudit({ userId, action: 'landing_page.deleted', entity: 'landing_pages', entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
