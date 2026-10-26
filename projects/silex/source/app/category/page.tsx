"use client";

import { PageLoading } from "@/components/ui/Skeleton";
import { useState, Suspense, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, Heart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCategories, getProducts } from "@/lib/catalog";
import ScreenHeader from "@/components/ScreenHeader";
import { ProductCard } from "@/components/ProductCard";
import { PostMediaThumbnail } from "@/components/PostMediaThumbnail";

type Post = {
  id: string;
  image_url: string | null;
  thumb_url: string | null;
  caption: string | null;
  media_type: "image" | "video" | "text";
  likes: number;
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    store_name: string | null;
    avatar_url: string | null;
  } | null;
};

async function getTrendingPosts(category?: string): Promise<Post[]> {
  let q = supabase
    .from("posts")
    .select("id, user_id, image_url, thumb_url, caption, media_type, author:profiles_public!user_id(id, role, full_name, username, store_name, avatar_url), product:products(is_active)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (category && category !== "all") q = q.eq("category", category);
  const { data } = await q;

  const base = ((data ?? []) as unknown as {
    id: string;
    user_id: string;
    image_url: string | null;
    thumb_url: string | null;
    caption: string | null;
    media_type: "image" | "video" | "text";
    author: {
      id: string;
      role: string;
      full_name: string | null;
      username: string | null;
      store_name: string | null;
      avatar_url: string | null;
    } | null;
    product: { is_active: boolean } | null;
  }[])
    .filter((p) => p.author?.role === "merchant" && p.product?.is_active !== false)
    .flatMap(({ id, user_id, image_url, thumb_url, caption, media_type, author }) =>
      author ? [{ id, user_id, image_url, thumb_url, caption, media_type, author }] : [],
    );
  if (!base.length) return [];
  const ids = base.map((p) => p.id);

  const [likesRes, savesRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_saves").select("post_id").in("post_id", ids),
  ]);

  const likes: Record<string, number> = {};
  const saves: Record<string, number> = {};
  (likesRes.data ?? []).forEach((r: { post_id: string }) => {
    likes[r.post_id] = (likes[r.post_id] ?? 0) + 1;
  });
  (savesRes.data ?? []).forEach((r: { post_id: string }) => {
    saves[r.post_id] = (saves[r.post_id] ?? 0) + 1;
  });

  return base
    .map((p) => ({ ...p, likes: likes[p.id] ?? 0, score: (likes[p.id] ?? 0) + (saves[p.id] ?? 0) * 2 }))
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...p }) => p);
}

function ExploreContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [active, setActive] = useState(params.get("c") ?? "all");
  const [q, setQ] = useState("");
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    meta: { persist: true },
  });
  const featuredQuery = useQuery({
    queryKey: ["explore-featured-products"],
    queryFn: async () => (await getProducts({ limit: 6, order: "top" })).filter((product) => product.promoted).slice(0, 3),
    meta: { persist: true },
  });
  const trendingQuery = useQuery({
    queryKey: ["explore-trending-posts", active],
    queryFn: () => getTrendingPosts(active),
    meta: { persist: true },
  });
  const categories = categoriesQuery.data ?? [];
  const featured = featuredQuery.data ?? [];
  const posts = trendingQuery.data ?? [];
  const loaded = !trendingQuery.isPending;

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/search?q=${encodeURIComponent(v)}` : "/search");
  }

  return (
    <div className="pb-10">
      <ScreenHeader title="استكشف" />

      <form onSubmit={onSearch} className="px-6 mt-3 md:px-10">
        <div className="flex items-center gap-3 bg-chip rounded-pill px-4 py-3">
          <SearchIcon size={16} className="text-ink/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink/40"
          />
        </div>
      </form>

      <div className="flex gap-2 px-6 mt-4 overflow-x-auto no-scrollbar md:px-10">
        <button
          onClick={() => setActive("all")}
          className={`px-4 py-2 rounded-pill text-sm font-medium shrink-0 ${
            active === "all" ? "bg-ink text-white" : "bg-chip text-ink/70"
          }`}
        >
          الكل
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`px-4 py-2 rounded-pill text-sm font-medium shrink-0 ${
              active === c.id ? "bg-ink text-white" : "bg-chip text-ink/70"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {featured.length > 0 && (
        <div className="px-6 mt-5 md:px-10">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted">منتجات مميزة</p>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">مدعومة</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {!loaded ? (
        <PageLoading />
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-muted py-14">لا توجد منشورات في هذا التصنيف بعد</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 items-start gap-2 px-6 sm:grid-cols-3 md:gap-3 md:px-10">
          {posts.map((p) => {
              if (!p.author) return null;
              const authorName = p.author.store_name || p.author.full_name || p.author.username || "متجر";
              return (
                <article key={p.id} className="surface-card min-w-0 overflow-hidden">
                  <Link
                    href={`/post/${p.id}`}
                    aria-label={`عرض منشور ${authorName}`}
                    className="relative block aspect-square overflow-hidden bg-chip"
                  >
                    {p.media_type !== "text" ? (
                      <span className="absolute inset-0">
                        <PostMediaThumbnail
                          imageUrl={p.image_url}
                          thumbUrl={p.thumb_url}
                          mediaType={p.media_type}
                          alt={p.caption ?? ""}
                        />
                      </span>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs leading-relaxed text-ink/70">
                        {p.caption ?? ""}
                      </div>
                    )}
                    {p.likes > 0 && (
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">
                        <Heart size={10} fill="currentColor" />
                        {p.likes}
                      </span>
                    )}
                  </Link>
                  <Link
                    href={`/store/${p.author.id}`}
                    className="flex min-w-0 items-center gap-2 p-2 transition-colors hover:bg-chip/70"
                    aria-label={`زيارة متجر ${authorName}`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip text-xs font-semibold text-ink/70">
                      {p.author.avatar_url ? (
                        <img src={p.author.avatar_url} alt="" loading="lazy" className="size-full object-cover" />
                      ) : (
                        authorName.charAt(0)
                      )}
                    </span>
                    <span className="min-w-0 truncate text-xs font-semibold">{authorName}</span>
                  </Link>
                </article>
              );
            })}
          </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreContent />
    </Suspense>
  );
}
