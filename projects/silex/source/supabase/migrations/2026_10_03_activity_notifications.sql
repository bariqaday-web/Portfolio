create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_actor_name text;
  v_post_title text;
begin
  select p.user_id, p.title
    into v_owner_id, v_post_title
    from public.posts p
    where p.id = new.post_id;

  if not found or v_owner_id = new.user_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'مستخدم')
    into v_actor_name
    from public.profiles p
    where p.id = new.user_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_owner_id,
    'تعليق جديد على منشورك',
    coalesce(v_actor_name, 'مستخدم') || ' علّق على منشورك' ||
      case when nullif(trim(v_post_title), '') is null then '' else ': ' || left(trim(v_post_title), 120) end ||
      case when nullif(trim(new.content), '') is null then '' else ' — ' || left(trim(new.content), 160) end,
    'post_comment'
  );

  return new;
end;
$$;

create or replace function public.notify_new_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_name text;
begin
  if new.follower_id = new.merchant_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'مستخدم')
    into v_actor_name
    from public.profiles p
    where p.id = new.follower_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    new.merchant_id,
    'متابع جديد',
    coalesce(v_actor_name, 'مستخدم') || ' بدأ بمتابعتك',
    'follow'
  );

  return new;
end;
$$;

drop trigger if exists post_comments_notify_owner on public.post_comments;
create trigger post_comments_notify_owner
after insert on public.post_comments
for each row execute function public.notify_post_comment();

drop trigger if exists follows_notify_merchant on public.follows;
create trigger follows_notify_merchant
after insert on public.follows
for each row execute function public.notify_new_follow();

notify pgrst, 'reload schema';
