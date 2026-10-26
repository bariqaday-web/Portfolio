-- شغّل هذا الملف كاملاً في Supabase → SQL Editor

-- ========== الجداول ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  full_name text,
  bio text,
  avatar_url text,
  whatsapp text,
  city text,
  store_name text,
  store_category text,
  store_bio text,
  public_key text,
  assistant_enabled boolean not null default false,
  assistant_config jsonb not null default '{}'::jsonb,
  bot_hours_start text,
  bot_hours_end text,
  store_rating numeric(2,1) not null default 0,
  store_reviews_count integer not null default 0,
  role text not null default 'customer' check (role in ('customer','merchant','admin')),
  banned_at timestamptz,
  ban_reason text,
  suspended_until timestamptz,
  verified_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  hashtags text[] not null default '{}',
  price numeric,
  cover_url text,
  promoted boolean not null default false,
  is_active boolean not null default true,
  merchant_hidden_by_role boolean not null default false,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_likes (
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (product_id, user_id)
);

create table public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text check (char_length(trim(comment)) <= 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, customer_id)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  video_url text,
  media_type text not null default 'text' check (media_type in ('text', 'image', 'video')),
  text text not null check (
    char_length(text) <= 40
    and (char_length(text) > 0 or image_url is not null or video_url is not null)
  ),
  bg_color text not null default '#111111',
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

create table public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, user_id)
);

create table public.story_hides (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (story_id, user_id)
);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, merchant_id),
  check (follower_id <> merchant_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null default ('#' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  merchant_id uuid references public.profiles(id) on delete set null,
  status text not null default 'قيد المعالجة' check (status in ('قيد المعالجة','في الطريق','تم التسليم')),
  total numeric not null default 0,
  items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  merchant_id uuid references public.profiles(id) on delete set null,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  unit_price numeric not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  color text,
  size text,
  image text,
  line_total numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.assistant_merchant_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  phrases text[] not null,
  response text not null,
  priority integer not null default 100 check (priority between 0 and 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(phrases) between 1 and 20),
  check (char_length(trim(response)) between 1 and 1000)
);

create table public.assistant_reply_rules (
  id uuid primary key default gen_random_uuid(),
  phrases text[] not null,
  response text not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(phrases) between 1 and 12),
  check (char_length(trim(response)) between 1 and 1000)
);

create index on public.products (merchant_id, created_at desc);
create index on public.stories (expires_at);
create index on public.stories (merchant_id);
create index on public.follows (merchant_id);
create index on public.orders (customer_id, created_at desc);
create index on public.order_items (order_id);
create index on public.order_items (merchant_id, created_at desc);
create index assistant_merchant_rules_lookup_idx
  on public.assistant_merchant_rules (merchant_id, priority, created_at)
  where is_active;
create index assistant_reply_rules_active_priority_idx
  on public.assistant_reply_rules (priority, created_at)
  where is_active;

-- ========== دوال ==========
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

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

create trigger store_reviews_recompute_after_write
after insert or update of rating on public.store_reviews
for each row execute function public.recompute_store_rating();

create trigger store_reviews_recompute_after_delete
after delete on public.store_reviews
for each row execute function public.recompute_store_rating();

create or replace function public.guard_profile_role_changes()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.role is distinct from old.role then
    if old.role = 'admin' and auth.uid() = old.id then
      raise exception 'ADMIN_ROLE_PROTECTED';
    end if;
    if new.role = 'admin' and auth.uid() is not null and not public.is_admin() then
      raise exception 'ROLE_CHANGE_FORBIDDEN';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard_role_changes
before update of role on public.profiles
for each row execute function public.guard_profile_role_changes();

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

create trigger profiles_guard_sensitive_fields
before insert or update on public.profiles
for each row execute function public.guard_profile_sensitive_fields();

create or replace function public.is_merchant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'merchant');
$$;

create or replace function public.is_active_merchant(p_merchant_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = p_merchant_id and role = 'merchant'
  );
$$;
grant execute on function public.is_active_merchant(uuid) to anon, authenticated;

create or replace function public.sync_merchant_products_for_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'merchant' and new.role is distinct from 'merchant' then
    update public.products
    set is_active = false, merchant_hidden_by_role = true
    where merchant_id = new.id and is_active and not merchant_hidden_by_role;
  elsif old.role is distinct from 'merchant' and new.role = 'merchant' then
    update public.products
    set is_active = true, merchant_hidden_by_role = false
    where merchant_id = new.id and merchant_hidden_by_role;
  end if;
  return new;
end $$;

create trigger profiles_sync_merchant_products
after update of role on public.profiles
for each row execute function public.sync_merchant_products_for_role();

create or replace function public.increment_product_views(pid uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set views = views + 1 where id = pid;
$$;
grant execute on function public.increment_product_views(uuid) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.admin_set_ban(p_user uuid, p_banned boolean, p_reason text default null, p_days integer default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'FORBIDDEN';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') = false then
    raise exception 'FORBIDDEN';
  end if;
  if auth.uid() = p_user then
    raise exception 'SELF';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'TARGET_ADMIN';
  end if;

  if p_banned then
    update public.profiles
    set banned_at = now(),
        ban_reason = coalesce(nullif(trim(p_reason), ''), 'حظر إداري'),
        suspended_until = case when p_days is null then null else now() + (p_days || ' days')::interval end
    where id = p_user;
  else
    update public.profiles
    set banned_at = null,
        ban_reason = null,
        suspended_until = null
    where id = p_user;
  end if;
end $$;

create or replace function public.admin_set_verified(p_user uuid, p_verified boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'FORBIDDEN';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') = false then
    raise exception 'FORBIDDEN';
  end if;

  update public.profiles
  set verified_at = case when p_verified then now() else null end
  where id = p_user;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ========== RLS ==========
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_likes enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.story_likes enable row level security;
alter table public.story_hides enable row level security;
alter table public.follows enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.assistant_merchant_rules enable row level security;
alter table public.assistant_reply_rules enable row level security;
alter table public.store_reviews enable row level security;

-- profiles
create policy "profiles_read" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

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
grant select on public.profiles_public to anon, authenticated;

-- notification_preferences
create policy "notification_preferences_read_own" on public.notification_preferences for select using (auth.uid() = user_id);
create policy "notification_preferences_insert_own" on public.notification_preferences for insert with check (auth.uid() = user_id);
create policy "notification_preferences_update_own" on public.notification_preferences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "store_reviews_read" on public.store_reviews for select using (true);
create policy "store_reviews_insert_own" on public.store_reviews for insert with check (customer_id = auth.uid() and merchant_id <> auth.uid());
create policy "store_reviews_update_own" on public.store_reviews for update using (customer_id = auth.uid()) with check (customer_id = auth.uid() and merchant_id <> auth.uid());
create policy "store_reviews_delete_own" on public.store_reviews for delete using (customer_id = auth.uid());

-- Assistant rules: merchants may edit only their own store's rules; platform rules are admin-managed.
grant select, insert, update, delete on public.assistant_merchant_rules to authenticated;
grant select on public.assistant_merchant_rules to service_role;
create policy "assistant_merchant_rules_owner_manage"
  on public.assistant_merchant_rules
  for all
  to authenticated
  using (
    merchant_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'merchant'
    )
  )
  with check (
    merchant_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'merchant'
    )
  );

grant select, insert, update, delete on public.assistant_reply_rules to authenticated;
grant select on public.assistant_reply_rules to service_role;
create policy "assistant_reply_rules_admin_manage"
  on public.assistant_reply_rules
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- products
create policy "products_read" on public.products for select using (true);
create policy "products_insert_own" on public.products for insert with check (auth.uid() = merchant_id and public.is_merchant());
create policy "products_update_own" on public.products for update using (auth.uid() = merchant_id) with check (auth.uid() = merchant_id);
create policy "products_delete_own" on public.products for delete using (auth.uid() = merchant_id);
create policy products_active_merchant_read on public.products
  as restrictive for select to anon, authenticated
  using (is_active and public.is_active_merchant(merchant_id));
create policy products_active_merchant_insert on public.products
  as restrictive for insert to authenticated
  with check (auth.uid() = merchant_id and public.is_active_merchant(merchant_id));
create policy products_active_merchant_update on public.products
  as restrictive for update to authenticated
  using (auth.uid() = merchant_id and public.is_active_merchant(merchant_id))
  with check (auth.uid() = merchant_id and public.is_active_merchant(merchant_id));
create policy products_active_merchant_delete on public.products
  as restrictive for delete to authenticated
  using (auth.uid() = merchant_id and public.is_active_merchant(merchant_id));

-- product_likes
create policy "product_likes_read" on public.product_likes for select using (true);
create policy "product_likes_insert_own" on public.product_likes for insert with check (auth.uid() = user_id);
create policy "product_likes_delete_own" on public.product_likes for delete using (auth.uid() = user_id);

-- stories
create policy "stories_read" on public.stories for select using (expires_at > now() or merchant_id = auth.uid());
create policy "stories_insert_own" on public.stories for insert to authenticated with check (auth.uid() = merchant_id);
create policy "stories_delete_own" on public.stories for delete using (auth.uid() = merchant_id);
grant insert on public.stories to authenticated;

-- story_views: المشاهد يسجّل مشاهدته، والتاجر يرى مشاهدي قصصه
create policy "story_views_insert_own" on public.story_views for insert with check (auth.uid() = viewer_id);
create policy "story_views_read" on public.story_views for select using (
  viewer_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.merchant_id = auth.uid())
);

-- story_likes
create policy "story_likes_read" on public.story_likes for select using (
  user_id = auth.uid()
  or exists (select 1 from public.stories s where s.id = story_id and s.merchant_id = auth.uid())
);
create policy "story_likes_insert_own" on public.story_likes for insert with check (auth.uid() = user_id);
create policy "story_likes_delete_own" on public.story_likes for delete using (auth.uid() = user_id);

-- story_hides
create policy "story_hides_own" on public.story_hides for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- follows
create policy "follows_read" on public.follows for select using (follower_id = auth.uid() or merchant_id = auth.uid());
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

-- orders
create policy "orders_read" on public.orders for select using (customer_id = auth.uid() or merchant_id = auth.uid());
create policy "orders_insert_own" on public.orders for insert with check (customer_id = auth.uid());
create policy "orders_update_merchant" on public.orders for update using (merchant_id = auth.uid());

-- order_items
create policy "order_items_read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or o.merchant_id = auth.uid()))
);
create policy "order_items_insert_own" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "order_items_update_merchant" on public.order_items for update using (
  exists (select 1 from public.orders o where o.id = order_id and o.merchant_id = auth.uid())
);

-- ========== التخزين (أغلفة المنتجات) ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories',
  'stories',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "covers_read" on storage.objects for select using (bucket_id = 'covers');
create policy "covers_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "stories_media_read" on storage.objects for select to public
  using (bucket_id = 'stories');
create policy "stories_media_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "stories_media_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "stories_media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "covers_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);
