alter table public.campaigns
  add column if not exists payer_name text,
  add column if not exists payment_last4 text;

drop function if exists public.submit_campaign_payment(uuid, text, text, text, text, text);
drop function if exists public.submit_campaign_payment(uuid, text, text, text);

create or replace function public.submit_campaign_payment(
  p_campaign_id uuid,
  p_receipt_path text,
  p_payment_ref text,
  p_payment_method text,
  p_payer_name text default null,
  p_payment_last4 text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ref text := upper(trim(coalesce(p_payment_ref, '')));
  v_name text := trim(coalesce(p_payer_name, ''));
  v_last4 text := trim(coalesce(p_payment_last4, ''));
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_payment_method is null or p_payment_method not in ('card', 'iban') then
    raise exception 'BAD_PAYMENT_METHOD';
  end if;

  if v_ref !~ '^[A-Z0-9-]{6,40}$' then
    raise exception 'BAD_REF';
  end if;

  if v_name = '' then
    raise exception 'BAD_PAYER_NAME';
  end if;

  if v_last4 <> '' and v_last4 !~ '^[0-9]{4}$' then
    raise exception 'BAD_LAST4';
  end if;

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
  if not found then
    raise exception 'NOT_PAYABLE';
  end if;

  update public.campaigns
  set receipt_path = p_receipt_path,
      payment_ref = v_ref,
      payment_method = p_payment_method,
      payer_name = left(trim(v_name), 80),
      payment_last4 = right('0000' || trim(v_last4), 4),
      status = 'pending_review',
      payment_status = 'pending_review',
      refund_status = 'none',
      review_note = null,
      updated_at = now()
  where id = p_campaign_id;
end
$function$;

revoke all on function public.submit_campaign_payment(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_campaign_payment(uuid, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
