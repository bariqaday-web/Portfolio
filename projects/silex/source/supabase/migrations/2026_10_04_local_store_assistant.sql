alter table public.profiles
  add column if not exists assistant_config jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
