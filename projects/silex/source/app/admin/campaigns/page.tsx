'use client'

import { useCallback, useEffect, useState } from 'react'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'
import { AdPreview } from '@/components/admin/AdPreview'
import { AD_STATUS, AD_TYPE_LABEL, resolveCampaignStatus } from '@/lib/ad-templates'

type Row = {
  id: string
  merchant_id: string
  type: string
  title: string
  image_url: string | null
  status: string
  price: number
  total_budget: number
  is_free: boolean
  duration_days: number
  target_province: string | null
  payment_ref: string | null
  payment_method: string | null
  payment_last4: string | null
  payer_name: string | null
  pending_deadline_at: string | null
  receipt_path: string | null
  refund_status: string | null
  review_note: string | null
  created_at: string
}
type Tab = 'pending_review' | 'pending_payment' | 'active' | 'all'
type Decision = 'approve' | 'reject' | 'pause' | 'resume' | 'confirm_refund'

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending_review', label: 'بانتظار المراجعة' },
  { key: 'pending_payment', label: 'بانتظار الدفع' },
  { key: 'active', label: 'نشطة' },
  { key: 'all', label: 'الكل' },
]

const DECISIONS: Record<Decision, { title: string; confirm: string; note: boolean }> = {
  approve: { title: 'الموافقة على الإعلان', confirm: 'موافقة', note: false },
  reject: { title: 'رفض الإعلان', confirm: 'رفض', note: true },
  pause: { title: 'إيقاف الإعلان', confirm: 'إيقاف', note: false },
  resume: { title: 'استئناف الإعلان', confirm: 'استئناف', note: false },
  confirm_refund: { title: 'تأكيد إعادة المبلغ يدويًا', confirm: 'تأكيد الإعادة', note: false },
}

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n || 0))
const btn = 'rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-50'

function errText(e: unknown) {
  const m = (e as { message?: string } | null)?.message ?? ''
  if (m.includes('NOT_REVIEWABLE')) return 'لا يمكن تنفيذ هذا الإجراء على حالة الإعلان الحالية، حدّث الصفحة وحاول مجدداً'
  if (m.includes('FORBIDDEN')) return 'ليست لديك صلاحية الأدمن'
  return m || 'خطأ غير معروف'
}

export default function CampaignsPage() {
  const [tab, setTab] = useState<Tab>('pending_review')
  const [rows, setRows] = useState<Row[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [dlg, setDlg] = useState<{ row: Row; decision: Decision } | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('campaigns')
      .select(
        'id, merchant_id, type, title, image_url, status, price, total_budget, is_free, duration_days, target_province, payment_ref, payment_method, payment_last4, payer_name, pending_deadline_at, receipt_path, refund_status, review_note, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100)
    if (tab !== 'all') q = q.eq('status', tab)
    const { data, error: e } = await q
    if (e) {
      setError(e.message)
      setLoading(false)
      return
    }
    const list = (data ?? []) as Row[]
    setRows(list)
    const ids = Array.from(new Set(list.map((r) => r.merchant_id)))
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, store_name, full_name, username').in('id', ids)
      const map: Record<string, string> = {}
      for (const p of (ps ?? []) as { id: string; store_name: string | null; full_name: string | null; username: string | null }[]) {
        map[p.id] = p.store_name || p.full_name || p.username || 'تاجر'
      }
      setNames(map)
    }
    setError('')
    setLoading(false)
  }, [tab])

  useEffect(() => {
    void load()
  }, [load])

  async function openReceipt(path: string) {
    const { data, error: e } = await supabase.storage.from('receipts').createSignedUrl(path, 300)
    if (e || !data) {
      setError('تعذّر فتح الإيصال')
      return
    }
    setReceiptUrl(data.signedUrl)
  }

  function ask(row: Row, decision: Decision) {
    setNote('')
    setOk('')
    setError('')
    setDlg({ row, decision })
  }

  async function decide() {
    if (!dlg) return
    const cfg = DECISIONS[dlg.decision]
    if (cfg.note && note.trim().length < 3) {
      setError('اكتب سبباً واضحاً (3 أحرف على الأقل)')
      return
    }
    setBusy(true)
    const actionStartedAt = new Date().toISOString()
    const { error: e } = await supabase.rpc('admin_review_campaign', {
      p_campaign_id: dlg.row.id,
      p_decision: dlg.decision,
      p_note: cfg.note ? note.trim() : null,
    })
    if (e) {
      setBusy(false)
      setError(errText(e))
      return
    }
    const { data: recentNotification, error: notificationLookupError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', dlg.row.merchant_id)
      .gte('created_at', actionStartedAt)
      .or('type.ilike.%campaign%,type.ilike.%ad%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (notificationLookupError) {
      setError(`تم تنفيذ الإجراء، لكن تعذّر ربط إشعار الإعلان: ${notificationLookupError.message}`)
      setDlg(null)
      setBusy(false)
      void load()
      return
    }
    if (recentNotification) {
      const { error: targetError } = await supabase
        .from('notifications')
        .update({ target_type: 'campaign', target_id: dlg.row.id })
        .eq('id', recentNotification.id)
      if (targetError) {
        setError(`تم تنفيذ الإجراء، لكن تعذّر ربط إشعار الإعلان: ${targetError.message}`)
        setDlg(null)
        setBusy(false)
        void load()
        return
      }
    } else {
      const statusMessage: Record<Decision, { title: string; body: string }> = {
        approve: {
          title: 'تمت الموافقة على إعلانك',
          body: `تمت الموافقة على إعلان "${dlg.row.title}"`,
        },
        reject: {
          title: 'تم رفض إعلانك',
          body: `تم رفض إعلان "${dlg.row.title}"`,
        },
        pause: {
          title: 'تم إيقاف إعلانك',
          body: `تم إيقاف إعلان "${dlg.row.title}"`,
        },
        resume: {
          title: 'تم استئناف إعلانك',
          body: `تم استئناف إعلان "${dlg.row.title}"`,
        },
        confirm_refund: {
          title: 'تم تسجيل إعادة مبلغ إعلانك',
          body: `أكدت الإدارة إعادة مبلغ إعلان "${dlg.row.title}" يدويًا`,
        },
      }
      const message = statusMessage[dlg.decision]
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: dlg.row.merchant_id,
        title: message.title,
        body: message.body,
        type: 'campaign_update',
        target_type: 'campaign',
        target_id: dlg.row.id,
      })
      if (notificationError) {
        setError(`تم تنفيذ الإجراء، لكن تعذّر إنشاء إشعار مرتبط بالإعلان: ${notificationError.message}`)
        setDlg(null)
        setBusy(false)
        void load()
        return
      }
    }
    setBusy(false)
    try {
      await logAction('campaign.' + dlg.decision, 'campaigns', dlg.row.id, { title: dlg.row.title })
    } catch {}
    setDlg(null)
    setError('')
    setOk('تم تنفيذ الإجراء')
    void load()
  }

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">الإعلانات</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`${btn} ${tab === t.key ? 'bg-primary text-primary-foreground' : 'border border-border'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      {loading ? (
        <p className="text-sm text-muted">جارٍ التحميل...</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">لا توجد إعلانات هنا.</p>
      ) : (
        rows.map((r) => {
          const resolvedStatus = resolveCampaignStatus(r.status, r.pending_deadline_at)
          const st = AD_STATUS[resolvedStatus] ?? { label: r.status, cls: 'bg-secondary text-muted' }
          const canApprove = resolvedStatus !== 'expired' && (r.is_free || (!!r.receipt_path && !!r.payment_ref && !!r.payment_method))
          return (
            <div key={r.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {AD_TYPE_LABEL[r.type] ?? r.type} · {names[r.merchant_id] ?? 'تاجر'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
              </div>

              <AdPreview id={r.id} defaultOpen={resolvedStatus === 'pending_review'} />

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>{r.is_free ? 'قديم / مجاني' : fmtUSD(r.price || r.total_budget)}</span>
                <span>{r.duration_days} أيام</span>
                <span>{r.target_province ?? 'حسب المتجر'}</span>
                <span>{new Date(r.created_at).toLocaleDateString('ar')}</span>
              </div>

              {r.payment_ref && (
                <p className="text-xs">
                  رقم العملية: <span dir="ltr" className="font-mono">{r.payment_ref}</span>
                </p>
              )}
              {(r.payer_name || r.payment_last4) && (
                <p className="text-xs text-muted">
                  المحوّل: {r.payer_name || 'غير محدد'}{r.payment_last4 ? ` • آخر 4: ${r.payment_last4}` : ''}
                </p>
              )}
              {r.pending_deadline_at && (resolvedStatus === 'pending_review' || resolvedStatus === 'pending_payment') && (
                <p className="text-xs text-muted">
                  المهلة: {new Date(r.pending_deadline_at).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
              {r.payment_method && <span className="text-xs text-muted">طريقة التحويل: {r.payment_method === 'iban' ? 'IBAN دولي' : 'بطاقة / حساب محلي'}</span>}
              {r.refund_status && r.refund_status !== 'none' && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  حالة الإعادة اليدوية: {r.refund_status === 'refunded' ? 'تم تأكيد إعادة المبلغ' : 'بانتظار إعادة المبلغ وتأكيدها'}
                </p>
              )}
              {r.review_note && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">ملاحظة سابقة: {r.review_note}</p>}

              <div className="flex flex-wrap items-center gap-2">
                {r.receipt_path && (
                  <button type="button" onClick={() => openReceipt(r.receipt_path as string)} className={`${btn} border border-border`}>
                    عرض الإيصال
                  </button>
                )}
                {resolvedStatus === 'pending_review' && (
                  <>
                    <button
                      type="button"
                      disabled={!canApprove}
                      onClick={() => ask(r, 'approve')}
                      className={`${btn} bg-green-600 text-white`}
                    >
                      موافقة
                    </button>
                    <button type="button" onClick={() => ask(r, 'reject')} className={`${btn} bg-red-600 text-white`}>
                      رفض
                    </button>
                    {!canApprove && <span className="text-xs text-muted">لا يوجد إيصال لهذا الإعلان</span>}
                  </>
                )}
                {r.status === 'rejected' && r.refund_status === 'pending' && (
                  <button type="button" onClick={() => ask(r, 'confirm_refund')} className={`${btn} bg-amber-600 text-white`}>
                    تأكيد إعادة المبلغ بعد تحويله يدويًا
                  </button>
                )}
                {resolvedStatus === 'active' && (
                  <button type="button" onClick={() => ask(r, 'pause')} className={`${btn} border border-border`}>
                    إيقاف
                  </button>
                )}
                {resolvedStatus === 'paused' && (
                  <button type="button" onClick={() => ask(r, 'resume')} className={`${btn} border border-border`}>
                    استئناف
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}

      {dlg && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-card p-5">
            <h3 className="text-lg font-semibold">{DECISIONS[dlg.decision].title}</h3>
            <p className="text-sm text-muted">{dlg.row.title}</p>
            {dlg.decision === 'confirm_refund' && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                استخدم هذا الإجراء بعد أن تعيد المبلغ فعليًا من تطبيق البنك أو البطاقة. الضغط هنا يسجل تأكيد الإدارة فقط، ولا ينفّذ التحويل.
              </p>
            )}
            {DECISIONS[dlg.decision].note && (
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="اكتب السبب ليصل للتاجر"
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"
              />
            )}
            {error && <p className="rounded-lg bg-red-100 p-2 text-xs text-red-800">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={decide}
                className={`${btn} flex-1 py-2.5 text-sm ${dlg.decision === 'reject' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground'}`}
              >
                {busy ? 'جارٍ التنفيذ...' : DECISIONS[dlg.decision].confirm}
              </button>
              <button type="button" disabled={busy} onClick={() => setDlg(null)} className={`${btn} border border-border py-2.5 text-sm`}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptUrl && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4" onClick={() => setReceiptUrl(null)}>
          <img src={receiptUrl} alt="الإيصال" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
          <button type="button" className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black">
            إغلاق
          </button>
        </div>
      )}
    </div>
  )
}
