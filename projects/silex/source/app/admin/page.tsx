'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { normalizeCountry, normalizeIraqiCity } from '@/lib/admin/city'
import { getUsageHours } from '@/lib/admin/api'
import { supabase } from '@/lib/supabase'

type Usage = Awaited<ReturnType<typeof getUsageHours>>
type Stats = {
  pendingAds: number
  openReports: number
  unverifiedMerchants: number
  users: number
  newUsers7: number
  merchants: number
  products: number
  orders: number
  activeAds: number
}

async function count(table: string, build?: (q: any) => any) {
  let q = supabase.from(table).select(table === 'profiles' ? 'id' : '*', { count: 'exact', head: true })
  if (build) q = build(q)
  const { count: c, error } = await q
  if (error) throw new Error(error.message)
  return c ?? 0
}

const n = (v: number) => v.toLocaleString('ar')
const chartColors = ['#2F855A', '#E9953B', '#D6A83C', '#42A878', '#F2A65A', '#E0B341']

export default function AdminHome() {
  const [s, setS] = useState<Stats | null>(null)
  const [usage, setUsage] = useState<Usage>([])
  const [error, setError] = useState('')
  const [usageError, setUsageError] = useState('')
  const [usageRefresh, setUsageRefresh] = useState(0)
  const [usageLoading, setUsageLoading] = useState(false)

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    Promise.all([
      count('campaigns', (q) => q.eq('status', 'pending_review')),
      count('reports', (q) => q.eq('status', 'open')),
      count('profiles', (q) => q.eq('role', 'merchant').is('verified_at', null)),
      count('profiles'),
      count('profiles', (q) => q.gte('created_at', since)),
      count('profiles', (q) => q.eq('role', 'merchant')),
      count('products'),
      count('orders'),
      count('campaigns', (q) => q.eq('status', 'active')),
    ])
      .then(([pendingAds, openReports, unverifiedMerchants, users, newUsers7, merchants, products, orders, activeAds]) => {
        setS({ pendingAds, openReports, unverifiedMerchants, users, newUsers7, merchants, products, orders, activeAds })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطأ غير معروف'))
  }, [])

  useEffect(() => {
    let alive = true
    setUsageLoading(true)
    getUsageHours()
      .then((rows) => {
        if (!alive) return
        setUsage(rows)
        setUsageError('')
      })
      .catch((e) => {
        if (alive) setUsageError(e instanceof Error ? e.message : 'تعذّر تحميل إحصاءات الاستخدام')
      })
      .finally(() => {
        if (alive) setUsageLoading(false)
      })
    return () => { alive = false }
  }, [usageRefresh])

  const attention = [
    { label: 'إعلانات بانتظار المراجعة', value: s?.pendingAds, href: '/admin/campaigns' },
    { label: 'بلاغات مفتوحة', value: s?.openReports, href: '/admin/reports' },
    { label: 'تجار غير موثّقين', value: s?.unverifiedMerchants, href: '/admin/merchants' },
  ]
  const numbers = [
    { label: 'المستخدمون', value: s ? n(s.users) : '…', href: '/admin/users' },
    { label: 'جدد آخر 7 أيام', value: s ? n(s.newUsers7) : '…', href: '/admin/users' },
    { label: 'التجار', value: s ? n(s.merchants) : '…', href: '/admin/merchants' },
    { label: 'المنتجات', value: s ? n(s.products) : '…', href: '/admin/products' },
    { label: 'الطلبات', value: s ? n(s.orders) : '…', href: '/admin/orders' },
    { label: 'إعلانات نشطة', value: s ? n(s.activeAds) : '…', href: '/admin/campaigns' },
  ]
  const cityTally = new Map<string, number>()
  for (const event of usage) {
    const city = normalizeIraqiCity(event.city)
    cityTally.set(city, (cityTally.get(city) ?? 0) + 1)
  }
  const cities = Array.from(cityTally, ([city, count]) => ({ city, count }))
    .filter((entry) => entry.city !== 'أخرى')
    .sort((a, b) => b.count - a.count)
  const topCities = cities.slice(0, 5)
  const cityActivity = topCities.reduce((sum, city) => sum + city.count, 0)
  const otherCityActivity = cityTally.get('أخرى') ?? 0
  const usageByPlace = Array.from(
    usage.reduce((map, event) => {
      const city = normalizeIraqiCity(event.city)
      if (city === 'أخرى') return map
      const country = normalizeCountry(event.country)
      const name = country === 'أخرى' ? city : `${city}، ${country}`
      const place = map.get(name) ?? { name, count: 0 }
      place.count += 1
      map.set(name, place)
      return map
    }, new Map<string, { name: string; count: number }>()),
    ([, value]) => value,
  ).sort((a, b) => b.count - a.count).slice(0, 10)
  const usageByCountry = Array.from(
    usage.reduce((map, event) => {
      const country = normalizeCountry(event.country)
      if (country === 'أخرى') return map
      map.set(country, (map.get(country) ?? 0) + 1)
      return map
    }, new Map<string, number>()),
    ([country, count]) => ({ country, count }),
  ).sort((a, b) => b.count - a.count).slice(0, 6)
  const usageByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    count: usage.filter((entry) => entry.active_hour === hour).length,
  }))
  const bestHour = [...usageByHour].sort((a, b) => b.count - a.count)[0]

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">نظرة عامة</h1>
      {error && <p className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">يحتاج انتباهك</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {attention.map((a) => {
            const hot = (a.value ?? 0) > 0
            return (
              <Link
                key={a.label}
                href={a.href}
                className={`rounded-2xl border p-4 transition-opacity hover:opacity-80 ${
                  hot ? 'border-amber-300 bg-amber-50' : 'border-border bg-card'
                }`}
              >
                <p className="text-xs text-muted">{a.label}</p>
                <p className="mt-1 font-display text-3xl">{a.value === undefined ? '…' : n(a.value)}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">الأرقام</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {numbers.map((c) => (
            <Link key={c.label} href={c.href} className="rounded-2xl border border-border bg-card p-4 transition-opacity hover:opacity-80">
              <p className="text-xs text-muted">{c.label}</p>
              <p className="mt-1 font-display text-3xl">{c.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-emerald-950">أكثر 5 مدن تفاعلاً</h2>
            <p className="mt-1 text-xs text-emerald-800/70">فترات النشاط المسجلة خلال آخر 30 يوماً، حسب المدينة التي أدخلها المستخدم في حسابه</p>
          </div>
          <div className="rounded-2xl bg-emerald-600 px-4 py-2 text-white shadow-sm">
            <p className="text-[11px] text-emerald-50">مدن لها نشاط معروف</p>
            <p className="font-display text-2xl font-bold">{n(cities.length)}</p>
          </div>
        </div>
        {topCities.length === 0 ? (
          <p className="rounded-xl bg-white/80 p-4 text-sm text-muted">
            {usage.length === 0
              ? 'لا توجد بيانات نشاط بعد. ستظهر المدن بعد بدء تسجيل فترات الاستخدام.'
              : 'لا توجد مدن عراقية معروفة ضمن النشاط المسجل حتى الآن.'}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="h-[320px] min-w-0 rounded-2xl border border-emerald-100 bg-white/80 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCities} layout="vertical" margin={{ top: 6, right: 32, left: 8, bottom: 6 }}>
                  <CartesianGrid horizontal={false} stroke="#d1fae5" />
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="city"
                    width={92}
                    tick={{ fill: '#065f46', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#ecfdf5' }}
                    formatter={(value) => [n(Number(value)), 'فترة نشاط']}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={24}>
                    {topCities.map((city, index) => (
                      <Cell key={city.city} fill={chartColors[index % chartColors.length]} />
                    ))}
                    <LabelList dataKey="count" position="right" formatter={(value) => n(Number(value))} fill="#065f46" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              <div className="rounded-2xl bg-white/90 p-4">
                <p className="text-xs text-muted">فترات النشاط في المدن المعروفة</p>
                <p className="mt-1 font-display text-3xl font-bold text-emerald-700">{n(cityActivity)}</p>
              </div>
              <ul className="flex max-h-[220px] flex-col gap-2 overflow-y-auto">
                {topCities.map((city, index) => (
                  <li key={city.city} className="flex items-center justify-between rounded-xl bg-white/90 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-semibold text-emerald-700">{index + 1}.</span>
                      <span className="truncate">{city.city}</span>
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-800">{n(city.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {otherCityActivity > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            جُمعت {n(otherCityActivity)} فترة نشاط بمدن غير معروفة أو غير مكتملة ضمن «أخرى»، واستُبعدت من ترتيب المدن.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-emerald-950">أوقات ومناطق استخدام التطبيق</h2>
            <p className="mt-1 text-xs text-emerald-800/70">فترات نشاط آخر ٣٠ يوماً حسب الدولة والمدينة المسجلتين في الحساب</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUsageRefresh((value) => value + 1)}
              disabled={usageLoading}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            >
              <RefreshCw aria-hidden="true" className={`size-4 ${usageLoading ? 'animate-spin' : ''}`} />
              {usageLoading ? 'جارٍ التحديث...' : 'تحديث البيانات'}
            </button>
            {bestHour && bestHour.count > 0 && (
              <div className="rounded-2xl bg-emerald-600 px-4 py-2 text-white shadow-sm">
                <p className="text-[11px] text-emerald-50">أفضل وقت مبدئي للترويج</p>
                <p className="font-display text-2xl font-bold">{bestHour.hour}</p>
              </div>
            )}
          </div>
        </div>
        {usageError ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            إحصاءات النشاط تحتاج تطبيق ترحيل الاستخدام من Supabase.
          </p>
        ) : usage.length === 0 ? (
          <p className="rounded-xl bg-white/80 p-4 text-sm text-muted">
            لا توجد بيانات نشاط بعد. ستظهر الإحصاءات بعد تطبيق الترحيل وتسجيل المستخدمين الدخول واستخدام التطبيق.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-emerald-950">الساعات الأكثر نشاطاً</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usageByHour} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}>
                    <CartesianGrid vertical={false} stroke="#d1fae5" />
                    <XAxis dataKey="hour" interval={2} tick={{ fill: '#065f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} width={38} tick={{ fill: '#065f46', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value) => [n(Number(value)), 'فترة نشاط مسجلة']} />
                    <Line type="monotone" dataKey="count" stroke="#2F855A" strokeWidth={3} dot={{ fill: '#E9953B', stroke: '#fff', strokeWidth: 2, r: 4 }} activeDot={{ fill: '#D6A83C', r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                <h3 className="mb-3 text-sm font-semibold text-emerald-950">الدول الأكثر نشاطاً</h3>
                <ul className="flex flex-col gap-2">
                  {usageByCountry.map((entry, index) => (
                    <li key={entry.country} className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                      <span className="truncate"><b className="ml-2 text-emerald-700">{index + 1}.</b>{entry.country}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 font-bold text-emerald-800">{n(entry.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                <h3 className="mb-3 text-sm font-semibold text-emerald-950">المدن الأكثر نشاطاً</h3>
                <ul className="flex flex-col gap-2">
                  {usageByPlace.map((entry, index) => (
                    <li key={entry.name} className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                      <span className="truncate"><b className="ml-2 text-emerald-700">{index + 1}.</b>{entry.name}</span>
                      <span className="rounded-full bg-white px-2.5 py-1 font-bold text-emerald-800">{n(entry.count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-emerald-900/60">
          الأرقام تمثل فترات نشاط مسجلة مرة لكل مستخدم في الساعة؛ وقت النشاط حسب الساعة المحلية للجهاز. المدينة مدخلة في الملف الشخصي وليست تحديداً دقيقاً للموقع.
        </p>
      </section>
    </div>
  )
}
