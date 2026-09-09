import type { SupplierProvider } from './types';

/**
 * ShopeeOfficialProvider — PLACEHOLDER.
 *
 * A Shopee não oferece hoje uma API pública destinada a terceiros comprarem
 * produtos em nome de outra loja (o Shopee Open Platform é voltado a
 * VENDEDORES gerenciando a própria loja Shopee). Os Termos de Serviço da
 * Shopee proíbem explicitamente automação de compra e uso do site "para
 * fins de revenda comercial" — por isso este provider NÃO deve conter bot
 * de navegador, automação de login, scraping, bypass de CAPTCHA ou qualquer
 * automação de checkout não autorizada.
 *
 * Ele existe apenas como ponto de extensão: se um dia existir uma API
 * oficial e autorizada aplicável ao seu caso de uso, implemente-a aqui
 * seguindo a interface SupplierProvider. Até lá, fornecedores com
 * platform="shopee" usam o ManualSupplierProvider normalmente.
 */
export class ShopeeOfficialProvider implements SupplierProvider {
  readonly key = 'shopee_official';

  private notImplemented(): never {
    throw new Error(
      'ShopeeOfficialProvider não está implementado: não há API oficial autorizada configurada. ' +
        'Use ManualSupplierProvider para fornecedores Shopee.',
    );
  }

  async getProduct(): Promise<{ name: string; cost: number } | null> {
    this.notImplemented();
  }
  async getStock(): Promise<number> {
    this.notImplemented();
  }
  async getPrice(): Promise<number> {
    this.notImplemented();
  }
  async createOrder(): ReturnType<SupplierProvider['createOrder']> {
    this.notImplemented();
  }
  async getOrderStatus(): Promise<string> {
    this.notImplemented();
  }
  async getTracking(): ReturnType<SupplierProvider['getTracking']> {
    this.notImplemented();
  }
}

/**
 * SupplierApiProvider / CustomApiProvider — PLACEHOLDER genérico para
 * fornecedores nacionais de dropshipping que já oferecem API própria de
 * fulfillment (ex: plataformas B2B de dropshipping nacional). Implemente
 * as chamadas HTTP reais quando tiver credenciais de um fornecedor
 * específico — a interface SupplierProvider já está pronta para receber.
 */
export class SupplierApiProvider implements SupplierProvider {
  readonly key: string = 'supplier_api';

  constructor(private readonly config: { baseUrl: string; apiKey: string }) {}

  private notImplemented(): never {
    throw new Error(`SupplierApiProvider (${this.config.baseUrl}) ainda não implementado.`);
  }

  async getProduct(): Promise<{ name: string; cost: number } | null> {
    this.notImplemented();
  }
  async getStock(): Promise<number> {
    this.notImplemented();
  }
  async getPrice(): Promise<number> {
    this.notImplemented();
  }
  async createOrder(): ReturnType<SupplierProvider['createOrder']> {
    this.notImplemented();
  }
  async getOrderStatus(): Promise<string> {
    this.notImplemented();
  }
  async getTracking(): ReturnType<SupplierProvider['getTracking']> {
    this.notImplemented();
  }
}

export class CustomApiProvider extends SupplierApiProvider {
  readonly key = 'custom_api';
}
