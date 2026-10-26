-- Add story campaigns while retaining the existing campaign creation checks.
alter table public.campaigns
  drop constraint if exists campaigns_type_check;

alter table public.campaigns
  add constraint campaigns_type_check
  check (type = any (array['product'::text, 'company'::text, 'promotion'::text, 'story'::text]));

insert into public.ad_templates (type, title, description, enabled, sort)
values ('story', 'قصة ممولة', 'قصة مصورة تظهر في شريط القصص', true, 4)
on conflict (type) do update
set title = excluded.title,
    description = excluded.description,
    sort = excluded.sort;

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
  v_free boolean := false;
  v_used integer;
  v_quota integer;
  v_period_start date;
  v_current_month date := date_trunc('month', now())::date;
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
  if p_type = 'product' and not exists (select 1 from public.products where id = p_target_id and merchant_id = v_uid) then
    raise exception 'BAD_TARGET';
  end if;
  if p_type in ('promotion', 'story') and coalesce(p_image_url, '') = '' then
    raise exception 'IMAGE_REQUIRED';
  end if;
  if coalesce(p_image_url, '') <> '' and p_image_url !~ '^https://' then raise exception 'BAD_IMAGE'; end if;
  if length(trim(coalesce(p_title, ''))) < 3 then raise exception 'BAD_TITLE'; end if;

  v_price := v_pkg.days::bigint * v_pkg.daily_price;

  insert into public.merchant_ad_quota (merchant_id, period_start)
  values (v_uid, v_current_month)
  on conflict do nothing;

  select free_used, period_start into v_used, v_period_start
  from public.merchant_ad_quota
  where merchant_id = v_uid
  for update;

  if v_period_start < v_current_month then
    update public.merchant_ad_quota
    set free_used = 0, period_start = v_current_month
    where merchant_id = v_uid;
    v_used := 0;
  end if;

  select coalesce((
    select case when value ~ '^[0-9]+$' then value::int end
    from public.platform_settings
    where key = 'free_ads_quota'
  ), 0)
  into v_quota;

  if v_price = 0 then
    v_free := true;
  elsif v_used < v_quota then
    v_free := true;
    update public.merchant_ad_quota
    set free_used = free_used + 1
    where merchant_id = v_uid;
  end if;

  insert into public.campaigns (
    merchant_id, type, title, description, image_url, target_id, target_province, target_category,
    daily_budget, total_budget, duration_days, package_id, price, is_free, status,
    design_color, design_shape
  ) values (
    v_uid, p_type, left(trim(p_title), 60), nullif(left(trim(coalesce(p_description, '')), 200), ''), p_image_url,
    case p_type when 'product' then p_target_id when 'company' then v_uid else null end,
    nullif(p_province, ''), nullif(p_category, ''),
    v_pkg.daily_price, v_price, v_pkg.days, v_pkg.id, v_price, v_free,
    case when v_free then 'pending_review' else 'pending_payment' end,
    case when p_color ~ '^#[0-9a-fA-F]{6}$' then lower(p_color) end,
    case when p_shape in ('orbit', 'arch', 'spark') then p_shape end
  )
  returning * into v_row;

  return v_row;
end
$function$;

grant execute on function public.create_campaign(text, text, text, text, text, uuid, text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';
