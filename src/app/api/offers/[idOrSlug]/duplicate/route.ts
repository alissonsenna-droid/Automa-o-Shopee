import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { duplicateOfferSchema } from '@/lib/validations/offers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/offers/[id]/duplicate
 *
 * Copia produto, preço, configuração e parâmetros da oferta original,
 * permitindo alterar nome, preço e landing page — pensado para testes A/B
 * rápidos sem tocar em código.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { idOrSlug: id } = await params;
    const overrides = duplicateOfferSchema.parse(await request.json());

    const supabase = createSupabaseAdminClient();
    const { data: original, error: findError } = await supabase.from('offers').select('*').eq('id', id).single();
    if (findError || !original) {
      return NextResponse.json({ error: 'Oferta original não encontrada.' }, { status: 404 });
    }

    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = original;
    const { data: duplicated, error } = await supabase
      .from('offers')
      .insert({
        ...rest,
        name: overrides.name,
        slug: overrides.slug,
        price: overrides.price ?? original.price,
        landing_page_url: overrides.landing_page_url ?? original.landing_page_url,
        active: false, // nasce inativa — ativação é uma ação explícita do operador
      })
      .select('*')
      .single();

    if (error) throw error;

    await logAudit({ userId, action: 'offer.duplicated', entity: 'offers', entityId: duplicated.id, metadata: { sourceOfferId: id } });

    return NextResponse.json({ offer: duplicated }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
