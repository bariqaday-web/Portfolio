-- Allow each merchant to manage multiple isolated reply rules.
grant select, insert, update, delete on public.assistant_merchant_rules to authenticated;

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

-- Preserve existing single-rule merchant settings, splitting long phrase lists
-- into the 20-phrase chunks supported by the multi-rule table.
insert into public.assistant_merchant_rules (merchant_id, phrases, response, priority, is_active)
select legacy.merchant_id, legacy.phrases[start_at:least(start_at + 19, cardinality(legacy.phrases))],
       legacy.response, 100, legacy.is_active
from public.assistant_merchant_rule_sets legacy
cross join lateral generate_series(
  1,
  greatest(1, ceil(cardinality(legacy.phrases)::numeric / 20)::integer)
) as chunks(start_at)
where not exists (
  select 1
  from public.assistant_merchant_rules current_rule
  where current_rule.merchant_id = legacy.merchant_id
    and current_rule.phrases = legacy.phrases[start_at:least(start_at + 19, cardinality(legacy.phrases))]
    and current_rule.response = legacy.response
);

-- Initial editable platform rules for common short and unexpected messages.
insert into public.assistant_reply_rules (phrases, response, priority, is_active)
select seed.phrases, seed.response, seed.priority, true
from (values
  (
    array['اريد اسلك', 'اريد اسألك', 'أريد أسألك', 'عندي سؤال', 'ممكن سؤال', 'ممكن استفسار', 'أحد يجاوب']::text[],
    'أهلاً بك! تفضل اسأل، أنا بانتظارك ومستعد لمساعدتك عن المنتجات أو الأسعار أو الطلبات. ||| حياك الله! اسألني عن المنتجات أو الأسعار أو طريقة الطلب وأنا بالخدمة.',
    10
  ),
  (
    array['مرحبا', 'موجود', 'موجودين', 'السلام عليكم', 'هلا']::text[],
    'حياك الله! تفضل باستفسارك عن منتجات هذا المتجر أو أسعاره أو طريقة الطلب. ||| أهلاً وسهلاً! شنو تحب تعرف عن منتجات المتجر؟',
    15
  ),
  (
    array['شنو شغلك', 'ما تفهم', 'ما جاي تفهمني', 'انت بوت', 'تعبتني', 'ما جاوبتني']::text[],
    'حقك عليّ، أعتذر عن اللخبطة. أنا مساعد المتجر وأقدر أساعدك بمعلوماته المسجلة؛ وضّح لي طلبك وسأحاول خدمتك بشكل أفضل. ||| أعتذر منك على اللبس! اكتب لي شنو تحتاج بالتحديد وأساعدك بمعلومات المتجر المسجلة.',
    20
  )
) as seed(phrases, response, priority)
where not exists (
  select 1
  from public.assistant_reply_rules existing
  where existing.phrases = seed.phrases
    and existing.response = seed.response
);

notify pgrst, 'reload schema';
