-- Categoria do produto — necessária pra loja (listagem por categoria, menu).
-- Aditiva e não-destrutiva: default garante que produtos existentes não quebram.
alter table products add column category text not null default 'geral';
create index products_category_idx on products (category);
create index products_active_idx on products (active);
