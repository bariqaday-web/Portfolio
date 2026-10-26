alter table public.orders
  add column if not exists total numeric not null default 0,
  add column if not exists items jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
