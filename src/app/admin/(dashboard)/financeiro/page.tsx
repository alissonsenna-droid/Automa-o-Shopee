import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculatePeriodProfit, groupProfitByDay } from '@/lib/financial';
import { formatCentsToBRL, toCents, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

type Preset = 'today' | '7d' | '30d' | 'month' | 'custom';

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'custom', label: 'Personalizado' },
];

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolveRange(preset: Preset, fromParam?: string, toParam?: string): { from: Date; to: Date } {
  const now = new Date();

  if (preset === 'custom' && fromParam && toParam) {
    return { from: new Date(`${fromParam}T00:00:00`), to: new Date(`${toParam}T23:59:59.999`) };
  }

  const to = now;
  const from = new Date(now);
  if (preset === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (preset === '7d') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (preset === 'month') {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const preset = (PRESETS.some((p) => p.key === sp.period) ? sp.period : '30d') as Preset;
  const { from, to } = resolveRange(preset, sp.from, sp.to);

  const supabase = createSupabaseAdminClient();

  const [{ data: orders }, { data: payableOrders }] = await Promise.all([
    supabase.from('orders').select('*').gte('created_at', from.toISOString()).lte('created_at', to.toISOString()),
    supabase.from('supplier_orders').select('supplier_cost').in('status', ['pending', 'sent']),
  ]);

  const result = calculatePeriodProfit({ orders: orders ?? [] });
  const dailyRows = [...groupProfitByDay(orders ?? [])].reverse();
  const payable = (payableOrders ?? []).reduce((sum, o) => sum + o.supplier_cost, 0);

  const cards = [
    { label: 'Faturamento', value: formatCentsToBRL(toCents(result.revenue)) },
    { label: 'Custo (fornecedor + gateway + outros)', value: formatCentsToBRL(toCents(result.cost)) },
    { label: 'Lucro', value: formatCentsToBRL(toCents(result.profit)) },
    { label: 'Margem', value: `${(result.margin * 100).toFixed(1)}%` },
    { label: 'Ticket médio', value: formatCentsToBRL(toCents(result.averageTicket)) },
    { label: 'Pedidos (exceto cancelados)', value: String(result.ordersCount) },
  ];

  const presetHref = (key: Preset) => `/admin/financeiro?period=${key}`;
  const exportHref = `/api/financeiro/export?from=${toDateInputValue(from)}&to=${toDateInputValue(to)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <a href={exportHref} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
          Exportar CSV
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={presetHref(p.key)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              preset === p.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {preset === 'custom' && (
        <form className="flex flex-wrap items-end gap-3" action="/admin/financeiro" method="get">
          <input type="hidden" name="period" value="custom" />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            De
            <input
              type="date"
              name="from"
              defaultValue={sp.from ?? toDateInputValue(from)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Até
            <input
              type="date"
              name="to"
              defaultValue={sp.to ?? toDateInputValue(to)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Aplicar
          </button>
        </form>
      )}

      <p className="text-sm text-muted-foreground">
        Período: {from.toLocaleDateString('pt-BR')} até {to.toLocaleDateString('pt-BR')}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas a pagar a fornecedores (saldo atual)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold text-destructive">{formatCentsToBRL(toCents(payable))}</p>
            <p className="text-xs text-muted-foreground">
              Compras aguardando ou já enviadas ao fornecedor, ainda não confirmadas como pagas. Não depende do
              período selecionado acima — é o saldo pendente agora.
            </p>
          </div>
          <Link href="/admin/pix" className="text-sm font-medium text-primary hover:underline">
            Ver central de pagamentos →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lucro por dia</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum pedido no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedidos</TableHead>
                  <TableHead>Faturamento</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Lucro</TableHead>
                  <TableHead>Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyRows.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{new Date(`${row.date}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{row.ordersCount}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(row.revenue))}</TableCell>
                    <TableCell>{formatCentsToBRL(toCents(row.cost))}</TableCell>
                    <TableCell className={row.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                      {formatCentsToBRL(toCents(row.profit))}
                    </TableCell>
                    <TableCell>{(row.margin * 100).toFixed(0)}%</TableCell>
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
