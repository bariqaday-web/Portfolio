import { Bot } from "lucide-react"
import { StoreAssistantContent } from "@/components/dashboard/store-assistant-content"
import { Header } from "@/components/dashboard/header"

export default function StoreAssistantPage() {
  return (
    <>
      <Header title="مساعد المتجر" description="جهّز مساعدك ليرد على أسئلة الزبائن عن متجرك." search={false} />
      <div className="mb-5 mt-6 flex items-center gap-3 rounded-2xl border border-primary/10 bg-primary/[0.03] p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="size-5" />
        </span>
        <p className="text-sm leading-6 text-muted">
          مكانك لإدارة مساعد المتجر. أضف معلومات التوصيل والاستبدال والعروض، ثم فعّل المساعد لتقليل وقت الرد على العملاء.
        </p>
      </div>
      <StoreAssistantContent />
    </>
  )
}
