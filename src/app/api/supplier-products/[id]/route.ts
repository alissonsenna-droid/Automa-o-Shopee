import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supplierProductSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireAdmin, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = supplierProductSchema.partial().parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('supplier_products')
      .update(input)
      .eq('id', id)
      .select('*, suppliers(name), products(name)')
      .single();
    if (error) throw error;
    await logAudit({ userId, action: 'supplier_product.updated', entity: 'supplier_products', entityId: id, metadata: input });
    return NextResponse.json({ supplier_product: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAdmin();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('supplier_products').delete().eq('id', id);
    if (error) throw error;
    await logAudit({ userId, action: 'supplier_product.deleted', entity: 'supplier_products', entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
