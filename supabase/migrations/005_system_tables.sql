-- Eventos de webhook: garante idempotência (o mesmo evento nunca é
-- processado duas vezes) via unique constraint (provider, event_id).
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean not null default false,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);
create index webhook_events_processed_idx on webhook_events (processed);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs (entity, entity_id);
create index audit_logs_created_at_idx on audit_logs (created_at desc);

create table system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
