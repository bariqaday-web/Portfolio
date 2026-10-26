"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { MessageCircle, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getMerchantProductsPage, getCategories, type Product } from "@/lib/catalog";
import { useProfile } from "@/lib/useProfile";
import { summarizeStoreRating } from "@/lib/store-rating";
import { waLink } from "@/lib/whatsapp";
import type { Story, StoryMerchant } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { FollowButton } from "@/components/FollowButton";
import { StoryViewer } from "@/components/StoryViewer";
import ScreenHeader from "@/components/ScreenHeader";
import { BookChatButton } from "@/components/BookChatButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

type Store = StoryMerchant & {
  bio: string | null;
  store_name: string | null;
  store_category: string | null;
  store_bio: string | null;
};

type StoreReview = {
  id: string;
  merchant_id: string;
  customer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type StorePageData = {
  store: Store;
  products: Product[];
  productsHaveMore: boolean;
  stories: Story[];
  followers: number | null;
  categoryName: string | null;
  reviews: StoreReview[];
};

export default function StorePage() {
  const params = useParams<{ id: string }>();
  const { user, loading } = useProfile();
  const viewerId = user?.id ?? null;
  const queryClient = useQueryClient();
  const storeQueryKey = ["store-page", params.id] as const;
  const storeQuery = useQuery<StorePageData | null>({
    queryKey: storeQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("id, full_name, username, bio, avatar_url, whatsapp, store_name, store_category, store_bio, verified_at")
        .eq("id", params.id)
        .eq("role", "merchant")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;

      const [productPage, storyResult, followerResult, reviewsResult, categories] = await Promise.all([
        getMerchantProductsPage(params.id),
        supabase
          .from("stories")
          .select("id, merchant_id, text, bg_color, image_url, video_url, media_type, product_id, created_at, expires_at")
          .eq("merchant_id", params.id)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: true }),
        supabase.rpc("followers_count", { mid: params.id }),
        supabase
          .from("store_reviews")
          .select("id, merchant_id, customer_id, rating, comment, created_at, updated_at")
          .eq("merchant_id", params.id)
          .order("created_at", { ascending: false }),
        data.store_category ? getCategories() : Promise.resolve([]),
      ]);
      if (storyResult.error) throw new Error(`تعذّر تحميل قصص المتجر: ${storyResult.error.message}`);
      if (followerResult.error) throw new Error(`تعذّر تحميل عدد المتابعين: ${followerResult.error.message}`);
      if (reviewsResult.error) throw new Error(`تعذّر تحميل تقييمات المتجر: ${reviewsResult.error.message}`);

      return {
        store: data as Store,
        products: productPage.items,
        productsHaveMore: productPage.hasMore,
        stories: (storyResult.data ?? []) as Story[],
        followers: typeof followerResult.data === "number" ? followerResult.data : null,
        categoryName: categories.find((category) => category.id === data.store_category)?.name ?? null,
        reviews: (reviewsResult.data ?? []) as StoreReview[],
      };
    },
    enabled: Boolean(params.id),
    meta: { persist: true },
  });
  const storePage = storeQuery.data;
  const store = storePage?.store ?? null;
  const products = storePage?.products ?? [];
  const productsHaveMore = storePage?.productsHaveMore ?? false;
  const stories = storePage?.stories ?? [];
  const followers = storePage?.followers ?? null;
  const catName = storePage?.categoryName ?? null;
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [sponsoredAdTitle, setSponsoredAdTitle] = useState<string | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("sponsored") === "1") {
      setSponsoredAdTitle(search.get("adTitle")?.slice(0, 120) ?? "إعلان المتجر");
    }
  }, []);
  // القصص التي أخفاها الزبون سابقاً
  useEffect(() => {
    if (!viewerId) return;
    supabase
      .from("story_hides")
      .select("story_id")
      .eq("user_id", viewerId)
      .then(({ data }) =>
        setHidden(new Set(((data ?? []) as { story_id: string }[]).map((r) => r.story_id)))
      );
  }, [viewerId]);

  async function loadMoreProducts() {
    if (loadingMoreProducts || !productsHaveMore || !storePage) return;
    setLoadingMoreProducts(true);
    try {
      const page = await getMerchantProductsPage(params.id, products.length);
      queryClient.setQueryData<StorePageData | null>(storeQueryKey, (current) =>
        current
          ? {
              ...current,
              products: [...current.products, ...page.items],
              productsHaveMore: page.hasMore,
            }
          : current
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر تحميل المزيد من المنتجات");
    } finally {
      setLoadingMoreProducts(false);
    }
  }

  if (storeQuery.isPending) {
    return (
      <div aria-busy="true" aria-label="جارٍ تحميل المتجر">
        <ScreenHeader />
        <div className="mx-6 mt-3 space-y-6 md:mx-10">
          <section className="rounded-[30px] border border-line bg-card p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <Skeleton className="size-[76px] shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-3 pt-1">
                <Skeleton className="h-6 w-40 max-w-full" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            </div>
            <div className="mt-5 flex gap-2 border-t border-line pt-4">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </section>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-line bg-card p-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (storeQuery.isError) {
    console.error("Could not load store page", { storeId: params.id, error: storeQuery.error });
    return (
      <div role="alert" className="space-y-3 p-6 text-sm text-red-700">
        <p>تعذّر تحميل المتجر. تحقق من الاتصال وحاول مجدداً.</p>
        <button
          type="button"
          onClick={() => void storeQuery.refetch()}
          className="rounded-full border border-red-200 px-4 py-2 font-semibold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
  if (!store) return <p className="p-6 text-sm text-muted">المتجر غير موجود.</p>;

  const name = store.store_name ?? store.full_name ?? store.username ?? "متجر";
  const visible = stories.filter((s) => !hidden.has(s.id));
  const isOwner = viewerId === store.id;
  const promotedProducts = products.filter((p) => p.promoted).slice(0, 3);
  const ratingSummary = summarizeStoreRating(storePage?.reviews ?? []);
  const userReview = viewerId ? (storePage?.reviews ?? []).find((review) => review.customer_id === viewerId) ?? null : null;
  const canRate = !isOwner && !!viewerId && user?.role !== "merchant";

  async function submitStoreRating(nextRating: number) {
    if (!viewerId || !store || !canRate) return;
    setRatingBusy(true);
    try {
      const { error } = await supabase
        .from("store_reviews")
        .upsert(
          {
            merchant_id: store.id,
            customer_id: viewerId,
            rating: nextRating,
            comment: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "merchant_id,customer_id" }
        )
        .select("id");
      if (error) throw error;
      await storeQuery.refetch();
      toast.success(`تم تقييم المتجر بنجاح: ${nextRating} نجوم`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذّر حفظ تقييم المتجر");
    } finally {
      setRatingBusy(false);
    }
  }

  return (
    <div>
      <ScreenHeader />

      <div className="mx-6 mt-3 md:mx-10">
        <section className="relative isolate overflow-hidden rounded-[30px] border border-[#c8b991]/30 bg-gradient-to-br from-[#f5f0e5] via-[#eee6d6] to-[#dfd2b9] p-5 shadow-[0_16px_40px_rgba(63,51,30,0.1)] sm:p-7">
          <div className="absolute -left-16 -top-24 -z-10 size-72 rounded-full border border-white/50" />
          <div className="absolute -left-6 -top-16 -z-10 size-52 rounded-full border border-white/40" />
          <div className="absolute bottom-0 right-0 -z-10 h-36 w-36 rounded-full bg-white/25 blur-3xl" />
          <div className="flex items-start gap-4">
            <button
              onClick={() => visible.length > 0 && setOpen(true)}
              aria-label="عرض قصص المتجر"
              className={`size-[76px] shrink-0 rounded-full p-[3px] shadow-md ${
                visible.length > 0
                  ? "bg-gradient-to-tr from-[#9a7440] via-[#e1c786] to-[#a9844d]"
                  : "bg-white/70"
              }`}
            >
              <span className="flex size-full items-center justify-center overflow-hidden rounded-full border-[3px] border-[#f4eddf] bg-[#e0d5be] font-display text-xl">
                {store.avatar_url ? (
                  <img src={store.avatar_url} alt={name} className="h-full w-full object-cover" />
                ) : (
                  name.charAt(0)
                )}
              </span>
            </button>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-[22px] leading-tight text-[#29261f] md:text-[28px]">
                  {name}<VerifiedBadge show={verifiedOf(store)} size={18} className="mr-1 align-middle" />
                </h1>
                {catName && (
                  <span className="rounded-full border border-white/70 bg-white/50 px-3 py-1 text-[10px] font-medium text-[#715d3c] backdrop-blur">
                    {catName}
                  </span>
                )}
              </div>
              {store.username && <p className="mt-1 truncate text-xs text-[#6f6859]">@{store.username}</p>}
              {(store.store_bio ?? store.bio) && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#484235]">{store.store_bio ?? store.bio}</p>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/60 pt-4 text-xs text-[#62563f]">
            <span className="rounded-full bg-white/55 px-3.5 py-2">{products.length} منتج</span>
            {followers !== null && <span className="rounded-full bg-white/55 px-3.5 py-2">{followers} متابع</span>}
            <div className="flex items-center gap-2 rounded-full bg-white/55 px-3.5 py-2">
              <div className="flex items-center gap-1 text-[#d4a950]">
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    size={14}
                    fill={index < Math.round(ratingSummary.average) ? "currentColor" : "none"}
                    className={index < Math.round(ratingSummary.average) ? "text-[#d4a950]" : "text-[#c4b394]"}
                  />
                ))}
              </div>
              <span className="font-semibold text-[#3f372d]">{ratingSummary.count > 0 ? ratingSummary.label : "0.0"}</span>
              <span>({ratingSummary.count})</span>
            </div>
            {visible.length > 0 && (
              <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-white/75 px-3.5 py-2 font-medium transition hover:bg-white">
                شاهد قصص المتجر
              </button>
            )}
          </div>
        </section>
      </div>

      {canRate && (
        <div className="px-6 mt-4 md:px-10">
          <div className="rounded-[24px] border border-[#ead9b9] bg-[#fffaf1] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#3b3019]">قيّم هذا المتجر</p>
                <p className="text-xs text-[#7a6851]">شارك تجربتك لتساعد العملاء الآخرين</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#7d6236]">
                {userReview ? `تقييمك الحالي: ${userReview.rating} نجوم` : "لم تقيمه بعد"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {Array.from({ length: 5 }, (_, index) => {
                const starValue = index + 1;
                const active = (userReview?.rating ?? 0) >= starValue || ratingBusy;
                return (
                  <button
                    key={starValue}
                    type="button"
                    disabled={ratingBusy}
                    aria-label={`تقييم ${starValue} نجوم`}
                    onClick={() => void submitStoreRating(starValue)}
                    className="rounded-full p-1 transition hover:scale-105 disabled:cursor-not-allowed"
                  >
                    <Star
                      size={26}
                      fill={active ? "currentColor" : "none"}
                      className={active ? "text-[#d4a950]" : "text-[#d2c5a8]"}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 mt-4 flex flex-wrap gap-2 md:px-10">
        {!loading && !isOwner && (
          <FollowButton
            merchantId={store.id}
            viewerId={viewerId}
            onChange={(f) => {
              queryClient.setQueryData<StorePageData | null>(storeQueryKey, (current) =>
                current && current.followers !== null
                  ? { ...current, followers: current.followers + (f ? 1 : -1) }
                  : current
              );
            }}
          />
        )}
        {!loading && !isOwner && (
          <BookChatButton
            merchantId={store.id}
            message={
              sponsoredAdTitle
                ? `مرحباً، لدي استفسار عن الإعلان الممول «${sponsoredAdTitle}» لمتجركم.`
                : undefined
            }
            label="دردشة"
            className="px-4 py-2 rounded-pill text-sm font-medium bg-chip text-ink/70 flex items-center gap-2"
          />
        )}
        {store.whatsapp && !isOwner && (
          <a
            href={waLink(store.whatsapp, `مرحباً ${name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-pill text-sm font-medium bg-chip text-ink/70 flex items-center gap-2"
          >
            <MessageCircle size={15} />
            واتساب
          </a>
        )}
      </div>

      {promotedProducts.length > 0 && (
        <div className="px-6 mt-6 md:px-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted">منتجات مميزة</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">مدعومة</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {promotedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="px-6 mt-10 text-sm text-muted text-center md:px-10">
          لم ينشر هذا المتجر منتجات بعد
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 px-6 mt-6 md:grid-cols-4 md:px-10 md:gap-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {productsHaveMore && (
        <button
          type="button"
          onClick={loadMoreProducts}
          disabled={loadingMoreProducts}
          className="mx-auto mt-6 block rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {loadingMoreProducts ? "جارٍ تحميل المزيد..." : "تحميل المزيد من المنتجات"}
        </button>
      )}

      {open && visible.length > 0 && (
        <StoryViewer
          merchant={store}
          stories={visible}
          viewerId={viewerId}
          onClose={() => setOpen(false)}
          onHidden={(id) => setHidden((p) => new Set(p).add(id))}
        />
      )}
    </div>
  );
}
