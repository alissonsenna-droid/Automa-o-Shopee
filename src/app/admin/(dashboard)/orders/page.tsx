'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/database';

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    fetch(`/api/orders?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders ?? []));
  }, [search, status]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Pedidos</h1>

      <div className="flex gap-3">
        <Input placeholder="Buscar por número..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.keys(STATUS_VARIANT).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
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
                    <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{order.payment_status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
