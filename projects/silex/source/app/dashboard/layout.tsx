import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { StoreProvider } from '@/components/store/store-context'
import DashboardGuard from '@/components/dashboard/DashboardGuard'
import DashboardNav from '@/components/dashboard/DashboardNav'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import DashboardBottomNav from '@/components/dashboard/DashboardBottomNav'
import HeaderActions from '@/components/dashboard/HeaderActions'
import { SupportChatButton } from '@/components/SupportChatButton'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <DashboardGuard>
        <div dir="rtl" className="min-h-screen bg-background text-foreground">
          <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-paper/95 px-3 backdrop-blur-md md:min-h-16 md:px-8">
            <div className="flex items-center gap-3">
              <DashboardMobileNav />
              <Link href="/dashboard" className="flex items-center gap-3">
                <span className="font-display text-xl">لوحتي</span>
              </Link>
              <Link
                href="/home"
                aria-label="العودة إلى التطبيق"
                title="العودة إلى التطبيق"
                className="flex h-10 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-primary hover:bg-chip lg:hidden"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
                <span>التطبيق</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <SupportChatButton />
              <HeaderActions />
            </div>
          </header>

          <div className="flex">
            <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-72 shrink-0 self-start overflow-y-auto border-e border-border bg-sidebar p-4 lg:block">
              <DashboardNav />
            </aside>
            <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-24 md:px-8 md:py-10 lg:pb-10">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
          <DashboardBottomNav />
        </div>
      </DashboardGuard>
    </StoreProvider>
  )
}
