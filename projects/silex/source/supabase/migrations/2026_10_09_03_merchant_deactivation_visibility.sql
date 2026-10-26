-- Hide products when an account stops being a merchant; restore only products hidden by this transition.
alter table public.products
  add column if not exists is_active boolean not null default true,
  add column if not exists merchant_hidden_by_role boolean not null default false;

create or replace function public.is_active_merchant(p_merchant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_merchant_id
      and role = 'merchant'
  );
$$;

revoke all on function public.is_active_merchant(uuid) from public;
grant execute on function public.is_active_merchant(uuid) to anon, authenticated;

create or replace function public.sync_merchant_products_for_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = 'merchant' and new.role is distinct from 'merchant' then
    update public.products
    set is_active = false,
        merchant_hidden_by_role = true
    where merchant_id = new.id
      and is_active
      and not merchant_hidden_by_role;
  elsif old.role is distinct from 'merchant' and new.role = 'merchant' then
    update public.products
    set is_active = true,
        merchant_hidden_by_role = false
    where merchant_id = new.id
      and merchant_hidden_by_role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_merchant_products on public.profiles;
create trigger profiles_sync_merchant_products
after update of role on public.profiles
for each row
execute function public.sync_merchant_products_for_role();

drop policy if exists products_active_merchant_read on public.products;
create policy products_active_merchant_read on public.products
  as restrictive for select to anon, authenticated
  using (is_active and public.is_active_merchant(merchant_id));

drop policy if exists products_active_merchant_insert on public.products;
create policy products_active_merchant_insert on public.products
  as restrictive for insert to authenticated
  with check (auth.uid() = merchant_id and public.is_active_merchant(merchant_id));

drop policy if exists products_active_merchant_update on public.products;
create policy products_active_merchant_update on public.products
  as restrictive for update to authenticated
  using (auth.uid() = merchant_id and public.is_active_merchant(merchant_id))
  with check (auth.uid() = merchant_id and public.is_active_merchant(merchant_id));

drop policy if exists products_active_merchant_delete on public.products;
create policy products_active_merchant_delete on public.products
  as restrictive for delete to authenticated
  using (auth.uid() = merchant_id and public.is_active_merchant(merchant_id));
