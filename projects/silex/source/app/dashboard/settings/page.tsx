import { Header } from "@/components/dashboard/header"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  return (
    <>
      <Header title="تفضيلات اللوحة" description="تحكم في الإشعارات التي تصلك بشأن الطلبات والديون والمخزون." />
      <div className="mt-6">
        <SettingsContent />
      </div>
    </>
  )
}
