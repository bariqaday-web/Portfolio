'use client'

import { useCallback, useEffect, useState } from 'react'
import { PERMS } from '@/lib/admin/perms'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'
import { BrandedActionDialog } from '@/components/ui/BrandedActionDialog'

type Staff = {
  id: string
  name: string
  username: string | null
  is_super: boolean
  perms: string[]
  is_me: boolean
}
type Candidate = {
  id: string
  full_name: string | null
  username: string | null
  store_name: string | null
  role: string | null
}
type Draft = { id: string; label: string; is_super: boolean; perms: string[] }
type ConfirmAction = { kind: 'super' } | { kind: 'remove'; staff: Staff }
type RoleFilter = 'all' | 'merchant' | 'customer'

const ERRORS: Record<string, string> = {
  FORBIDDEN: 'هذه الصفحة للمشرف العام فقط',
  CANNOT_DEMOTE_SELF: 'لا يمكنك تقليل صلاحياتك بنفسك',
  CANNOT_REMOVE_SELF: 'لا يمكنك إزالة نفسك',
  USER_NOT_FOUND: 'المستخدم غير موجود',
  NOT_ADMIN: 'هذا الحساب ليس مشرفاً',
}

function friendly(m: string) {
  const key = Object.keys(ERRORS).find((k) => m.includes(k))
  return key ? ERRORS[key] : m
}

const input = 'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40'
const label = (key: string) => PERMS.find((p) => p.key === key)?.label ?? key

export default function StaffPage() {
  const [rows, setRows] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [username, setUsername] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase.rpc('admin_list_staff')
    if (e) setError(friendly(e.message))
    else {
      setRows(Array.isArray(data) ? (data as Staff[]) : [])
      setError('')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function searchUsers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const term = username.trim().replace(/^@/, '').replace(/[%_,()]/g, ' ')
    if (!term) return
    setOk('')
    setError('')
    setSearching(true)
    setCandidates([])
    let query = supabase
      .from('profiles')
      .select('id, full_name, username, store_name, role')
      .neq('role', 'admin')
      .or(`full_name.ilike.%${term}%,username.ilike.%${term}%,store_name.ilike.%${term}%`)
      .order('created_at', { ascending: false })
      .limit(20)
    if (roleFilter !== 'all') query = query.eq('role', roleFilter)
    const { data, error: e } = await query
    setSearching(false)
    if (e) return setError(e.message)
    setCandidates((data ?? []) as Candidate[])
    if (!data?.length) setError('ما لقينا مستخدمين مطابقين للبحث')
  }

  function startAdd(user: Candidate) {
    setError('')
    setOk('')
    setDraft({
      id: user.id,
      label: user.store_name || user.full_name || (user.username ? `@${user.username}` : 'مستخدم'),
      is_super: false,
      perms: [],
    })
  }

  function startEdit(s: Staff) {
    setOk('')
    setError('')
    setDraft({ id: s.id, label: s.name, is_super: s.is_super, perms: s.perms })
  }

  const toggle = (key: string) =>
    setDraft((d) =>
      d ? { ...d, perms: d.perms.includes(key) ? d.perms.filter((x) => x !== key) : [...d.perms, key] } : d,
    )

  async function save() {
    if (!draft) return
    if (!draft.is_super && draft.perms.length === 0) {
      return setError('اختر قسماً واحداً على الأقل أو اجعله مشرفاً عاماً')
    }
    if (draft.is_super) {
      setConfirmAction({ kind: 'super' })
      return
    }
    await saveDraft()
  }

  async function saveDraft() {
    if (!draft) return
    setBusy(true)
    setOk('')
    setError('')
    const { error: e } = await supabase.rpc('admin_set_staff', {
      p_user: draft.id,
      p_super: draft.is_super,
      p_perms: draft.perms,
    })
    setBusy(false)
    if (e) return setError(friendly(e.message))
    await logAction('staff.save', 'profiles', draft.id)
    setOk('تم حفظ الصلاحيات')
    setDraft(null)
    setCandidates([])
    void load()
  }

  async function remove(s: Staff) {
    setConfirmAction({ kind: 'remove', staff: s })
  }

  async function removeStaff(s: Staff) {
    setOk('')
    setError('')
    const { error: e } = await supabase.rpc('admin_remove_staff', { p_user: s.id })
    if (e) return setError(friendly(e.message))
    await logAction('staff.remove', 'profiles', s.id)
    setOk('تمت إزالة المشرف')
    void load()
  }

  function confirmPendingAction() {
    const action = confirmAction
    setConfirmAction(null)
    if (action?.kind === 'super') void saveDraft()
    else if (action?.kind === 'remove') void removeStaff(action.staff)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">المشرفون والصلاحيات</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">إضافة مشرف</h2>
        <form onSubmit={searchUsers} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ابحث بالاسم أو اسم المستخدم"
            className={input}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            aria-label="تصفية حسب نوع الحساب"
            className={`${input} sm:w-36`}
          >
            <option value="all">كل الحسابات</option>
            <option value="merchant">التجار</option>
            <option value="customer">الزبائن</option>
          </select>
          <button
            type="submit"
            disabled={!username.trim() || searching}
            className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {searching ? 'جارٍ البحث...' : 'بحث'}
          </button>
        </form>
        {candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            {candidates.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.store_name || user.full_name || 'بدون اسم'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {user.username ? `@${user.username} · ` : ''}
                    {user.role === 'merchant' ? 'تاجر' : 'زبون'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startAdd(user)}
                  className="h-9 shrink-0 rounded-full border border-border px-4 text-xs font-semibold"
                >
                  اختيار لإضافة مشرف
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {draft && (
        <section className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-card p-5">
          <h2 className="text-lg font-semibold">صلاحيات {draft.label}</h2>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={draft.is_super}
              onChange={(e) => setDraft({ ...draft, is_super: e.target.checked })}
            />
            مشرف عام (كل الصلاحيات وإدارة المشرفين)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {PERMS.map((p) => (
              <label key={p.key} className={`flex items-center gap-2 text-sm ${draft.is_super ? 'opacity-40' : ''}`}>
                <input
                  type="checkbox"
                  disabled={draft.is_super}
                  checked={draft.is_super || draft.perms.includes(p.key)}
                  onChange={() => toggle(p.key)}
                />
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="h-11 rounded-full border border-border px-6 text-sm">
              إلغاء
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">المشرفون الحاليون</h2>
        {loading ? (
          <p className="text-sm text-muted">جارٍ التحميل...</p>
        ) : (
          rows.map((s) => (
            <article key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">
                  {s.name}
                  {s.is_me && <span className="mr-2 text-xs text-muted">(أنت)</span>}
                </p>
                {s.username && <p className="text-xs text-muted">@{s.username}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.is_super ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] text-emerald-700">مشرف عام</span>
                  ) : (
                    s.perms.map((k) => (
                      <span key={k} className="rounded-full bg-chip px-3 py-1 text-[11px]">
                        {label(k)}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(s)} className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold">
                  تعديل الصلاحيات
                </button>
                {!s.is_me && (
                  <button type="button" onClick={() => remove(s)} className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white">
                    إزالة
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
      <BrandedActionDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={confirmAction?.kind === 'super' ? 'تعيين مشرف عام؟' : 'إزالة صلاحية المشرف؟'}
        description={
          confirmAction?.kind === 'super'
            ? 'المشرف العام يستطيع إدارة جميع الأقسام والمشرفين. هل تريد المتابعة؟'
            : confirmAction?.kind === 'remove'
              ? `هل تريد إزالة صلاحية المشرف عن ${confirmAction.staff.name}؟`
              : ''
        }
        confirmLabel={confirmAction?.kind === 'super' ? 'تعيين مشرف عام' : 'إزالة الصلاحية'}
        destructive={confirmAction?.kind === 'remove'}
        busy={busy}
        onConfirm={confirmPendingAction}
      />
    </div>
  )
}
