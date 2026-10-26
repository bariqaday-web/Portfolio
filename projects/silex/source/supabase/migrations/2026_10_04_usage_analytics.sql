alter table public.profiles
  add column if not exists country text;

create table if not exists public.app_usage_hours (
  id uuid primary key default gen_random_uuid(),
  active_date date not null,
  active_hour smallint not null check (active_hour between 0 and 23),
  city text,
  country text,
  created_at timestamptz not null default now()
);

create index if not exists app_usage_hours_date_hour_idx
  on public.app_usage_hours (active_date desc, active_hour);

alter table public.app_usage_hours enable row level security;

grant select on public.app_usage_hours to authenticated;
grant select, insert, delete on public.app_usage_hours to service_role;

drop policy if exists "app_usage_hours_admin_read" on public.app_usage_hours;
create policy "app_usage_hours_admin_read"
  on public.app_usage_hours
  for select
  to authenticated
  using (public.is_admin());

notify pgrst, 'reload schema';
