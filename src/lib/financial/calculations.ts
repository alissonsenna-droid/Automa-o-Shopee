import type { Order } from '@/types/database';

export interface ProfitBreakdown {
  revenue: number;
  supplierCost: number;
  gatewayFee: number;
  otherCosts: number;
  discount: number;
  profit: number;
  margin: number; // profit / revenue, 0 quando revenue = 0
}

/**
 * Única fonte de verdade para o cálculo de lucro de um pedido:
 *   lucro = total - custo_fornecedor - taxa_gateway - outros_custos
 * (o desconto já está embutido em `total`, mas é reportado separadamente
 * para o breakdown mostrado no painel).
 *
 * Espelha exatamente a trigger SQL `recalc_order_profit` — se mudar a
 * fórmula aqui, replique em supabase/migrations/006_functions_triggers.sql.
 */
export function calculateOrderProfit(
  order: Pick<Order, 'total' | 'supplier_cost' | 'gateway_fee' | 'other_costs' | 'discount'>,
): ProfitBreakdown {
  const revenue = order.total ?? 0;
  const supplierCost = order.supplier_cost ?? 0;
  const gatewayFee = order.gateway_fee ?? 0;
  const otherCosts = order.other_costs ?? 0;
  const profit = revenue - supplierCost - gatewayFee - otherCosts;

  return {
    revenue,
    supplierCost,
    gatewayFee,
    otherCosts,
    discount: order.discount ?? 0,
    profit,
    margin: revenue > 0 ? profit / revenue : 0,
  };
}

export interface AggregateProfitInput {
  orders: Array<Pick<Order, 'total' | 'supplier_cost' | 'gateway_fee' | 'other_costs' | 'discount' | 'status'>>;
  /** CPA (custo de aquisição) total gasto em tráfego no período, informado manualmente. */
  totalAdSpend?: number;
}

export interface AggregateProfitResult {
  ordersCount: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  averageTicket: number;
  cpa: number | null;
  roi: number | null;
}

function aggregate(orders: AggregateProfitInput['orders'], totalAdSpend?: number): AggregateProfitResult {
  const relevant = orders.filter((o) => o.status !== 'cancelled');
  const totals = relevant.reduce(
    (acc, order) => {
      const b = calculateOrderProfit(order);
      acc.revenue += b.revenue;
      acc.cost += b.supplierCost + b.gatewayFee + b.otherCosts;
      acc.profit += b.profit;
      return acc;
    },
    { revenue: 0, cost: 0, profit: 0 },
  );

  const ordersCount = relevant.length;
  const cpa = totalAdSpend != null && ordersCount > 0 ? totalAdSpend / ordersCount : null;
  const roi = totalAdSpend != null && totalAdSpend > 0 ? totals.profit / totalAdSpend : null;

  return {
    ordersCount,
    revenue: totals.revenue,
    cost: totals.cost,
    profit: totals.profit,
    margin: totals.revenue > 0 ? totals.profit / totals.revenue : 0,
    averageTicket: ordersCount > 0 ? totals.revenue / ordersCount : 0,
    cpa,
    roi,
  };
}

/** Agrega lucro/ROI/CPA de todos os pedidos de uma oferta específica. */
export function calculateOfferProfit(input: AggregateProfitInput): AggregateProfitResult {
  return aggregate(input.orders, input.totalAdSpend);
}

/** Agrega lucro/ROI/CPA de todos os pedidos de um produto (via suas ofertas). */
export function calculateProductProfit(input: AggregateProfitInput): AggregateProfitResult {
  return aggregate(input.orders, input.totalAdSpend);
}
