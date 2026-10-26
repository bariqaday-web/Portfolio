"use client";
import { AdSlider } from "@/components/AdSlider";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProfile } from "@/lib/useProfile";
import { supabase } from "@/lib/supabase";
import { StoriesBar } from "@/components/StoriesBar";
import { PostCard, type FeedPost } from "@/components/PostCard";
import { FollowButton } from "@/components/FollowButton";
import { SponsoredCard, type AdItem } from "@/components/SponsoredCard";
import { getFollowingFeed, getDiscoverFeed, getSuggestedStores, type SuggestedStore } from "@/lib/feed";

export default function HomePage() {
  const { user } = useProfile();
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [stores, setStores] = useState<SuggestedStore[]>([]);
  const [following, setFollowing] = useState(0);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [ready, setReady] = useState(false);
  const storyAds = ads.filter((ad) => ad.type === "story");
  const productAds = ads.filter((ad) => ad.type === "product" && ad.product_id);
  const bannerAds = ads.filter((ad) => ad.type !== "story" && ad.type !== "product");
  const sliderAds = bannerAds.slice(0, 5);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const [mine, discover, sug, hides, adsRes] = await Promise.all([
        getFollowingFeed(user.id),
        getDiscoverFeed(user.id),
        getSuggestedStores(user.id),
        supabase.from("post_hides").select("post_id").eq("user_id", user.id),
        supabase.rpc("get_active_ads", { p_limit: 6 }),
      ]);
      if (!alive) return;
      const hidden = new Set(((hides.data ?? []) as { post_id: string }[]).map((r) => r.post_id));
      const seen = new Set(mine.map((p) => p.id));
      setFeed(
        [...mine, ...discover.filter((p) => !seen.has(p.id))].filter((p) => !hidden.has(p.id))
      );
      setFollowing(mine.length);
      setStores(sug);
      setAds(Array.isArray(adsRes.data) ? (adsRes.data as AdItem[]) : []);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [user]);

  return (
    <div className="pb-10">
      <StoriesBar storyAds={storyAds} />
      {ready && sliderAds.length > 0 && (
        <div className="mx-auto mt-5 max-w-lg px-6 md:px-0">
          <AdSlider ads={sliderAds} />
        </div>
      )}

      <div className="flex flex-col gap-4 px-6 mt-5 max-w-lg mx-auto md:px-0">
        {feed.map((p, i) => (
          <>
            <PostCard key={p.id} post={p} />
            {productAds[Math.floor(i / 4)] && (i + 1) % 4 === 0 && (
              <div key={`ad-${productAds[Math.floor(i / 4)].id}`} className="relative">
                <span className="absolute right-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                  ممول
                </span>
                <SponsoredCard ad={productAds[Math.floor(i / 4)]} />
              </div>
            )}
          </>
        ))}
        {ready && feed.length === 0 && (
          <p className="text-center text-sm text-muted py-10">لا توجد منشورات بعد</p>
        )}
      </div>

      {user && stores.length > 0 && following < 5 && (
        <div className="mt-5">
          <h2 className="font-display text-[17px] px-6 md:px-10">متاجر مقترحة لك</h2>
          <div className="flex gap-3 px-6 mt-3 overflow-x-auto no-scrollbar md:px-10">
            {stores.map((s) => {
              const name = s.store_name ?? s.full_name ?? s.username ?? "متجر";
              return (
                <div key={s.id} className="group relative w-[152px] shrink-0 overflow-hidden rounded-[24px] border border-black/[0.04] bg-gradient-to-br from-white via-[#faf7f0] to-[#eee5d5] p-3.5 text-center shadow-[0_10px_26px_rgba(38,32,22,0.07)] transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(38,32,22,0.12)]">
                  <div className="absolute -left-8 -top-9 size-24 rounded-full bg-[#c5a66d]/10 blur-xl" />
                  <Link href={`/store/${s.id}`} prefetch className="relative block">
                    <div className="mx-auto flex size-[68px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white bg-[#e9dfca] font-display text-xl shadow-[0_4px_16px_rgba(90,70,35,0.16)] ring-1 ring-[#c5a66d]/40">
                      {s.avatar_url ? <img src={s.avatar_url} alt="" className="h-full w-full object-cover" /> : name.charAt(0)}
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-[#eee5d5] px-2.5 py-1 text-[9px] font-semibold text-[#8a7147]">متجر مقترح</span>
                    <p className="mt-2 truncate text-sm font-semibold">{name}<VerifiedBadge show={verifiedOf(s)} size={13} className="mr-1 align-middle" /></p>
                    {s.username && <p className="mt-0.5 truncate text-[10px] text-muted">@{s.username}</p>}
                  </Link>
                  <div className="relative mt-3 flex justify-center">
                    <FollowButton merchantId={s.id} viewerId={user.id} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
