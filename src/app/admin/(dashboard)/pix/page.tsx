'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import type { SupplierOrder, SupplierPlatform, SupplierOrderStatus } from '@/types/database';

const PLATFORM_LABEL: Record<SupplierPlatform, string> = {
  shopee: 'Shopee',
  supplier_direct: 'Direto com fornecedor',
  manual: 'Manual',
  api: 'API',
  other: 'Outro',
};

const STATUS_VARIANT: Record<SupplierOrderStatus, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  pending: 'warning',
  sent: 'default',
  confirmed: 'success',
  shipped: 'success',
  cancelled: 'muted',
  problem: 'destructive',
};

const STATUS_LABEL: Record<SupplierOrderStatus, string> = {
  pending: 'Aguardando compra',
  sent: 'Comprado — aguardando confirmação',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
  problem: 'Problema',
};

type Row = SupplierOrder & {
  suppliers: { name: string; platform: SupplierPlatform } | null;
  orders: { order_number: string; total: number } | null;
};

export default function PixCentralPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [problemDraft, setProblemDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch('/api/supplier-orders?status=pending');
    const data = await res.json();
    setRows(data.supplier_orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAsBought(id: string) {
    setActingId(id);
    await fetch(`/api/supplier-orders/${id}/confirm-purchase`, { method: 'POST' });
    setActingId(null);
    load();
  }

  async function reportProblem(id: string) {
    const reason = problemDraft[id]?.trim();
    if (!reason) return;
    setActingId(id);
    await fetch(`/api/supplier-orders/${id}/problem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    setActingId(null);
    setProblemDraft((d) => ({ ...d, [id]: '' }));
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Central de pagamentos a fornecedores</h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Reúne todas as compras que precisam ser feitas manualmente nos fornecedores (Mercado Livre, Shopee etc.) fora
        deste sistema. <strong>Este projeto não gera Pix real</strong> — não há integração com API de checkout dos
        marketplaces ainda, então o pagamento em si continua sendo feito por você, no site do fornecedor. Depois de
        pagar lá, marque como comprado aqui.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{loading ? 'Carregando...' : `${rows.length} aguardando compra`}</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nada pendente. 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${row.order_id}`} className="font-medium text-primary hover:underline">
                        {row.orders?.order_number ?? row.order_id}
                      </Link>
                    </TableCell>
                    <TableCell>{row.suppliers?.name ?? '—'}</TableCell>
                    <TableCell>{row.suppliers ? PLATFORM_LABEL[row.suppliers.platform] : '—'}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(row.supplier_cost))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => markAsBought(row.id)} disabled={actingId === row.id}>
                          Já comprei / paguei
                        </Button>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Motivo do problema..."
                            value={problemDraft[row.id] ?? ''}
                            onChange={(e) => setProblemDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reportProblem(row.id)}
                            disabled={actingId === row.id || !problemDraft[row.id]?.trim()}
                          >
                            Reportar
                          </Button>
                        </div>
                      </div>
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
