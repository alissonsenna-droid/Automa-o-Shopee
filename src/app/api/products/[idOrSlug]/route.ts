import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { updateProductSchema } from '@/lib/validations/products';
import { handleApiError, requireAdmin, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** GET /api/products/[slug] — leitura pública por slug (usado por landing pages/preview). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const supabase = createSupabaseAdminClient();
    const column = UUID_RE.test(idOrSlug) ? 'id' : 'slug';
    const { data, error } = await supabase.from('products').select('*').eq(column, idOrSlug).single();
    if (error || !data) return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
    return NextResponse.json({ product: data });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/products/[id] */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { idOrSlug: id } = await params;
    const input = updateProductSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('products').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'product.updated', entity: 'products', entityId: id, metadata: input });
    return NextResponse.json({ product: data });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/products/[id] */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { userId } = await requireAdmin();
    const { idOrSlug: id } = await params;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    await logAudit({ userId, action: 'product.deleted', entity: 'products', entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
