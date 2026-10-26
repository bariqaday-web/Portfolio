-- Seed a usable $5/day starting rate only for the three standard ad packages
-- when their current rate is zero. Admins can change each rate afterward.
update public.ad_packages
set daily_price = 5
where id in ('basic', 'standard', 'premium')
  and coalesce(daily_price, 0) = 0;

notify pgrst, 'reload schema';
