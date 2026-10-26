-- Optional follow-up for projects that already ran an earlier manual-payment script.
-- Run this AFTER 2026_10_09_01_manual_usd_campaign_payments.sql.
-- It only refreshes submit_campaign_payment without creating an in-app payment notice.
-- It does not replace admin_review_campaign; that function is defined by migration 01.

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

notify pgrst, 'reload schema';
