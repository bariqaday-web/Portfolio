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
