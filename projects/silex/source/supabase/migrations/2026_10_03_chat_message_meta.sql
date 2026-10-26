alter table public.messages
  add column if not exists meta jsonb;

notify pgrst, 'reload schema';
