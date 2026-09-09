export interface SupplierOrderInput {
  orderNumber: string;
  items: Array<{ supplierSku: string | null; name: string; quantity: number; unitCost: number }>;
  customer: { name: string; phone: string; email: string };
  address: {
    cep: string;
    street: string;
    number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface SupplierOrderResult {
  supplierOrderNumber: string | null;
  supplierUrl: string | null;
  status: 'pending' | 'sent' | 'confirmed';
  notes?: string;
}

export interface SupplierTrackingResult {
  carrier: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  status: string | null;
}

/**
 * Interface que qualquer integração de fornecedor deve implementar.
 * Isso permite trocar/adicionar fornecedores sem alterar o restante do
 * sistema (checkout, pedidos, financeiro).
 */
export interface SupplierProvider {
  readonly key: string;
  getProduct(supplierSku: string): Promise<{ name: string; cost: number } | null>;
  getStock(supplierSku: string): Promise<number>;
  getPrice(supplierSku: string): Promise<number>;
  createOrder(input: SupplierOrderInput): Promise<SupplierOrderResult>;
  getOrderStatus(supplierOrderNumber: string): Promise<string>;
  getTracking(supplierOrderNumber: string): Promise<SupplierTrackingResult | null>;
}
