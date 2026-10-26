"use client"

import { Switch } from "@/components/ui/switch"
import { useStore } from "@/components/store/store-context"

export function SettingsContent() {
  const { settings, updateSetting } = useStore()

  const notificationItems = [
    { key: "debt_notifications" as const, label: "إشعارات الديون المستحقة", description: "تنبيه عند اقتراب موعد استحقاق دين" },
    { key: "inventory_notifications" as const, label: "تنبيهات نفاد المخزون", description: "تنبيه عند قرب نفاد أحد المنتجات" },
    { key: "order_notifications" as const, label: "طلبات الزبائن الجديدة", description: "إشعار عند وصول طلب جديد" },
    { key: "weekly_reports" as const, label: "تقارير المبيعات الأسبوعية", description: "ملخص أسبوعي لأداء المتجر" },
  ]

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-2 text-lg font-semibold">الإشعارات</h3>
        <ul className="divide-y divide-border">
          {notificationItems.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-xs text-muted">{item.description}</p>
              </div>
              <Switch
                checked={settings[item.key]}
                onCheckedChange={(checked) => void updateSetting(item.key, checked)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
