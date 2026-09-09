import { describe, expect, it } from 'vitest';
import { selectBestSupplier } from '@/lib/suppliers/selection';
import type { SupplierProductRow } from '@/types/database';

function makeRow(overrides: Partial<SupplierProductRow>): SupplierProductRow {
  return {
    id: overrides.id ?? 'row',
    supplier_id: overrides.supplier_id ?? 'supplier',
    product_id: 'product',
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

describe('selectBestSupplier', () => {
  it('ignora fornecedores inativos', () => {
    const best = selectBestSupplier([makeRow({ id: 'a', active: false, supplier_cost: 10 }), makeRow({ id: 'b', supplier_cost: 20 })]);
    expect(best?.id).toBe('b');
  });

  it('ignora fornecedores sem estoque', () => {
    const best = selectBestSupplier([makeRow({ id: 'a', stock: 0, supplier_cost: 10 }), makeRow({ id: 'b', supplier_cost: 20 })]);
    expect(best?.id).toBe('b');
  });

  it('escolhe o menor custo entre os elegíveis', () => {
    const best = selectBestSupplier([makeRow({ id: 'a', supplier_cost: 30 }), makeRow({ id: 'b', supplier_cost: 20 })]);
    expect(best?.id).toBe('b');
  });

  it('em empate de custo, escolhe maior prioridade', () => {
    const best = selectBestSupplier([
      makeRow({ id: 'a', supplier_cost: 20, priority: 1 }),
      makeRow({ id: 'b', supplier_cost: 20, priority: 5 }),
    ]);
    expect(best?.id).toBe('b');
  });

  it('retorna null quando nenhum fornecedor é elegível', () => {
    const best = selectBestSupplier([makeRow({ active: false }), makeRow({ stock: 0 })]);
    expect(best).toBeNull();
  });
});
