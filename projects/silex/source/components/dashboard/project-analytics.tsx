"use client"

import { useMemo } from "react"
import { useStore, formatIQD } from "@/components/store/store-context"

const weeklyBarColors = ["#2F855A", "#E9953B", "#D6A83C", "#42A878", "#F2A65A", "#E0B341", "#23845B"]

export function ProjectAnalytics() {
  const { orders } = useStore()

  const weekData = useMemo(() => {
    const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    const now = new Date()
    const buckets = days.map((label, idx) => ({ label, total: 0, isToday: idx === now.getDay() }))
    for (const order of orders) {
      buckets[now.getDay()].total += order.total
    }
    return buckets
  }, [orders])

  const maxTotal = Math.max(...weekData.map((d) => d.total), 1)
  const weekTotal = weekData.reduce((s, d) => s + d.total, 0)

  return (
    <section className="surface-card min-w-0 p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-6">
        <h2 className="text-sm font-semibold sm:text-lg">مبيعات الأسبوع</h2>
        <span className="truncate text-xs text-muted sm:text-sm">{formatIQD(weekTotal)}</span>
      </div>

      {weekTotal === 0 ? (
        <div className="flex h-28 items-center justify-center text-center text-xs text-muted sm:h-56 sm:text-sm">
          لا توجد مبيعات مسجّلة هذا الأسبوع بعد.
        </div>
      ) : (
        <div className="flex h-36 items-end justify-between gap-1 sm:h-56 sm:gap-3">
          {weekData.map((d, index) => (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1 sm:gap-2">
              <div
                className="w-full rounded-t-lg transition-colors"
                style={{
                  backgroundColor: weeklyBarColors[index],
                  opacity: d.isToday ? 1 : 0.68,
                  height: `${Math.max(4, (d.total / maxTotal) * 140)}px`,
                }}
              />
              <span className="truncate text-[9px] text-muted sm:text-[11px]">{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
