import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectAnalytics } from "@/components/dashboard/project-analytics"
import { DebtsSummary } from "@/components/dashboard/debts-summary"
import { TopProducts } from "@/components/dashboard/top-products"
import { LowStock } from "@/components/dashboard/low-stock"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { QuickActions } from "@/components/dashboard/quick-actions"

export default function DashboardPage() {
  return (
    <>
<Header
          title="لوحة تحكم التاجر"
          description="تابع مبيعاتك وديونك ومخزونك في لمحة واحدة."
          actions={<QuickActions />}
        />

        <div className="mt-3 space-y-3 sm:mt-5 sm:space-y-4">
          <StatsCards />

          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
            <div className="col-span-2 space-y-2 sm:space-y-4 lg:col-span-2">
              <ProjectAnalytics />
              <TopProducts />
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-2 lg:col-span-1 lg:grid-cols-1 lg:gap-4">
              <DebtsSummary />
              <LowStock />
            </div>
          </div>

          <RecentOrders />
        </div>
</>
  )
}
