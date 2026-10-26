"use client"

import Link from "next/link"
import { Star } from "lucide-react"
import { useStore, formatIQD, toArabicNumber } from "@/components/store/store-context"

export function TopProducts() {
  const { topProducts } = useStore()

  return (
    <section className="surface-card min-w-0 p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:size-9">
            <Star aria-hidden="true" className="size-3.5 sm:size-4" />
          </span>
          <h2 className="truncate text-xs font-semibold sm:text-lg">المنتجات الأكثر مبيعاً</h2>
        </div>
        <Link href="/dashboard/analytics" className="shrink-0 text-[10px] text-muted underline sm:text-xs">
          التحليل
        </Link>
      </div>

      {topProducts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد مبيعات مسجّلة بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {topProducts.slice(0, 3).map((p, i) => (
            <li key={p.name} className="flex items-center justify-between gap-2 py-2.5 sm:gap-3 sm:py-3">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chip text-[10px] font-semibold sm:size-7 sm:text-xs">
                  {toArabicNumber(i + 1)}
                </span>
                <span className="truncate text-xs font-medium sm:text-sm">{p.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className="text-[10px] text-muted sm:text-xs">{toArabicNumber(p.quantity)}</span>
                <span className="text-xs font-semibold text-emerald-700 sm:text-sm">{formatIQD(p.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
