'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import { MARKETPLACES } from '@/lib/validations/fulfillment';
import type { FulfillmentOrder, SupplierOrderStatus } from '@/types/database';

const MARKETPLACE_LABEL: Record<string, string> = {
  mercado_livre: 'Mercado Livre',
  shopee: 'Shopee',
  tiktok_shop: 'TikTok Shop',
  outro: 'Outro',
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

const emptyForm = {
  source: 'cartipanda',
  external_order_id: '',
  marketplace: 'mercado_livre',
  product_description: '',
  product_url: '',
  quantity: '1',
  sale_price: '',
  customer_name: '',
  customer_cpf: '',
  customer_phone: '',
  customer_email: '',
  address_cep: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
};

function customerDataText(row: FulfillmentOrder) {
  return [
    `Nome: ${row.customer_name}`,
    row.customer_cpf && `CPF: ${row.customer_cpf}`,
    row.customer_phone && `Telefone: ${row.customer_phone}`,
    row.customer_email && `E-mail: ${row.customer_email}`,
    '',
    `Endereço: ${row.address_street ?? ''}, ${row.address_number ?? ''} ${row.address_complement ?? ''}`.trim(),
    `Bairro: ${row.address_neighborhood ?? ''}`,
    `Cidade/UF: ${row.address_city ?? ''}/${row.address_state ?? ''}`,
    `CEP: ${row.address_cep ?? ''}`,
    '',
    `Produto: ${row.product_description}`,
    row.product_url && `Link: ${row.product_url}`,
    `Quantidade: ${row.quantity}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export default function AutomacaoPage() {
  const [rows, setRows] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SupplierOrderStatus | 'all'>('pending');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [buyDraft, setBuyDraft] = useState<Record<string, { cost: string; orderNumber: string }>>({});
  const [problemDraft, setProblemDraft] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const qs = statusFilter === 'all' ? '' : `?status=${statusFilter}`;
    const res = await fetch(`/api/fulfillment-orders${qs}`);
    const data = await res.json();
    setRows(data.fulfillment_orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function createOrder() {
    setSaving(true);
    setFormError(null);
    const res = await fetch('/api/fulfillment-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setFormError(data.error ?? 'Não foi possível salvar.');
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  }

  async function copyData(row: FulfillmentOrder) {
    try {
      await navigator.clipboard.writeText(customerDataText(row));
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 2000);
    } catch {
      // clipboard pode falhar em contexto não seguro (http) — sem efeito colateral grave
    }
  }

  async function markAsBought(id: string) {
    const draft = buyDraft[id];
    setActingId(id);
    await fetch(`/api/fulfillment-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'sent',
        supplier_cost: draft?.cost ? Number(draft.cost) : undefined,
        purchase_order_number: draft?.orderNumber || undefined,
      }),
    });
    setActingId(null);
    load();
  }

  async function reportProblem(id: string) {
    const reason = problemDraft[id]?.trim();
    if (!reason) return;
    setActingId(id);
    await fetch(`/api/fulfillment-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'problem', notes: reason }),
    });
    setActingId(null);
    setProblemDraft((d) => ({ ...d, [id]: '' }));
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Painel de Automação</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Fila de compras a fazer nos marketplaces (Mercado Livre, Shopee, TikTok Shop) pra cumprir pedidos pagos
            fora deste sistema (ex: Cartipanda). Cadastre o pedido aqui, use &quot;Copiar dados&quot; pra colar
            direto no checkout do marketplace, e marque como comprado depois de pagar lá.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Cancelar' : '+ Novo pedido'}</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Novo pedido de automação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Marketplace</Label>
              <select
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                value={form.marketplace}
                onChange={(e) => setForm((f) => ({ ...f, marketplace: e.target.value }))}
              >
                {MARKETPLACES.map((m) => (
                  <option key={m} value={m}>
                    {MARKETPLACE_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>ID do pedido na Cartipanda (opcional)</Label>
              <Input value={form.external_order_id} onChange={(e) => setForm((f) => ({ ...f, external_order_id: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Produto a comprar</Label>
              <Input
                value={form.product_description}
                onChange={(e) => setForm((f) => ({ ...f, product_description: e.target.value }))}
                placeholder="Ex: Fone Bluetooth JBL Tune 510BT preto"
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Link do produto no marketplace (opcional)</Label>
              <Input value={form.product_url} onChange={(e) => setForm((f) => ({ ...f, product_url: e.target.value }))} />
            </div>
            <div>
              <Label>Quantidade</Label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div>
              <Label>Valor pago pelo cliente (R$)</Label>
              <Input value={form.sale_price} onChange={(e) => setForm((f) => ({ ...f, sale_price: e.target.value }))} placeholder="0,00" />
            </div>

            <div className="sm:col-span-2 border-t border-border pt-4 text-sm font-medium text-foreground">Dados do cliente (pra preencher no checkout do marketplace)</div>
            <div>
              <Label>Nome completo</Label>
              <Input value={form.customer_name} onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={form.customer_cpf} onChange={(e) => setForm((f) => ({ ...f, customer_cpf: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.customer_email} onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))} />
            </div>
            <div>
              <Label>CEP</Label>
              <Input value={form.address_cep} onChange={(e) => setForm((f) => ({ ...f, address_cep: e.target.value }))} />
            </div>
            <div>
              <Label>Rua</Label>
              <Input value={form.address_street} onChange={(e) => setForm((f) => ({ ...f, address_street: e.target.value }))} />
            </div>
            <div>
              <Label>Número</Label>
              <Input value={form.address_number} onChange={(e) => setForm((f) => ({ ...f, address_number: e.target.value }))} />
            </div>
            <div>
              <Label>Complemento</Label>
              <Input value={form.address_complement} onChange={(e) => setForm((f) => ({ ...f, address_complement: e.target.value }))} />
            </div>
            <div>
              <Label>Bairro</Label>
              <Input value={form.address_neighborhood} onChange={(e) => setForm((f) => ({ ...f, address_neighborhood: e.target.value }))} />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.address_city} onChange={(e) => setForm((f) => ({ ...f, address_city: e.target.value }))} />
            </div>
            <div>
              <Label>UF</Label>
              <Input value={form.address_state} maxLength={2} onChange={(e) => setForm((f) => ({ ...f, address_state: e.target.value }))} />
            </div>

            {formError && <p className="sm:col-span-2 text-sm text-destructive">{formError}</p>}
            <div className="sm:col-span-2">
              <Button onClick={createOrder} disabled={saving || !form.customer_name || !form.product_description}>
                {saving ? 'Salvando...' : 'Salvar pedido'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        {(['pending', 'sent', 'problem', 'all'] as const).map((s) => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{loading ? 'Carregando...' : `${rows.length} pedido(s)`}</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nada aqui. 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
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
                      <div className="font-medium">{row.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{row.address_city ?? '—'}/{row.address_state ?? ''}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="line-clamp-2 text-sm">{row.product_description}</div>
                      {row.product_url && (
                        <a href={row.product_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                          Abrir no marketplace
                        </a>
                      )}
                    </TableCell>
                    <TableCell>{MARKETPLACE_LABEL[row.marketplace] ?? row.marketplace}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(row.sale_price))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 min-w-[220px]">
                        {row.marketplace === 'mercado_livre' && row.product_url && (
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={() => window.open(`${row.product_url}#fazzo_so=${row.id}`, '_blank', 'noopener')}
                          >
                            Abrir com dados preenchidos
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => copyData(row)}>
                          {copiedId === row.id ? 'Copiado!' : 'Copiar dados do cliente'}
                        </Button>
                        {row.status === 'pending' && (
                          <>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Custo pago (R$)"
                                className="h-8 text-xs"
                                value={buyDraft[row.id]?.cost ?? ''}
                                onChange={(e) => setBuyDraft((d) => ({ ...d, [row.id]: { ...d[row.id], cost: e.target.value, orderNumber: d[row.id]?.orderNumber ?? '' } }))}
                              />
                              <Input
                                placeholder="Nº do pedido"
                                className="h-8 text-xs"
                                value={buyDraft[row.id]?.orderNumber ?? ''}
                                onChange={(e) => setBuyDraft((d) => ({ ...d, [row.id]: { ...d[row.id], orderNumber: e.target.value, cost: d[row.id]?.cost ?? '' } }))}
                              />
                            </div>
                            <Button size="sm" onClick={() => markAsBought(row.id)} disabled={actingId === row.id}>
                              Já comprei / paguei
                            </Button>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Motivo do problema..."
                                className="h-8 text-xs"
                                value={problemDraft[row.id] ?? ''}
                                onChange={(e) => setProblemDraft((d) => ({ ...d, [row.id]: e.target.value }))}
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
                          </>
                        )}
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
