-- Extensões necessárias
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Enums
create type user_role as enum ('admin', 'operator');

create type supplier_platform as enum ('shopee', 'supplier_direct', 'manual', 'api', 'other');

create type payment_status as enum (
  'aguardando_pagamento',
  'pagamento_aprovado',
  'pagamento_recusado',
  'pagamento_cancelado',
  'pagamento_expirado'
);

create type order_status as enum (
  'pending_payment',
  'paid',
  'supplier_pending',
  'supplier_ordered',
  'supplier_shipped',
  'in_transit',
  'delivered',
  'cancelled',
  'refunded',
  'problem'
);

create type supplier_order_status as enum (
  'pending',
  'sent',
  'confirmed',
  'shipped',
  'cancelled',
  'problem'
);

create type payment_provider as enum ('appmax');
create type payment_method as enum ('pix', 'credit_card', 'boleto');
