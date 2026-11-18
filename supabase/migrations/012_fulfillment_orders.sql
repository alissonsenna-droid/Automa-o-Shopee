-- Painel de automação de compra a fornecedor para pedidos pagos FORA deste
-- sistema (ex: Cartipanda) — diferente de `orders`/`supplier_orders`, que são
-- do checkout interno (Appmax) e exigem offer_id/customer_id daqui.
-- `fulfillment_orders` guarda tudo que é preciso pra comprar o produto no
-- marketplace (Mercado Livre, Shopee, TikTok Shop) em nome do cliente final,
-- sem depender do catálogo/clientes internos.

create table fulfillment_orders (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'cartipanda',
  external_order_id text,
  marketplace text not null,
  product_description text not null,
  product_url text,
  quantity integer not null default 1,
  sale_price numeric(12, 2) not null default 0,
  supplier_cost numeric(12, 2),
  customer_name text not null,
  customer_cpf text,
  customer_phone text,
  customer_email text,
  address_cep text,
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  status supplier_order_status not null default 'pending',
  purchase_order_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fulfillment_orders_status_idx on fulfillment_orders (status);
create index fulfillment_orders_marketplace_idx on fulfillment_orders (marketplace);
create unique index fulfillment_orders_source_external_idx on fulfillment_orders (source, external_order_id) where external_order_id is not null;

create trigger set_updated_at before update on fulfillment_orders for each row execute function set_updated_at();

alter table fulfillment_orders enable row level security;
create policy "fulfillment_orders_staff_select" on fulfillment_orders for select using (is_staff());
create policy "fulfillment_orders_staff_write" on fulfillment_orders for insert with check (is_staff());
create policy "fulfillment_orders_staff_update" on fulfillment_orders for update using (is_staff());
create policy "fulfillment_orders_admin_delete" on fulfillment_orders for delete using (is_admin());
