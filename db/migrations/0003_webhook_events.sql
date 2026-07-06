create table if not exists webhook_event (
  id text primary key,
  type text,
  created_at timestamptz not null default now()
);
