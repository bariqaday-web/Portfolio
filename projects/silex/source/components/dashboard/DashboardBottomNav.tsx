'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ClipboardList, LayoutDashboard, Megaphone, Warehouse } from 'lucide-react'
import { isNavActive } from '@/lib/dashboard/nav'

const items = [
  { label: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
  { label: 'المخزون', href: '/dashboard/inventory', icon: Warehouse },
  { label: 'الطلبات', href: '/dashboard/orders', icon: ClipboardList },
  { label: 'الديون', href: '/dashboard/debts', icon: BookOpen },
  { label: 'الإعلانات', href: '/dashboard/ads', icon: Megaphone },
]

export default function DashboardBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="تنقل لوحة التاجر"
      className="fixed inset-x-0 bottom-0 z-40 bg-paper px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden"
    >
      <div className="mx-auto grid min-h-14 max-w-lg grid-cols-5 items-center">
        {items.map(({ label, href, icon: Icon }) => {
          const active = isNavActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 text-[10px] transition-colors ${
                active ? 'font-semibold text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon aria-hidden="true" className={`size-5 ${active ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
