create table if not exists public.assistant_merchant_rules (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  phrases text[] not null,
  response text not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_merchant_rules_phrases_count check (
    cardinality(phrases) between 1 and 20
  ),
  constraint assistant_merchant_rules_response_length check (
    char_length(trim(response)) between 1 and 1000
  ),
  constraint assistant_merchant_rules_priority_range check (
    priority between 0 and 1000
  )
);

create index if not exists assistant_merchant_rules_lookup_idx
  on public.assistant_merchant_rules (merchant_id, priority, created_at)
  where is_active;

alter table public.assistant_merchant_rules enable row level security;
grant select, insert, update, delete on public.assistant_merchant_rules to authenticated;
grant select on public.assistant_merchant_rules to service_role;

drop policy if exists "assistant_merchant_rules_owner_manage" on public.assistant_merchant_rules;
create policy "assistant_merchant_rules_owner_manage"
  on public.assistant_merchant_rules
  for all
  to authenticated
  using (
    merchant_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'merchant'
    )
  )
  with check (
    merchant_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'merchant'
    )
  );

notify pgrst, 'reload schema';
