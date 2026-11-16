import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const reportProblemSchema = z.object({
  reason: z.string().min(3).max(1000),
});

/**
 * POST /api/supplier-orders/[id]/problem — "REPORTAR PROBLEMA" da Central de
 * Pagamentos: marca a compra ao fornecedor (e o pedido) como "problem", com
 * o motivo registrado em texto. Não reverte pagamento nem move dinheiro —
 * só sinaliza pra um humano olhar.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireStaff();
    const { id } = await params;
    const input = reportProblemSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();

    const { data: supplierOrder, error: findError } = await supabase
      .from('supplier_orders')
      .select('order_id')
      .eq('id', id)
      .single();
    if (findError || !supplierOrder) {
      return NextResponse.json({ error: 'Ordem de fornecedor não encontrada.' }, { status: 404 });
    }

    const { data: updated, error } = await supabase
      .from('supplier_orders')
      .update({ status: 'problem', notes: input.reason })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    await supabase.from('orders').update({ status: 'problem', notes: input.reason }).eq('id', supplierOrder.order_id);

    await logAudit({ userId, action: 'supplier_order.problem_reported', entity: 'supplier_orders', entityId: id, metadata: input });

    return NextResponse.json({ supplier_order: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
