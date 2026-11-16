'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const OUTCOME_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'muted' }> = {
  ready: { label: 'Fornecedor selecionado', variant: 'success' },
  low_margin: { label: 'Margem baixa — bloqueado', variant: 'destructive' },
  no_supplier: { label: 'Sem fornecedor disponível', variant: 'destructive' },
  multi_supplier: { label: 'Precisa de mais de 1 fornecedor', variant: 'warning' },
  no_items: { label: 'Pedido sem itens', variant: 'muted' },
  already_processed: { label: 'Já processado', variant: 'muted' },
};

type ResultRow = { order_id: string; order_number: string; outcome: string; detail?: string };

export default function ProcessOrdersPage() {
  const [eligibleCount, setEligibleCount] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastRun, setLastRun] = useState<{ results: ResultRow[]; min_margin_percent: number } | null>(null);

  async function loadCount() {
    const res = await fetch('/api/orders/process');
    const data = await res.json();
    setEligibleCount(data.eligible_count ?? 0);
  }

  useEffect(() => {
    loadCount();
  }, []);

  async function processBatch() {
    setProcessing(true);
    const res = await fetch('/api/orders/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 20 }),
    });
    const data = await res.json();
    setLastRun(data);
    setProcessing(false);
    loadCount();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Processar pedidos</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Pega os pedidos pagos que ainda não têm fornecedor escolhido, seleciona automaticamente o melhor fornecedor
        disponível (menor custo, com estoque) e só segue adiante se a margem mínima configurada em Configurações for
        respeitada. Pedidos sem fornecedor ou com margem baixa viram &quot;Pedido com problema&quot; em vez de serem
        aprovados sozinhos. Nenhuma compra é feita aqui — isso continua manual, pelo botão &quot;Enviar ao
        fornecedor&quot; em cada pedido.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {eligibleCount === null ? 'Carregando...' : `${eligibleCount} pedido(s) pago(s) aguardando processamento`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={processBatch} disabled={processing || eligibleCount === 0}>
            {processing ? 'Processando...' : 'PROCESSAR PEDIDOS'}
          </Button>
        </CardContent>
      </Card>

      {lastRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Resultado do lote · margem mínima usada: {lastRun.min_margin_percent.toFixed(1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastRun.results.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido elegível neste lote.</p>
            ) : (
              <ul className="divide-y divide-border">
                {lastRun.results.map((r) => {
                  const meta = OUTCOME_LABEL[r.outcome] ?? { label: r.outcome, variant: 'muted' as const };
                  return (
                    <li key={r.order_id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <Link href={`/admin/orders/${r.order_id}`} className="font-medium text-primary hover:underline">
                        Pedido {r.order_number}
                      </Link>
                      <div className="flex items-center gap-2">
                        {r.detail && <span className="text-xs text-muted-foreground">{r.detail}</span>}
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
