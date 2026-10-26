export type StoreAssistantConfig = {
  deliveryFee?: number | null;
  deliveryMinDays?: number | null;
  deliveryMaxDays?: number | null;
  returnDays?: number | null;
  exchangeDeliveryFee?: number | null;
  reviewUrl?: string | null;
  discountCode?: string | null;
  discountDescription?: string | null;
  shippingRates?: string | null;
  internationalShippingCountries?: string | null;
  paymentMethods?: string | null;
  returnPolicy?: string | null;
  botHoursEnabled?: boolean;
  botHoursAlwaysOn?: boolean;
  botHoursStart?: string;
  botHoursEnd?: string;
  storeMode?: "online" | "physical" | "both";
  branchLocations?: string | null;
  socialInstagram?: string | null;
  socialTikTok?: string | null;
  socialFacebook?: string | null;
  socialWebsite?: string | null;
  socialWhatsApp?: string | null;
};

export type AssistantProduct = {
  id: string;
  title: string;
  price: number | null;
  oldPrice: number | null;
  description: string | null;
  stock: number | null;
  coverUrl: string | null;
  category: string | null;
};

export type AssistantOrder = {
  code: string;
  status: string;
  total: number;
  items: unknown;
};

export type AssistantReplyRule = {
  phrases: string[];
  response: string;
};

type ReplyContext = {
  customerName: string;
  storeName: string;
  storeCategory?: string | null;
  storeBio?: string | null;
  message: string;
  context?: string;
  previousReply?: string;
  products: AssistantProduct[];
  latestOrder: AssistantOrder | null;
  config: StoreAssistantConfig;
  activePromotions?: string[];
  customRules?: AssistantReplyRule[];
  platformRules?: AssistantReplyRule[];
};

export type LocalAssistantReply = {
  text: string;
  needsMerchant: boolean;
  productRecommendations?: AssistantProduct[];
};

export function isWithinBotHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) return nowMin >= startMin && nowMin <= endMin;
  return nowMin >= startMin || nowMin <= endMin;
}

export function isBotAvailableNow(config: StoreAssistantConfig): boolean {
  if (config.botHoursEnabled !== true) return true;
  if (config.botHoursAlwaysOn === true) return true;
  const start = config.botHoursStart || "09:00";
  const end = config.botHoursEnd || "22:00";
  return isWithinBotHours(start, end);
}

export function chooseAssistantResponse(response: string, previousResponse?: string | null) {
  const alternatives = response.split(/\s*\|\|\|\s*/u).map((item) => item.trim()).filter(Boolean);
  return alternatives.find((item) => item !== previousResponse) ?? alternatives[0] ?? response;
}

export function renderAssistantResponse(
  response: string,
  vars: Record<string, string>,
  previousResponse?: string | null,
) {
  const alternatives = response.split(/\s*\|\|\|\s*/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => vars[key] ?? placeholder));
  return alternatives.find((item) => item !== previousResponse) ?? alternatives[0] ?? response;
}

function normalizeArabic(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// مسافة التحرير (Levenshtein): عدد التعديلات (إضافة/حذف/استبدال حرف) للتحويل من كلمة لأخرى
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current.push(
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], current[j - 1]),
      );
    }
    prev.splice(0, prev.length, ...current);
  }
  return prev[b.length];
}

// تسامح إملائي: يسمح بفرق حرف أو حرفين حسب طول الكلمة (كلمة قصيرة = تسامح أقل لتجنب تطابقات خاطئة)
function fuzzyWordMatch(word: string, target: string): boolean {
  if (word === target) return true;
  if (Math.abs(word.length - target.length) > 2) return false;
  const maxDistance = target.length <= 4 ? 1 : target.length <= 7 ? 2 : 3;
  return levenshtein(word, target) <= maxDistance;
}

export function getLocalStoreAssistantReplyRule(
  rules: AssistantReplyRule[],
  message: string,
): { matched: boolean; response: string | null } {
  const words = normalizeArabic(message).split(" ").filter(Boolean);
  const normalizedMessage = ` ${words.join(" ")} `;

  // تمريرة أولى: تطابق دقيق (الأسرع والأدق، نفس المنطق الأصلي)
  for (const rule of rules) {
    for (const phrase of rule.phrases) {
      const normalizedPhrase = normalizeArabic(phrase);
      const phraseWords = normalizedPhrase.split(" ").filter(Boolean);
      const greetingPhrase = [
        "مرحبا",
        "هلا",
        "اهلا",
        "موجود",
        "موجودين",
        "السلام عليكم",
      ].includes(normalizedPhrase);
      if (greetingPhrase && words.length > 2) continue;
      const preliminaryPhrase = [
        "اريد اسلك",
        "اريد اسالك",
        "اريد اسألك",
        "عندي سؤال",
        "ممكن سؤال",
        "ممكن استفسار",
        "احد يجاوب",
      ].includes(normalizedPhrase);
      if (preliminaryPhrase && words.length > 3) continue;
      const exactMatch = normalizedPhrase && normalizedMessage.includes(` ${normalizedPhrase} `);
      const singleWordVariant = phraseWords.length === 1 &&
        phraseWords[0].length >= 4 &&
        words.some((word) => word.startsWith(phraseWords[0]));
      if (exactMatch || singleWordVariant) {
        return { matched: true, response: rule.response };
      }
    }
  }

  // تمريرة ثانية: تسامح إملائي (فقط لو ما فيه تطابق دقيق، ولعبارات من كلمة أو كلمتين لتجنب تطابقات عشوائية)
  for (const rule of rules) {
    for (const phrase of rule.phrases) {
      const normalizedPhrase = normalizeArabic(phrase);
      const phraseWords = normalizedPhrase.split(" ").filter(Boolean);
      if (phraseWords.length === 0 || phraseWords.length > 2) continue;
      const allWordsFuzzyMatch = phraseWords.every((pw) =>
        pw.length >= 3 && words.some((w) => w.length >= 3 && fuzzyWordMatch(w, pw)),
      );
      if (allWordsFuzzyMatch) {
        return { matched: true, response: rule.response };
      }
    }
  }

  return { matched: false, response: null };
}

export function isHumanHandoffRequest(message: string) {
  const text = normalizeArabic(message);
  return hasAny(text, [
    "اريد موظف",
    "اريد اكلم موظف",
    "اريد احجي ويا موظف",
    "اريد اتكلم مع شخص",
    "احتاج اتكلم مع موظف",
    "اريد موظف حقيقي",
    "اريد انسان",
    "اريد شخص حقيقي",
    "حولني لموظف",
    "حولني للبشر",
    "خدمة العملاء",
    "كلموني",
    "احجي ويا صاحب المتجر",
    "اريد اكلم صاحب المتجر",
  ]);
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => {
    const normalized = normalizeArabic(word);
    if (normalized.length <= 2 && !normalized.includes(" ")) {
      return ` ${text} `.includes(` ${normalized} `);
    }
    return text.includes(normalized);
  });
}

function amount(value: number) {
  return new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 2 }).format(value);
}

function money(value: number) {
  return `$${amount(value)}`;
}

function arabicSearchVariants(input: string) {
  const normalized = normalizeArabic(input);
  const variants = [normalized];
  if (normalized.endsWith("ات") && normalized.length > 4) {
    variants.push(`${normalized.slice(0, -2)}ه`);
  }
  if (normalized.endsWith("ه") && normalized.length > 4) {
    variants.push(`${normalized.slice(0, -1)}ات`);
  }
  return Array.from(new Set(variants));
}

function containsArabicSearchTerm(text: string, term: string) {
  return arabicSearchVariants(term).some((variant) => text.includes(variant));
}

function productMatch(message: string, products: AssistantProduct[]) {
  const normalized = normalizeArabic(message).replace(/(^|\s)ال(?=\S{3,})/gu, "$1");
  const queryTerms = normalized.split(" ").flatMap(arabicSearchVariants);
  return products
    .map((product) => ({
      product,
      name: normalizeArabic(product.title).replace(/(^|\s)ال(?=\S{3,})/gu, "$1"),
    }))
    .filter(({ name }) => name.length >= 2 && (
      normalized.includes(name) ||
      queryTerms.some((variant) => variant.length >= 4 && containsArabicSearchTerm(name, variant))
    ))
    .sort((a, b) => b.name.length - a.name.length)[0]?.product ?? null;
}

const PRODUCT_SEARCH_TERMS = [
  "اريد", "ابغي", "ابي", "ابحث", "ادور", "دورلي", "عندكم", "متوفر", "موجود", "تبيعون",
  "بيع", "شراء", "اشتري", "اشتريلي", "منتج", "منتجات", "شي", "شيء", "نوع", "انواع",
  "صنف", "اصناف", "بضاعه", "بضاعة", "ممكن", "اريد اشوف", "وريني", "اعرض",
];

const SEARCH_STOP_WORDS = new Set([
  "اريد", "ابغي", "ابي", "ابحث", "ادور", "دورلي", "عندكم", "متوفر", "موجود", "تبيعون",
  "بيع", "شراء", "اشتري", "اشتريلي", "منتج", "منتجات", "شي", "شيء", "نوع", "انواع",
  "صنف", "اصناف", "بضاعه", "ممكن", "اشوف", "وريني", "اعرض", "من", "في", "عن", "على",
  "هل", "يا", "لو", "سمحت", "شنو", "ماذا", "ما", "هو", "هي", "هذا", "هذه", "اريدكم",
]);

function productSearchTerms(input: string) {
  return normalizeArabic(input)
    .split(" ")
    .filter((word) => word.length > 1 && !SEARCH_STOP_WORDS.has(word));
}

export function findProductRecommendations(input: string, products: AssistantProduct[]) {
  const query = normalizeArabic(input);
  const terms = productSearchTerms(input);
  if (!terms.length) return [];

  return products
    .map((product) => {
      const title = normalizeArabic(product.title);
      const category = normalizeArabic(product.category ?? "");
      const description = normalizeArabic(product.description ?? "");
      const exact = terms.join(" ");
      const score = terms.reduce((total, term) => {
        if (containsArabicSearchTerm(title, term)) return total + 4;
        if (containsArabicSearchTerm(category, term)) return total + 3;
        if (containsArabicSearchTerm(description, term)) return total + 1;
        return total;
      }, 0) + (exact.length > 2 && (title.includes(exact) || category.includes(exact)) ? 5 : 0);
      return {
        product,
        score,
        strongMatch: terms.some((term) => containsArabicSearchTerm(title, term) || containsArabicSearchTerm(category, term)),
      };
    })
    .filter(({ score, strongMatch, product }) => strongMatch && score >= 3 && (product.stock == null || product.stock > 0))
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title, "ar"))
    .slice(0, 3)
    .map(({ product }) => product);
}

export function isProductInquiry(input: string) {
  const text = normalizeArabic(input);
  return PRODUCT_SEARCH_TERMS.some((term) => text.includes(normalizeArabic(term)));
}

function deliveryText(config: StoreAssistantConfig) {
  const fee = typeof config.deliveryFee === "number"
    ? `أجور التوصيل ${money(config.deliveryFee)}.`
    : "أجور التوصيل غير محددة عندي حالياً.";
  const duration = typeof config.deliveryMinDays === "number" && typeof config.deliveryMaxDays === "number"
    ? `المدة المتوقعة من ${amount(config.deliveryMinDays)} إلى ${amount(config.deliveryMaxDays)} أيام عمل.`
    : "";
  return [fee, duration].filter(Boolean).join(" ");
}

export function getLocalStoreAssistantReply(context: ReplyContext): LocalAssistantReply {
  const text = normalizeArabic(context.message);
  const name = context.customerName.trim() || "عزيزي الزبون";
  const store = context.storeName.trim() || "المتجر";
  const product = productMatch(`${context.message} ${context.context ?? ""}`, context.products);
  const productInquiryText = `${context.message} ${context.context ?? ""}`;
  const productRecommendations = findProductRecommendations(productInquiryText, context.products);
  const config = context.config;

  const branches = config.branchLocations?.trim() ?? "";
  const shippingInfo = config.shippingRates?.trim() || deliveryText(config);
  const paymentOptions = config.paymentMethods?.trim()
    || "لم يسجل المتجر طرق الدفع المتاحة بعد. يرجى تأكيدها مع المتجر قبل إتمام الطلب.";
  const savedReturnPolicy = config.returnPolicy?.trim();
  const returnPolicy = savedReturnPolicy
    || (typeof config.returnDays === "number"
      ? `يمكن طلب الاستبدال أو الاسترجاع خلال ${amount(config.returnDays)} أيام من الاستلام.${typeof config.exchangeDeliveryFee === "number" ? ` أجور توصيل التبديل ${money(config.exchangeDeliveryFee)}.` : ""}`
      : "لم يسجل المتجر سياسة الاستبدال والاسترجاع بعد، يرجى تأكيدها قبل الشراء.");
  const offers = [
    ...(config.discountDescription?.trim() ? [config.discountDescription.trim()] : []),
    ...(config.discountCode?.trim() ? [`كود الخصم: ${config.discountCode.trim()}`] : []),
    ...(context.activePromotions ?? []).map((title) => `عرض نشط: ${title}`),
    ...context.products
      .filter((item) => item.oldPrice != null && item.price != null && item.oldPrice > item.price)
      .map((item) => `${item.title}: ${money(item.oldPrice ?? 0)} بدلاً من ${money(item.price ?? 0)}`),
  ];
  const offerInfo = offers.length
    ? `العروض والخصومات المتاحة من ${store}:\n${offers.slice(0, 8).join("\n")}`.slice(0, 900)
    : `لا يوجد لدي عرض أو خصم مؤكد من ${store} حالياً.`;
  const internationalShippingInfo = config.internationalShippingCountries?.trim()
    ? `الشحن متاح إلى: ${config.internationalShippingCountries.trim()}. تختلف التكلفة والمدة حسب الوجهة.`
    : `لم يسجل ${store} الدول المتاح الشحن إليها بعد.`;
  const orderInstructions = "اختر المنتج الذي تريده، أضفه إلى السلة، ثم اختر «إتمام الطلب» وأدخل بيانات التواصل والعنوان. تظهر لك تفاصيل التوصيل قبل تأكيد الطلب.";
  const productPriceInfo = product
    ? product.price == null
      ? `لم يسجل سعر مؤكد لـ ${product.title} بعد.`
      : `${product.title}: ${product.oldPrice != null && product.oldPrice > product.price ? `السعر بعد الخصم ${money(product.price)} بدلاً من ${money(product.oldPrice)}.` : `السعر ${money(product.price)}.`}`
    : "أرسل اسم المنتج لأتحقق من سعره المسجل في هذا المتجر.";

  if (isHumanHandoffRequest(context.message)) {
    return {
      text: chooseAssistantResponse(
        `أكيد يا ${name}، أحوّل رسالتك لصاحب ${store} ليتابعها معك مباشرة. ||| حاضر يا ${name}، أبلّغ صاحب ${store} بطلبك حتى يتواصل معك.`,
        context.previousReply,
      ),
      needsMerchant: true,
    };
  }

  const hours = config.botHoursAlwaysOn === true
    ? "على مدار الساعة"
    : config.botHoursEnabled && config.botHoursStart && config.botHoursEnd
      ? `من ${config.botHoursStart} إلى ${config.botHoursEnd}`
      : "حسب أوقات العمل المعلنة من المتجر";
  const storeLocationReply = config.storeMode === "online"
    ? `أهلاً بك! ${store} متجر إلكتروني ويوفر التوصيل حسب المناطق المتاحة في صفحة المتجر. تقدر تطلب المنتجات من التطبيق.`
    : branches
      ? `أهلاً بك! مواقع ${store} وفروعه:\n${branches}\nأوقات العمل: ${hours}.`
      : `لم يسجل ${store} عناوين الفروع بعد. أرسل استفسارك لصاحب المتجر ليحدد لك الموقع.`;
  const socialLinks = [
    ["إنستغرام", config.socialInstagram],
    ["تيك توك", config.socialTikTok],
    ["فيسبوك", config.socialFacebook],
    ["الموقع الإلكتروني", config.socialWebsite],
    ["واتساب", config.socialWhatsApp],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    .map(([label, url]) => `${label}: ${url}`)
    .join("\n") || `لم يسجل ${store} حسابات تواصل رسمية بعد.`;
  const customRule = getLocalStoreAssistantReplyRule(context.customRules ?? [], context.message);
  if (customRule.matched && customRule.response) {
    const replacements: Record<string, string> = {
      storeName: store,
      businessHours: hours,
      branchLocations: branches || "لم تُسجل عناوين الفروع بعد",
      storeLocationReply,
      socialLinks,
      shippingInfo,
      paymentOptions,
      returnPolicy,
      offerInfo,
      internationalShippingInfo,
      orderInstructions,
      productPriceInfo,
    };
    const response = renderAssistantResponse(customRule.response, replacements, context.previousReply);
    return {
      text: response.slice(0, 1000),
      needsMerchant: ["لم يسجل", "لم تسجل", "لم يحدد", "لم تتوفر"].some((phrase) => response.includes(phrase)),
    };
  }

  if (productRecommendations.length) {
    return {
      text: `أكيد يا ${name}! لقيت لك هذي المنتجات المتوفرة من ${store}، اضغط على المنتج حتى تشوف تفاصيله وتطلبه:`,
      needsMerchant: false,
      productRecommendations,
    };
  }

  if (hasAny(text, ["اريد اسألك", "اريد اسالك", "اريد اسلك", "عندي سؤال", "ممكن سؤال", "ممكن استفسار", "موجودين"])) {
    return {
      text: chooseAssistantResponse(
        `أهلاً بك يا ${name}! تفضل اسألني عن المنتجات أو الأسعار أو الطلب، وأنا أساعدك بمعلومات ${store} المسجلة. ||| حياك الله يا ${name}! اسأل براحتك، وأجاوبك حسب معلومات ${store} المتوفرة.`,
        context.previousReply,
      ),
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["شنو شغلك", "ما تفهم", "ما فهمتني", "ما جاي تفهمني", "تعبتني", "ما جاوبتني"])) {
    return {
      text: chooseAssistantResponse(
        `حقك عليّ يا ${name}، أعتذر عن اللخبطة. أنا مساعد ${store} وأقدر أساعدك بالمنتجات والأسعار والطلبات. اكتب لي شنو تحتاج وأحاول أجاوبك من المعلومات المسجلة. ||| أعتذر منك يا ${name} إذا ما وضحت لك. اذكر المنتج أو سؤالك بالتحديد وأساعدك بالمعلومات المسجلة لدى ${store}.`,
        context.previousReply,
      ),
      needsMerchant: false,
    };
  }

  if (isProductInquiry(context.message) && productSearchTerms(context.message).length) {
    const requestedType = productSearchTerms(context.message).join(" ");
    return {
      text: chooseAssistantResponse(
        `ما لقيت تطابقاً واضحاً لـ«${requestedType}» ضمن المنتجات الظاهرة لي في ${store}. ممكن تكتب الاسم الكامل أو توضح النوع حتى أبحث لك بدقة؟ ||| ما ظهر لي منتج مطابق لـ«${requestedType}» في قائمة ${store}. ارسل الاسم الكامل أو صورة حتى أتحقق بشكل أدق.`,
        context.previousReply,
      ),
      needsMerchant: false,
    };
  }
  if (/^\s*(الإجمالي|المجموع)\s*:/u.test(context.message) && context.latestOrder) {
    const delivery = typeof config.deliveryFee === "number"
      ? ` أجور التوصيل ${money(config.deliveryFee)}، فيكون المجموع مع التوصيل ${money(context.latestOrder.total + config.deliveryFee)}.`
      : "";
    return {
      text: `وصل طلبك ${context.latestOrder.code} إلى ${store}، ومجموع المنتجات ${money(context.latestOrder.total)}.${delivery} إذا تحب تأكيده اكتب «تأكيد».`,
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["الغاء", "الغي", "بطلت", "ما اريده", "ماريده", "كنسل"])) {
    if (context.latestOrder) {
      return {
        text: `وصل طلب إلغاء الطلب ${context.latestOrder.code}. ما ألغيه تلقائياً حتى ما يتغير طلبك بالغلط؛ صاحب المتجر راح يراجع الطلب ويرد عليك.`,
        needsMerchant: true,
      };
    }
    return {
      text: "أرسل رقم الطلب أو رقم الهاتف المستخدم بالطلب حتى يراجع المتجر طلب الإلغاء.",
      needsMerchant: true,
    };
  }

  if (hasAny(text, ["تغيير الطلب", "تعديل الطلب", "غير الرقم", "غير العنوان", "اضيف قطعة", "اضيف قطعه", "تبديل القياس"])) {
    return {
      text: `أرسل رقم الطلب والتعديل المطلوب بالتحديد. ما أعدّل بيانات الشحن أو المنتجات تلقائياً؛ صاحب ${store} يراجع طلبك ويأكد التعديل.`,
      needsMerchant: true,
    };
  }

  if (
    !hasAny(text, ["لا", "مو", "ما اريد", "ما اكد", "الغاء"]) &&
    hasAny(text, ["تاكيد", "اكد", "اي اكيد", "نعم دزوه", "دزوه", "موافق"])
  ) {
    if (!context.latestOrder) {
      return {
        text: "ما ظهر عندي طلب بانتظار التأكيد. اكتب رقم الطلب أو أرسل تفاصيله حتى أطلب من المتجر مراجعته.",
        needsMerchant: true,
      };
    }
    return {
      text: `وصل تأكيدك للطلب ${context.latestOrder.code}. ما أغيّر حالة الشحن تلقائياً؛ راح يتابع المتجر الطلب ويأكد لك الخطوة التالية.`,
      needsMerchant: true,
    };
  }

  if (hasAny(text, ["توصيل", "يوصل", "يوصلني", "يمته", "شوكت", "شكد يطول", "اجور", "اجرة", "الشحن"])) {
    return {
      text: `أهلاً بك، ${shippingInfo}`,
      needsMerchant: !config.shippingRates?.trim() &&
        (typeof config.deliveryFee !== "number" ||
          typeof config.deliveryMinDays !== "number" ||
          typeof config.deliveryMaxDays !== "number"),
    };
  }

  if (hasAny(text, ["دولي", "خارج البلاد", "خارج البلد", "السعوديه", "السعودية", "الخليج", "الاردن", "الأردن", "سوريا", "لبنان", "الجزائر", "المغرب", "السودان", "المحافظات", "الولايات", "شحن دولي"])) {
    const countries = config.internationalShippingCountries?.trim();
    return {
      text: countries
        ? `أهلاً بك! الشحن متاح من ${store} إلى: ${countries}. تختلف التكلفة والمدة حسب وجهة الطلب، وستظهر التفاصيل عند إدخال عنوانك.`
        : `أهلاً بك! لم يسجل ${store} الدول المتاح الشحن إليها بعد. أرسل دولتك وسيتأكد المتجر من إمكانية التوصيل والتكلفة.`,
      needsMerchant: !countries,
    };
  }

  if (hasAny(text, ["افحص", "افتح الباكيت", "المندوب", "الدفع عند الاستلام", "كاش عند الاستلام", "قبل لا ادفع"])) {
    const payment = config.paymentMethods?.trim() || "لم يحدد المتجر طرق الدفع أو إمكانية فحص الطرد عند الاستلام بعد.";
    return { text: `أهلاً بك! ${payment}`, needsMerchant: !config.paymentMethods?.trim() };
  }

  if (hasAny(text, ["استرجاع", "ارجع", "ارجاع", "استبدال", "بدل", "تبديل", "رجع الغرض"])) {
    if (savedReturnPolicy) {
      return { text: savedReturnPolicy, needsMerchant: false };
    }
    const duration = typeof config.returnDays === "number"
      ? `المدة المحددة للاسترجاع أو الاستبدال ${amount(config.returnDays)} أيام من الاستلام.`
      : "مدة وشروط الاسترجاع والاستبدال غير محددة عندي، وما أريد أعطيك معلومة مو مؤكدة.";
    const exchange = typeof config.exchangeDeliveryFee === "number"
      ? `أجور التوصيل عند التبديل ${money(config.exchangeDeliveryFee)}.`
      : "";
    return {
      text: `${duration}${exchange ? ` ${exchange}` : ""} اكتب رقم الطلب ووضح شنو المطلوب، والمتجر يتابع وياك.`,
      needsMerchant: typeof config.returnDays !== "number" || typeof config.exchangeDeliveryFee !== "number",
    };
  }

  if (hasAny(text, ["تأخر", "متاخر", "متأخر", "خربان", "مكسور", "تالف", "مو نفس", "شكوي", "شكوى", "زعلان", "سيء", "سيئ", "كذاب", "نصب"])) {
    return {
      text: `نعتذر عن اللي صار وياك يا ${name}. أرسل رقم الطلب وصورة للمشكلة إذا متوفرة، وراح يتابع صاحب ${store} الموضوع بنفسه.`,
      needsMerchant: true,
    };
  }

  if (hasAny(text, ["غبي", "حيوان", "حمار", "زباله", "قذر", "يلعن", "شتيمه", "شتيمة"])) {
    return {
      text: "عذراً، نرجو أن يكون الحديث باحترام. إذا عندك مشكلة بمنتج أو طلب، اكتب تفاصيلها حتى نساعدك.",
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["خصم", "كود", "عرض", "عروض", "تخفيض", "تنزيلات", "سعر جملة", "مكاسر", "تخفيضات"])) {
    return { text: offerInfo, needsMerchant: false };
  }

  if (hasAny(text, ["كيف اطلب", "كيفاش نطلب", "طريقة الطلب", "ابي اطلب", "بدي اطلب", "حابب اشتري", "داير اطلب", "شلون اشتري", "اريد اشتري"])) {
    return {
      text: "أهلاً بك! اختر المنتج الذي تريده، أضفه إلى السلة، ثم اختر «إتمام الطلب» وأدخل بيانات التواصل والعنوان. تظهر لك تفاصيل التوصيل قبل تأكيد الطلب.",
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["طريقة الدفع", "طرق الدفع", "زين كاش", "ماستر كارد", "فيزا", "كاش لو تحويل", "شلون ادفع", "كيف ادفع"])) {
    const payment = config.paymentMethods?.trim();
    return {
      text: payment
        ? `طرق الدفع المعتمدة لدى ${store}: ${payment}`
        : `لم يسجل ${store} طرق الدفع المتاحة بعد. يرجى تأكيدها مع المتجر قبل إتمام الطلب.`,
      needsMerchant: !payment,
    };
  }

  if (hasAny(text, ["تقييم", "قيموني", "رابط الصفحة", "صفحتكم"])) {
    if (config.reviewUrl?.trim()) {
      return { text: `يسعدنا تقييمك يا ${name}! هذا رابط المتجر: ${config.reviewUrl.trim()}`, needsMerchant: false };
    }
    return { text: `رأيك يهمنا يا ${name}. ما متوفر عندي رابط تقييم مؤكد، لكن تقدر تزور صفحة ${store} على المنصة.`, needsMerchant: false };
  }

  if (product && hasAny(text, ["سعر", "بيش", "شكد", "بكم", "كم"])) {
    if (product.price == null) {
      return { text: `ما عندي سعر مؤكد لـ ${product.title} حالياً. راح أخلي صاحب المتجر يتأكد منه ويرد عليك.`, needsMerchant: true };
    }
    const delivery = typeof config.deliveryFee === "number"
      ? ` أجور التوصيل ${money(config.deliveryFee)}.`
      : "";
    return {
      text: `أهلاً بك! ${product.title}: ${product.oldPrice != null && product.oldPrice > product.price
        ? `السعر بعد الخصم ${money(product.price)} بدلاً من ${money(product.oldPrice)}.`
        : `السعر ${money(product.price)}.`}${delivery}`,
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["سعر", "بيش", "شكد", "بكم", "كم"])) {
    return { text: `أي منتج تقصد يا ${name}؟ اكتب اسمه حتى أطلع لك سعره المسجل بالمتجر.`, needsMerchant: false };
  }

  if (product && hasAny(text, ["تفاصيل", "مواصفات", "جوده", "جودة", "لون", "مقاس", "قياس", "الخامة", "الماده"])) {
    const description = product.description?.trim();
    if (description) {
      return { text: `${product.title}: ${description}${product.stock != null ? ` المتوفر حالياً: ${amount(product.stock)}.` : ""}`, needsMerchant: false };
    }
    return {
      text: `ما عندي تفاصيل إضافية مؤكدة عن ${product.title}. راح أطلب من صاحب المتجر يوضحها لك.`,
      needsMerchant: true,
    };
  }

  if (hasAny(text, ["تفاصيل", "مواصفات", "لون", "مقاس", "قياس"])) {
    return { text: "اكتب اسم المنتج اللي تريد تعرف تفاصيله، وأجاوبك بالمعلومات المسجلة عند المتجر.", needsMerchant: false };
  }

  if (hasAny(text, ["اريد اطلب", "اريد طلب", "شلون اطلب", "اريد احجز", "احجز", "اطلب"])) {
    return {
      text: `حياك الله ${name}! حتى يراجع المتجر طلبك، اكتب اسمك ورقم هاتفك والمدينة والعنوان والمنتج المطلوب. لا ترسل معلومات بطاقتك البنكية هنا.`,
      needsMerchant: true,
    };
  }

  if (hasAny(text, ["طلبتي", "طلبي", "رقم الطلب", "حالة الطلب", "وين الطلب"])) {
    if (context.latestOrder) {
      return {
        text: `آخر طلب عندك ${context.latestOrder.code} وحالته المسجلة: ${context.latestOrder.status}. الإجمالي المسجل ${money(context.latestOrder.total)}. إذا تريد تفاصيل أكثر، أتابعها ويا صاحب المتجر.`,
        needsMerchant: false,
      };
    }
    return { text: "ما لكيت طلب سابق مرتبط بهالحساب. أرسل رقم الطلب أو رقم الهاتف حتى يراجعه المتجر.", needsMerchant: true };
  }

  if (hasAny(text, ["وصل", "استلمت", "عاشت ايديكم", "حلو", "يخبل", "شكرا", "شكراً"])) {
    if (hasAny(text, ["شكرا", "شكراً", "عاشت ايديكم", "حلو", "يخبل"])) {
      const review = config.reviewUrl?.trim() ? ` شاركنا رأيك هنا: ${config.reviewUrl.trim()}` : "";
      return { text: `بالعافية عليك يا ${name}! شكراً لاختيارك ${store}.${review}`, needsMerchant: false };
    }
  }

  if (hasAny(text, ["شلونك", "شخبارك", "السلام عليكم", "هلا", "مرحبا", "اهلا"])) {
    return {
      text: `هلا بيك ${name}! أنا مساعد ${store}، أساعدك بمعلومات المنتجات والطلبات والتوصيل. شتحتاج؟`,
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["نكتة", "نكته", "سياسي", "موضوع عام"])) {
    return {
      text: `أعتذر يا ${name}، اختصاصي مساعدة زبائن ${store}. أگدر أساعدك بمنتج أو طلب أو توصيل.`,
      needsMerchant: false,
    };
  }

  if (hasAny(text, ["سياسة", "كم يوم", "يصير ارجع", "حق الاسترجاع"])) {
    if (typeof config.returnDays === "number") {
      return { text: `مدة الاسترجاع المحددة من ${store} هي ${amount(config.returnDays)} أيام من الاستلام. اكتب رقم الطلب إذا تريد نراجع حالتك.`, needsMerchant: false };
    }
    return { text: `ما عندي سياسة استرجاع مسجلة من ${store}، لذلك ما أقدر أأكد لك مدة أو شرط. خلي صاحب المتجر يوضحها لك.`, needsMerchant: true };
  }

  if (hasAny(text, ["شنو تبيعون", "شنو تقدمون", "شنو متخصصين", "شنو عندكم", "متجركم", "محلكم", "كلشي بيه", "شنو الجديد", "جديد عندكم", "بضاعه جديده", "بضاعة جديدة", "وصل جديد", "شنو منتجاتكم", "شنو اصناف", "شنو اقسام"])) {
    const category = context.storeCategory?.trim();
    const bio = context.storeBio?.trim();
    const productNames = context.products.slice(0, 5).map((p) => p.title);

    if (bio) {
      return {
        text: `هلا بيك ${name}! ${bio}${productNames.length ? ` أبرز المتوفر حالياً: ${productNames.join("، ")}.` : ""} تحب أساعدك تدور على شي محدد؟`,
        needsMerchant: false,
      };
    }
    if (category) {
      return {
        text: `هلا بيك ${name}! ${store} متخصص بـ${category}.${productNames.length ? ` من المتوفر عندنا: ${productNames.join("، ")}.` : ""} شنو تدور عليه بالضبط؟`,
        needsMerchant: false,
      };
    }
    if (productNames.length) {
      return {
        text: `هلا بيك ${name}! من منتجات ${store} المتوفرة حالياً: ${productNames.join("، ")}. اكتب اسم الشي اللي تدور عليه وأطلعلك التفاصيل والسعر.`,
        needsMerchant: false,
      };
    }
    return {
      text: `هلا بيك ${name}! ما عندي وصف مسجل عن تخصص ${store} حالياً. راح أوصل سؤالك لصاحب المتجر يوضحه لك.`,
      needsMerchant: true,
    };
  }

  const platformRule = getLocalStoreAssistantReplyRule(context.platformRules ?? [], context.message);
  if (platformRule.matched && platformRule.response) {
    return {
      text: chooseAssistantResponse(platformRule.response, context.previousReply),
      needsMerchant: false,
    };
  }

  const shortQueryWords = text.split(" ").filter(Boolean);
  if (shortQueryWords.length > 0 && shortQueryWords.length <= 4) {
    return {
      text: chooseAssistantResponse(
        `أهلاً بك يا ${name}! ما لقيت تطابقاً مؤكداً لهذا الاسم ضمن منتجات ${store} المسجلة. ممكن توضح النوع أو تكتب اسم المنتج الكامل؟ ||| ما قدرت أحدد المنتج من الاسم وحده. ارسل اسمه الكامل أو وصفاً قصيراً حتى أبحث لك في منتجات ${store}.`,
        context.previousReply,
      ),
      needsMerchant: false,
    };
  }

  return {
    text: chooseAssistantResponse(
      `أهلاً بك يا ${name}! أقدر أساعدك بمعلومات المنتجات والأسعار والتوصيل المسجلة لدى ${store}. اكتب سؤالك بتفصيل أكثر، أو اطلب التواصل مع موظف إذا تحب. ||| حياك الله يا ${name}، وضّح لي أكثر شنو تحتاج، وأبحث لك في منتجات ومعلومات ${store} المسجلة.`,
      context.previousReply,
    ),
    needsMerchant: false,
  };
}
