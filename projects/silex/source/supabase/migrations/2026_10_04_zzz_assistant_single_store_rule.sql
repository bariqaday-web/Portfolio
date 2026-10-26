create table if not exists public.assistant_merchant_rule_sets (
  merchant_id uuid primary key references public.profiles(id) on delete cascade,
  phrases text[] not null,
  response text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_merchant_rule_sets_phrases_count check (
    cardinality(phrases) between 1 and 200
  ),
  constraint assistant_merchant_rule_sets_response_length check (
    char_length(trim(response)) between 1 and 1000
  )
);

alter table public.assistant_merchant_rule_sets enable row level security;
grant select, insert, update on public.assistant_merchant_rule_sets to authenticated;
grant select on public.assistant_merchant_rule_sets to service_role;
revoke delete on public.assistant_merchant_rule_sets from authenticated;

-- The previous merchant-rules table is retired; merchants can no longer delete
-- its retained legacy rows through the client API.
revoke delete on public.assistant_merchant_rules from authenticated;

drop policy if exists "assistant_merchant_rule_sets_owner_manage" on public.assistant_merchant_rule_sets;
create policy "assistant_merchant_rule_sets_owner_manage"
  on public.assistant_merchant_rule_sets
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

-- Carry forward existing merchant rules only where there is exactly one active
-- response to preserve without merging unrelated trigger/response pairs.
insert into public.assistant_merchant_rule_sets (merchant_id, phrases, response, is_active)
select r.merchant_id, r.phrases, r.response, true
from public.assistant_merchant_rules r
where r.is_active
  and (
    select count(*)
    from public.assistant_merchant_rules existing
    where existing.merchant_id = r.merchant_id
      and existing.is_active
  ) = 1
on conflict (merchant_id) do nothing;

notify pgrst, 'reload schema';
