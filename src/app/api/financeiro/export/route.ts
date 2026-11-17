import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { handleApiError, requireStaff } from '@/lib/auth';
import { calculateOrderProfit } from '@/lib/financial';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/**
 * GET /api/financeiro/export — CSV do relatório financeiro (um pedido por
 * linha) pra importar na contabilidade. Usa a mesma `calculateOrderProfit`
 * que alimenta o dashboard e o /admin/financeiro, então os números batem.
 */
export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const defaults = defaultRange();
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const from = fromParam && DATE_RE.test(fromParam) ? fromParam : defaults.from;
    const to = toParam && DATE_RE.test(toParam) ? toParam : defaults.to;

    const supabase = createSupabaseAdminClient();
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_number, status, created_at, total, supplier_cost, gateway_fee, other_costs, discount')
      .gte('created_at', `${from}T00:00:00`)
      .lte('created_at', `${to}T23:59:59.999`)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const header = ['Data', 'Pedido', 'Status', 'Faturamento', 'Custo fornecedor', 'Taxa gateway', 'Outros custos', 'Lucro', 'Margem'];
    const lines = [header.join(',')];

    for (const order of orders ?? []) {
      const b = calculateOrderProfit(order);
      lines.push(
        [
          csvField(order.created_at.slice(0, 10)),
          csvField(order.order_number),
          csvField(order.status),
          csvField(b.revenue.toFixed(2)),
          csvField(b.supplierCost.toFixed(2)),
          csvField(b.gatewayFee.toFixed(2)),
          csvField(b.otherCosts.toFixed(2)),
          csvField(b.profit.toFixed(2)),
          csvField((b.margin * 100).toFixed(1)),
        ].join(','),
      );
    }

    const csv = `﻿${lines.join('\n')}\n`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="financeiro-${from}-a-${to}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
