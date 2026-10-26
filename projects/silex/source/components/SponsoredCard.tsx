"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag, Store } from "lucide-react";
import { formatIQD } from "@/components/store/store-context";
import { VerifiedBadge } from "@/components/VerifiedBadge";

export type AdItem = {
  id: string;
  type: "product" | "company" | "promotion" | "story";
  title: string;
  description: string | null;
  image_url: string | null;
  merchant_id: string;
  merchant_name: string;
  merchant_avatar: string | null;
  merchant_verified?: boolean | null;
  product_id: string | null;
  product_title: string | null;
  product_image: string | null;
  product_price: number | null;
  design_color?: string | null;
  design_shape?: string | null;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_COLOR = { product: "#8c6331", company: "#355b83", promotion: "#a83242", story: "#674d83" } as const;
const INK = "#0f1117";

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function mix(hex: string, into: string, amount: number) {
  const a = channels(hex);
  const b = channels(into);
  const [r, g, bl] = a.map((v, i) => Math.round(v + (b[i] - v) * amount));
  return `rgb(${r}, ${g}, ${bl})`;
}

function luminance(hex: string) {
  const [r, g, b] = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ألوان آمنة دائماً: حتى لو كان اللون فاتحاً يُغمَّق ليبقى النص الأبيض واضحاً
function palette(color: string | null | undefined, type: AdItem["type"]) {
  const base = color && HEX.test(color) ? color : DEFAULT_COLOR[type];
  const light = luminance(base) > 0.3;
  return {
    from: mix(base, INK, light ? 0.5 : 0.18),
    to: mix(base, INK, light ? 0.82 : 0.7),
    cta: mix(base, "#000000", light ? 0.65 : 0.35),
  };
}

function Decor({ shape }: { shape?: string | null }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 size-full text-white"
    >
      {shape === "arch" ? (
        <>
          <path d="M30 300V150a95 95 0 0 1 190 0v150z" fill="currentColor" fillOpacity=".09" />
          <path d="M0 40h120M0 56h80" stroke="currentColor" strokeOpacity=".2" strokeWidth="1.5" />
        </>
      ) : shape === "spark" ? (
        <>
          <path d="M70 40l11 33 33 11-33 11-11 33-11-33-33-11 33-11z" fill="currentColor" fillOpacity=".2" />
          <path d="M150 215l7 21 21 7-21 7-7 21-7-21-21-7 21-7z" fill="currentColor" fillOpacity=".14" />
          <circle cx="40" cy="250" r="5" fill="currentColor" fillOpacity=".2" />
        </>
      ) : (
        <>
          <circle cx="70" cy="70" r="130" fill="none" stroke="currentColor" strokeOpacity=".14" strokeWidth="1.5" />
          <circle cx="70" cy="70" r="92" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="1.5" />
          <circle cx="170" cy="260" r="80" fill="currentColor" fillOpacity=".06" />
        </>
      )}
    </svg>
  );
}

export function SponsoredCard({ ad, preview = false }: { ad: AdItem; preview?: boolean }) {
  const isProduct = ad.type === "product" && !!ad.product_id;
  const kind: "product" | "company" | "promotion" =
    isProduct ? "product" : ad.type === "promotion" || ad.type === "story" ? "promotion" : "company";
  // الإعلانات القديمة كانت صورة SVG جاهزة بنصها، تبقى تُعرض كما هي
  const isLegacy = kind === "promotion" && !!ad.image_url && /\.svg(\?|$)/i.test(ad.image_url);
  const hasPhoto = kind === "promotion" && !!ad.image_url && !isLegacy;
  const title = isProduct ? ad.product_title ?? ad.title : ad.title;
  const target = isProduct ? `/product/${ad.product_id}` : `/store/${ad.merchant_id}`;
  const adContext = new URLSearchParams({
    sponsored: "1",
    adTitle: title.slice(0, 120),
    adType: ad.type,
  });
  const href = `${target}?${adContext.toString()}`;
  const label = `إعلان ${ad.merchant_name}: ${title}`;
  const colors = palette(ad.design_color, kind);

  if (isLegacy) {
    const legacyClass =
      "group block overflow-hidden rounded-[28px] border border-line/60 bg-card text-ink shadow-[0_18px_48px_rgba(35,29,19,0.12)] transition hover:shadow-[0_22px_54px_rgba(35,29,19,0.17)]";
    const legacy = (
      <>
        <img loading="lazy" decoding="async" src={ad.image_url as string} alt={`إعلان ${title}`} className="aspect-[9/7] w-full bg-[#25231f] object-cover" />
        <span className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-display text-sm">
              {ad.merchant_avatar ? (
                <img loading="lazy" decoding="async" src={ad.merchant_avatar} alt="" className="size-full object-cover" />
              ) : (
                ad.merchant_name.charAt(0)
              )}
            </span>
            <span className="truncate text-xs font-semibold">{ad.merchant_name}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-white">
            <Store size={14} />
            اكتشف المتجر
          </span>
        </span>
      </>
    );
    return preview ? (
      <div className={legacyClass}>{legacy}</div>
    ) : (
      <Link href={href} prefetch aria-label={label} className={legacyClass}>
        {legacy}
      </Link>
    );
  }

  const cta = isProduct ? "اكتشف المنتج" : kind === "promotion" ? "اكتشف العرض" : "زيارة المتجر";
  const badge = isProduct ? "إعلان · منتج" : kind === "promotion" ? "إعلان · عرض" : "إعلان · متجر";

  const textColumn = (
    <span className={`relative z-10 flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6 ${hasPhoto ? "max-w-[80%]" : ""}`}>
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 font-display text-sm ring-2 ring-white/30">
            {ad.merchant_avatar ? (
              <img loading="lazy" decoding="async" src={ad.merchant_avatar} alt="" className="size-full object-cover" />
            ) : (
              ad.merchant_name.charAt(0)
            )}
          </span>
          <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-white/90">
            <span className="truncate">{ad.merchant_name}</span>
            <VerifiedBadge show={ad.merchant_verified} size={13} />
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/90">{badge}</span>
      </span>

      <span className="block min-w-0">
        <span className="block line-clamp-3 break-words font-display text-[20px] leading-[1.3] sm:text-[26px]">{title}</span>
        {ad.description && (
          <span className="mt-2 block line-clamp-2 break-words text-[13px] leading-relaxed text-white/80">{ad.description}</span>
        )}
      </span>

      <span className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13px] font-bold shadow-sm transition-all group-hover:gap-3"
          style={{ color: colors.cta }}
        >
          {cta}
          <ArrowLeft size={15} />
        </span>
        {isProduct && ad.product_price != null && (
          <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-bold">{formatIQD(ad.product_price)}</span>
        )}
      </span>
    </span>
  );

  const productVisual = (
    <span className="relative flex w-[38%] shrink-0 items-center justify-center p-3 sm:p-4">
      <span aria-hidden="true" className="absolute size-[82%] rounded-full bg-white/[0.12]" />
      {ad.product_image ? (
        <img loading="lazy" decoding="async"
          src={ad.product_image}
          alt={title}
          className="relative aspect-square w-full max-w-[200px] -rotate-3 rounded-[26px] object-cover shadow-[0_18px_40px_rgba(0,0,0,0.38)] ring-4 ring-white/25 transition duration-500 group-hover:rotate-0 group-hover:scale-105"
        />
      ) : (
        <ShoppingBag size={48} className="relative text-white/60" />
      )}
    </span>
  );

  const companyVisual = (
    <span className="relative flex w-[38%] shrink-0 items-center justify-center p-3">
      <span aria-hidden="true" className="absolute size-[88%] rounded-full border border-white/20" />
      <span aria-hidden="true" className="absolute size-[66%] rounded-full bg-white/[0.1]" />
      <span className="relative flex size-24 items-center justify-center overflow-hidden rounded-full bg-white/15 font-display text-4xl shadow-[0_14px_34px_rgba(0,0,0,0.3)] ring-4 ring-white/30 sm:size-28">
        {ad.merchant_avatar ? (
          <img loading="lazy" decoding="async" src={ad.merchant_avatar} alt="" className="size-full object-cover" />
        ) : (
          ad.merchant_name.charAt(0)
        )}
      </span>
    </span>
  );

  const promotionContent = (
    <>
      {hasPhoto && (
        <img
          loading="lazy"
          decoding="async"
          src={ad.image_url as string}
          alt=""
          className="absolute inset-0 -z-10 size-full object-cover"
        />
      )}
      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-l from-black/80 via-black/45 to-black/10" />
      <span className="relative z-10 flex min-h-[210px] flex-col justify-between gap-7 p-5 sm:min-h-[230px] sm:p-6">
        <span className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 font-display text-sm ring-2 ring-white/40">
              {ad.merchant_avatar ? (
                <img loading="lazy" decoding="async" src={ad.merchant_avatar} alt="" className="size-full object-cover" />
              ) : (
                ad.merchant_name.charAt(0)
              )}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-xs font-semibold text-white">
                <span className="truncate">{ad.merchant_name}</span>
                <VerifiedBadge show={ad.merchant_verified} size={13} />
              </span>
              <span className="mt-0.5 block text-[10px] text-white/75">عرض من المتجر</span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-white/30 bg-black/25 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm">
            إعلان ممول
          </span>
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/75">عرض خاص</span>
            <span className="block line-clamp-2 break-words font-display text-2xl leading-tight text-white sm:text-3xl">{title}</span>
            {ad.description && <span className="mt-2 line-clamp-1 block text-xs text-white/85">{ad.description}</span>}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-ink shadow-sm">
            اكتشف العرض
            <ArrowLeft size={15} />
          </span>
        </span>
      </span>
    </>
  );

  const content = (
    <>
      {hasPhoto && kind !== "promotion" ? (
        <>
          <img loading="lazy" decoding="async"
            src={ad.image_url as string}
            alt=""
            className="absolute inset-0 -z-10 size-full object-cover transition duration-700 group-hover:scale-105"
          />
          <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-l from-black/80 via-black/50 to-black/10" />
        </>
      ) : kind !== "promotion" ? (
        <Decor shape={ad.design_shape} />
      ) : null}
      {kind === "promotion" ? (
        promotionContent
      ) : (
        <span className="relative z-10 flex min-h-[250px] sm:min-h-[270px]">
          {textColumn}
          {kind === "product" && productVisual}
          {kind === "company" && companyVisual}
        </span>
      )}
    </>
  );

  const boxClass =
    "group relative isolate block overflow-hidden rounded-[28px] text-white shadow-[0_18px_48px_rgba(15,17,23,0.26)] transition hover:shadow-[0_22px_54px_rgba(15,17,23,0.34)]";
  const boxStyle = { background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` };

  return preview ? (
    <div dir="rtl" className={boxClass} style={boxStyle}>
      {content}
    </div>
  ) : (
    <Link href={href} prefetch dir="rtl" aria-label={label} className={boxClass} style={boxStyle}>
      {content}
    </Link>
  );
}
