-- Configurações/segredos gerados dinamicamente pelo próprio backend (ex:
-- credenciais de MERCHANT da Appmax, obtidas via fluxo OAuth de instalação
-- do app — ver src/lib/appmax/install.ts). Nunca populada manualmente por
-- humano; só lida/escrita pelo service role do servidor.
create table app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;
-- Sem policies: só acessível via service role (createSupabaseAdminClient),
-- igual ao padrão usado para webhook_events e demais tabelas internas.
