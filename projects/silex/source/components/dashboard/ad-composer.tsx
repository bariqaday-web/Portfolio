"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, CalendarDays, Check, ImagePlus, Package, Play, Search, Store } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { formatIQD } from "@/components/store/store-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SponsoredCard, type AdItem } from "@/components/SponsoredCard"
import { SponsoredStoryPreview } from "@/components/SponsoredStory"
import {
  AD_COPY_OPTIONS,
  AD_DESIGN_COLORS,
  AD_DESIGN_PRESETS,
  AD_SHAPES,
  type AdDesignType,
  type AdShape,
} from "@/lib/ad-artwork"

export type Pkg = {
  id: string;
  label: string;
  days: number;
  daily_price: number;
  features?: string[] | null;
  is_recommended?: boolean | null;
}
export type Tpl = { type: string; title: string; description: string }
export type MyProduct = { id: string; title: string; cover_url: string | null; price: number | null }
export type CreatedCampaign = { id: string; status: string; price: number }

const ERR: Record<string, string> = {
  NOT_MERCHANT: "هذه الخدمة للتجار فقط",
  TEMPLATE_DISABLED: "هذا القالب غير متاح حالياً",
  PACKAGE_UNAVAILABLE: "الباقة غير متاحة حالياً",
  PACKAGE_PRICE_UNAVAILABLE: "سعر هذه الباقة غير مضبوط بعد، تواصل مع الإدارة",
  PAYMENT_NOT_CONFIGURED: "الدفع غير مهيأ حالياً، تواصل مع الإدارة",
  PAYMENTS_DISABLED: "بوابة الدفع الإلكتروني الآلي متوقفة. التحويل اليدوي لا يحتاج تفعيلها؛ حدّث دوال الدفع اليدوي في Supabase إذا ظهر هذا الخطأ أثناء إنشاء الإعلان.",
  BAD_TARGET: "المنتج غير صالح",
  BAD_TITLE: "العنوان قصير جداً",
  IMAGE_REQUIRED: "أضف صورة للإعلان",
  BAD_IMAGE: "رابط الصورة غير صالح",
  BAD_REF: "رقم العملية غير صالح (من 6 إلى 40 حرفاً أو رقماً)",
  BAD_RECEIPT: "تعذّر قبول الإيصال",
  NOT_PAYABLE: "هذا الإعلان لا يحتاج دفعاً الآن",
  REF_USED: "رقم العملية مستخدم سابقاً",
}

export function errText(e: unknown) {
  const m = (e as { message?: string } | null)?.message ?? ""
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k]
  return "تعذّر تنفيذ العملية، حاول مجدداً"
}

export function pickImage(e: React.ChangeEvent<HTMLInputElement>, max: number): File | null {
  const f = e.target.files?.[0]
  e.target.value = ""
  if (!f) return null
  if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
    toast.error("اختر صورة (JPG أو PNG أو WebP)")
    return null
  }
  if (f.size > max) {
    toast.error(`حجم الصورة أكبر من ${Math.round(max / 1024 / 1024)}MB`)
    return null
  }
  return f
}

const ICONS: Record<string, typeof Package> = { product: Package, company: Store, promotion: ImagePlus, story: Play }

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

type Props = {
  uid: string
  storeName: string
  storeAvatar: string | null
  paymentConfigured: boolean
  paymentSettingsError: boolean
  packagesError: boolean
  tpls: Tpl[]
  pkgs: Pkg[]
  products: MyProduct[]
  onCancel: () => void
  onCreated: (row: CreatedCampaign) => void | Promise<void>
}

export function AdComposer({ uid, storeName, storeAvatar, paymentConfigured, paymentSettingsError, packagesError, tpls, pkgs, products, onCancel, onCreated }: Props) {
  const [tpl, setTpl] = useState<AdDesignType | null>(null)
  const [step, setStep] = useState(1)
  const [productId, setProductId] = useState("")
  const [query, setQuery] = useState("")
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [color, setColor] = useState<string>(AD_DESIGN_COLORS[0].value)
  const [shape, setShape] = useState<AdShape>("orbit")
  const [file, setFile] = useState<File | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [pkgId, setPkgId] = useState("")
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!pkgId && pkgs.length) setPkgId((pkgs.find((x) => x.is_recommended) ?? pkgs[1] ?? pkgs[0]).id)
  }, [pkgs, pkgId])

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  const known = tpls.filter((t) => t.type in AD_COPY_OPTIONS)
  const selectedProduct = products.find((p) => p.id === productId)
  const shownProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? products.filter((p) => p.title.toLowerCase().includes(q)) : products
  }, [products, query])
  const pkg = pkgs.find((p) => p.id === pkgId)

  function chooseTemplate(type: AdDesignType) {
    setTpl(type)
    const first = AD_DESIGN_PRESETS.find((d) => d.type === type)
    if (first) {
      setColor(first.color)
      setShape(first.shape)
    }
    setDesc(AD_COPY_OPTIONS[type][0])
    setStep(2)
  }

  function continueToPlan() {
    if (tpl === "product" && !selectedProduct) {
      toast.error("اختر المنتج المراد الترويج له")
      return
    }
    if ((tpl === "promotion" || tpl === "story") && title.trim().length < 3) {
      toast.error("اكتب عنواناً للإعلان (3 أحرف على الأقل)")
      return
    }
    if ((tpl === "promotion" || tpl === "story") && !file) {
      toast.error("أضف صورة للبانر")
      return
    }
    setStep(3)
  }

  const previewAd: AdItem | null = tpl
    ? {
        id: "preview",
        type: tpl,
        title:
          tpl === "product"
            ? selectedProduct?.title || "اسم منتجك"
            : tpl === "company"
              ? storeName || "متجري"
              : title.trim() || (tpl === "story" ? "عنوان قصتك" : "عنوان إعلانك"),
        description: desc.trim() || null,
        image_url: tpl === "promotion" || tpl === "story" ? photo : null,
        merchant_id: uid,
        merchant_name: storeName || "متجري",
        merchant_avatar: storeAvatar,
        merchant_verified: false,
        product_id: tpl === "product" ? selectedProduct?.id ?? "preview" : null,
        product_title: tpl === "product" ? selectedProduct?.title ?? null : null,
        product_image: tpl === "product" ? selectedProduct?.cover_url ?? null : null,
        product_price: tpl === "product" ? selectedProduct?.price ?? null : null,
        design_color: color,
        design_shape: shape,
      }
    : null

  async function submit() {
    if (!tpl || !pkg) return
    let adTitle = ""
    let targetId: string | null = null
    let imageUrl: string | null = null

    if (tpl === "product") {
      if (!selectedProduct) return toast.error("اختر المنتج المراد تعزيزه")
      adTitle = selectedProduct.title
      targetId = selectedProduct.id
    } else if (tpl === "company") {
      adTitle = storeName || "متجري"
    } else if (tpl === "promotion" || tpl === "story") {
      if (title.trim().length < 3) return toast.error("اكتب عنواناً للإعلان (3 أحرف على الأقل)")
      if (!file) return toast.error(tpl === "story" ? "أضف صورة للقصة" : "أضف صورة للبانر")
      adTitle = title.trim()
    }

    setBusy(true)
    try {
      if ((tpl === "promotion" || tpl === "story") && file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
        const path = `${uid}/ad-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from("posts").upload(path, file, { contentType: file.type })
        if (upErr) throw upErr
        imageUrl = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl
      }
      const { data, error } = await supabase.rpc("create_campaign", {
        p_type: tpl,
        p_package_id: pkg.id,
        p_title: adTitle,
        p_description: desc.trim() || null,
        p_image_url: imageUrl,
        p_target_id: targetId,
        p_province: null,
        p_category: null,
        p_color: color,
        p_shape: shape,
      })
      if (error) throw error
      await onCreated(data as CreatedCampaign)
    } catch (e) {
      console.error(e)
      toast.error(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <aside className="order-last lg:sticky lg:top-24 lg:order-none lg:col-start-2 lg:row-start-1 lg:self-start">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">هكذا سيظهر إعلانك للزبائن</p>
        {previewAd ? (
          tpl === "story" ? <SponsoredStoryPreview ad={previewAd} /> : <SponsoredCard ad={previewAd} preview />
        ) : (
          <div className="flex min-h-[250px] items-center justify-center rounded-[28px] border-2 border-dashed border-border px-6 text-center text-sm text-muted-foreground">
            اختر نوع الإعلان لتشاهد المعاينة
          </div>
        )}
      </aside>

      <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">إنشاء إعلان جديد</p>
              <h2 className="mt-1 text-lg font-bold">
                {step === 1 ? "اختر نوع الإعلان" : step === 2 ? "التصميم والمحتوى" : step === 3 ? "العبارة التسويقية" : "اختر مدة الإعلان"}
              </h2>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">{step} من 4</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5" aria-label="خطوات إنشاء الإعلان">
            {["النوع", "التصميم", "الوصف", "المدة"].map((label, index) => (
              <div key={label} className="space-y-1.5">
                <div className={`h-1 rounded-full ${step >= index + 1 ? "bg-primary" : "bg-secondary"}`} />
                <span className={`block text-[10px] ${step === index + 1 ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {step === 1 && <Section title="نوع الإعلان" hint="اختر أين تريد أن يظهر إعلانك">
          {known.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد قوالب متاحة حالياً.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {known.map((t) => {
                const Icon = ICONS[t.type] ?? Package
                const active = tpl === t.type
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => chooseTemplate(t.type as AdDesignType)}
                    className={`flex min-h-32 flex-col items-start gap-3 rounded-2xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-sm ${
                      active ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{t.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{t.description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </Section>}

        {step === 2 && tpl === "product" && (
          <Section title="المنتج" hint="اختر المنتج الذي تريد الترويج له">
            {products.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد منتجات لتعزيزها، أضف منتجاً أولاً.</p>
            ) : (
              <>
                {products.length > 5 && (
                  <div className="relative">
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج" className="h-10 ps-9" />
                  </div>
                )}
                <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                  {shownProducts.map((p) => {
                    const active = productId === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductId(p.id)}
                        className={`flex w-full items-center gap-3 rounded-lg p-2 text-right transition ${
                          active ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-secondary"
                        }`}
                      >
                        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                          {p.cover_url ? (
                            <img src={p.cover_url} alt="" className="size-full object-cover" />
                          ) : (
                            <Package className="size-4 text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{p.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {p.price == null ? "السعر غير محدد" : formatIQD(p.price)}
                          </span>
                        </span>
                        {active && <Check className="size-4 shrink-0 text-primary" />}
                      </button>
                    )
                  })}
                  {shownProducts.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">لا توجد نتائج</p>}
                </div>
              </>
            )}
          </Section>
        )}

        {step === 2 && (tpl === "promotion" || tpl === "story") && (
          <Section title={tpl === "story" ? "محتوى القصة الممولة" : "محتوى البانر"}>
            <div className="space-y-1.5">
              <label htmlFor="ad-title" className="text-xs font-semibold">
                عنوان الإعلان
              </label>
              <Input
                id="ad-title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                placeholder="مثال: خصم 20% على كل المنتجات"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold">{tpl === "story" ? "صورة القصة" : "صورة البانر"}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border hover:bg-secondary"
              >
                {photo ? (
                  <img src={photo} alt="" className="size-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
                    <ImagePlus className="size-7" />
                    اضغط لاختيار صورة ({tpl === "story" ? "يفضّل عمودية بنسبة 9:16" : "يفضّل أفقية وواضحة"})
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = pickImage(e, 5 * 1024 * 1024)
                  if (!f) return
                  setFile(f)
                  setPhoto(URL.createObjectURL(f))
                }}
              />
            </div>
          </Section>
        )}

        {step === 2 && tpl && (
          <Section title="الهوية البصرية" hint="اختر نمطاً ولوناً يعكسان شكل إعلانك">
            <div className="grid grid-cols-3 gap-2">
              {AD_DESIGN_PRESETS.filter((d) => d.type === tpl).map((d) => {
                const active = d.color === color && d.shape === shape
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setColor(d.color)
                      setShape(d.shape)
                    }}
                    className={`relative overflow-hidden rounded-xl p-3 text-right text-white transition ${
                      active ? "ring-2 ring-primary ring-offset-2" : "opacity-90 hover:opacity-100"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${d.color}, #171923)` }}
                  >
                    <span className="block text-xs font-bold">{d.title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-[10px] text-white/70">{d.subtitle}</span>
                    {active && <Check className="absolute left-2 top-2 size-3.5" />}
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">اللون</p>
              <div className="flex flex-wrap gap-2">
                {AD_DESIGN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    aria-label={`اللون ${c.name}`}
                    aria-pressed={color === c.value}
                    onClick={() => setColor(c.value)}
                    className={`flex size-8 items-center justify-center rounded-full border-2 transition ${
                      color === c.value ? "scale-110 border-foreground" : "border-white shadow-sm"
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {color === c.value && <Check size={15} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold">الزخرفة</p>
              <div className="flex flex-wrap gap-2">
                {AD_SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={shape === s.id}
                    onClick={() => setShape(s.id)}
                    className={`rounded-full border px-4 py-1.5 text-xs transition ${
                      shape === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

          </Section>
        )}

        {step === 3 && tpl && (
          <Section title="العبارة التسويقية" hint="أضف وصفاً قصيراً يوضح قيمة الإعلان (اختياري)">
            <div className="flex flex-wrap gap-2">
              {AD_COPY_OPTIONS[tpl].map((copy) => (
                <button
                  key={copy}
                  type="button"
                  onClick={() => setDesc(copy)}
                  className={`min-h-10 rounded-full border px-3 py-2 text-[11px] transition ${
                    desc === copy ? "border-primary bg-primary/5 font-semibold" : "border-border hover:bg-secondary"
                  }`}
                >
                  {copy}
                </button>
              ))}
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 90))}
              maxLength={90}
              rows={3}
              placeholder="أو اكتب عبارتك (حتى 90 حرفاً)"
              className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </Section>
        )}

        {step === 4 && tpl && (
          <Section title="مدة الإعلان" hint="اختر مدة الإعلان. سيُرسل للإدارة للمراجعة ولن يظهر للعملاء قبل الموافقة.">
            {packagesError ? (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-800">تعذّر تحميل الباقات من قاعدة البيانات. حدّث الصفحة أو تحقق من صلاحيات قراءة الباقات.</p>
            ) : pkgs.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد باقات متاحة حالياً.</p>
            ) : (
              <div className="grid items-stretch gap-4 pt-3 sm:grid-cols-2 xl:grid-cols-3">
                {pkgs.map((p) => {
                  const active = pkgId === p.id
                  const features = p.features ?? []
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPkgId(p.id)}
                      aria-pressed={active}
                      disabled={p.daily_price < 1}
                      className={`relative flex h-auto min-h-[220px] flex-col gap-4 rounded-2xl border p-5 text-right transition ${
                        active
                          ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary"
                          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {p.is_recommended && (
                        <span className="absolute -top-3 right-5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground shadow-sm">
                          الأكثر طلباً
                        </span>
                      )}
                      <span className="block break-words text-lg font-bold leading-snug">{p.label}</span>
                      <span className="flex items-end justify-between gap-3">
                        <span className="block">
                          <span className="block text-3xl font-extrabold leading-none">{p.days}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {p.days === 1 ? "يوم واحد" : p.days === 7 ? "أسبوع واحد" : p.days === 30 ? "شهر واحد" : "أيام عرض"}
                          </span>
                        </span>
                        <span className="text-left">
                          <span className="block font-bold text-primary">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              maximumFractionDigits: 0,
                            }).format(p.daily_price * p.days)}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {p.daily_price < 1 ? "بانتظار تسعير الأدمن" : "للباقة"}
                          </span>
                        </span>
                      </span>
                      {features.length > 0 && (
                        <span className="block space-y-2 border-t border-border pt-4">
                          {features.map((f) => (
                            <span key={f} className="flex items-start gap-2 text-sm leading-6 text-foreground/80">
                              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-emerald-600" />
                              <span className="break-words">{f}</span>
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            <p className={`text-xs leading-5 ${paymentSettingsError || !paymentConfigured || !pkgs.some((p) => p.daily_price >= 1) ? "rounded-lg bg-amber-50 p-3 text-amber-800" : "text-muted-foreground"}`}>
              {paymentSettingsError
                ? "تعذّر تحميل وجهة التحويل. تحقق من تطبيق ترحيل إعدادات التحويل اليدوي وصلاحية القراءة للمستخدم المسجل."
                : !paymentConfigured
                ? "لم يضبط الأدمن رقم البطاقة أو المحفظة أو IBAN بعد، لذلك لا يمكن بدء الدفع."
                : !pkgs.some((p) => p.daily_price >= 1)
                  ? "الباقات غير متاحة حتى يحدد الأدمن سعرها بالدولار من إعدادات الإعلانات."
                  : "حوّل المبلغ إلى الوجهة التي حددها الأدمن وأرسل الإيصال؛ يبقى الإعلان مخفيًا حتى مراجعة الإدارة وموافقتها."}
            </p>
          </Section>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? onCancel() : setStep((current) => current - 1))}
            disabled={busy}
            className="h-11 rounded-full bg-transparent px-5"
          >
            {step === 1 ? "إلغاء" : "السابق"}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => {
                if (step === 1) setStep(2)
                else if (step === 2) continueToPlan()
                else setStep(4)
              }}
              disabled={busy || !tpl}
              className="h-11 min-w-32 rounded-full"
            >
              التالي
              <ArrowRight className="ms-2 size-4" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={!tpl || !pkg || pkg.daily_price < 1 || !paymentConfigured || paymentSettingsError || packagesError || busy} className="h-11 flex-1 rounded-full">
              {busy ? "جارٍ إنشاء الإعلان..." : "إنشاء الإعلان والمتابعة للدفع"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
