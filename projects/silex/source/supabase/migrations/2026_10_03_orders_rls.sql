grant select, insert on table public.orders to authenticated;

drop policy if exists "orders_read" on public.orders;
create policy "orders_read"
  on public.orders
  for select
  to authenticated
  using (customer_id = (select auth.uid()) or merchant_id = (select auth.uid()));

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
  on public.orders
  for insert
  to authenticated
  with check (customer_id = (select auth.uid()));
