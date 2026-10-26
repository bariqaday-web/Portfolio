export type AdDesignType = "product" | "company" | "promotion" | "story";
export type AdShape = "orbit" | "arch" | "spark";

export type AdDesignPreset = {
  id: string;
  type: AdDesignType;
  title: string;
  subtitle: string;
  color: string;
  shape: AdShape;
};

export const AD_DESIGN_PRESETS: AdDesignPreset[] = [
  { id: "product-luxe", type: "product", title: "لمسة فاخرة", subtitle: "أناقة تليق بمنتجك", color: "#8c6331", shape: "orbit" },
  { id: "product-pop", type: "product", title: "ألوان نابضة", subtitle: "لفت الأنظار من أول نظرة", color: "#a83242", shape: "spark" },
  { id: "product-nature", type: "product", title: "روح الطبيعة", subtitle: "بساطة وتفاصيل دافئة", color: "#536b4c", shape: "arch" },
  { id: "company-luxe", type: "company", title: "هوية راقية", subtitle: "مساحة أنيقة لاسم متجرك", color: "#674d83", shape: "arch" },
  { id: "company-warm", type: "company", title: "ترحيب دافئ", subtitle: "قريبون من ذوقك", color: "#8c6331", shape: "orbit" },
  { id: "company-modern", type: "company", title: "عصرية وواضحة", subtitle: "متجرك يستحق أن يُكتشف", color: "#355b83", shape: "spark" },
  { id: "promotion-sale", type: "promotion", title: "عرض لا يفوّت", subtitle: "قالب لافت للعروض والخصومات", color: "#a83242", shape: "spark" },
  { id: "promotion-launch", type: "promotion", title: "وصل حديثاً", subtitle: "أعلن عن جديد متجرك", color: "#355b83", shape: "orbit" },
  { id: "promotion-season", type: "promotion", title: "موسم مميز", subtitle: "لمسة احتفالية أنيقة", color: "#8c6331", shape: "arch" },
  { id: "story-featured", type: "story", title: "قصة مميزة", subtitle: "ظهور عمودي داخل القصص", color: "#674d83", shape: "spark" },
  { id: "story-warm", type: "story", title: "قصة دافئة", subtitle: "تصميم واضح للصورة", color: "#8c6331", shape: "orbit" },
  { id: "story-modern", type: "story", title: "قصة عصرية", subtitle: "ألوان تبرز محتواك", color: "#355b83", shape: "arch" },
];

export const AD_DESIGN_COLORS = [
  { name: "طوبي", value: "#a83242" },
  { name: "كحلي", value: "#355b83" },
  { name: "أخضر", value: "#536b4c" },
  { name: "بنفسجي", value: "#674d83" },
  { name: "ذهبي", value: "#8c6331" },
  { name: "وردي", value: "#b44870" },
];

export const AD_SHAPES: { id: AdShape; title: string }[] = [
  { id: "orbit", title: "دوائر" },
  { id: "arch", title: "قوس" },
  { id: "spark", title: "أشكال هندسية" },
];

export const AD_COPY_OPTIONS: Record<AdDesignType, string[]> = {
  product: ["اختيارك المميز بانتظارك", "تفاصيل صغيرة تصنع فرقاً", "اكتشف القطعة الأقرب لذوقك"],
  company: ["تسوّق تجربة مختلفة", "كل ما تحبه في مكان واحد", "أهلاً بك في متجرنا"],
  promotion: ["لفترة محدودة — لا تفوّت العرض", "تسوّق الآن واستمتع بالسعر المميز", "عرض خاص من متجرنا إليك"],
  story: ["اكتشف جديد متجرنا", "تفاصيل تستحق المشاهدة", "تسوّق الآن من متجرنا"],
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] ?? character);
}

export function createAdArtwork({
  type,
  title,
  description,
  storeName,
  color,
  shape,
  imageData,
}: {
  type: AdDesignType;
  title: string;
  description: string;
  storeName: string;
  color: string;
  shape: AdShape;
  imageData?: string | null;
}) {
  const safeTitle = escapeXml(title.slice(0, 48));
  const safeDescription = escapeXml(description.slice(0, 90));
  const safeStoreName = escapeXml(storeName.slice(0, 30));
  const photo = imageData
    ? `<image href="${imageData}" x="585" y="0" width="495" height="840" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>`
    : `<circle cx="830" cy="420" r="210" fill="#ffffff" fill-opacity=".12"/><circle cx="830" cy="420" r="160" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/><path d="M760 485c50-104 96-152 145-183 28 66 47 130 61 193-61 49-129 66-206 55z" fill="#ffffff" fill-opacity=".17"/>`;
  const motif = shape === "orbit"
    ? `<circle cx="965" cy="105" r="126" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/><circle cx="965" cy="105" r="88" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/><circle cx="140" cy="700" r="92" fill="#fff" fill-opacity=".07"/>`
    : shape === "arch"
      ? `<path d="M760 840V460a180 180 0 0 1 360 0v380z" fill="#fff" fill-opacity=".1"/><path d="M0 90h240v2H0zM0 110h180v2H0z" fill="#fff" fill-opacity=".2"/>`
      : `<path d="m850 45 22 68 68 22-68 22-22 68-22-68-68-22 68-22z" fill="#fff" fill-opacity=".22"/><path d="m130 635 13 40 40 13-40 13-13 40-13-40-40-13 40-13z" fill="#fff" fill-opacity=".18"/>`;
  const cta = type === "product" ? "اكتشف المنتج" : type === "company" ? "تعرّف على المتجر" : type === "story" ? "شاهد القصة" : "تسوّق العرض";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="840" viewBox="0 0 1080 840">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#171923"/></linearGradient>
      <linearGradient id="photoShade" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${color}" stop-opacity=".05"/><stop offset="1" stop-color="#111" stop-opacity=".45"/></linearGradient>
      <clipPath id="photoClip"><rect x="585" y="0" width="495" height="840" rx="0"/></clipPath>
    </defs>
    <rect width="1080" height="840" fill="url(#background)"/>
    ${photo}
    <rect x="585" width="495" height="840" fill="url(#photoShade)"/>
    ${motif}
    <path d="M0 620c170-94 359-94 585-22v242H0z" fill="#111" fill-opacity=".13"/>
    <g direction="rtl" text-anchor="end" font-family="Arial,Tahoma,sans-serif" fill="#fff">
      <text x="535" y="180" font-size="23" font-weight="700" fill="#fff" fill-opacity=".75">${safeStoreName}</text>
      <rect x="450" y="214" width="85" height="5" rx="2.5" fill="#fff" fill-opacity=".7"/>
      <text x="535" y="350" font-size="56" font-weight="700" textLength="500" lengthAdjust="spacingAndGlyphs">${safeTitle}</text>
      <text x="535" y="415" font-size="27" fill="#fff" fill-opacity=".86" textLength="470" lengthAdjust="spacingAndGlyphs">${safeDescription}</text>
      <rect x="285" y="480" width="250" height="70" rx="35" fill="#fff"/>
      <text x="410" y="524" text-anchor="middle" font-size="24" font-weight="700" fill="${color}">${cta}</text>
    </g>
    <rect x="36" y="36" width="124" height="42" rx="21" fill="#111" fill-opacity=".28" stroke="#fff" stroke-opacity=".25"/>
    <text x="98" y="63" text-anchor="middle" font-family="Arial,Tahoma,sans-serif" font-size="18" font-weight="700" fill="#fff">إعلان مميز</text>
  </svg>`;
}

export function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("تعذّر قراءة الصورة المحددة"));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة المحددة"));
    reader.readAsDataURL(blob);
  });
}

export function readFileAsDataUrl(file: File) {
  return readBlobAsDataUrl(file);
}

export async function fetchImageAsDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("تعذّر تحميل صورة المنتج لإنشاء التصميم");
  return readBlobAsDataUrl(await response.blob());
}
