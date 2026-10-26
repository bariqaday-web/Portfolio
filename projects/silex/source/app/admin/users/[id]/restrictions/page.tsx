'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type User = {
  id: string
  full_name: string | null
  username: string | null
  store_name: string | null
  role: string | null
}

type Restriction = {
  posts_restricted: boolean
  stories_restricted: boolean
  comments_restricted: boolean
  reason: string
}

const EMPTY_RESTRICTION: Restriction = {
  posts_restricted: false,
  stories_restricted: false,
  comments_restricted: false,
  reason: '',
}

const OPTIONS = [
  ['posts_restricted', 'منع نشر المنشورات'],
  ['stories_restricted', 'منع نشر القصص'],
  ['comments_restricted', 'منع كتابة التعليقات'],
] as const

const btn = 'rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50'

export default function ContentRestrictionsPage() {
  const params = useParams<{ id: string }>()
  const userId = params.id
  const [user, setUser] = useState<User | null>(null)
  const [draft, setDraft] = useState<Restriction>(EMPTY_RESTRICTION)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [userResult, restrictionResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, username, store_name, role')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_content_restrictions')
        .select('posts_restricted, stories_restricted, comments_restricted, reason')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    if (userResult.error) {
      setError(userResult.error.message)
    } else if (!userResult.data) {
      setError('المستخدم غير موجود')
    } else if (userResult.data.role === 'admin') {
      setError('لا يمكن تقييد حساب إداري')
      setUser(userResult.data as User)
    } else if (restrictionResult.error) {
      setError(restrictionResult.error.message)
      setUser(userResult.data as User)
    } else {
      setUser(userResult.data as User)
      setDraft(restrictionResult.data
        ? {
            posts_restricted: restrictionResult.data.posts_restricted,
            stories_restricted: restrictionResult.data.stories_restricted,
            comments_restricted: restrictionResult.data.comments_restricted,
            reason: restrictionResult.data.reason ?? '',
          }
        : EMPTY_RESTRICTION)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!user || user.role === 'admin') return
    setBusy(true)
    setError('')
    setSuccess('')
    const { error: saveError } = await supabase.rpc('admin_set_content_restrictions', {
      p_user: user.id,
      p_posts: draft.posts_restricted,
      p_stories: draft.stories_restricted,
      p_comments: draft.comments_restricted,
      p_reason: draft.reason.trim(),
    })
    if (saveError) {
      const message = saveError.message
      setError(message.includes('SELF')
        ? 'لا يمكن تقييد حسابك الشخصي'
        : message.includes('FORBIDDEN')
          ? 'ليست لديك صلاحية الأدمن'
          : message.includes('NOT_FOUND')
            ? 'المستخدم غير موجود'
            : message)
      setBusy(false)
      return
    }

    try {
      await logAction('user.content_restrictions', 'profiles', user.id, {
        posts_restricted: draft.posts_restricted,
        stories_restricted: draft.stories_restricted,
        comments_restricted: draft.comments_restricted,
      })
    } catch (logError) {
      console.error('تعذر تسجيل عملية تقييد المحتوى', logError)
    }
    setBusy(false)
    setSuccess('تم تحديث القيود وإشعار المستخدم')
  }

  const userName = user?.store_name || user?.full_name || (user?.username ? `@${user.username}` : 'مستخدم')

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href="/admin/users" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted hover:text-foreground">
        <ArrowRight aria-hidden="true" className="size-4" />
        العودة إلى المستخدمين
      </Link>

      <header>
        <h1 className="text-2xl font-semibold">إدارة تقييد المحتوى</h1>
        {user && (
          <p className="mt-1 text-sm text-muted">
            {userName}{user.username && userName !== `@${user.username}` ? ` · @${user.username}` : ''}
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted">جارٍ تحميل بيانات المستخدم والقيود...</p>
      ) : error && !user ? (
        <p role="alert" className="rounded-xl bg-red-100 p-4 text-sm text-red-800">{error}</p>
      ) : (
        <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <p className="text-sm leading-6 text-muted">
            اختر الميزات التي تريد منعها عن هذا الحساب. سيتم إشعار المستخدم عند حفظ التغييرات.
          </p>

          {OPTIONS.map(([key, label]) => (
            <label key={key} className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={draft[key]}
                disabled={busy || user?.role === 'admin'}
                onChange={(event) => setDraft((value) => ({ ...value, [key]: event.target.checked }))}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          ))}

          <label className="flex flex-col gap-2 text-sm font-medium">
            سبب التقييد
            <textarea
              rows={4}
              maxLength={200}
              value={draft.reason}
              disabled={busy || user?.role === 'admin'}
              onChange={(event) => setDraft((value) => ({ ...value, reason: event.target.value }))}
              placeholder="اكتب السبب الذي سيظهر للمستخدم في الإشعار"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-normal outline-none focus:border-foreground/40 disabled:opacity-50"
            />
          </label>

          {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
          {success && <p role="status" className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{success}</p>}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <button
              type="button"
              disabled={busy || loading || !user || user.role === 'admin'}
              onClick={() => void save()}
              className={`${btn} bg-primary text-primary-foreground`}
            >
              {busy ? 'جارٍ الحفظ...' : 'حفظ وإشعار المستخدم'}
            </button>
            <Link href="/admin/users" className={`${btn} border border-border text-center`}>
              إلغاء
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
