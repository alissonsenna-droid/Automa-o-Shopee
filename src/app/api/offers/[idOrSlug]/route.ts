import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { updateOfferSchema } from '@/lib/validations/offers';
import { handleApiError, requireAdmin, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/offers/[slug] — leitura pública por slug (usado pelo checkout/landing page). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const supabase = createSupabaseAdminClient();
    const column = UUID_RE.test(idOrSlug) ? 'id' : 'slug';
    const { data, error } = await supabase.from('offers').select('*, products(*)').eq(column, idOrSlug).single();
    if (error || !data) return NextResponse.json({ error: 'Oferta não encontrada.' }, { status: 404 });
    return NextResponse.json({ offer: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { idOrSlug: id } = await params;
    const input = updateOfferSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('offers').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'offer.updated', entity: 'offers', entityId: id, metadata: input });
    return NextResponse.json({ offer: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { userId } = await requireAdmin();
    const { idOrSlug: id } = await params;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) throw error;
    await logAudit({ userId, action: 'offer.deleted', entity: 'offers', entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
