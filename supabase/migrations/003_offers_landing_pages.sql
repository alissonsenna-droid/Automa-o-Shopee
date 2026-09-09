-- Ofertas: uma campanha/produto sendo testado em uma landing page específica.
-- Um mesmo produto pode ter várias ofertas com preço/desconto/landing próprios.
create table offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_id uuid not null references products (id) on delete restrict,
  price numeric(12, 2) not null,
  compare_price numeric(12, 2),
  shipping_price numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  active boolean not null default true,
  landing_page_url text,
  checkout_enabled boolean not null default true,
  tracking_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_product_id_idx on offers (product_id);
create index offers_active_idx on offers (active);

-- Landing pages cadastradas, cada uma apontando para uma oferta.
create table landing_pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  offer_id uuid not null references offers (id) on delete cascade,
  active boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index landing_pages_offer_id_idx on landing_pages (offer_id);

-- Sessões de checkout: criadas pela API a partir de uma oferta + UTMs.
-- O preço nunca é confiado a partir da landing page — é sempre resolvido
-- a partir da oferta no momento da criação da sessão (ver /api/checkout/session).
create table checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers (id) on delete restrict,
  quantity integer not null default 1,
  price_snapshot numeric(12, 2) not null,
  shipping_snapshot numeric(12, 2) not null default 0,
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
  order_id uuid,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);
create index checkout_sessions_offer_id_idx on checkout_sessions (offer_id);
