update public.ad_packages
set daily_price = 0
where daily_price <> 0;

insert into public.platform_settings (key, value, updated_at)
values ('free_ads_quota', '2147483647', now())
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
