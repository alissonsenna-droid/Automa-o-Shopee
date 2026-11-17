import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculatePeriodProfit } from '@/lib/financial';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<OrderStatus, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  pending_payment: 'warning',
  paid: 'default',
  supplier_pending: 'warning',
  supplier_ordered: 'default',
  supplier_shipped: 'default',
  in_transit: 'default',
  delivered: 'success',
  cancelled: 'muted',
  refunded: 'muted',
  problem: 'destructive',
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  const [{ data: customer }, { data: orders }] = await Promise.all([
    supabase.from('customers').select('*').eq('id', id).single(),
    supabase.from('orders').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
  ]);

  if (!customer) notFound();

  const result = calculatePeriodProfit({ orders: orders ?? [] });

  const stats = [
    { label: 'Pedidos', value: String(orders?.length ?? 0) },
    { label: 'Total gasto', value: formatCentsToBRL(toCents(result.revenue)) },
    { label: 'Ticket médio', value: formatCentsToBRL(toCents(result.averageTicket)) },
    { label: 'Cliente desde', value: new Date(customer.created_at).toLocaleDateString('pt-BR') },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-muted-foreground hover:underline">
          ← Clientes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{customer.name}</h1>
        <p className="text-sm text-muted-foreground">
          {customer.email} · {customer.phone}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(order.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(order.total))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status as OrderStatus]}>{order.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
