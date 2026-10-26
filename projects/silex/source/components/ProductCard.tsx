"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Star, Store } from "lucide-react";
import { toast } from "sonner";
import { syncLike, type Product } from "@/lib/catalog";
import { getStorageImageUrl } from "@/lib/image";
import { useCart } from "@/lib/cart-context";

export function ProductCard({
  product,
  size = "md",
}: {
  product: Product;
  size?: "md" | "lg";
}) {
  const { toggleFavorite, isFavorite } = useCart();
  const saved = isFavorite(product.id);
  const isVideoCover = /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(product.image);
  const imageSrc = isVideoCover
    ? product.image
    : getStorageImageUrl(product.image, { width: size === "lg" ? 640 : 420, quality: 75 });

  return (
    <Link
      href={`/product/${product.id}`}
      className="surface-card surface-card-interactive group block w-full min-w-0 shrink-0 overflow-hidden text-ink"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[#e9e2d5]">
        {isVideoCover ? (
          <video
            src={imageSrc}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              if (video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
            }}
            aria-label={`معاينة فيديو المنتج: ${product.name}`}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes={size === "lg" ? "(min-width: 768px) 640px, 100vw" : "(min-width: 768px) 420px, 50vw"}
            quality={75}
            loading="lazy"
            className="object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
            void syncLike(product.id, !saved).then((success) => {
              if (success === false) {
                toggleFavorite(product.id);
                toast.error("تعذّر تحديث المحفوظات، تحقق من الاتصال");
              }
            });
          }}
          className="icon-control absolute right-3 top-3 size-10 border border-white/60 bg-white/90 text-ink shadow-sm backdrop-blur-md"
          aria-label={saved ? "إزالة من المحفوظات" : "حفظ المنتج"}
        >
          <Bookmark size={17} className={saved ? "fill-ink text-ink" : "text-ink"} />
        </button>
        {product.promoted && (
          <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-[#b8955b]/95 px-3 py-1 text-[10px] font-bold text-white shadow-sm backdrop-blur">
            اختيار مميز
          </span>
        )}
        <div className="absolute bottom-3 right-3 rounded-full border border-white/50 bg-white/90 px-3 py-1.5 text-sm font-bold text-ink shadow-sm backdrop-blur-md">
          ${product.price}
          {product.oldPrice != null && product.oldPrice > product.price && (
            <span className="mr-1.5 text-[10px] font-medium text-muted line-through">${product.oldPrice}</span>
          )}
        </div>
      </div>
      <div className="px-3.5 pb-4 pt-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted">
            <Store size={12} className="shrink-0 text-[#a48754]" />
            <span className="truncate">{product.merchant}</span>
          </span>
          {product.reviews > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#9b7740]">
              <Star size={12} className="fill-[#c5a66d] text-[#c5a66d]" />
              {product.rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 line-clamp-2 min-h-10 font-display text-[16px] leading-snug">
          {product.name}
        </h3>
      </div>
    </Link>
  );
}
