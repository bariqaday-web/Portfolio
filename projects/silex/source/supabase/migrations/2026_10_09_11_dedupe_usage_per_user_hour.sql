-- Make usage analytics idempotent across tabs and devices for each signed-in user.
alter table public.app_usage_hours
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

create unique index if not exists app_usage_hours_user_date_hour_uidx
  on public.app_usage_hours (user_id, active_date, active_hour);

grant select, insert, update, delete on public.app_usage_hours to service_role;

notify pgrst, 'reload schema';
