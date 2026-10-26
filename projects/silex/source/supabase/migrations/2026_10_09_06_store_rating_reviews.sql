alter table public.profiles
  add column if not exists store_rating numeric(2,1) not null default 0,
  add column if not exists store_reviews_count integer not null default 0;

create table if not exists public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(trim(comment)) <= 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, customer_id)
);

create or replace function public.recompute_store_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_merchant_id uuid;
begin
  if tg_op = 'DELETE' then
    v_merchant_id := old.merchant_id;
  else
    v_merchant_id := new.merchant_id;
  end if;

  update public.profiles p
  set
    store_rating = coalesce((
      select round(avg(sr.rating)::numeric, 1)
      from public.store_reviews sr
      where sr.merchant_id = v_merchant_id
    ), 0),
    store_reviews_count = coalesce((
      select count(*)
      from public.store_reviews sr
      where sr.merchant_id = v_merchant_id
    ), 0)
  where p.id = v_merchant_id;

  return coalesce(new, old);
end;
$$;

alter table public.store_reviews enable row level security;
create policy "store_reviews_read" on public.store_reviews for select using (true);
create policy "store_reviews_insert_own" on public.store_reviews for insert with check (customer_id = auth.uid() and merchant_id <> auth.uid());
create policy "store_reviews_update_own" on public.store_reviews for update using (customer_id = auth.uid()) with check (customer_id = auth.uid() and merchant_id <> auth.uid());
create policy "store_reviews_delete_own" on public.store_reviews for delete using (customer_id = auth.uid());

create trigger store_reviews_recompute_after_write
after insert or update of rating on public.store_reviews
for each row execute function public.recompute_store_rating();

create trigger store_reviews_recompute_after_delete
after delete on public.store_reviews
for each row execute function public.recompute_store_rating();

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
  bot_hours_end,
  store_rating,
  store_reviews_count
from public.profiles;

revoke all on public.profiles_public from public;
grant select on public.profiles_public to anon, authenticated;

notify pgrst, 'reload schema';
