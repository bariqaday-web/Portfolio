update public.ad_packages
set daily_price = 0
where daily_price <> 0;

insert into public.platform_settings (key, value, updated_at)
values ('free_ads_quota', '2147483647', now())
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

grant select on public.campaigns to authenticated;

drop policy if exists campaigns_admin_select on public.campaigns;
create policy campaigns_admin_select on public.campaigns
  for select to authenticated
  using (public.is_admin());

notify pgrst, 'reload schema';
