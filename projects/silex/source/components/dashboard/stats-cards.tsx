"use client"

import Link from "next/link"
import { Wallet, DollarSign, Package, Users, type LucideIcon } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"
import { Skeleton } from "@/components/ui/Skeleton"

type Stat = {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  iconClass: string
  href?: string
}

export function StatsCards() {
  const { debtors, products, orders, isLoading } = useStore()
  const unpaid = debtors.filter((d) => !d.paid)
  const totalDebts = unpaid.reduce((sum, d) => sum + d.amount, 0)
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10).length
  const today = new Date()
  const todaySales = orders
    .filter((order) => {
      const created = order.createdAt ? new Date(order.createdAt) : null
      if (!created || Number.isNaN(created.getTime())) return false
      return created.toDateString() === today.toDateString()
    })
    .reduce((sum, order) => sum + Number(order.total ?? 0), 0)
  const loading = "جار التحميل..."

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card min-w-0 p-3 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-9 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-10 w-24" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
    )
  }

  const stats: Stat[] = [
    {
      title: "مبيعات اليوم",
      value: todaySales ? formatIQD(todaySales) : "—",
      subtitle: todaySales ? `${toArabicNumber(orders.filter((order) => order.createdAt && new Date(order.createdAt).toDateString() === today.toDateString()).length)} طلب اليوم` : "لا توجد مبيعات لهذا اليوم",
      icon: DollarSign,
      iconClass: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "إجمالي الديون",
      value: isLoading ? loading : formatIQD(totalDebts),
      subtitle: `على ${toArabicNumber(unpaid.length)} زبائن`,
      icon: Wallet,
      iconClass: "bg-orange-100 text-orange-700",
      href: "/dashboard/debts",
    },
    {
      title: "المنتجات في المخزن",
      value: isLoading ? loading : toArabicNumber(products.length),
      subtitle: `${toArabicNumber(lowStock)} قاربت النفاد`,
      icon: Package,
      iconClass: "bg-primary/10 text-primary",
      href: "/dashboard/inventory",
    },
    {
      title: "عدد الزبائن",
      value: orders.length ? "بيانات الطلبات" : "—",
      subtitle: "لا يوجد مصدر زبائن مرتبط",
      icon: Users,
      iconClass: "bg-red-100 text-red-700",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => {
        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs text-muted sm:text-sm">{s.title}</p>
              <span className={`flex size-7 shrink-0 items-center justify-center rounded-full sm:size-9 ${s.iconClass}`}>
                <s.icon aria-hidden="true" className="size-3.5 sm:size-4" />
              </span>
            </div>
            <p className="mt-2 truncate text-xl font-semibold tracking-tight sm:mt-4 sm:text-3xl">{s.value}</p>
            <p className="mt-1 truncate text-[10px] text-muted sm:mt-2 sm:text-xs">{s.subtitle}</p>
          </>
        )
        const cls = "surface-card surface-card-interactive min-w-0 p-3 sm:p-5"
        return s.href ? (
          <Link key={s.title} href={s.href} className={`${cls} hover:border-foreground/30`}>
            {body}
          </Link>
        ) : (
          <article key={s.title} className={cls}>
            {body}
          </article>
        )
      })}
    </div>
  )
}
