-- updated_at automático em todas as tabelas relevantes
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles', 'products', 'suppliers', 'supplier_products', 'customers',
      'addresses', 'offers', 'landing_pages', 'orders', 'supplier_orders',
      'payments', 'tracking'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at();',
      t
    );
  end loop;
end;
$$;

-- Cria automaticamente um profile (role=operator) quando um usuário se registra
-- via Supabase Auth. Promova para admin manualmente no banco quando necessário.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'operator');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Recalcula orders.profit sempre que custos/valores do pedido mudam,
-- usando a mesma fórmula do motor financeiro (src/lib/financial).
create or replace function recalc_order_profit()
returns trigger
language plpgsql
as $$
begin
  new.profit = coalesce(new.total, 0)
    - coalesce(new.supplier_cost, 0)
    - coalesce(new.gateway_fee, 0)
    - coalesce(new.other_costs, 0);
  return new;
end;
$$;

create trigger orders_recalc_profit
  before insert or update of total, supplier_cost, gateway_fee, other_costs
  on orders
  for each row execute function recalc_order_profit();
