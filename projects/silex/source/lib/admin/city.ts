const CITY_ALIASES: Record<string, string> = {
  بغداد: "بغداد",
  baghdad: "بغداد",
  بصره: "البصرة",
  البصرة: "البصرة",
  basra: "البصرة",
  البصره: "البصرة",
  اربيل: "أربيل",
  هولير: "أربيل",
  erbil: "أربيل",
  hawler: "أربيل",
  الموصل: "الموصل",
  موصل: "الموصل",
  mosul: "الموصل",
  السليمانيه: "السليمانية",
  سليمانيه: "السليمانية",
  السليمانية: "السليمانية",
  sulaymaniyah: "السليمانية",
  sulaymaniya: "السليمانية",
  sulaimani: "السليمانية",
  كركوك: "كركوك",
  kirkuk: "كركوك",
  النجف: "النجف",
  najaf: "النجف",
  كربلاء: "كربلاء",
  كربلا: "كربلاء",
  karbala: "كربلاء",
  دهوك: "دهوك",
  duhok: "دهوك",
  الرمادي: "الرمادي",
  ramadi: "الرمادي",
  الحله: "الحلة",
  الحلة: "الحلة",
  hillah: "الحلة",
  الناصريه: "الناصرية",
  الناصرية: "الناصرية",
  nasiriyah: "الناصرية",
  العماره: "العمارة",
  العمارة: "العمارة",
  amarah: "العمارة",
  الكوت: "الكوت",
  kut: "الكوت",
  الديوانيه: "الديوانية",
  الديوانية: "الديوانية",
  diwaniyah: "الديوانية",
  بعقوبه: "بعقوبة",
  بعقوبة: "بعقوبة",
  baqubah: "بعقوبة",
  الفلوجه: "الفلوجة",
  الفلوجة: "الفلوجة",
  fallujah: "الفلوجة",
  تكريت: "تكريت",
  tikrit: "تكريت",
  زاخو: "زاخو",
  zakho: "زاخو",
  سامراء: "سامراء",
  سامرا: "سامراء",
  samarra: "سامراء",
}

function normalizeCityKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىي]/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

const NORMALIZED_CITY_ALIASES = new Map(
  Object.entries(CITY_ALIASES).map(([alias, city]) => [normalizeCityKey(alias), city]),
)

export function normalizeIraqiCity(value: string | null | undefined) {
  if (!value) return "أخرى"
  const key = normalizeCityKey(value)
  return NORMALIZED_CITY_ALIASES.get(key)
    ?? NORMALIZED_CITY_ALIASES.get(key.replace(/(?:العراق|iraq)$/u, ""))
    ?? "أخرى"
}

export function normalizeCountry(value: string | null | undefined) {
  if (!value) return "أخرى"
  const normalized = value.trim().toLocaleLowerCase("ar").replace(/[\u064B-\u065F\u0670\u0640]/g, "")
  if (["iq", "iraq", "العراق", "عراق"].includes(normalized)) return "العراق"
  if (["غير محدد", "غيرمعروف", "unknown", "not specified", "other", "أخرى", "اخرى"].includes(normalized)) {
    return "أخرى"
  }
  if (/^[a-z]{2}$/i.test(normalized)) {
    try {
      const localized = new Intl.DisplayNames(["ar"], { type: "region" }).of(normalized.toUpperCase())
      if (localized && localized !== normalized.toUpperCase() && localized !== "الإقليم غير المعروف") return localized
    } catch {
      return "أخرى"
    }
  }
  if (/^[\p{L}\s-]{2,40}$/u.test(normalized) && !/(.)\1{2,}/u.test(normalized)) return value.trim()
  return "أخرى"
}
