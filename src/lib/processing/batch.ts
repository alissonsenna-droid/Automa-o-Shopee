import { selectBestSupplier } from '@/lib/suppliers/selection';
import type { SupplierProductRow } from '@/types/database';

export interface OrderItemToProcess {
  product_id: string;
  quantity: number;
}

export interface OrderToProcess {
  id: string;
  total: number;
  gateway_fee: number;
  other_costs: number;
  items: OrderItemToProcess[];
}

export type ProcessDecision =
  | { outcome: 'ready'; supplierId: string; supplierCost: number; margin: number }
  | { outcome: 'no_supplier'; reason: string }
  | { outcome: 'multi_supplier'; reason: string }
  | { outcome: 'low_margin'; margin: number; minMargin: number; supplierId: string; supplierCost: number }
  | { outcome: 'no_items'; reason: string };

/**
 * Decide se um pedido pago está pronto para virar uma supplier_order, e com
 * qual fornecedor — ou por que não (sem fornecedor, margem baixa, múltiplos
 * fornecedores necessários). Função pura e determinística de propósito (ver
 * seção 14 do prompt mestre: regras financeiras não dependem de LLM) —
 * nenhum pedido é aprovado automaticamente abaixo da margem mínima.
 */
export function decideOrderProcessing(
  order: OrderToProcess,
  candidatesByProduct: Record<string, SupplierProductRow[]>,
  minMargin: number,
): ProcessDecision {
  if (order.items.length === 0) {
    return { outcome: 'no_items', reason: 'Pedido sem itens — nada para processar.' };
  }

  const chosenSuppliers = new Set<string>();
  let totalSupplierCost = 0;

  for (const item of order.items) {
    const candidates = candidatesByProduct[item.product_id] ?? [];
    const best = selectBestSupplier(candidates);
    if (!best) {
      return { outcome: 'no_supplier', reason: `Nenhum fornecedor disponível para o produto ${item.product_id}.` };
    }
    chosenSuppliers.add(best.supplier_id);
    totalSupplierCost += best.supplier_cost * item.quantity;
  }

  if (chosenSuppliers.size > 1) {
    return {
      outcome: 'multi_supplier',
      reason: 'Itens deste pedido exigiriam mais de um fornecedor — ainda não suportado (um pedido = um fornecedor).',
    };
  }

  const supplierId = [...chosenSuppliers][0]!;
  const profit = order.total - totalSupplierCost - order.gateway_fee - order.other_costs;
  const margin = order.total > 0 ? profit / order.total : 0;

  if (margin < minMargin) {
    return { outcome: 'low_margin', margin, minMargin, supplierId, supplierCost: totalSupplierCost };
  }

  return { outcome: 'ready', supplierId, supplierCost: totalSupplierCost, margin };
}
