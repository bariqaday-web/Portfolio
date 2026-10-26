alter table public.profiles
  add column if not exists store_name text,
  add column if not exists store_category text,
  add column if not exists store_bio text,
  add column if not exists public_key text,
  add column if not exists assistant_enabled boolean not null default false,
  add column if not exists bot_hours_start text,
  add column if not exists bot_hours_end text;

create or replace function public.guard_profile_sensitive_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      if new.role <> 'customer'
        or new.banned_at is not null
        or new.ban_reason is not null
        or new.suspended_until is not null
        or new.verified_at is not null then
        raise exception 'PROTECTED_PROFILE_FIELDS';
      end if;
    elsif new.banned_at is distinct from old.banned_at
      or new.ban_reason is distinct from old.ban_reason
      or new.suspended_until is distinct from old.suspended_until
      or new.verified_at is distinct from old.verified_at
      or new.created_at is distinct from old.created_at then
      raise exception 'PROTECTED_PROFILE_FIELDS';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_sensitive_fields on public.profiles;
create trigger profiles_guard_sensitive_fields
  before insert or update on public.profiles
  for each row execute function public.guard_profile_sensitive_fields();

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

create or replace view public.profiles_public with (security_barrier = true) as
select
  id,
  username,
  full_name,
  bio,
  avatar_url,
  case when role = 'merchant' then whatsapp else null end as whatsapp,
  case when role = 'merchant' then 'merchant' else 'customer' end as role,
  verified_at,
  store_name,
  store_category,
  store_bio,
  public_key,
  assistant_enabled,
  bot_hours_start,
  bot_hours_end
from public.profiles;

revoke all on public.profiles_public from public;
grant select on public.profiles_public to anon, authenticated;

notify pgrst, 'reload schema';
