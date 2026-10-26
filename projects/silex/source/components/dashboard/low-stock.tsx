"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { useStore, toArabicNumber } from "@/components/store/store-context"

export function LowStock() {
  const { products } = useStore()
  const items = products.filter((p) => p.stock > 0 && p.stock <= 10).slice(0, 3)

  return (
    <section className="surface-card min-w-0 p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700 sm:size-9">
            <AlertTriangle aria-hidden="true" className="size-3.5 sm:size-4" />
          </span>
          <h2 className="truncate text-xs font-semibold sm:text-lg">قاربت على النفاد</h2>
        </div>
        <Link href="/dashboard/inventory" className="shrink-0 text-[10px] text-muted underline sm:text-xs">
          المخزون
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لا توجد منتجات قاربت النفاد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between gap-1 py-2 sm:gap-3 sm:py-3">
              <span className="min-w-0 truncate text-[10px] font-medium sm:text-sm">{item.name}</span>
              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-[9px] text-orange-700 sm:px-3 sm:text-[11px]">
                {toArabicNumber(item.stock)} وحدة
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
