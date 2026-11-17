import { describe, expect, it } from 'vitest';
import { calculateOrderProfit, calculateOfferProfit, calculateProductProfit, groupProfitByDay } from '@/lib/financial';

describe('calculateOrderProfit', () => {
  it('calcula lucro simples corretamente', () => {
    const result = calculateOrderProfit({ total: 150, supplier_cost: 60, gateway_fee: 5, other_costs: 0, discount: 0 });
    expect(result.profit).toBe(85);
    expect(result.margin).toBeCloseTo(85 / 150);
  });

  it('retorna margem 0 quando não há receita', () => {
    const result = calculateOrderProfit({ total: 0, supplier_cost: 0, gateway_fee: 0, other_costs: 0, discount: 0 });
    expect(result.margin).toBe(0);
  });

  it('permite lucro negativo (prejuízo)', () => {
    const result = calculateOrderProfit({ total: 100, supplier_cost: 90, gateway_fee: 20, other_costs: 0, discount: 0 });
    expect(result.profit).toBe(-10);
  });
});

describe('calculateOfferProfit / calculateProductProfit', () => {
  const orders = [
    { total: 100, supplier_cost: 40, gateway_fee: 5, other_costs: 0, discount: 0, status: 'paid' as const },
    { total: 100, supplier_cost: 40, gateway_fee: 5, other_costs: 0, discount: 0, status: 'delivered' as const },
    { total: 100, supplier_cost: 40, gateway_fee: 5, other_costs: 0, discount: 0, status: 'cancelled' as const },
  ];

  it('ignora pedidos cancelados na agregação', () => {
    const result = calculateOfferProfit({ orders });
    expect(result.ordersCount).toBe(2);
    expect(result.revenue).toBe(200);
    expect(result.profit).toBe(110);
  });

  it('calcula CPA e ROI quando ad spend é informado', () => {
    const result = calculateProductProfit({ orders, totalAdSpend: 55 });
    expect(result.cpa).toBeCloseTo(55 / 2);
    expect(result.roi).toBeCloseTo(110 / 55);
  });

  it('CPA/ROI ficam null sem ad spend informado', () => {
    const result = calculateOfferProfit({ orders });
    expect(result.cpa).toBeNull();
    expect(result.roi).toBeNull();
  });
});

describe('groupProfitByDay', () => {
  const day1Order1 = { total: 100, supplier_cost: 40, gateway_fee: 5, other_costs: 0, discount: 0, status: 'paid' as const, created_at: '2026-11-01T10:00:00Z' };
  const day1Order2 = { total: 50, supplier_cost: 20, gateway_fee: 2, other_costs: 0, discount: 0, status: 'delivered' as const, created_at: '2026-11-01T18:00:00Z' };
  const day2Order1 = { total: 200, supplier_cost: 80, gateway_fee: 10, other_costs: 0, discount: 0, status: 'paid' as const, created_at: '2026-11-02T09:00:00Z' };
  const day2Cancelled = { total: 999, supplier_cost: 0, gateway_fee: 0, other_costs: 0, discount: 0, status: 'cancelled' as const, created_at: '2026-11-02T09:00:00Z' };
  const orders = [day1Order1, day1Order2, day2Order1, day2Cancelled];

  it('agrupa por dia, soma receita/custo/lucro e ignora cancelados', () => {
    const rows = groupProfitByDay(orders);
    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({ date: '2026-11-01', ordersCount: 2, revenue: 150, cost: 67, profit: 83 });
    expect(rows[1]).toMatchObject({ date: '2026-11-02', ordersCount: 1, revenue: 200, cost: 90, profit: 110 });
  });

  it('ordena por data crescente', () => {
    const shuffled = [day2Order1, day1Order1, day1Order2];
    const rows = groupProfitByDay(shuffled);
    expect(rows.map((r) => r.date)).toEqual(['2026-11-01', '2026-11-02']);
  });

  it('retorna lista vazia sem pedidos', () => {
    expect(groupProfitByDay([])).toEqual([]);
  });
});
