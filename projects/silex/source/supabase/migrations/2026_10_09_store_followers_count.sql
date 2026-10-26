create or replace function public.followers_count(mid uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.follows
  where merchant_id = mid;
$$;

revoke all on function public.followers_count(uuid) from public;
grant execute on function public.followers_count(uuid) to anon, authenticated;
