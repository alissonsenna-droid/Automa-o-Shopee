import { describe, expect, it } from 'vitest';
import { decideOrderProcessing, type OrderToProcess } from '@/lib/processing/batch';
import type { SupplierProductRow } from '@/types/database';

function makeRow(overrides: Partial<SupplierProductRow>): SupplierProductRow {
  return {
    id: overrides.id ?? 'row',
    supplier_id: overrides.supplier_id ?? 'supplier-a',
    product_id: overrides.product_id ?? 'product-a',
    supplier_sku: null,
    supplier_url: null,
    supplier_cost: 0,
    stock: 10,
    active: true,
    priority: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function makeOrder(overrides: Partial<OrderToProcess>): OrderToProcess {
  return {
    id: 'order-1',
    total: 100,
    gateway_fee: 0,
    other_costs: 0,
    items: [{ product_id: 'product-a', quantity: 1 }],
    ...overrides,
  };
}

describe('decideOrderProcessing', () => {
  it('fica pronto quando a margem é suficiente', () => {
    const decision = decideOrderProcessing(
      makeOrder({ total: 100 }),
      { 'product-a': [makeRow({ supplier_cost: 50 })] },
      0.1,
    );
    expect(decision.outcome).toBe('ready');
    if (decision.outcome === 'ready') {
      expect(decision.supplierId).toBe('supplier-a');
      expect(decision.margin).toBeCloseTo(0.5);
    }
  });

  it('bloqueia quando a margem fica abaixo do mínimo configurado', () => {
    const decision = decideOrderProcessing(
      makeOrder({ total: 100 }),
      { 'product-a': [makeRow({ supplier_cost: 95 })] },
      0.1,
    );
    expect(decision.outcome).toBe('low_margin');
  });

  it('reporta sem fornecedor quando nenhum candidato é elegível', () => {
    const decision = decideOrderProcessing(makeOrder({}), { 'product-a': [makeRow({ active: false })] }, 0.1);
    expect(decision.outcome).toBe('no_supplier');
  });

  it('considera taxa de gateway e outros custos no cálculo de margem', () => {
    const decision = decideOrderProcessing(
      makeOrder({ total: 100, gateway_fee: 5, other_costs: 5 }),
      { 'product-a': [makeRow({ supplier_cost: 50 })] },
      0.1,
    );
    expect(decision.outcome).toBe('ready');
    if (decision.outcome === 'ready') expect(decision.margin).toBeCloseTo(0.4);
  });

  it('bloqueia quando itens diferentes exigiriam fornecedores diferentes', () => {
    const decision = decideOrderProcessing(
      makeOrder({
        items: [
          { product_id: 'product-a', quantity: 1 },
          { product_id: 'product-b', quantity: 1 },
        ],
      }),
      {
        'product-a': [makeRow({ product_id: 'product-a', supplier_id: 'supplier-a', supplier_cost: 10 })],
        'product-b': [makeRow({ product_id: 'product-b', supplier_id: 'supplier-b', supplier_cost: 10 })],
      },
      0.1,
    );
    expect(decision.outcome).toBe('multi_supplier');
  });

  it('reporta sem itens quando o pedido não tem order_items', () => {
    const decision = decideOrderProcessing(makeOrder({ items: [] }), {}, 0.1);
    expect(decision.outcome).toBe('no_items');
  });
});
