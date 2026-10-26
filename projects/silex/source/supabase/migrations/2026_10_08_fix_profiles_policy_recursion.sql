-- دائرة بين سياسة profiles وسياسة stories سببت خطأ 500 (infinite recursion)
drop policy if exists profiles_read_story_viewers on public.profiles;

-- سياسات القراءة تنادي هذه الدوال، والزائر غير المسجل يحتاج صلاحية تنفيذها
grant execute on function public.has_perm(text) to anon;
grant execute on function public.is_super_admin() to anon;
grant execute on function public.can_write_setting(text) to anon;

-- سياسات مراجعة البلاغات تنطبق على المسجلين فقط (الزائر ما يملك صلاحية على reports)
drop policy if exists conversations_admin_read_reported on public.conversations;
create policy conversations_admin_read_reported on public.conversations
  for select to authenticated
  using (public.has_perm('reports') and exists (select 1 from public.reports r where r.conversation_id = conversations.id));

drop policy if exists messages_admin_read_reported on public.messages;
create policy messages_admin_read_reported on public.messages
  for select to authenticated
  using (public.has_perm('reports') and exists (select 1 from public.reports r where r.conversation_id = messages.conversation_id));
