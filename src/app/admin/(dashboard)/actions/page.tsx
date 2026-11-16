import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCentsToBRL, toCents } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type ActionItem = {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  notes: string | null;
  customers: { name: string } | null;
};

/**
 * Fila de ações pendentes — tudo que precisa de uma decisão/ação humana agora.
 * Cada card mostra cliente, valor e o botão da próxima ação (seção 6.4 do
 * prompt mestre), não só o número interno do pedido.
 */
export default async function PendingActionsPage() {
  const supabase = createSupabaseAdminClient();
  const selectCols = 'id, order_number, created_at, total, notes, customers(name)';

  const [{ data: paymentsPending }, { data: supplierPending }, { data: problems }, { data: shippedNoDelivery }] = await Promise.all([
    supabase.from('orders').select(selectCols).eq('payment_status', 'aguardando_pagamento').order('created_at', { ascending: true }).limit(50),
    supabase.from('orders').select(selectCols).eq('status', 'supplier_pending').order('created_at', { ascending: true }).limit(50),
    supabase.from('orders').select(selectCols).eq('status', 'problem').order('created_at', { ascending: true }).limit(50),
    supabase
      .from('orders')
      .select(selectCols)
      .eq('status', 'supplier_shipped')
      .lt('created_at', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50),
  ]);

  const sections = [
    {
      title: 'Pagamentos pendentes',
      items: (paymentsPending ?? []) as unknown as ActionItem[],
      variant: 'warning' as const,
      actionLabel: 'Verificar pagamento',
    },
    {
      title: 'Aguardando envio ao fornecedor',
      items: (supplierPending ?? []) as unknown as ActionItem[],
      variant: 'default' as const,
      actionLabel: 'Processar',
    },
    {
      title: 'Pedidos com problema',
      items: (problems ?? []) as unknown as ActionItem[],
      variant: 'destructive' as const,
      actionLabel: 'Ver alternativas',
    },
    {
      title: 'Enviados há mais de 15 dias sem entrega',
      items: (shippedNoDelivery ?? []) as unknown as ActionItem[],
      variant: 'warning' as const,
      actionLabel: 'Acompanhar',
    },
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
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/admin/orders/${item.id}`} className="font-medium text-primary hover:underline">
                        Pedido {item.order_number}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        Cliente: {item.customers?.name ?? 'não identificado'} · {new Date(item.created_at).toLocaleString('pt-BR')}
                        {item.notes ? ` · ${item.notes}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">{formatCentsToBRL(toCents(item.total))}</span>
                      <Link
                        href={`/admin/orders/${item.id}`}
                        className="h-8 rounded-md border border-border px-3 text-xs font-medium leading-8 hover:bg-muted"
                      >
                        {section.actionLabel}
                      </Link>
                    </div>
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
