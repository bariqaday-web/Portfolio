alter table public.notifications
  add column if not exists actor_avatar_url text;

create or replace function public.notify_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient_id uuid;
  v_sender_name text;
  v_sender_avatar text;
  v_title text;
  v_body text;
  v_type text;
begin
  select
    case
      when c.customer_id = new.sender_id then c.merchant_id
      when c.merchant_id = new.sender_id then c.customer_id
      else null
    end
    into v_recipient_id
    from public.conversations c
    where c.id = new.conversation_id;

  if v_recipient_id is null then
    return new;
  end if;

  select
    coalesce(nullif(trim(p.store_name), ''), nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), 'مستخدم'),
    p.avatar_url
    into v_sender_name, v_sender_avatar
    from public.profiles p
    where p.id = new.sender_id;

  if new.media_type = 'call' then
    v_type := 'call';
    v_title := coalesce(v_sender_name, 'مستخدم');
    v_body := coalesce(nullif(trim(new.content), ''), 'اتصال جديد');
  else
    v_type := 'message';
    v_title := 'رسالة جديدة من ' || coalesce(v_sender_name, 'مستخدم');
    v_body := coalesce(
      nullif(trim(new.content), ''),
      case new.media_type
        when 'image' then 'أرسل صورة'
        when 'video' then 'أرسل مقطع فيديو'
        when 'audio' then 'أرسل رسالة صوتية'
        else 'أرسل إليك رسالة'
      end
    );
  end if;

  insert into public.notifications (
    user_id,
    title,
    body,
    type,
    target_type,
    target_id,
    actor_avatar_url
  )
  values (
    v_recipient_id,
    v_title,
    left(v_body, 1000),
    v_type,
    'conversation',
    new.conversation_id,
    v_sender_avatar
  );

  return new;
end;
$$;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient
after insert on public.messages
for each row execute function public.notify_new_chat_message();

notify pgrst, 'reload schema';
