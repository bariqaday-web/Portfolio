"use client"

import Link from "next/link"
import { Wallet } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function DebtsSummary() {
  const { debtors } = useStore()
  const active = debtors.filter((d) => !d.paid)
  const overdue = active.filter((d) => d.overdue)
  const total = active.reduce((s, d) => s + d.amount, 0)

  return (
    <section className="surface-card min-w-0 p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 sm:size-9">
            <Wallet aria-hidden="true" className="size-3.5 sm:size-4" />
          </span>
          <h2 className="truncate text-xs font-semibold sm:text-lg">ملخص الديون</h2>
        </div>
        <Link href="/dashboard/debts" className="shrink-0 text-[10px] text-muted underline sm:text-xs">
          الكل
        </Link>
      </div>

      {active.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد ديون مسجّلة حالياً.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[10px] leading-tight text-muted sm:text-sm">إجمالي الديون النشطة</span>
            <span className="truncate text-sm font-semibold sm:text-lg">{formatIQD(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[10px] text-muted sm:text-sm">الزبائن المتأخرون</span>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] sm:px-3 sm:text-[11px] ${
                overdue.length ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {toArabicNumber(overdue.length)}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
