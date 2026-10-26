-- Persist a user's hidden posts and keep hide records private to that user.
create table if not exists public.post_hides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_hides enable row level security;
revoke all on public.post_hides from public, anon, authenticated;
grant select, insert, delete on public.post_hides to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'post_hides'
  loop
    execute format('drop policy %I on public.post_hides', p.policyname);
  end loop;
end;
$$;

create policy post_hides_read_own
  on public.post_hides for select to authenticated
  using (user_id = auth.uid());
create policy post_hides_insert_own
  on public.post_hides for insert to authenticated
  with check (user_id = auth.uid());
create policy post_hides_delete_own
  on public.post_hides for delete to authenticated
  using (user_id = auth.uid());

notify pgrst, 'reload schema';
