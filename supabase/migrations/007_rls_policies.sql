-- RLS: por padrão, tudo é bloqueado para roles anon/authenticated.
-- Toda escrita de negócio passa pelas API routes usando a service_role key
-- (server-side apenas — nunca exposta ao frontend), que ignora RLS.
-- As policies abaixo cobrem apenas o que o próprio cliente (browser) precisa:
--   1) o painel admin autenticado lendo/gerenciando dados;
--   2) leitura pública mínima necessária para o checkout carregar uma oferta
--      (feita via API route com service role — não diretamente do browser),
--      então nenhuma tabela de negócio precisa de policy pública de leitura.

alter table profiles enable row level security;
alter table products enable row level security;
alter table suppliers enable row level security;
alter table supplier_products enable row level security;
alter table customers enable row level security;
alter table addresses enable row level security;
alter table offers enable row level security;
alter table landing_pages enable row level security;
alter table checkout_sessions enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table supplier_orders enable row level security;
alter table tracking enable row level security;
alter table webhook_events enable row level security;
alter table audit_logs enable row level security;
alter table system_settings enable row level security;

create or replace function is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'operator')
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: cada usuário vê o próprio perfil; admin vê todos.
create policy "profiles_self_select" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_admin_write" on profiles for update using (is_admin());

-- Tabelas operacionais: staff (admin+operator) autenticado pode ler e escrever.
-- (Regras mais finas por ação/role podem ser adicionadas depois por tabela.)
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'suppliers', 'supplier_products', 'customers', 'addresses',
      'offers', 'landing_pages', 'orders', 'order_items', 'payments',
      'supplier_orders', 'tracking', 'system_settings'
    ])
  loop
    execute format('create policy "%1$s_staff_select" on %1$s for select using (is_staff());', t);
    execute format('create policy "%1$s_staff_write" on %1$s for insert with check (is_staff());', t);
    execute format('create policy "%1$s_staff_update" on %1$s for update using (is_staff());', t);
    execute format('create policy "%1$s_admin_delete" on %1$s for delete using (is_admin());', t);
  end loop;
end;
$$;

-- checkout_sessions: sem policy de acesso pelo browser (só service role/API).
-- webhook_events e audit_logs: apenas admin lê; nada é gravado pelo browser.
create policy "webhook_events_admin_select" on webhook_events for select using (is_admin());
create policy "audit_logs_admin_select" on audit_logs for select using (is_admin());
