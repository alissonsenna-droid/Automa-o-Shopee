-- Perfis de usuário administrativo (estende auth.users do Supabase)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role user_role not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Produtos (independentes de oferta — uma oferta referencia um produto)
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text unique,
  description text,
  price numeric(12, 2) not null default 0,
  compare_price numeric(12, 2),
  cost_price numeric(12, 2) not null default 0,
  images jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fornecedores
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  platform supplier_platform not null default 'manual',
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relação produto <-> fornecedor (um produto pode ter vários fornecedores)
create table supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  supplier_sku text,
  supplier_url text,
  supplier_cost numeric(12, 2) not null default 0,
  stock integer not null default 0,
  active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, product_id)
);

-- Clientes
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  cpf text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_email_idx on customers (lower(email));
create index customers_cpf_idx on customers (cpf);
create index customers_phone_idx on customers (phone);

-- Endereços
create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
