import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { supplierProductSchema } from '@/lib/validations/suppliers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * GET /api/supplier-products — vínculos fornecedor<->produto (custo, estoque,
 * SKU, prioridade). Usado pela tela de Produtos e pela seleção de fornecedor
 * no processamento de pedidos (ver src/lib/suppliers/selection.ts).
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const supabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);

    let query = supabase
      .from('supplier_products')
      .select('*, suppliers(name, platform), products(name)')
      .order('priority', { ascending: false });
    if (searchParams.get('product_id')) query = query.eq('product_id', searchParams.get('product_id') as string);
    if (searchParams.get('supplier_id')) query = query.eq('supplier_id', searchParams.get('supplier_id') as string);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ supplier_products: data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireStaff();
    const input = supplierProductSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from('supplier_products').insert(input).select('*, suppliers(name), products(name)').single();
    if (error) throw error;
    await logAudit({ userId, action: 'supplier_product.created', entity: 'supplier_products', entityId: data.id });
    return NextResponse.json({ supplier_product: data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
