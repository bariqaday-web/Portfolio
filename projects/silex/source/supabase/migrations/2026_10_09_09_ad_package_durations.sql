-- Give merchants daily, weekly, and monthly campaign durations.
-- Prices are deliberately preserved and remain editable by administrators.
update public.ad_packages
set label = 'يومي',
    days = 1,
    active = true,
    sort = 1
where id = 'basic';

update public.ad_packages
set label = 'أسبوعي',
    days = 7,
    active = true,
    sort = 2
where id = 'standard';

update public.ad_packages
set label = 'شهري',
    days = 30,
    active = true,
    sort = 3
where id = 'premium';

notify pgrst, 'reload schema';
