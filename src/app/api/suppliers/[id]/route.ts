import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supplierSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = supplierSchema.partial().parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('suppliers').update(input).eq('id', id).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'supplier.updated', entity: 'suppliers', entityId: id });
    return NextResponse.json({ supplier: data });
  } catch (error) {
    return handleApiError(error);
  }
}
