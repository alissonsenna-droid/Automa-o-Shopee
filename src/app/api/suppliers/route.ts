import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supplierSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('suppliers').select('*').order('name');
    if (error) throw error;
    return NextResponse.json({ suppliers: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const input = supplierSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('suppliers').insert(input).select('*').single();
    if (error) throw error;
    await logAudit({ userId, action: 'supplier.created', entity: 'suppliers', entityId: data.id });
    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
