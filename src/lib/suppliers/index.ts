import type { Supplier } from '@/types/database';
import type { SupplierProvider } from './types';
import { ManualSupplierProvider } from './manual-provider';
import { ShopeeOfficialProvider, SupplierApiProvider } from './official-providers';

export * from './types';
export * from './manual-provider';
export * from './official-providers';
export * from './selection';

const manual = new ManualSupplierProvider();

/**
 * Resolve qual SupplierProvider usar para um fornecedor cadastrado.
 * Hoje todo mundo cai em ManualSupplierProvider — os outros branches ficam
 * prontos para quando houver integração real configurada.
 */
export function getSupplierProvider(supplier: Pick<Supplier, 'platform'>): SupplierProvider {
  switch (supplier.platform) {
    case 'shopee':
      return manual; // ver comentário em ShopeeOfficialProvider: sem API oficial disponível
    case 'api':
      return manual; // troque por new SupplierApiProvider({...}) quando configurar credenciais
    case 'supplier_direct':
    case 'manual':
    case 'other':
    default:
      return manual;
  }
}

// Mantido para referência/typecheck dos placeholders (não usado por padrão).
void ShopeeOfficialProvider;
void SupplierApiProvider;
