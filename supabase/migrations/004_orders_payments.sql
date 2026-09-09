create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  offer_id uuid not null references offers (id) on delete restrict,
  customer_id uuid not null references customers (id) on delete restrict,
  address_id uuid references addresses (id) on delete set null,
  checkout_session_id uuid references checkout_sessions (id) on delete set null,
  status order_status not null default 'pending_payment',
  payment_status payment_status not null default 'aguardando_pagamento',
  subtotal numeric(12, 2) not null default 0,
  shipping numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  supplier_cost numeric(12, 2) not null default 0,
  gateway_fee numeric(12, 2) not null default 0,
  other_costs numeric(12, 2) not null default 0,
  profit numeric(12, 2) not null default 0,
  tracking_code text,
  tracking_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  gclid text,
  ttclid text,
  referrer text,
  landing_page_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_offer_id_idx on orders (offer_id);
create index orders_customer_id_idx on orders (customer_id);
create index orders_status_idx on orders (status);
create index orders_payment_status_idx on orders (payment_status);
create index orders_created_at_idx on orders (created_at desc);
create index orders_utm_campaign_idx on orders (utm_campaign);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  supplier_product_id uuid references supplier_products (id) on delete set null,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null,
  supplier_cost numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  created_at timestamptz not null default now()
);
create index order_items_order_id_idx on order_items (order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  provider payment_provider not null default 'appmax',
  transaction_id text,
  status payment_status not null default 'aguardando_pagamento',
  amount numeric(12, 2) not null,
  payment_method payment_method,
  raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_id_idx on payments (order_id);
create unique index payments_provider_transaction_idx on payments (provider, transaction_id) where transaction_id is not null;

create table supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  supplier_id uuid not null references suppliers (id) on delete restrict,
  status supplier_order_status not null default 'pending',
  supplier_order_number text,
  supplier_url text,
  supplier_cost numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);
create index supplier_orders_supplier_id_idx on supplier_orders (supplier_id);
create index supplier_orders_status_idx on supplier_orders (status);

create table tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  carrier text,
  tracking_code text,
  tracking_url text,
  status text,
  last_event text,
  last_update timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id)
);
