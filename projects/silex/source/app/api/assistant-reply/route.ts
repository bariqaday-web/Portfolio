import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getLocalStoreAssistantReplyRule,
  getLocalStoreAssistantReply,
  isBotAvailableNow,
  isHumanHandoffRequest,
  renderAssistantResponse,
  type StoreAssistantConfig,
  type AssistantProduct,
  type AssistantOrder,
} from "@/lib/local-store-assistant"

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") ?? ""
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "backend_not_configured" }, { status: 503 })
    }

    const { data: userData } = await supabaseAdmin.auth.getUser(auth.slice(7))
    const caller = userData.user
    if (!caller) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const { conversationId, customerMessage, recipientId, context } = await req.json()
    if (
      typeof conversationId !== "string" ||
      !conversationId ||
      typeof customerMessage !== "string" ||
      !customerMessage.trim()
    ) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 })
    }
    if (customerMessage.length > 1000) {
      return NextResponse.json({ error: "الرسالة طويلة جداً" }, { status: 400 })
    }
    if (context !== undefined && (typeof context !== "string" || context.length > 500)) {
      return NextResponse.json({ error: "سياق الرسالة غير صالح" }, { status: 400 })
    }
    if (typeof recipientId !== "string") {
      return NextResponse.json({ error: "أطراف المحادثة غير صحيحة" }, { status: 400 })
    }

    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .select("customer_id, merchant_id")
      .eq("id", conversationId)
      .maybeSingle()

    if (!conv) return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 })

    if (caller.id !== conv.customer_id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const senderId = caller.id
    if (!recipientId || recipientId !== conv.merchant_id || senderId === recipientId) {
      return NextResponse.json({ error: "أطراف المحادثة غير صحيحة" }, { status: 400 })
    }

    const { data: merchant } = await supabaseAdmin
      .from("profiles")
      .select("store_name, full_name, store_category, store_bio, assistant_enabled, assistant_config")
      .eq("id", recipientId)
      .maybeSingle()

    if (!merchant || !merchant.assistant_enabled) {
      return NextResponse.json({ skipped: "assistant_disabled" })
    }

    const config = (merchant.assistant_config as StoreAssistantConfig | null) ?? {}
    const handoffRequested = isHumanHandoffRequest(customerMessage)

    // ساعات العمل: عند تفعيل الخيار 24/7 لا توجد قيود زمنية؛ وإلا يلزم تحديد النطاق الزمني
    if (!handoffRequested && !isBotAvailableNow(config)) {
      return NextResponse.json({ skipped: "outside_hours" })
    }

    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, username")
      .eq("id", senderId)
      .maybeSingle()

    const { data: productsRaw, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, title, price, old_price, description, stock, cover_url, category")
      .eq("merchant_id", recipientId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100)
    if (productsError) throw productsError

    const { data: categoriesRaw, error: categoriesError } = await supabaseAdmin
      .from("categories")
      .select("id, name")
    if (categoriesError) throw categoriesError
    const categoryNames = new Map(
      (categoriesRaw ?? []).map((category) => [category.id, category.name]),
    )

    const products: AssistantProduct[] = (productsRaw ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      oldPrice: p.old_price,
      description: p.description,
      stock: p.stock,
      coverUrl: p.cover_url,
      category: categoryNames.get(p.category) ?? p.category,
    }))

    const { data: latestOrderRaw } = await supabaseAdmin
      .from("orders")
      .select("code, status, total_amount, items_count")
      .eq("merchant_id", recipientId)
      .eq("customer_id", senderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const latestOrder: AssistantOrder | null = latestOrderRaw
      ? {
          code: latestOrderRaw.code,
          status: latestOrderRaw.status,
          total: latestOrderRaw.total_amount,
          items: latestOrderRaw.items_count,
        }
      : null

    const { data: previousStoreMessage, error: previousMessageError } = await supabaseAdmin
      .from("messages")
      .select("content")
      .eq("conversation_id", conversationId)
      .eq("sender_id", recipientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (previousMessageError) throw previousMessageError
    const previousReply = previousStoreMessage?.content ?? null

    const storeName = merchant.store_name || merchant.full_name || "المتجر"

    // المتغيرات الديناميكية التي تُستخدم داخل قاعدة التاجر الخاصة
    const businessHours = config.botHoursAlwaysOn === true
      ? "على مدار الساعة"
      : config.botHoursEnabled
        ? `${config.botHoursStart || "09:00"} - ${config.botHoursEnd || "22:00"}`
        : "على مدار الساعة"
    const socialLinks = [
      config.socialInstagram && `إنستغرام: ${config.socialInstagram}`,
      config.socialTikTok && `تيك توك: ${config.socialTikTok}`,
      config.socialFacebook && `فيسبوك: ${config.socialFacebook}`,
      config.socialWebsite && `الموقع: ${config.socialWebsite}`,
      config.socialWhatsApp && `واتساب: ${config.socialWhatsApp}`,
    ].filter(Boolean).join("، ")
    const storeLocationReply = config.storeMode === "physical" || config.storeMode === "both"
      ? (config.branchLocations || "تواصل معنا لمعرفة أقرب فرع")
      : "متجرنا إلكتروني بالكامل، نوصّل لباب بيتك"

    const templateVars: Record<string, string> = {
      storeName,
      businessHours,
      branchLocations: config.branchLocations || "",
      storeLocationReply,
      socialLinks: socialLinks || "لا توجد روابط مسجلة",
      shippingInfo: config.shippingRates || "",
      paymentOptions: config.paymentMethods || "",
      returnPolicy: config.returnPolicy || "",
      offerInfo: config.discountCode
        ? `${config.discountCode}${config.discountDescription ? ` — ${config.discountDescription}` : ""}`
        : "لا يوجد عرض نشط حالياً",
    }

    // 1) قاعدة التاجر الخاصة (أولوية قصوى، لأن التاجر خصصها بنفسه)
    const { data: merchantRules, error: merchantRulesError } = await supabaseAdmin
      .from("assistant_merchant_rules")
      .select("phrases, response")
      .eq("merchant_id", recipientId)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
    if (merchantRulesError) throw merchantRulesError

    let matchedText: string | null = null

    if (!handoffRequested) {
      const merchantRule = getLocalStoreAssistantReplyRule(
        (merchantRules ?? []).map((rule) => ({
          phrases: rule.phrases as string[],
          response: rule.response,
        })),
        customerMessage,
      )
      if (merchantRule.matched && merchantRule.response) {
        matchedText = renderAssistantResponse(merchantRule.response, templateVars, previousReply)
      }
    }

    // 2) قواعد الأدمن العامة (لو ما طابقت قاعدة التاجر)
    if (!matchedText && !handoffRequested) {
      const { data: adminRulesRaw, error: adminRulesError } = await supabaseAdmin
        .from("assistant_reply_rules")
        .select("phrases, response")
        .eq("is_active", true)
        .order("priority", { ascending: true })
      if (adminRulesError) throw adminRulesError

      const platformRule = getLocalStoreAssistantReplyRule(
        (adminRulesRaw ?? []).map((rule) => ({
          phrases: rule.phrases as string[],
          response: rule.response,
        })),
        customerMessage,
      )
      if (platformRule.matched && platformRule.response) {
        matchedText = renderAssistantResponse(platformRule.response, templateVars, previousReply)
      }
    }

    let replyText: string
    let needsMerchant: boolean
    let assistantReply: ReturnType<typeof getLocalStoreAssistantReply> | null = null;

    if (matchedText) {
      replyText = matchedText
      needsMerchant = false
    } else {
      // 3) النيات المدمجة بالكود (سعر، توصيل، استرجاع، هوية المتجر...)
      assistantReply = getLocalStoreAssistantReply({
        customerName: senderProfile?.full_name || senderProfile?.username || "عزيزي الزبون",
        storeName,
        storeCategory: merchant.store_category,
        storeBio: merchant.store_bio,
        message: String(customerMessage),
        context: typeof context === "string" ? context : undefined,
        previousReply,
        products,
        latestOrder,
        config,
      })
      replyText = assistantReply.text
      needsMerchant = assistantReply.needsMerchant
    }

    const recommendations = assistantReply?.productRecommendations ?? []
    const { error: messageError } = await supabaseAdmin.from("messages").insert({
      conversation_id: conversationId,
      sender_id: recipientId,
      content: replyText,
      meta: {
        from_bot: true,
        needs_merchant: needsMerchant,
        ...(recommendations.length
          ? {
              type: "product_recommendations",
              products: recommendations.map((product) => ({
                id: product.id,
                name: product.title,
                price: product.price,
                oldPrice: product.oldPrice,
                image: product.coverUrl,
              })),
            }
          : {}),
      },
    })
    if (messageError) throw messageError

    await supabaseAdmin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId)

    return NextResponse.json({ ok: true, handover: needsMerchant })
  } catch (err) {
    console.error("assistant-reply error:", err)
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 })
  }
}
