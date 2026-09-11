'use client';

import { use, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TIMELINE_STEPS = [
  { key: 'pending_payment', label: 'Pedido recebido' },
  { key: 'paid', label: 'Pagamento confirmado' },
  { key: 'supplier_ordered', label: 'Pedido enviado ao fornecedor' },
  { key: 'supplier_shipped', label: 'Pedido enviado' },
  { key: 'in_transit', label: 'Em trânsito' },
  { key: 'delivered', label: 'Entregue' },
] as const;

interface PublicOrder {
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
  tracking_code: string | null;
  tracking_url: string | null;
  offers: { name: string; products: { name: string; images: string[] } };
  tracking: { carrier: string | null; status: string | null; last_event: string | null; last_update: string | null } | null;
}

export default function OrderTrackingPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const [contact, setContact] = useState('');
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/by-number/${orderNumber}?contact=${encodeURIComponent(contact)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Pedido não encontrado.');
        setOrder(null);
        return;
      }
      setOrder(data.order);
    } finally {
      setLoading(false);
    }
  }

  const currentStepIndex = order ? TIMELINE_STEPS.findIndex((s) => s.key === order.status) : -1;

  return (
    <main className="mx-auto max-w-xl p-6 py-16">
      <h1 className="mb-1 text-xl font-semibold">Acompanhar pedido</h1>
      <p className="mb-6 text-sm text-muted-foreground">Pedido {orderNumber}</p>

      {!order && (
        <Card>
          <CardHeader>
            <CardTitle>Confirme seus dados</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={lookup} className="space-y-4">
              <div>
                <Label htmlFor="contact">E-mail ou telefone usado na compra</Label>
                <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Consultando...' : 'Consultar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {order && (
        <Card>
          <CardHeader>
            <CardTitle>{order.offers.products.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="space-y-3">
              {TIMELINE_STEPS.map((step, i) => (
                <li key={step.key} className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                  <span className={i <= currentStepIndex ? 'font-medium' : 'text-muted-foreground'}>{step.label}</span>
                </li>
              ))}
            </ol>

            {order.tracking_code && (
              <div className="rounded-md bg-muted p-4 text-sm">
                <p>
                  <strong>Transportadora:</strong> {order.tracking?.carrier}
                </p>
                <p>
                  <strong>Código:</strong> {order.tracking_code}
                </p>
                {order.tracking_url && (
                  <a href={order.tracking_url} className="text-primary underline" target="_blank" rel="noreferrer">
                    Rastrear na transportadora
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
