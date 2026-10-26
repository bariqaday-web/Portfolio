grant select, insert on table realtime.messages to authenticated;

drop policy if exists chat_presence_read on realtime.messages;
create policy chat_presence_read on realtime.messages
  for select to authenticated
  using (
    (
      split_part(realtime.topic(), ':', 1) = 'user-presence'
      and exists (
        select 1
        from public.conversations c
        where split_part(realtime.topic(), ':', 2) in (c.customer_id::text, c.merchant_id::text)
          and auth.uid() in (c.customer_id, c.merchant_id)
      )
    )
    or (
      split_part(realtime.topic(), ':', 1) = 'conversation-presence'
      and exists (
        select 1 from public.conversations c
        where c.id::text = split_part(realtime.topic(), ':', 2)
          and auth.uid() in (c.customer_id, c.merchant_id)
      )
    )
  );

drop policy if exists chat_presence_write on realtime.messages;
create policy chat_presence_write on realtime.messages
  for insert to authenticated
  with check (
    (
      split_part(realtime.topic(), ':', 1) = 'user-presence'
      and split_part(realtime.topic(), ':', 2) = auth.uid()::text
    )
    or (
      split_part(realtime.topic(), ':', 1) = 'conversation-presence'
      and exists (
        select 1 from public.conversations c
        where c.id::text = split_part(realtime.topic(), ':', 2)
          and auth.uid() in (c.customer_id, c.merchant_id)
      )
    )
  );
