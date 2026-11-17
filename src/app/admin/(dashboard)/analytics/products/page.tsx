import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { calculateOfferProfit } from '@/lib/financial';
import { formatCentsToBRL, toCents } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdSpendCell } from './ad-spend-cell';

export const dynamic = 'force-dynamic';

function readAdSpend(metadata: Record<string, unknown>): number {
  return typeof metadata.ad_spend === 'number' ? metadata.ad_spend : 0;
}

/**
 * Visão específica para TESTE DE PRODUTOS: por oferta, mostra pedidos,
 * conversão aproximada (pedidos pagos / total), faturamento, custo e lucro.
 * CPA/ROI usam o gasto com tráfego informado manualmente por oferta
 * (metadata.ad_spend, editável na própria tabela).
 */
export default async function ProductTestingDashboard() {
  const supabase = createSupabaseAdminClient();

  const { data: offers } = await supabase.from('offers').select('*, products(name)');
  const { data: orders } = await supabase.from('orders').select('*');

  const rows = (offers ?? []).map((offer) => {
    const offerOrders = (orders ?? []).filter((o) => o.offer_id === offer.id);
    const paidOrders = offerOrders.filter((o) => o.status !== 'pending_payment' && o.status !== 'cancelled');
    const adSpend = readAdSpend(offer.metadata ?? {});
    const result = calculateOfferProfit({ orders: offerOrders, totalAdSpend: adSpend > 0 ? adSpend : undefined });
    const conversion = offerOrders.length > 0 ? paidOrders.length / offerOrders.length : 0;

    return {
      offer,
      adSpend,
      totalOrdersCount: offerOrders.length,
      conversion,
      ...result,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Teste de produtos</h1>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Oferta</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Conversão</TableHead>
                <TableHead>Faturamento</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead>Gasto c/ tráfego</TableHead>
                <TableHead>CPA</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.offer.id}>
                  <TableCell>{row.offer.products?.name}</TableCell>
                  <TableCell className="font-medium">{row.offer.name}</TableCell>
                  <TableCell>{row.totalOrdersCount}</TableCell>
                  <TableCell>{(row.conversion * 100).toFixed(0)}%</TableCell>
                  <TableCell>{formatCentsToBRL(toCents(row.revenue))}</TableCell>
                  <TableCell>{formatCentsToBRL(toCents(row.cost))}</TableCell>
                  <TableCell className={row.profit >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                    {formatCentsToBRL(toCents(row.profit))}
                  </TableCell>
                  <TableCell>{(row.margin * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <AdSpendCell offerId={row.offer.id} initialValue={row.adSpend} metadata={row.offer.metadata ?? {}} />
                  </TableCell>
                  <TableCell>{row.cpa != null ? formatCentsToBRL(toCents(row.cpa)) : '—'}</TableCell>
                  <TableCell className={row.roi != null && row.roi < 1 ? 'text-destructive' : ''}>
                    {row.roi != null ? `${(row.roi * 100).toFixed(0)}%` : '—'}
                  </TableCell>
                  <TableCell>{row.offer.active ? 'Ativa' : 'Pausada'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
