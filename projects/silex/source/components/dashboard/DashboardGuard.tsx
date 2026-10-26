'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// حماية واجهة فقط؛ الحماية الحقيقية بسياسات RLS على جداول التاجر
export default function DashboardGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const uid = data.session?.user.id
      if (!uid) {
        router.replace('/onboarding')
        return
      }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle()
      if (!alive) return
      if (p?.role !== 'merchant') {
        router.replace('/home')
        return
      }
      setAllowed(true)
    })()
    return () => {
      alive = false
    }
  }, [router])

  if (!allowed) {
    return (
      <div dir="rtl" aria-busy="true" aria-label="جارٍ تحميل لوحة المتجر" className="min-h-screen bg-background text-foreground">
        <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="size-9 animate-pulse rounded-full bg-muted/40" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted/40" />
          </div>
          <div className="size-9 animate-pulse rounded-full bg-muted/40" />
        </div>
        <div className="flex">
          <aside className="hidden h-[calc(100vh-4rem)] w-72 shrink-0 border-e border-border bg-sidebar p-5 lg:block">
            <div className="space-y-3">
              {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg bg-muted/30" />
              ))}
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">
            <div className="mx-auto max-w-6xl space-y-6">
              <div className="h-8 w-48 animate-pulse rounded bg-muted/40" />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
            </div>
          </main>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
