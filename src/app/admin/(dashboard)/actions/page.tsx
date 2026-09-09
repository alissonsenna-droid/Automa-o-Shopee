import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

/**
 * Fila de ações pendentes — uma das áreas mais importantes do painel:
 * tudo que precisa de uma decisão/ação humana agora.
 */
export default async function PendingActionsPage() {
  const supabase = createSupabaseAdminClient();

  const [{ data: paymentsPending }, { data: supplierPending }, { data: problems }, { data: shippedNoDelivery }] = await Promise.all([
    supabase.from('orders').select('id, order_number, created_at, total').eq('payment_status', 'aguardando_pagamento').order('created_at', { ascending: true }).limit(50),
    supabase.from('orders').select('id, order_number, created_at, total').eq('status', 'supplier_pending').order('created_at', { ascending: true }).limit(50),
    supabase.from('orders').select('id, order_number, created_at, notes').eq('status', 'problem').order('created_at', { ascending: true }).limit(50),
    supabase
      .from('orders')
      .select('id, order_number, created_at')
      .eq('status', 'supplier_shipped')
      .lt('created_at', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50),
  ]);

  const sections = [
    { title: 'Pagamentos pendentes', items: paymentsPending ?? [], variant: 'warning' as const },
    { title: 'Aguardando envio ao fornecedor', items: supplierPending ?? [], variant: 'default' as const },
    { title: 'Pedidos com problema', items: problems ?? [], variant: 'destructive' as const },
    { title: 'Enviados há mais de 15 dias sem entrega', items: shippedNoDelivery ?? [], variant: 'warning' as const },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ações pendentes</h1>
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {section.title}
              <Badge variant={section.variant}>{section.items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {section.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada por aqui. 🎉</p>
            ) : (
              <ul className="divide-y divide-border">
                {section.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/admin/orders/${item.id}`} className="text-primary hover:underline">
                      {item.order_number}
                    </Link>
                    <span className="text-muted-foreground">{new Date(item.created_at).toLocaleString('pt-BR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
