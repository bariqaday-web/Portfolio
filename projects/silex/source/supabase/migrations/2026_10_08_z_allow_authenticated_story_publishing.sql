grant insert on public.stories to authenticated;

drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories
  for insert to authenticated
  with check (auth.uid() = merchant_id);

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
  if v_role is null then
    raise exception 'PROFILE_REQUIRED';
  end if;
  if tg_table_name = 'posts' and v_role is distinct from 'merchant' then
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

notify pgrst, 'reload schema';
