"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useProfile } from "@/lib/useProfile"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import type { StoreAssistantConfig } from "@/lib/local-store-assistant"
import { ChevronDown, Pencil, Plus, Trash2 } from "lucide-react"

type AssistantRuleDraft = {
  id: string | null
  phrases: string
  response: string
}

type MerchantAssistantRule = {
  id: string
  phrases: string[]
  response: string
  priority: number
  is_active: boolean
}

export function StoreAssistantContent() {
  const { profile, setProfile } = useProfile()
  const [assistantEnabled, setAssistantEnabled] = useState(profile?.assistant_enabled ?? false)
  const [settingsSection, setSettingsSection] = useState<"store" | "delivery" | "rules">("store")
  const [socialLinksOpen, setSocialLinksOpen] = useState(false)
  const [config, setConfig] = useState({
    deliveryFee: "",
    deliveryMinDays: "",
    deliveryMaxDays: "",
    returnDays: "",
    exchangeDeliveryFee: "",
    reviewUrl: "",
    discountCode: "",
    discountDescription: "",
    shippingRates: "",
    internationalShippingCountries: "",
    paymentMethods: "",
    returnPolicy: "",
    botHoursEnabled: true,
    botHoursAlwaysOn: false,
    botHoursStart: "09:00",
    botHoursEnd: "22:00",
    storeMode: "online" as "online" | "physical" | "both",
    branchLocations: "",
    socialInstagram: "",
    socialTikTok: "",
    socialFacebook: "",
    socialWebsite: "",
    socialWhatsApp: "",
  })
  const [merchantRules, setMerchantRules] = useState<MerchantAssistantRule[]>([])
  const [ruleDraft, setRuleDraft] = useState<AssistantRuleDraft | null>(null)
  const [loadingRule, setLoadingRule] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle")

  useEffect(() => {
    if (!profile) return
    setAssistantEnabled(profile.assistant_enabled ?? false)
    const saved = profile.assistant_config ?? {}
    setConfig({
      deliveryFee: saved.deliveryFee == null ? "" : String(saved.deliveryFee),
      deliveryMinDays: saved.deliveryMinDays == null ? "" : String(saved.deliveryMinDays),
      deliveryMaxDays: saved.deliveryMaxDays == null ? "" : String(saved.deliveryMaxDays),
      returnDays: saved.returnDays == null ? "" : String(saved.returnDays),
      exchangeDeliveryFee: saved.exchangeDeliveryFee == null ? "" : String(saved.exchangeDeliveryFee),
      reviewUrl: saved.reviewUrl ?? "",
      discountCode: saved.discountCode ?? "",
      discountDescription: saved.discountDescription ?? "",
      shippingRates: saved.shippingRates ?? "",
      internationalShippingCountries: saved.internationalShippingCountries ?? "",
      paymentMethods: saved.paymentMethods ?? "",
      returnPolicy: saved.returnPolicy ?? "",
      botHoursEnabled: saved.botHoursEnabled ?? true,
      botHoursAlwaysOn: saved.botHoursAlwaysOn ?? false,
      botHoursStart: saved.botHoursStart ?? "09:00",
      botHoursEnd: saved.botHoursEnd ?? "22:00",
      storeMode: saved.storeMode ?? "online",
      branchLocations: saved.branchLocations ?? "",
      socialInstagram: saved.socialInstagram ?? "",
      socialTikTok: saved.socialTikTok ?? "",
      socialFacebook: saved.socialFacebook ?? "",
      socialWebsite: saved.socialWebsite ?? "",
      socialWhatsApp: saved.socialWhatsApp ?? "",
    })
  }, [profile])

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    setLoadingRule(true)
    setMerchantRules([])
    setRuleDraft(null)
    void supabase
      .from("assistant_merchant_rules")
      .select("id, phrases, response, priority, is_active")
      .eq("merchant_id", profile.id)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error("Could not load merchant assistant rules", error)
          toast.error("تعذر تحميل قواعد مساعد المتجر")
          setLoadingRule(false)
          return
        }
        setMerchantRules((data ?? []) as MerchantAssistantRule[])
        setLoadingRule(false)
      })
    return () => {
      active = false
    }
  }, [profile?.id])

  async function toggleAssistant(checked: boolean) {
    if (!profile) return
    setAssistantEnabled(checked)
    const { error } = await supabase.from("profiles").update({ assistant_enabled: checked }).eq("id", profile.id)
    if (error) {
      toast.error("تعذر تحديث حالة المساعد")
      setAssistantEnabled(!checked)
    } else {
      setProfile({ ...profile, assistant_enabled: checked })
      toast.success(checked ? "تم تفعيل مساعد المتجر" : "تم إيقاف مساعد المتجر")
    }
  }

  async function saveInstructions() {
    if (!profile) return
    setSaveStatus("idle")
    const numeric = ["deliveryFee", "deliveryMinDays", "deliveryMaxDays", "returnDays", "exchangeDeliveryFee"] as const
    const values: StoreAssistantConfig = {
      deliveryFee: null,
      deliveryMinDays: null,
      deliveryMaxDays: null,
      returnDays: null,
      exchangeDeliveryFee: null,
    }
    for (const key of numeric) {
      const value = config[key].trim()
      if (value && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        toast.error("تأكد من إدخال أرقام صحيحة وغير سالبة في إعدادات التوصيل والاسترجاع")
        return
      }
      values[key] = value ? Number(value) : null
    }
    if (values.deliveryMinDays != null && values.deliveryMaxDays != null &&
        values.deliveryMinDays > values.deliveryMaxDays) {
      toast.error("مدة التوصيل الدنيا يجب ألا تتجاوز المدة العليا")
      return
    }
    if (config.reviewUrl.trim()) {
      try {
        const reviewUrl = new URL(config.reviewUrl.trim())
        if (reviewUrl.protocol !== "https:" && reviewUrl.protocol !== "http:") throw new Error("invalid URL")
      } catch {
        toast.error("أدخل رابط تقييم صحيحاً يبدأ بـ https://")
        return
      }
    }
    for (const [label, value] of [
      ["إنستغرام", config.socialInstagram],
      ["تيك توك", config.socialTikTok],
      ["فيسبوك", config.socialFacebook],
      ["الموقع الإلكتروني", config.socialWebsite],
      ["واتساب", config.socialWhatsApp],
    ]) {
      if (!value.trim()) continue
      try {
        const url = new URL(value.trim())
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid URL")
      } catch {
        toast.error(`أدخل رابط ${label} صحيحاً يبدأ بـ https://`)
        return
      }
    }
    if (config.botHoursEnabled && !config.botHoursAlwaysOn && (!config.botHoursStart || !config.botHoursEnd)) {
      toast.error("حدد بداية ونهاية ساعات عمل المساعد أو فعّل التشغيل على مدار الساعة")
      return
    }
    const assistantConfig: StoreAssistantConfig = {
      ...values,
      reviewUrl: config.reviewUrl.trim() || null,
      discountCode: config.discountCode.trim() || null,
      discountDescription: config.discountDescription.trim() || null,
      shippingRates: config.shippingRates.trim() || null,
      internationalShippingCountries: config.internationalShippingCountries.trim() || null,
      paymentMethods: config.paymentMethods.trim() || null,
      returnPolicy: config.returnPolicy.trim() || null,
      botHoursEnabled: config.botHoursEnabled,
      botHoursAlwaysOn: config.botHoursAlwaysOn,
      botHoursStart: config.botHoursStart,
      botHoursEnd: config.botHoursEnd,
      storeMode: config.storeMode,
      branchLocations: config.branchLocations.trim() || null,
      socialInstagram: config.socialInstagram.trim() || null,
      socialTikTok: config.socialTikTok.trim() || null,
      socialFacebook: config.socialFacebook.trim() || null,
      socialWebsite: config.socialWebsite.trim() || null,
      socialWhatsApp: config.socialWhatsApp.trim() || null,
    }
    setSaving(true)
    const { error } = await supabase
      .from("profiles")
      .update({ assistant_config: assistantConfig })
      .eq("id", profile.id)
    if (error) {
      toast.error("تعذر حفظ إعدادات المساعد")
      setSaving(false)
      return
    }
    setProfile({ ...profile, assistant_config: assistantConfig })
    setSaving(false)
    setSaveStatus("saved")
    toast.success("تم حفظ إعدادات المساعد")
  }

  function startRuleDraft(existing?: MerchantAssistantRule) {
    setRuleDraft({
      id: existing?.id ?? null,
      phrases: existing?.phrases.join("\n") ?? "",
      response: existing?.response ?? "",
    })
  }

  async function saveMerchantRule() {
    if (!profile || !ruleDraft) return
    const phrases = Array.from(new Set(ruleDraft.phrases.split("\n").map((phrase) => phrase.trim()).filter(Boolean)))
    const response = ruleDraft.response.trim()
    if (!phrases.length || phrases.length > 20 ||
        phrases.some((phrase) => phrase.length < 2 || phrase.length > 80) ||
        !response || response.length > 1000) {
      toast.error("أدخل من عبارة واحدة إلى ٢٠ عبارة، ورداً لا يتجاوز ١٠٠٠ حرف")
      return
    }

    setSaving(true)
    const values = {
      phrases,
      response,
      is_active: true,
      updated_at: new Date().toISOString(),
    }
    const result = ruleDraft.id
      ? await supabase
          .from("assistant_merchant_rules")
          .update(values)
          .eq("id", ruleDraft.id)
          .eq("merchant_id", profile.id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("assistant_merchant_rules")
          .insert({ ...values, merchant_id: profile.id, priority: 100 })
          .select("id")
          .single()
    setSaving(false)
    if (result.error || !result.data?.id) {
      console.error("Could not save this merchant assistant rule", result.error)
      toast.error("تعذر حفظ قاعدة الرد")
      return
    }
    const savedRuleId = result.data.id
    setMerchantRules((current) => {
      if (!ruleDraft.id) {
        return [...current, {
          id: savedRuleId,
          phrases,
          response,
          priority: 100,
          is_active: true,
        }]
      }
      return current.map((rule) => rule.id === ruleDraft.id
        ? { ...rule, phrases, response, is_active: true }
        : rule)
    })
    setRuleDraft(null)
    toast.success("تم حفظ قاعدة متجرك")
  }

  async function toggleMerchantRule(rule: MerchantAssistantRule) {
    if (!profile) return
    const nextActive = !rule.is_active
    const { error } = await supabase
      .from("assistant_merchant_rules")
      .update({ is_active: nextActive, updated_at: new Date().toISOString() })
      .eq("id", rule.id)
      .eq("merchant_id", profile.id)
    if (error) {
      toast.error("تعذر تغيير حالة القاعدة")
      return
    }
    setMerchantRules((current) => current.map((item) =>
      item.id === rule.id ? { ...item, is_active: nextActive } : item,
    ))
  }

  async function deleteMerchantRule(rule: MerchantAssistantRule) {
    if (!profile) return
    const { error } = await supabase
      .from("assistant_merchant_rules")
      .delete()
      .eq("id", rule.id)
      .eq("merchant_id", profile.id)
    if (error) {
      toast.error("تعذر حذف القاعدة")
      return
    }
    setMerchantRules((current) => current.filter((item) => item.id !== rule.id))
    if (ruleDraft?.id === rule.id) setRuleDraft(null)
    toast.success("تم حذف القاعدة")
  }

  const input = "w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-foreground/40"
  const socialLinksCount = [
    config.socialInstagram,
    config.socialTikTok,
    config.socialFacebook,
    config.socialWebsite,
    config.socialWhatsApp,
  ].filter((value) => value.trim()).length

  return (
    <div className="max-w-4xl space-y-5">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">مساعد المتجر المحلي</h2>
            <p className="mt-1 text-sm text-muted">
              يتولى الرد على أسئلة زبائنك في المحادثات، اعتماداً على قواعد المنصة ومعلومات متجرك.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saveStatus === "saved" && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                تم حفظ الإعدادات
              </span>
            )}
            <Switch checked={assistantEnabled} onCheckedChange={toggleAssistant} aria-label="تفعيل مساعد المتجر" />
          </div>
        </div>

        {assistantEnabled ? (
          <div className="mt-5 space-y-5 border-t border-border pt-5">
            <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="إعدادات مساعد المتجر">
              {([
                ["store", "المتجر والروابط"],
                ["delivery", "التوصيل والعروض"],
                ["rules", "قواعد الرد"],
              ] as const).map(([key, label], index) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`assistant-settings-tab-${key}`}
                  aria-selected={settingsSection === key}
                  aria-controls={`assistant-settings-panel-${key}`}
                  onClick={() => setSettingsSection(key)}
                  className={`min-h-11 rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${
                    settingsSection === key ? "bg-ink text-white" : "bg-secondary text-muted hover:text-foreground"
                  }`}
                >
                  <span className="hidden sm:inline">{index + 1}. </span>{label}
                </button>
              ))}
            </div>

            <div
              role="tabpanel"
              id="assistant-settings-panel-store"
              aria-labelledby="assistant-settings-tab-store"
              hidden={settingsSection !== "store"}
              className="space-y-4"
            >
              <div>
                <p className="text-sm font-medium">معلومات المتجر التي يعتمد عليها المساعد</p>
                <p className="mt-1 text-xs text-muted">
                  يستخدم اسم هذا المتجر ومنتجاته وطلباته فقط، ويقرأ بيانات النشاط والفروع من حساب التاجر.
                </p>
                <Link href="/profile/merchant-setup" className="mt-2 inline-flex text-xs font-semibold text-primary underline underline-offset-4">
                  تعديل بيانات النشاط والفروع
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <label className="flex items-center justify-between gap-3 text-xs">
                    <span>تخصيص ساعات الدوام التي يذكرها المساعد</span>
                    <Switch
                      checked={config.botHoursEnabled}
                      onCheckedChange={(checked) => setConfig((current) => ({ ...current, botHoursEnabled: checked }))}
                      aria-label="تفعيل ساعات عمل المساعد"
                    />
                  </label>
                  {config.botHoursEnabled && (
                    <div className="space-y-3">
                      <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-xs">
                        <span>تشغيل البوت على مدار الساعة</span>
                        <Switch
                          checked={config.botHoursAlwaysOn}
                          onCheckedChange={(checked) => setConfig((current) => ({ ...current, botHoursAlwaysOn: checked }))}
                          aria-label="تشغيل البوت على مدار الساعة"
                        />
                      </label>
                      {!config.botHoursAlwaysOn && (
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1 text-xs">
                            <span>من</span>
                            <input type="time" value={config.botHoursStart} onChange={(event) => setConfig((current) => ({ ...current, botHoursStart: event.target.value }))} className={input} />
                          </label>
                          <label className="space-y-1 text-xs">
                            <span>إلى</span>
                            <input type="time" value={config.botHoursEnd} onChange={(event) => setConfig((current) => ({ ...current, botHoursEnd: event.target.value }))} className={input} />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <section className="overflow-hidden rounded-xl border border-border">
                <button
                  type="button"
                  aria-expanded={socialLinksOpen}
                  aria-controls="assistant-social-links"
                  onClick={() => setSocialLinksOpen((open) => !open)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-right"
                >
                  <span>
                    <span className="block text-sm font-medium">روابط التواصل الاجتماعي</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      فيسبوك، تيك توك، واتساب، إنستغرام والموقع
                      {socialLinksCount ? ` · ${socialLinksCount} مضافة` : ""}
                    </span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 transition-transform ${socialLinksOpen ? "rotate-180" : ""}`} />
                </button>
                {socialLinksOpen && (
                  <div id="assistant-social-links" className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-2">
                    {([
                      ["socialFacebook", "رابط فيسبوك"],
                      ["socialTikTok", "رابط تيك توك"],
                      ["socialWhatsApp", "رابط واتساب"],
                      ["socialInstagram", "رابط إنستغرام"],
                      ["socialWebsite", "الموقع الإلكتروني"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="space-y-1.5 text-xs">
                        <span>{label}</span>
                        <input
                          type="url"
                          value={config[key]}
                          onChange={(event) => setConfig((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder="https://..."
                          className={input}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div
              role="tabpanel"
              id="assistant-settings-panel-delivery"
              aria-labelledby="assistant-settings-tab-delivery"
              hidden={settingsSection !== "delivery"}
              className="rounded-2xl border border-border p-4 sm:p-5"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  ["deliveryFee", "أجور التوصيل"],
                  ["deliveryMinDays", "أقل مدة توصيل بالأيام"],
                  ["deliveryMaxDays", "أعلى مدة توصيل بالأيام"],
                  ["returnDays", "مدة الاسترجاع/الاستبدال بالأيام"],
                  ["exchangeDeliveryFee", "أجور توصيل التبديل"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="space-y-1.5 text-xs">
                    <span>{label}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={config[key]}
                      onChange={(event) => setConfig((current) => ({ ...current, [key]: event.target.value }))}
                      placeholder="اتركه فارغاً إذا لم يُحدّد"
                      className={input}
                    />
                  </label>
                ))}
                <label className="space-y-1.5 text-xs">
                  <span>رابط التقييم أو صفحة المتجر</span>
                  <input
                    type="url"
                    value={config.reviewUrl}
                    onChange={(event) => setConfig((current) => ({ ...current, reviewUrl: event.target.value }))}
                    placeholder="https://..."
                    className={input}
                  />
                </label>
                <label className="space-y-1.5 text-xs">
                  <span>كود الخصم الحالي</span>
                  <input
                    value={config.discountCode}
                    onChange={(event) => setConfig((current) => ({ ...current, discountCode: event.target.value }))}
                    placeholder="أدخل الكود الفعّال فقط"
                    className={input}
                  />
                </label>
                <label className="space-y-1.5 text-xs sm:col-span-2">
                  <span>تفاصيل الخصم</span>
                  <input
                    value={config.discountDescription}
                    onChange={(event) => setConfig((current) => ({ ...current, discountDescription: event.target.value }))}
                    placeholder="مثال: خصم ١٠٪ حتى تاريخ ... أو عرض قطعتين بسعر ..."
                    className={input}
                  />
                </label>
                <p className="text-xs text-muted sm:col-span-2">
                  يذكر المساعد هنا الخصومات التي تدخلها، وأسعار التخفيض المسجلة على منتجاتك، والإعلانات الترويجية النشطة لمتجرك فقط.
                </p>
                <label className="space-y-1.5 text-xs sm:col-span-2">
                  <span>تفاصيل أجور ومناطق التوصيل</span>
                  <textarea
                    rows={3}
                    value={config.shippingRates}
                    onChange={(event) => setConfig((current) => ({ ...current, shippingRates: event.target.value }))}
                    placeholder="مثال: بغداد ٣,٠٠٠ د.ع، باقي المحافظات ٥,٠٠٠ د.ع، مجاني للطلبات فوق ..."
                    className={input}
                  />
                </label>
                <label className="space-y-1.5 text-xs sm:col-span-2">
                  <span>الدول التي يشملها الشحن الدولي</span>
                  <input
                    value={config.internationalShippingCountries}
                    onChange={(event) => setConfig((current) => ({ ...current, internationalShippingCountries: event.target.value }))}
                    placeholder="اتركه فارغاً إذا لا يوجد شحن دولي"
                    className={input}
                  />
                </label>
                <label className="space-y-1.5 text-xs sm:col-span-2">
                  <span>طرق الدفع وفحص المنتج عند الاستلام</span>
                  <textarea
                    rows={3}
                    value={config.paymentMethods}
                    onChange={(event) => setConfig((current) => ({ ...current, paymentMethods: event.target.value }))}
                    placeholder="مثال: الدفع عند الاستلام، زين كاش، وهل يسمح بفحص الطرد أمام المندوب"
                    className={input}
                  />
                </label>
                <label className="space-y-1.5 text-xs sm:col-span-2">
                  <span>سياسة الاستبدال والاسترجاع</span>
                  <textarea
                    rows={3}
                    value={config.returnPolicy}
                    onChange={(event) => setConfig((current) => ({ ...current, returnPolicy: event.target.value }))}
                    placeholder="اكتب الشروط والمدة الفعلية، أو اتركه فارغاً لاستخدام المدة المحددة أعلاه"
                    className={input}
                  />
                </label>
              </div>
            </div>

            <div
              role="tabpanel"
              id="assistant-settings-panel-rules"
              aria-labelledby="assistant-settings-tab-rules"
              hidden={settingsSection !== "rules"}
              className="space-y-3 rounded-2xl border border-border p-4 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">قواعد ردود هذا المتجر</p>
                  <p className="mt-1 text-xs text-muted">
                    أضف قواعد متعددة؛ كل قاعدة لها كلماتها وردها الخاص، ولا تُستخدم إلا في محادثات هذا المتجر.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingRule || saving}
                  onClick={() => startRuleDraft()}
                  className="shrink-0 rounded-full"
                >
                  <Plus className="me-1 size-4" />
                  إضافة قاعدة
                </Button>
              </div>
              {ruleDraft && (
                <div className="space-y-3 rounded-2xl border border-border p-4">
                  <label className="block space-y-1.5 text-xs">
                    <span>الكلمات أو العبارات المحفزة (عبارة في كل سطر)</span>
                    <textarea
                      rows={6}
                      value={ruleDraft.phrases}
                      onChange={(event) => setRuleDraft((current) => current ? { ...current, phrases: event.target.value } : current)}
                      placeholder={"وين مكانكم\nشكد التوصيل\nمتى يجهز الطلب"}
                      className={input}
                    />
                    <span className="block text-[11px] text-muted">حتى ٢٠ عبارة. تطابق الكلمات بعد توحيد أشكال الحروف العربية واللهجات القريبة.</span>
                  </label>
                  <label className="block space-y-1.5 text-xs">
                    <span>الردود المعتمدة لهذا المتجر</span>
                    <textarea
                      rows={5}
                      value={ruleDraft.response}
                      onChange={(event) => setRuleDraft((current) => current ? { ...current, response: event.target.value } : current)}
                      placeholder={"اكتب رداً واحداً، أو افصل الردود البديلة بـ |||\nمثال: أهلاً بك! ||| حياك الله!"}
                      className={input}
                    />
                    <span className="block text-[11px] text-muted">عند وجود أكثر من رد، سيختار المساعد رداً مختلفاً عن آخر رد في المحادثة.</span>
                  </label>
                  <p className="text-[11px] text-muted">
                    المتغيرات المتاحة: {"{{storeName}}"}، {"{{businessHours}}"}، {"{{branchLocations}}"}، {"{{storeLocationReply}}"}، {"{{socialLinks}}"}، {"{{shippingInfo}}"}، {"{{paymentOptions}}"}، {"{{returnPolicy}}"}، {"{{offerInfo}}"}.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setRuleDraft(null)} className="rounded-full">
                      إغلاق
                    </Button>
                    <Button type="button" onClick={() => void saveMerchantRule()} disabled={saving || loadingRule} className="rounded-full">
                      {saving ? "جارٍ الحفظ..." : "حفظ القاعدة"}
                    </Button>
                  </div>
                </div>
              )}
              {loadingRule ? (
                <p className="rounded-xl bg-secondary p-3 text-xs text-muted">جارٍ تحميل القواعد...</p>
              ) : merchantRules.length === 0 ? (
                <p className="rounded-xl bg-secondary p-3 text-xs text-muted">لا توجد قواعد خاصة بعد. أضف قاعدة لرد مخصص لهذا المتجر.</p>
              ) : (
                <div className="space-y-3">
                  {merchantRules.map((merchantRule) => (
                    <article key={merchantRule.id} className="rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-semibold">الكلمات: {merchantRule.phrases.join("، ")}</p>
                            <span className={`rounded-full px-2 py-1 text-[10px] ${merchantRule.is_active ? "bg-emerald-100 text-emerald-800" : "bg-chip text-muted"}`}>
                              {merchantRule.is_active ? "مفعّلة" : "متوقفة"}
                            </span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted">
                            {merchantRule.response.split(/\s*\|\|\|\s*/u).join("\nأو: ")}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" variant="outline" className="h-8 rounded-full px-3 text-xs" onClick={() => void toggleMerchantRule(merchantRule)}>
                            {merchantRule.is_active ? "إيقاف" : "تفعيل"}
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="size-8 rounded-full" aria-label="تعديل القاعدة" onClick={() => startRuleDraft(merchantRule)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="size-8 rounded-full text-red-700" aria-label="حذف القاعدة" onClick={() => void deleteMerchantRule(merchantRule)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={() => saveInstructions()} disabled={saving || !!ruleDraft} className="h-11 rounded-full px-6">
              {saving ? "جارٍ الحفظ..." : "حفظ إعدادات المتجر"}
            </Button>
            <p className="text-xs text-muted">
              الأسعار تُقرأ من منتجاتك الفعلية. تأكيد الإلغاء أو تعديل الطلب أو الشكوى يحتاج متابعة التاجر.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-secondary p-4">
            <p className="text-sm font-medium">المساعد متوقف حالياً</p>
            <p className="mt-1 text-xs leading-5 text-muted">فعّله ليجيب تلقائياً عن أسئلة العملاء. يمكنك تجهيز بيانات المتجر بعد التفعيل.</p>
          </div>
        )}
      </section>
    </div>
  )
}
