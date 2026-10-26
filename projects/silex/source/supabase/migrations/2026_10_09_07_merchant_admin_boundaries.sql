-- Enforce merchant/admin boundaries in the database.
-- Campaign creation and payment submission remain available only through their
-- validated security-definer functions; campaign status and payment data are not
-- directly writable by authenticated users.

create or replace function public.get_public_platform_settings()
returns table (key text, value text)
language sql
stable
security definer
set search_path = public
as $$
  select s.key, s.value
  from public.platform_settings s
  where auth.uid() is not null
    and s.key in (
      'payment_card_number',
      'payment_card_holder',
      'payment_iban',
      'payment_iban_holder',
      'payment_note',
      'support_email',
      'support_whatsapp'
    );
$$;

revoke all on function public.get_public_platform_settings() from public;
grant execute on function public.get_public_platform_settings() to authenticated;

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from public, anon, authenticated;
grant select, insert, update, delete on public.platform_settings to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'platform_settings'
  loop
    execute format('drop policy %I on public.platform_settings', p.policyname);
  end loop;
end;
$$;

create policy platform_settings_admin_only
  on public.platform_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.ad_packages enable row level security;
alter table public.ad_templates enable row level security;
revoke all on public.ad_packages, public.ad_templates from public, anon, authenticated;
grant select on public.ad_packages, public.ad_templates to anon, authenticated;
grant insert, update, delete on public.ad_packages, public.ad_templates to authenticated;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('ad_packages', 'ad_templates')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

create policy ad_packages_read_public
  on public.ad_packages for select to anon, authenticated using (true);
create policy ad_packages_admin_manage
  on public.ad_packages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ad_templates_read_public
  on public.ad_templates for select to anon, authenticated using (true);
create policy ad_templates_admin_manage
  on public.ad_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter table public.campaigns enable row level security;
revoke insert, update, delete on public.campaigns from public, anon, authenticated;
revoke update on public.campaigns from public, anon, authenticated;
grant select, delete on public.campaigns to authenticated;
grant update (title, description, image_url) on public.campaigns to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'campaigns'
  loop
    execute format('drop policy %I on public.campaigns', p.policyname);
  end loop;
end;
$$;

create policy campaigns_read_owner_admin
  on public.campaigns for select to authenticated
  using (merchant_id = auth.uid() or public.is_admin());
create policy campaigns_update_content_owner
  on public.campaigns for update to authenticated
  using (
    public.is_admin()
    or (
      merchant_id = auth.uid()
      and status in ('draft', 'pending_payment')
      and receipt_path is null
      and (pending_deadline_at is null or pending_deadline_at > now())
    )
  )
  with check (
    public.is_admin()
    or (
      merchant_id = auth.uid()
      and status in ('draft', 'pending_payment')
      and receipt_path is null
      and length(trim(coalesce(title, ''))) >= 3
      and (type not in ('promotion', 'story') or image_url is not null)
    )
  );
create policy campaigns_delete_unpaid_owner
  on public.campaigns for delete to authenticated
  using (
    merchant_id = auth.uid()
    and receipt_path is null
    and (
      status in ('draft', 'pending_payment', 'expired')
      or (status = 'rejected' and coalesce(refund_status, 'none') <> 'pending')
    )
  );

-- Posts stay public to read; restrictive write policies constrain any older
-- permissive policies without changing their feed visibility rules.
alter table public.posts enable row level security;
revoke insert, update, delete on public.posts from public, anon, authenticated;
revoke select on public.posts from public, anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

drop policy if exists silex_posts_read_public on public.posts;
drop policy if exists silex_posts_insert_owner on public.posts;
drop policy if exists silex_posts_insert_guard on public.posts;
drop policy if exists silex_posts_update_owner on public.posts;
drop policy if exists silex_posts_update_guard on public.posts;
drop policy if exists silex_posts_delete_owner on public.posts;
drop policy if exists silex_posts_delete_guard on public.posts;
create policy silex_posts_read_public
  on public.posts for select to anon, authenticated using (true);
create policy silex_posts_insert_owner
  on public.posts for insert to authenticated
  with check ((user_id = auth.uid() and public.is_merchant()) or public.is_admin());
create policy silex_posts_insert_guard
  on public.posts as restrictive for insert to authenticated
  with check ((user_id = auth.uid() and public.is_merchant()) or public.is_admin());
create policy silex_posts_update_owner
  on public.posts for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_merchant()) or public.is_admin());
create policy silex_posts_update_guard
  on public.posts as restrictive for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and public.is_merchant()) or public.is_admin());
create policy silex_posts_delete_owner
  on public.posts for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy silex_posts_delete_guard
  on public.posts as restrictive for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

alter table public.stories enable row level security;
revoke insert, update, delete on public.stories from public, anon, authenticated;
revoke select on public.stories from public, anon, authenticated;
grant select on public.stories to anon, authenticated;
grant insert, update, delete on public.stories to authenticated;

drop policy if exists silex_stories_insert_owner on public.stories;
drop policy if exists silex_stories_insert_guard on public.stories;
drop policy if exists silex_stories_update_owner on public.stories;
drop policy if exists silex_stories_update_guard on public.stories;
drop policy if exists silex_stories_delete_owner on public.stories;
drop policy if exists silex_stories_delete_guard on public.stories;
create policy silex_stories_insert_owner
  on public.stories for insert to authenticated
  with check (merchant_id = auth.uid() or public.is_admin());
create policy silex_stories_insert_guard
  on public.stories as restrictive for insert to authenticated
  with check (merchant_id = auth.uid() or public.is_admin());
create policy silex_stories_update_owner
  on public.stories for update to authenticated
  using (merchant_id = auth.uid() or public.is_admin())
  with check (merchant_id = auth.uid() or public.is_admin());
create policy silex_stories_update_guard
  on public.stories as restrictive for update to authenticated
  using (merchant_id = auth.uid() or public.is_admin())
  with check (merchant_id = auth.uid() or public.is_admin());
create policy silex_stories_delete_owner
  on public.stories for delete to authenticated
  using (merchant_id = auth.uid() or public.is_admin());
create policy silex_stories_delete_guard
  on public.stories as restrictive for delete to authenticated
  using (merchant_id = auth.uid() or public.is_admin());

-- Keep media public to read while restricting writes to the owner's folder.
drop policy if exists silex_posts_media_read_public on storage.objects;
drop policy if exists silex_posts_media_insert_owner on storage.objects;
drop policy if exists silex_posts_media_insert_guard on storage.objects;
drop policy if exists silex_posts_media_update_owner on storage.objects;
drop policy if exists silex_posts_media_update_guard on storage.objects;
drop policy if exists silex_posts_media_delete_owner on storage.objects;
drop policy if exists silex_posts_media_delete_guard on storage.objects;
create policy silex_posts_media_read_public
  on storage.objects for select to public using (bucket_id = 'posts');
create policy silex_posts_media_insert_owner
  on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy silex_posts_media_insert_guard
  on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'posts' or (storage.foldername(name))[1] = auth.uid()::text);
create policy silex_posts_media_update_owner
  on storage.objects for update to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy silex_posts_media_update_guard
  on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'posts' or (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id <> 'posts' or (storage.foldername(name))[1] = auth.uid()::text);
create policy silex_posts_media_delete_owner
  on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy silex_posts_media_delete_guard
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'posts' or (storage.foldername(name))[1] = auth.uid()::text);

-- Receipts are immutable for merchants and readable only by administrators.
drop policy if exists receipts_read_admin_guard on storage.objects;
drop policy if exists receipts_read_anon_deny on storage.objects;
drop policy if exists receipts_insert_owner_guard on storage.objects;
drop policy if exists receipts_update_deny on storage.objects;
drop policy if exists receipts_delete_deny on storage.objects;
create policy receipts_read_anon_deny
  on storage.objects as restrictive for select to anon
  using (bucket_id <> 'receipts');
create policy receipts_read_admin_guard
  on storage.objects as restrictive for select to authenticated
  using (bucket_id <> 'receipts' or public.is_admin());
create policy receipts_insert_owner_guard
  on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'receipts' or (storage.foldername(name))[1] = auth.uid()::text);
create policy receipts_update_deny
  on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'receipts');
create policy receipts_delete_deny
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'receipts');

notify pgrst, 'reload schema';
