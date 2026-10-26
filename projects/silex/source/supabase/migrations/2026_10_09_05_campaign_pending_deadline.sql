alter table public.campaigns
  add column if not exists pending_deadline_at timestamptz,
  add column if not exists expired_at timestamptz;

create or replace function public.ensure_campaign_deadline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('pending_payment', 'pending_review') then
    if new.pending_deadline_at is null or new.pending_deadline_at < now() then
      new.pending_deadline_at = now() + interval '72 hours';
    end if;
  else
    new.pending_deadline_at = null;
  end if;

  if new.status in ('pending_payment', 'pending_review')
    and new.pending_deadline_at is not null
    and new.pending_deadline_at <= now() then
    new.status = 'expired';
    new.expired_at = coalesce(new.expired_at, now());
  end if;

  return new;
end
$$;

drop trigger if exists trg_campaign_pending_deadline on public.campaigns;
create trigger trg_campaign_pending_deadline
before insert or update on public.campaigns
for each row
execute function public.ensure_campaign_deadline();

create or replace function public.expire_stale_campaigns()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
begin
  update public.campaigns
  set status = 'expired',
      expired_at = coalesce(expired_at, now()),
      updated_at = now()
  where status in ('pending_payment', 'pending_review')
    and pending_deadline_at is not null
    and pending_deadline_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

grant execute on function public.expire_stale_campaigns() to authenticated;

update public.campaigns
set pending_deadline_at = now() + interval '72 hours'
where status in ('pending_payment', 'pending_review')
  and pending_deadline_at is null;

notify pgrst, 'reload schema';
