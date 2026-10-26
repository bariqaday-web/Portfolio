grant select on public.campaigns to authenticated;

alter table public.campaigns enable row level security;

drop policy if exists campaigns_select_merchant_or_admin on public.campaigns;
create policy campaigns_select_merchant_or_admin on public.campaigns
  for select to authenticated
  using (merchant_id = auth.uid() or public.is_admin());

update public.campaigns
set status = 'pending_review'
where status = 'pending_payment'
  and (is_free or price = 0)
  and receipt_path is null;

notify pgrst, 'reload schema';
