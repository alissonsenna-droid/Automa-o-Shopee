import type { SupplierOrderInput, SupplierOrderResult, SupplierProvider, SupplierTrackingResult } from './types';

/**
 * ManualSupplierProvider: usado enquanto não houver uma API oficial e
 * autorizada do fornecedor. O sistema gera a "ordem de compra" internamente
 * (fica registrada em supplier_orders com status "pending") e é o operador
 * humano quem realiza a compra/contato com o fornecedor manualmente,
 * marcando a ordem como enviada/confirmada pelo painel admin depois.
 *
 * Isso vale inclusive para fornecedores cadastrados com platform="shopee":
 * nenhuma automação de login, scraping, bot de checkout ou contorno de
 * proteção é feita aqui — só criação de registro + ação manual.
 */
export class ManualSupplierProvider implements SupplierProvider {
  readonly key = 'manual';

  async getProduct() {
    return null; // sem catálogo integrado — dados vêm de supplier_products
  }

  async getStock(): Promise<number> {
    return 0; // estoque é controlado manualmente em supplier_products.stock
  }

  async getPrice(): Promise<number> {
    return 0; // preço é controlado manualmente em supplier_products.supplier_cost
  }

  async createOrder(input: SupplierOrderInput): Promise<SupplierOrderResult> {
    return {
      supplierOrderNumber: null,
      supplierUrl: null,
      status: 'pending',
      notes: `Ordem de compra manual gerada para o pedido ${input.orderNumber}. Realize a compra com o fornecedor e atualize o status pelo painel.`,
    };
  }

  async getOrderStatus(): Promise<string> {
    return 'pending';
  }

  async getTracking(): Promise<SupplierTrackingResult | null> {
    return null; // rastreamento é inserido manualmente pelo operador
  }
}
