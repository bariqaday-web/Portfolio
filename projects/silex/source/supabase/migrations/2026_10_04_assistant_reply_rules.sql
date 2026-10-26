create table if not exists public.assistant_reply_rules (
  id uuid primary key default gen_random_uuid(),
  phrases text[] not null,
  response text not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_reply_rules_phrases_count check (
    cardinality(phrases) between 1 and 12
  ),
  constraint assistant_reply_rules_response_length check (
    char_length(trim(response)) between 1 and 1000
  )
);

create index if not exists assistant_reply_rules_active_priority_idx
  on public.assistant_reply_rules (priority, created_at)
  where is_active;

alter table public.assistant_reply_rules enable row level security;

grant select, insert, update, delete on public.assistant_reply_rules to authenticated;
grant select on public.assistant_reply_rules to service_role;

drop policy if exists "assistant_reply_rules_admin_manage" on public.assistant_reply_rules;
create policy "assistant_reply_rules_admin_manage"
  on public.assistant_reply_rules
  for all
  to authenticated
  using (coalesce(public.my_admin_permissions() ->> 'super', 'false') = 'true')
  with check (coalesce(public.my_admin_permissions() ->> 'super', 'false') = 'true');

notify pgrst, 'reload schema';
