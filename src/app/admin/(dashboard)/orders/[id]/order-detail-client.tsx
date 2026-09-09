'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import { calculateOrderProfit } from '@/lib/financial';
import type { Order, SupplierOrder } from '@/types/database';

interface Props {
  order: Order & {
    customers: { name: string; email: string; phone: string; cpf: string };
    addresses: { cep: string; street: string; number: string; neighborhood: string; city: string; state: string } | null;
    offers: { name: string };
    supplier_orders: SupplierOrder[];
  };
}

export function OrderDetailClient({ order }: Props) {
  const router = useRouter();
  const supplierOrder = order.supplier_orders?.[0];
  const [sending, setSending] = useState(false);
  const [tracking, setTracking] = useState({ carrier: '', tracking_code: '', tracking_url: '' });
  const [savingTracking, setSavingTracking] = useState(false);

  const profit = calculateOrderProfit(order);

  async function sendToSupplier() {
    if (!supplierOrder) return;
    setSending(true);
    await fetch(`/api/supplier-orders/${supplierOrder.id}/send`, { method: 'POST' });
    setSending(false);
    router.refresh();
  }

  async function saveTracking(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierOrder) return;
    setSavingTracking(true);
    await fetch(`/api/supplier-orders/${supplierOrder.id}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tracking),
    });
    setSavingTracking(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pedido {order.order_number}</h1>
        <div className="mt-1 flex gap-2">
          <Badge>{order.status}</Badge>
          <Badge variant="muted">{order.payment_status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.customers.name}</p>
            <p className="text-muted-foreground">{order.customers.email}</p>
            <p className="text-muted-foreground">{order.customers.phone}</p>
            {order.addresses && (
              <p className="text-muted-foreground">
                {order.addresses.street}, {order.addresses.number} — {order.addresses.neighborhood}, {order.addresses.city}/
                {order.addresses.state}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Receita</span>
              <span>{formatCentsToBRL(toCents(profit.revenue))}</span>
            </div>
            <div className="flex justify-between">
              <span>Custo fornecedor</span>
              <span>-{formatCentsToBRL(toCents(profit.supplierCost))}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa gateway</span>
              <span>-{formatCentsToBRL(toCents(profit.gatewayFee))}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <span>Lucro</span>
              <span>{formatCentsToBRL(toCents(profit.profit))}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {supplierOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fornecedor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={supplierOrder.status === 'pending' ? 'warning' : 'success'}>{supplierOrder.status}</Badge>
              {supplierOrder.status === 'pending' && (
                <Button size="sm" onClick={sendToSupplier} disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar ao fornecedor'}
                </Button>
              )}
            </div>
            {supplierOrder.notes && <p className="text-sm text-muted-foreground">{supplierOrder.notes}</p>}

            <form onSubmit={saveTracking} className="grid grid-cols-3 gap-3">
              <div>
                <Label>Transportadora</Label>
                <Input value={tracking.carrier} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} required />
              </div>
              <div>
                <Label>Código</Label>
                <Input value={tracking.tracking_code} onChange={(e) => setTracking({ ...tracking, tracking_code: e.target.value })} required />
              </div>
              <div>
                <Label>URL de rastreio</Label>
                <Input value={tracking.tracking_url} onChange={(e) => setTracking({ ...tracking, tracking_url: e.target.value })} />
              </div>
              <div className="col-span-3">
                <Button type="submit" variant="outline" disabled={savingTracking}>
                  {savingTracking ? 'Salvando...' : 'Salvar rastreamento'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
