import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupplierProvider } from '@/lib/suppliers';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

/**
 * POST /api/supplier-orders/[id]/send
 *
 * Aciona o fornecedor (hoje sempre via ManualSupplierProvider, que apenas
 * confirma a criação da ordem — a compra em si é feita manualmente pelo
 * operador fora do sistema). Idempotente: clicar duas vezes não recria a
 * ordem nem reenvia — apenas retorna o estado atual se já não estiver mais
 * "pending".
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();

    const { data: supplierOrder, error } = await supabase
      .from('supplier_orders')
      .select('*, suppliers(*), orders(order_number, customers(name, phone, email), addresses(*))')
      .eq('id', id)
      .single();

    if (error || !supplierOrder) {
      return NextResponse.json({ error: 'Ordem de fornecedor não encontrada.' }, { status: 404 });
    }

    if (supplierOrder.status !== 'pending') {
      return NextResponse.json({ supplier_order: supplierOrder, idempotent: true });
    }

    const supplier = supplierOrder.suppliers as { platform: 'shopee' | 'supplier_direct' | 'manual' | 'api' | 'other' };
    const order = supplierOrder.orders as {
      order_number: string;
      customers: { name: string; phone: string; email: string };
      addresses: { cep: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string };
    };

    const provider = getSupplierProvider(supplier);
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', supplierOrder.order_id);

    const result = await provider.createOrder({
      orderNumber: order.order_number,
      items: (items ?? []).map((i) => ({ supplierSku: null, name: '', quantity: i.quantity, unitCost: i.supplier_cost })),
      customer: order.customers,
      address: order.addresses,
    });

    const { data: updated, error: updateError } = await supabase
      .from('supplier_orders')
      .update({
        status: result.status,
        supplier_order_number: result.supplierOrderNumber,
        supplier_url: result.supplierUrl,
        notes: result.notes ?? supplierOrder.notes,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) throw updateError;

    if (result.status === 'sent' || result.status === 'confirmed') {
      await supabase.from('orders').update({ status: 'supplier_ordered' }).eq('id', supplierOrder.order_id);
    }

    await logAudit({ userId, action: 'supplier_order.sent', entity: 'supplier_orders', entityId: id });

    return NextResponse.json({ supplier_order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
