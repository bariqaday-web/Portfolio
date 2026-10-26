"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { AdItem } from "@/components/SponsoredCard";

export function SponsoredStoryPreview({ ad }: { ad: AdItem }) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl bg-ink text-white shadow-lg">
      {ad.image_url && <img src={ad.image_url} alt="" className="absolute inset-0 size-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold">{ad.merchant_name}</span>
        <span className="shrink-0 rounded-full border border-white/30 bg-black/30 px-2.5 py-1 text-[10px] font-bold">
          إعلان ممول
        </span>
      </div>
      <div className="absolute inset-x-4 bottom-4">
        <p className="line-clamp-2 break-words font-display text-xl font-bold leading-tight">{ad.title}</p>
        {ad.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/85">{ad.description}</p>}
      </div>
    </div>
  );
}

export function SponsoredStoryViewer({ ad, onClose }: { ad: AdItem; onClose: () => void }) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => onCloseRef.current(), 5000);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [ad.id]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`قصة ممولة من ${ad.merchant_name}`} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      <style>{`@keyframes sponsored-story-progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
      <div className="relative h-full w-full overflow-hidden bg-ink text-white shadow-2xl md:h-[92vh] md:max-w-[420px] md:rounded-[32px]">
        {ad.image_url && <img src={ad.image_url} alt="" className="absolute inset-0 size-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/85" />
        <div className="absolute inset-x-0 top-0 z-10 px-3 pt-3">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/35">
            <div className="h-full w-full origin-right animate-[sponsored-story-progress_5s_linear_forwards] bg-white" />
          </div>
        </div>
        <div className="absolute inset-x-0 top-7 z-10 flex items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-black/40 font-semibold">
              {ad.merchant_avatar ? (
                <img src={ad.merchant_avatar} alt="" className="size-full object-cover" />
              ) : (
                ad.merchant_name.charAt(0)
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{ad.merchant_name}</p>
              <p className="text-[11px] text-white/75">قصة ممولة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق القصة الممولة"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/45"
          >
            <X size={19} />
          </button>
        </div>
        <div className="absolute inset-x-5 bottom-4 z-10 pb-24 md:bottom-7 md:pb-0">
          <span className="mb-3 inline-flex rounded-full border border-white/30 bg-black/30 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
            إعلان ممول
          </span>
          <h2 className="break-words font-display text-2xl font-bold leading-tight">{ad.title}</h2>
          {ad.description && <p className="mt-2 break-words text-sm leading-relaxed text-white/85">{ad.description}</p>}
          <Link
            href={`/store/${ad.merchant_id}`}
            onClick={onClose}
            className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-ink"
          >
            زيارة المتجر
          </Link>
        </div>
      </div>
    </div>
  );
}
