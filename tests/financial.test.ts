import { describe, expect, it } from 'vitest';
import { calculateOrderProfit, calculateOfferProfit, calculateProductProfit } from '@/lib/financial';

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
