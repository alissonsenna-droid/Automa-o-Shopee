// Tipos hand-written correspondentes às migrations em supabase/migrations.
// Se preferir, substitua por tipos gerados: `supabase gen types typescript`.

export type UserRole = 'admin' | 'operator';
export type SupplierPlatform = 'shopee' | 'supplier_direct' | 'manual' | 'api' | 'other';

export type PaymentStatus =
  | 'aguardando_pagamento'
  | 'pagamento_aprovado'
  | 'pagamento_recusado'
  | 'pagamento_cancelado'
  | 'pagamento_expirado';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'supplier_pending'
  | 'supplier_ordered'
  | 'supplier_shipped'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'problem';

export type SupplierOrderStatus = 'pending' | 'sent' | 'confirmed' | 'shipped' | 'cancelled' | 'problem';
export type PaymentProvider = 'appmax';
export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  price: number;
  compare_price: number | null;
  cost_price: number;
  images: string[];
  active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  name: string;
  slug: string;
  product_id: string;
  price: number;
  compare_price: number | null;
  shipping_price: number;
  discount: number;
  active: boolean;
  landing_page_url: string | null;
  checkout_enabled: boolean;
  tracking_enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LandingPage {
  id: string;
  name: string;
  url: string;
  offer_id: string;
  active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  id: string;
  offer_id: string;
  quantity: number;
  price_snapshot: number;
  shipping_snapshot: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  referrer: string | null;
  landing_page_url: string | null;
  order_id: string | null;
  expires_at: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  platform: SupplierPlatform;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierProductRow {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_sku: string | null;
  supplier_url: string | null;
  supplier_cost: number;
  stock: number;
  active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: string;
  customer_id: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  offer_id: string;
  customer_id: string;
  address_id: string | null;
  checkout_session_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  supplier_cost: number;
  gateway_fee: number;
  other_costs: number;
  profit: number;
  tracking_code: string | null;
  tracking_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  gclid: string | null;
  ttclid: string | null;
  referrer: string | null;
  landing_page_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  supplier_product_id: string | null;
  quantity: number;
  unit_price: number;
  supplier_cost: number;
  total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  provider: PaymentProvider;
  transaction_id: string | null;
  status: PaymentStatus;
  amount: number;
  payment_method: PaymentMethod | null;
  raw_response: Record<string, unknown> | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierOrder {
  id: string;
  order_id: string;
  supplier_id: string;
  status: SupplierOrderStatus;
  supplier_order_number: string | null;
  supplier_url: string | null;
  supplier_cost: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tracking {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  status: string | null;
  last_event: string | null;
  last_update: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
