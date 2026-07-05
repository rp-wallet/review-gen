create extension if not exists pgcrypto;

do $$ begin
  create type plan as enum ('free', 'pro');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type subscription_status as enum ('pending', 'active', 'on_hold', 'cancelled', 'failed', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type app_type as enum ('telegram', 'instagram', 'twitter');
exception
  when duplicate_object then null;
end $$;

create table if not exists "user" (
  id text primary key,
  name text,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists "session" (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists account (
  id text primary key,
  account_id text not null,
  provider_id text not null,
  user_id text not null references "user"(id) on delete cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists verification (
  id text primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subscription (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique references "user"(id) on delete cascade,
  plan plan not null default 'free',
  status subscription_status not null default 'active',
  dodo_customer_id text unique,
  dodo_subscription_id text unique,
  dodo_product_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  app app_type not null default 'telegram',
  title text not null default 'Untitled',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_user_idx on project (user_id, updated_at);

create table if not exists export_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  app app_type not null,
  device text,
  width integer not null,
  height integer not null,
  created_at timestamptz not null default now()
);

create index if not exists export_log_user_idx on export_log (user_id, created_at);

create table if not exists credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id) on delete cascade,
  delta integer not null,
  reason text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx on credit_ledger (user_id, created_at);
