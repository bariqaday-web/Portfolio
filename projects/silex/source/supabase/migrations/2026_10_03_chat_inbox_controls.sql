alter table public.conversations
  add column if not exists customer_cleared_at timestamptz,
  add column if not exists merchant_cleared_at timestamptz,
  add column if not exists customer_pinned boolean not null default false,
  add column if not exists merchant_pinned boolean not null default false;

notify pgrst, 'reload schema';
