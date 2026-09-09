import type { SupplierProductRow } from '@/types/database';

export interface SupplierCandidate extends SupplierProductRow {
  supplierPriorityOverride?: number;
}

/**
 * Seleciona o melhor fornecedor para um produto considerando, nesta ordem:
 *   1. ativo
 *   2. estoque disponível (> 0)
 *   3. menor custo
 *   4. prioridade (maior prioridade primeiro, em empate de custo)
 *
 * O administrador sempre pode sobrepor manualmente a escolha ao criar a
 * supplier_order (ver /admin/orders/[id]).
 */
export function selectBestSupplier(candidates: SupplierProductRow[]): SupplierProductRow | null {
  const eligible = candidates.filter((c) => c.active && c.stock > 0);
  if (eligible.length === 0) return null;

  return [...eligible].sort((a, b) => {
    if (a.supplier_cost !== b.supplier_cost) return a.supplier_cost - b.supplier_cost;
    return b.priority - a.priority;
  })[0]!;
}
