import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateOrderProfit } from '@/lib/financial';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminDashboardPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: todayOrders }, { data: monthOrders }, { count: paidCount }, { count: supplierPendingCount }, { count: shippedCount }, { count: deliveredCount }] =
    await Promise.all([
      supabase.from('orders').select('*').gte('created_at', startOfDay()),
      supabase.from('orders').select('*').gte('created_at', startOfMonth()),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'supplier_pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'supplier_shipped'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
    ]);

  const todayRevenue = (todayOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const monthRevenue = (monthOrders ?? []).reduce((sum, o) => sum + o.total, 0);
  const monthProfit = (monthOrders ?? []).reduce((sum, o) => sum + calculateOrderProfit(o).profit, 0);
  const averageTicket = monthOrders && monthOrders.length > 0 ? monthRevenue / monthOrders.length : 0;

  const cards = [
    { label: 'Faturamento hoje', value: formatCentsToBRL(toCents(todayRevenue)) },
    { label: 'Faturamento no mês', value: formatCentsToBRL(toCents(monthRevenue)) },
    { label: 'Lucro no mês', value: formatCentsToBRL(toCents(monthProfit)) },
    { label: 'Ticket médio', value: formatCentsToBRL(toCents(averageTicket)) },
    { label: 'Pedidos pagos', value: String(paidCount ?? 0) },
    { label: 'Aguardando fornecedor', value: String(supplierPendingCount ?? 0) },
    { label: 'Enviados', value: String(shippedCount ?? 0) },
    { label: 'Entregues', value: String(deliveredCount ?? 0) },
  ];

  const quickActions = [
    { href: '/admin/process', label: 'PROCESSAR PEDIDOS' },
    { href: '/admin/pix', label: 'PAGAR PEDIDOS' },
    { href: '/admin/orders', label: 'VER PEDIDOS' },
    { href: '/admin/actions', label: 'VER PROBLEMAS' },
    { href: '/admin/analytics/products', label: 'RELATÓRIOS' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="flex flex-wrap gap-3">
        {quickActions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            {a.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
