'use client'

import { useCallback, useEffect, useState } from 'react'
import { logAction } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Pkg = { id: string; label: string; days: number; daily_price: number; active: boolean; sort: number }
type Tpl = { type: string; title: string; description: string; enabled: boolean; sort: number }
type Cfg = {
  payment_card_number: string
  payment_card_holder: string
  payment_iban: string
  payment_iban_holder: string
  payment_note: string
}

const CFG_KEYS = ['payment_card_number', 'payment_card_holder', 'payment_iban', 'payment_iban_holder', 'payment_note'] as const
const EMPTY_CFG: Cfg = {
  payment_card_number: '',
  payment_card_holder: '',
  payment_iban: '',
  payment_iban_holder: '',
  payment_note: '',
}
const DIGITS = '٠١٢٣٤٥٦٧٨٩'

function toNum(s: string) {
  const ascii = s.replace(/[٠-٩]/g, (d) => String(DIGITS.indexOf(d))).replace(/[^\d]/g, '')
  return ascii ? Number(ascii) : 0
}

const input = 'w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40'
const saveBtn = 'h-10 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50'

export default function AdPricingPage() {
  const [pkgs, setPkgs] = useState<Pkg[]>([])
  const [tpls, setTpls] = useState<Tpl[]>([])
  const [cfg, setCfg] = useState<Cfg>(EMPTY_CFG)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const [p, t, s] = await Promise.all([
      supabase.from('ad_packages').select('*').order('sort'),
      supabase.from('ad_templates').select('*').order('sort'),
      supabase.from('platform_settings').select('key, value').in('key', [...CFG_KEYS]),
    ])
    const err = p.error ?? t.error ?? s.error
    if (err) throw new Error(err.message)
    setPkgs((p.data ?? []) as Pkg[])
    setTpls((t.data ?? []) as Tpl[])
    const next: Cfg = { ...EMPTY_CFG }
    for (const r of (s.data ?? []) as { key: keyof Cfg; value: string }[]) next[r.key] = r.value ?? ''
    setCfg(next)
  }, [])

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
      .finally(() => setLoading(false))
  }, [load])

  async function run(name: string, fn: () => Promise<void>, done: string) {
    setBusy(name)
    setOk('')
    setError('')
    try {
      await fn()
      setOk(done)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير معروف')
    } finally {
      setBusy('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const editPkg = (i: number, patch: Partial<Pkg>) =>
    setPkgs((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const editTpl = (i: number, patch: Partial<Tpl>) =>
    setTpls((a) => a.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  function addPkg() {
    setPkgs((a) => {
      if (a.some((p) => p.label.trim() === 'باقة جديدة' && p.days === 7)) {
        return a
      }
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      return [
        { id, label: 'باقة جديدة', days: 7, daily_price: 5, active: true, sort: a.length + 1 },
        ...a,
      ]
    })
  }

  function savePkg(p: Pkg) {
    return run('pkg:' + p.id, async () => {
      if (!p.label.trim()) throw new Error('اكتب اسم الباقة')
      if (p.days < 1) throw new Error('عدد الأيام لازم يكون 1 أو أكثر')
      if (!Number.isInteger(p.daily_price) || p.daily_price < 5) throw new Error('حدد سعر اليوم بالدولار كعدد صحيح (5 دولار على الأقل)')
      const row = { ...p, label: p.label.trim() }
      const { data, error: e } = await supabase.from('ad_packages').upsert(row).select('id')
      if (e) throw new Error(e.message)
      if (!data?.length) throw new Error('لم يتم الحفظ، تحقق من الصلاحيات')
      await logAction('ad_package.save', 'ad_packages', p.id, { daily_price: p.daily_price, days: p.days, active: p.active })
    }, 'تم حفظ الباقة')
  }

  function saveTpl(t: Tpl) {
    return run('tpl:' + t.type, async () => {
      if (!t.title.trim()) throw new Error('اكتب اسم القالب')
      const { data, error: e } = await supabase
        .from('ad_templates')
        .update({ title: t.title.trim(), description: t.description.trim(), enabled: t.enabled })
        .eq('type', t.type)
        .select('type')
      if (e) throw new Error(e.message)
      if (!data?.length) throw new Error('لم يتم الحفظ، تحقق من الصلاحيات')
      await logAction('ad_template.save', 'ad_templates', t.type, { enabled: t.enabled })
    }, 'تم حفظ القالب')
  }

  function saveCfg() {
    return run('cfg', async () => {
      const { data: u } = await supabase.auth.getUser()
      const now = new Date().toISOString()
      const values: Cfg = {
        payment_card_number: cfg.payment_card_number.trim(),
        payment_card_holder: cfg.payment_card_holder.trim(),
        payment_iban: cfg.payment_iban.trim(),
        payment_iban_holder: cfg.payment_iban_holder.trim(),
        payment_note: cfg.payment_note.trim(),
      }
      const rows = CFG_KEYS.map((key) => ({ key, value: values[key], updated_at: now, updated_by: u.user?.id ?? null }))
      const { data, error: e } = await supabase.from('platform_settings').upsert(rows).select('key')
      if (e) throw new Error(e.message)
      if (data?.length !== rows.length) throw new Error('لم يتم الحفظ، تحقق من الصلاحيات')
      setCfg(values)
      await logAction('ad_settings.save', 'platform_settings')
    }, 'تم حفظ الإعدادات')
  }

  if (loading) return <p className="text-sm text-muted">جارٍ التحميل...</p>

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">إعدادات الإعلانات</h1>
        <p className="mt-2 text-sm text-muted">
          حدد أسعار الباقات بالدولار، ثم أدخل وجهات التحويل التي تظهر للتجار عند الدفع.
                  حدد مدة كل باقة وسعر اليوم بالدولار؛ يُحسب الإجمالي تلقائيًا. ثم أدخل وجهة بطاقة أو محفظة محلية و/أو IBAN. لا تظهر الباقة للتاجر قبل ضبط سعرها.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
      {ok && <p className="rounded-lg bg-green-100 p-3 text-sm text-green-800">{ok}</p>}

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">الباقات</h2>
          <button type="button" onClick={addPkg} className="text-sm font-semibold underline">
            + باقة جديدة
          </button>
        </div>
        {pkgs.map((p, i) => (
          <div key={p.id} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-[minmax(0,1fr)_7rem_9rem_auto_auto] md:items-end">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              الاسم
              <input className={input} value={p.label} onChange={(e) => editPkg(i, { label: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              الأيام
              <input
                className={input}
                inputMode="numeric"
                dir="ltr"
                value={p.days || ''}
                onChange={(e) => editPkg(i, { days: toNum(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              سعر اليوم (USD) — الحد الأدنى 5$
              <input
                className={input}
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="5"
                value={p.daily_price === 0 ? '' : String(p.daily_price)}
                onChange={(e) => {
                  const raw = toNum(e.target.value)
                  editPkg(i, { daily_price: raw })
                }}
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={p.active} onChange={(e) => editPkg(i, { active: e.target.checked })} />
              مفعّلة
            </label>
            <button type="button" disabled={busy === 'pkg:' + p.id} onClick={() => savePkg(p)} className={saveBtn}>
              حفظ
            </button>
            <p className="text-xs text-muted md:col-span-4">
              الإجمالي: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(p.daily_price * p.days)} · المدة {p.days} أيام
            </p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">القوالب</h2>
        {tpls.map((t, i) => (
          <div key={t.type} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-[1fr_2fr_auto_auto] md:items-end">
            <label className="flex flex-col gap-1 text-xs font-semibold">
              الاسم
              <input className={input} value={t.title} onChange={(e) => editTpl(i, { title: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold">
              الوصف
              <input className={input} value={t.description} onChange={(e) => editTpl(i, { description: e.target.value })} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={t.enabled} onChange={(e) => editTpl(i, { enabled: e.target.checked })} />
              مفعّل
            </label>
            <button type="button" disabled={busy === 'tpl:' + t.type} onClick={() => saveTpl(t)} className={saveBtn}>
              حفظ
            </button>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">وجهات التحويل اليدوي</h2>
          <p className="mt-1 text-sm text-muted">
            أدخل وجهة واحدة على الأقل. لا تُفعّل الحملة تلقائيًا عند إرسال الإيصال؛ تحقّق من وصول المبلغ في تطبيق البنك أولًا.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          رقم بطاقة أو حساب التحويل المحلي
                    رقم البطاقة أو الهاتف/معرّف المحفظة المحلية (اختياري)
                      placeholder="رقم بطاقة، رقم هاتف، أو معرّف محفظة"
          <input
            className={input}
            inputMode="numeric"
            dir="ltr"
            value={cfg.payment_card_number}
            onChange={(e) => setCfg((c) => ({ ...c, payment_card_number: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          اسم صاحب البطاقة / الحساب المحلي
          <input
            className={input}
            value={cfg.payment_card_holder}
            onChange={(e) => setCfg((c) => ({ ...c, payment_card_holder: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          رقم IBAN للتحويل الدولي (اختياري)
          <input
            className={input}
            dir="ltr"
            value={cfg.payment_iban}
            onChange={(e) => setCfg((c) => ({ ...c, payment_iban: e.target.value.toUpperCase() }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          اسم صاحب حساب IBAN
          <input
            className={input}
            value={cfg.payment_iban_holder}
            onChange={(e) => setCfg((c) => ({ ...c, payment_iban_holder: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          اسم المحفظة أو تعليمات الدفع (اختياري)
          <textarea
            rows={3}
            className={input}
            value={cfg.payment_note}
            onChange={(e) => setCfg((c) => ({ ...c, payment_note: e.target.value }))}
          />
        </label>
        <button type="button" disabled={busy === 'cfg'} onClick={saveCfg} className={`${saveBtn} self-start`}>
          حفظ
        </button>
      </section>
    </div>
  )
}
