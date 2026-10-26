"use client"

import { useStore, formatIQD } from "@/components/store/store-context"

function chip(status: string) {
  if (status === "مكتمل") return "bg-emerald-100 text-emerald-700"
  if (status === "ملغى") return "bg-red-100 text-red-700"
  return "bg-orange-100 text-orange-700"
}

export function RecentOrders() {
  const { orders } = useStore()
  return (
    <section className="surface-card min-w-0 p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between sm:mb-4">
        <h2 className="text-sm font-semibold sm:text-lg">آخر الفواتير</h2>
        <span className="text-xs text-muted">اليوم</span>
      </div>
      {orders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">لا توجد فواتير حقيقية بعد.</p>
      ) : (
        <ul className="divide-y divide-border">
          {orders.slice(0, 5).map((order) => (
            <li key={order.id} className="flex min-w-0 items-center justify-between gap-2 py-2.5 sm:gap-3 sm:py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium sm:text-sm">{order.customer}</p>
                <p className="hidden truncate text-[9px] text-muted sm:block sm:text-[11px]">{order.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className={`rounded-full px-2 py-1 text-[9px] sm:px-3 sm:text-[11px] ${chip(order.status)}`}>{order.status}</span>
                <span className="text-xs font-semibold sm:text-sm">{formatIQD(order.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
