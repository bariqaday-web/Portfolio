-- Permit every authenticated account role to create its own stories while
-- retaining post-only merchant checks and per-account story restrictions.
alter table public.stories
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists media_type text not null default 'text';

alter table public.stories
  drop constraint if exists stories_text_check,
  drop constraint if exists stories_content_check;

alter table public.stories
  add constraint stories_content_check
  check (
    char_length(text) <= 40
    and (char_length(text) > 0 or image_url is not null or video_url is not null)
    and media_type in ('text', 'image', 'video')
  );

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

drop policy if exists "stories_media_read" on storage.objects;
create policy "stories_media_read" on storage.objects
  for select to public
  using (bucket_id = 'stories');

drop policy if exists "stories_media_insert_own" on storage.objects;
create policy "stories_media_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "stories_media_update_own" on storage.objects;
create policy "stories_media_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "stories_media_delete_own" on storage.objects;
create policy "stories_media_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
