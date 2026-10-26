create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('customer', 'merchant', 'admin'));
alter table public.profiles add column if not exists verified_at timestamptz;

create or replace function public.guard_profile_role_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
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
end;
$$;

drop trigger if exists profiles_guard_role_changes on public.profiles;
create trigger profiles_guard_role_changes
  before update of role on public.profiles
  for each row execute function public.guard_profile_role_changes();

create or replace function public.admin_set_ban(
  p_user uuid,
  p_banned boolean,
  p_reason text default null,
  p_days integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'حظر إداري');
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if auth.uid() = p_user then
    raise exception 'SELF';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'TARGET_ADMIN';
  end if;
  if p_banned and p_days is not null and p_days < 1 then
    raise exception 'BAD_DURATION';
  end if;

  if p_banned then
    update public.profiles
    set banned_at = now(),
        ban_reason = v_reason,
        suspended_until = case when p_days is null then null else now() + make_interval(days => p_days) end
    where id = p_user;
  else
    update public.profiles
    set banned_at = null, ban_reason = null, suspended_until = null
    where id = p_user;
  end if;
  if not found then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.notifications (user_id, title, body, type)
  values (
    p_user,
    case when p_banned then 'تم تقييد حسابك' else 'تم رفع الحظر عن حسابك' end,
    case when p_banned then 'سبب الحظر: ' || v_reason else 'رفع المشرف الحظر عن حسابك. يمكنك استخدام المنصة مجدداً.' end,
    'account_restriction'
  );
end;
$$;

create or replace function public.admin_set_verified(p_user uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  update public.profiles
  set verified_at = case when p_verified then now() else null end
  where id = p_user;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

create table if not exists public.user_content_restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  posts_restricted boolean not null default false,
  stories_restricted boolean not null default false,
  comments_restricted boolean not null default false,
  reason text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_content_restrictions enable row level security;

drop policy if exists "user_content_restrictions_read_own" on public.user_content_restrictions;
create policy "user_content_restrictions_read_own"
  on public.user_content_restrictions for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_content_restrictions_admin_write" on public.user_content_restrictions;
create policy "user_content_restrictions_admin_write"
  on public.user_content_restrictions for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.admin_set_content_restrictions(
  p_user uuid,
  p_posts boolean,
  p_stories boolean,
  p_comments boolean,
  p_reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_features text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if auth.uid() = p_user then
    raise exception 'SELF';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.user_content_restrictions (
    user_id, posts_restricted, stories_restricted, comments_restricted, reason, updated_by, updated_at
  )
  values (
    p_user, p_posts, p_stories, p_comments, coalesce(nullif(trim(p_reason), ''), ''),
    auth.uid(), now()
  )
  on conflict (user_id) do update set
    posts_restricted = excluded.posts_restricted,
    stories_restricted = excluded.stories_restricted,
    comments_restricted = excluded.comments_restricted,
    reason = excluded.reason,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  v_features := concat_ws('،',
    case when p_posts then 'نشر المنشورات' end,
    case when p_stories then 'نشر القصص' end,
    case when p_comments then 'كتابة التعليقات' end
  );
  insert into public.notifications (user_id, title, body, type)
  values (
    p_user,
    case when p_posts or p_stories or p_comments then 'تم تقييد بعض ميزات حسابك' else 'تم رفع قيود حسابك' end,
    case
      when p_posts or p_stories or p_comments then
        'تم تقييد ' || v_features || '. السبب: ' || coalesce(nullif(trim(p_reason), ''), 'مخالفة إرشادات المنصة') || '. يمكنك مراجعة الدعم عند الحاجة.'
      else 'رفع المشرف قيود نشر المنشورات والقصص والتعليقات عن حسابك.'
    end,
    'content_restriction'
  );
end;
$$;

grant execute on function public.admin_set_content_restrictions(uuid, boolean, boolean, boolean, text) to authenticated;

create or replace function public.enforce_content_restrictions()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_role text;
  v_restricted boolean;
  v_kind text;
begin
  if tg_table_name = 'stories' then
    v_user_id := (to_jsonb(new)->>'merchant_id')::uuid;
    v_kind := 'stories';
  elsif tg_table_name = 'posts' then
    v_user_id := (to_jsonb(new)->>'user_id')::uuid;
    v_kind := 'posts';
  else
    v_user_id := (to_jsonb(new)->>'user_id')::uuid;
    v_kind := 'comments';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if tg_table_name in ('posts', 'stories') and v_role is distinct from 'merchant' then
    raise exception 'MERCHANT_ONLY';
  end if;

  select case v_kind
      when 'posts' then posts_restricted
      when 'stories' then stories_restricted
      else comments_restricted
    end
    into v_restricted
    from public.user_content_restrictions
    where user_id = v_user_id;

  if coalesce(v_restricted, false) then
    raise exception 'RESTRICTED_%', upper(v_kind);
  end if;
  return new;
end;
$$;

drop trigger if exists posts_enforce_content_restrictions on public.posts;
create trigger posts_enforce_content_restrictions
  before insert on public.posts
  for each row execute function public.enforce_content_restrictions();

drop trigger if exists stories_enforce_content_restrictions on public.stories;
create trigger stories_enforce_content_restrictions
  before insert on public.stories
  for each row execute function public.enforce_content_restrictions();

drop trigger if exists comments_enforce_content_restrictions on public.post_comments;
create trigger comments_enforce_content_restrictions
  before insert on public.post_comments
  for each row execute function public.enforce_content_restrictions();

notify pgrst, 'reload schema';
