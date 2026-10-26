-- Manual campaign payments (USD).
-- Run this file only after:
--   1. 2026_10_08_add_sponsored_story_ads.sql
--   2. 2026_10_08_zz_campaign_review_visibility.sql
-- This installs the payment submission and admin-review functions.
-- Admin approval is manual; no bank or card-provider confirmation is performed here.

alter table public.campaigns
  add column if not exists payment_method text,
  add column if not exists refund_status text not null default 'none',
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_by uuid references public.profiles(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into public.platform_settings (key, value, updated_at)
values ('free_ads_quota', '0', now())
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

drop policy if exists receipts_admin_read on storage.objects;
create policy receipts_admin_read
  on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

drop policy if exists receipts_owner_insert on storage.objects;
create policy receipts_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.create_campaign(
  p_type text,
  p_package_id text,
  p_title text,
  p_description text,
  p_image_url text,
  p_target_id uuid,
  p_province text,
  p_category text,
  p_color text default null::text,
  p_shape text default null::text
)
returns public.campaigns
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_pkg public.ad_packages;
  v_price bigint;
  v_row public.campaigns;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from public.profiles where id = v_uid and role = 'merchant') then
    raise exception 'NOT_MERCHANT';
  end if;
  if not exists (select 1 from public.ad_templates where type = p_type and enabled) then
    raise exception 'TEMPLATE_DISABLED';
  end if;

  select * into v_pkg from public.ad_packages where id = p_package_id and active;
  if not found then raise exception 'PACKAGE_UNAVAILABLE'; end if;
  if coalesce(v_pkg.daily_price, 0) < 1 then raise exception 'PACKAGE_PRICE_UNAVAILABLE'; end if;
  if not exists (
    select 1 from public.platform_settings
    where key in ('payment_card_number', 'payment_iban')
      and nullif(trim(value), '') is not null
  ) then
    raise exception 'PAYMENT_NOT_CONFIGURED';
  end if;
  if p_type = 'product'
    and not exists (select 1 from public.products where id = p_target_id and merchant_id = v_uid) then
    raise exception 'BAD_TARGET';
  end if;
  if p_type in ('promotion', 'story') and coalesce(p_image_url, '') = '' then
    raise exception 'IMAGE_REQUIRED';
  end if;
  if coalesce(p_image_url, '') <> '' and p_image_url !~ '^https://' then raise exception 'BAD_IMAGE'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'BAD_TITLE'; end if;

  v_price := v_pkg.days::bigint * v_pkg.daily_price;
  if v_price < 1 then raise exception 'PACKAGE_PRICE_UNAVAILABLE'; end if;

  insert into public.campaigns (
    merchant_id, type, title, description, image_url, target_id, target_province, target_category,
    daily_budget, total_budget, duration_days, package_id, price, is_free, status,
    payment_status, payment_provider, refund_status, design_color, design_shape
  ) values (
    v_uid, p_type, left(trim(p_title), 60), nullif(left(trim(coalesce(p_description, '')), 200), ''), p_image_url,
    case p_type when 'product' then p_target_id when 'company' then v_uid else null end,
    nullif(p_province, ''), nullif(p_category, ''),
    v_pkg.daily_price, v_price, v_pkg.days, v_pkg.id, v_price, false, 'pending_payment',
    'pending', 'disabled', 'none',
    case when p_color ~ '^#[0-9a-fA-F]{6}$' then lower(p_color) end,
    case when p_shape in ('orbit', 'arch', 'spark') then p_shape end
  )
  returning * into v_row;

  return v_row;
end
$function$;

grant execute on function public.create_campaign(text, text, text, text, text, uuid, text, text, text, text)
  to authenticated;

create or replace function public.submit_campaign_payment(
  p_campaign_id uuid,
  p_receipt_path text,
  p_payment_ref text,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ref text := upper(trim(coalesce(p_payment_ref, '')));
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_payment_method is null or p_payment_method not in ('card', 'iban') then
    raise exception 'BAD_PAYMENT_METHOD';
  end if;
  if v_ref !~ '^[A-Z0-9-]{6,40}$' then raise exception 'BAD_REF'; end if;
  if p_receipt_path is null
    or p_receipt_path not like v_uid::text || '/' || p_campaign_id::text || '-%'
    or position('..' in p_receipt_path) > 0 then
    raise exception 'BAD_RECEIPT';
  end if;
  if not exists (
    select 1 from public.platform_settings
    where key = case p_payment_method when 'card' then 'payment_card_number' else 'payment_iban' end
      and nullif(trim(value), '') is not null
  ) then
    raise exception 'PAYMENT_METHOD_UNAVAILABLE';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'receipts' and name = p_receipt_path
  ) then
    raise exception 'BAD_RECEIPT';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_ref));
  if exists (
    select 1 from public.campaigns
    where upper(payment_ref) = v_ref and id <> p_campaign_id
  ) then
    raise exception 'REF_USED';
  end if;

  perform 1
  from public.campaigns
  where id = p_campaign_id
    and merchant_id = v_uid
    and status = 'pending_payment'
    and not is_free
  for update;
  if not found then raise exception 'NOT_PAYABLE'; end if;

  update public.campaigns
  set receipt_path = p_receipt_path,
      payment_ref = v_ref,
      payment_method = p_payment_method,
      status = 'pending_review',
      payment_status = 'pending_review',
      refund_status = 'none',
      review_note = null,
      updated_at = now()
  where id = p_campaign_id;
end
$function$;

drop function if exists public.submit_campaign_payment(uuid, text, text);
revoke all on function public.submit_campaign_payment(uuid, text, text, text) from public;
grant execute on function public.submit_campaign_payment(uuid, text, text, text) to authenticated;

-- PostgreSQL cannot replace a function while changing its return type.
-- Drop this exact signature, then recreate it below and restore authenticated access.
drop function if exists public.admin_review_campaign(uuid, text, text);

create or replace function public.admin_review_campaign(
  p_campaign_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_campaign public.campaigns;
  v_title text;
  v_body text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_campaign
  from public.campaigns
  where id = p_campaign_id
  for update;
  if not found then raise exception 'NOT_REVIEWABLE'; end if;

  if p_decision = 'approve' then
    if v_campaign.status <> 'pending_review'
      or (not v_campaign.is_free and (v_campaign.receipt_path is null or v_campaign.payment_ref is null or v_campaign.payment_method is null)) then
      raise exception 'NOT_REVIEWABLE';
    end if;
    update public.campaigns
    set status = 'active',
        payment_status = case when is_free then payment_status else 'paid' end,
        paid_at = case when is_free then paid_at else coalesce(paid_at, now()) end,
        review_note = null,
        updated_at = now()
    where id = p_campaign_id;
    v_title := 'تمت الموافقة على إعلانك';
    v_body := 'تمت الموافقة على إعلان "' || left(v_campaign.title, 100) || '" وتفعيله.';
  elsif p_decision = 'reject' then
    if v_campaign.status <> 'pending_review' then raise exception 'NOT_REVIEWABLE'; end if;
    if length(trim(coalesce(p_note, ''))) < 3 then raise exception 'REVIEW_NOTE_REQUIRED'; end if;
    update public.campaigns
    set status = 'rejected',
        payment_status = case when not is_free and receipt_path is not null then 'cancelled' else payment_status end,
        refund_status = case when not is_free and receipt_path is not null then 'pending' else 'none' end,
        review_note = left(trim(p_note), 200),
        updated_at = now()
    where id = p_campaign_id;
    v_title := 'تم رفض إعلانك';
    v_body := 'تم رفض إعلان "' || left(v_campaign.title, 100) || '". ملاحظة الإدارة: ' || left(trim(p_note), 180)
      || case when not v_campaign.is_free and v_campaign.receipt_path is not null then ' وسيعاد المبلغ يدويًا.' else '' end;
  elsif p_decision = 'confirm_refund' then
    if v_campaign.status <> 'rejected' or v_campaign.refund_status <> 'pending' then
      raise exception 'NOT_REVIEWABLE';
    end if;
    update public.campaigns
    set refund_status = 'refunded',
        refunded_at = now(),
        refunded_by = auth.uid(),
        payment_status = 'cancelled',
        updated_at = now()
    where id = p_campaign_id;
    v_title := 'تم تسجيل إعادة مبلغ إعلانك';
    v_body := 'أكدت الإدارة إعادة مبلغ إعلان "' || left(v_campaign.title, 100) || '" يدويًا.';
  elsif p_decision = 'pause' then
    if v_campaign.status <> 'active' then raise exception 'NOT_REVIEWABLE'; end if;
    update public.campaigns set status = 'paused', updated_at = now() where id = p_campaign_id;
    v_title := 'تم إيقاف إعلانك';
    v_body := 'تم إيقاف إعلان "' || left(v_campaign.title, 100) || '".';
  elsif p_decision = 'resume' then
    if v_campaign.status <> 'paused' then raise exception 'NOT_REVIEWABLE'; end if;
    update public.campaigns set status = 'active', updated_at = now() where id = p_campaign_id;
    v_title := 'تم استئناف إعلانك';
    v_body := 'تم استئناف إعلان "' || left(v_campaign.title, 100) || '".';
  else
    raise exception 'BAD_DECISION';
  end if;

  insert into public.notifications (user_id, title, body, type, target_type, target_id)
  values (v_campaign.merchant_id, v_title, v_body, 'campaign_update', 'campaign', p_campaign_id);
end
$function$;

revoke all on function public.admin_review_campaign(uuid, text, text) from public;
grant execute on function public.admin_review_campaign(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
