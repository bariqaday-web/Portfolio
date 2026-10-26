"use client";

import { ReportPostButton } from "@/components/ReportPostButton";
import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { CartButton } from "@/components/ui/CartButton";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Share2, User as UserIcon, Volume2, VolumeX, ShoppingBag, Flag, Pencil, Trash2, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { useCart } from "@/lib/cart-context";
import { getProduct } from "@/lib/catalog";
import { FollowButton } from "@/components/FollowButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionMenu, ActionMenuItem, ActionMenuSub } from "@/components/ui/ActionMenu";
import { submitReport } from "@/lib/report";

export type FeedPost = {
  id: string;
  user_id: string;
  title: string | null;
  caption: string | null;
  hashtags: string[] | null;
  image_url: string | null;
  thumb_url?: string | null;
  media_type: "image" | "video" | "text";
  product_id?: string | null;
  created_at: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  author: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    store_name?: string | null;
  } | null;
};

let followingCache: { uid: string; ids: Set<string>; promise?: Promise<Set<string>> } | null = null;

function loadFollowing(uid: string): Promise<Set<string>> {
  if (followingCache && followingCache.uid === uid) {
    if (followingCache.promise) return followingCache.promise;
    return Promise.resolve(followingCache.ids);
  }
  const promise = Promise.resolve(
    supabase.from("follows").select("merchant_id").eq("follower_id", uid)
  ).then(({ data }) => {
    const ids = new Set(((data ?? []) as { merchant_id: string }[]).map((r) => r.merchant_id));
    followingCache = { uid, ids };
    return ids;
  });
  followingCache = { uid, ids: new Set(), promise };
  return promise;
}

const REPORT_REASONS = ["محتوى مسيء", "احتيال أو نصب", "محتوى مزعج (سبام)", "أخرى"];

export function PostCard({ post }: { post: FeedPost }) {
  const router = useRouter();
  const { user: viewer } = useProfile();
  const { add } = useCart();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.saved);
  const [muted, setMuted] = useState(true);
  const [following, setFollowing] = useState<boolean | null>(null);
  const [gone, setGone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shownTitle, setShownTitle] = useState(post.title ?? "");
  const [shownCaption, setShownCaption] = useState(post.caption ?? "");
  const [draftTitle, setDraftTitle] = useState(post.title ?? "");
  const [draftCaption, setDraftCaption] = useState(post.caption ?? "");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const authorName =
    post.author?.store_name ?? post.author?.full_name ?? post.author?.username ?? "مستخدم";
  const isOwner = viewer?.id === post.user_id;

  useEffect(() => {
    if (!viewer || viewer.id === post.user_id) return;
    let alive = true;
    loadFollowing(viewer.id).then((ids) => {
      if (alive) setFollowing(ids.has(post.user_id));
    });
    return () => { alive = false; };
  }, [viewer?.id, post.user_id]);

  // تشغيل تلقائي عند الظهور وإيقاف عند الخروج
  useEffect(() => {
    const v = videoRef.current;
    const box = boxRef.current;
    if (!v || !box) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio >= 0.6) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(box);
    return () => io.disconnect();
  }, []);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  }

  async function toggleLike() {
    if (!viewer) return router.push("/login");
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: viewer.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", viewer.id);
    if (error && error.code !== "23505") {
      setLiked(!next);
      setLikeCount((c) => c + (next ? -1 : 1));
      toast.error("تعذّر تنفيذ الإجراء، تحقق من الاتصال");
    }
  }

  async function toggleSave() {
    if (!viewer) return router.push("/login");
    const next = !saved;
    setSaved(next);
    const { error } = next
      ? await supabase.from("post_saves").insert({ post_id: post.id, user_id: viewer.id })
      : await supabase.from("post_saves").delete().eq("post_id", post.id).eq("user_id", viewer.id);
    if (error && error.code !== "23505") {
      setSaved(!next);
      toast.error("تعذّر تنفيذ الإجراء، تحقق من الاتصال");
    }
  }

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try { await navigator.share({ url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("تم نسخ الرابط");
    }
  }

  async function report(reason: string) {
    if (!viewer) return router.push("/login");
    const submitted = await submitReport("post", post.id, reason);
    if (!submitted) return void toast.error("تعذّر إرسال البلاغ");
    toast.success("تم إرسال البلاغ، شكراً لك");
    setGone(true);
    const { error } = await supabase
      .from("post_hides")
      .insert({ user_id: viewer.id, post_id: post.id });
    if (error && error.code !== "23505") console.error("Could not persist hide after report", error);
  }

  async function hidePost() {
    if (!viewer) return router.push("/login");
    setGone(true);
    const hideResult = await supabase
      .from("post_hides")
      .insert({ user_id: viewer.id, post_id: post.id });
    if (hideResult.error && hideResult.error.code !== "23505") {
      setGone(false);
      toast.error("تعذر حفظ الإخفاء");
      return;
    }

    toast("تم إخفاء المنشور", {
      action: {
        label: "تراجع",
        onClick: () => {
          void supabase
            .from("post_hides")
            .delete()
            .eq("user_id", viewer.id)
            .eq("post_id", post.id)
            .then(({ error }) => {
              if (error) {
                toast.error("تعذّر التراجع عن الإخفاء");
                return;
              }
              setGone(false);
            });
        },
      },
      duration: 6000,
    });
  }

  async function deletePost() {
    if (!viewer) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDeletePost() {
    setDeleteConfirmOpen(false);
    if (!viewer) return;
    const { data, error } = await supabase
      .from("posts").delete().eq("id", post.id).eq("user_id", viewer.id).select("id");
    if (error || !data?.length) return toast.error("تعذر حذف المنشور");
    setGone(true);
    toast.success("تم حذف المنشور");
  }

  async function saveEdit() {
    if (!viewer) return;
    setSaving(true);
    const t = draftTitle.trim();
    const c = draftCaption.trim();
    const { data, error } = await supabase
      .from("posts").update({ title: t || null, caption: c || null })
      .eq("id", post.id).eq("user_id", viewer.id).select("id");
    setSaving(false);
    if (error || !data?.length) return toast.error("تعذر حفظ التعديل");
    setShownTitle(t);
    setShownCaption(c);
    setEditing(false);
    toast.success("تم حفظ التعديل");
  }

  async function addToCart() {
    if (!post.product_id) return;
    const p = await getProduct(post.product_id);
    if (!p) return toast.error("هذا المنتج غير متوفر");
    if (viewer?.id === p.merchantId) return toast.error("لا يمكنك إضافة منتج متجرك إلى السلة");
    add(p, 1, { color: null, size: null });
  }

  if (gone) return null;

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link href={`/u/${post.user_id}`} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-full bg-chip flex items-center justify-center overflow-hidden shrink-0">
            {post.author?.avatar_url ? (
              <img loading="lazy" decoding="async" src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={14} className="text-ink/40" />
            )}
          </div>
          <p className="flex min-w-0 items-center gap-1 text-sm font-semibold">
            <span className="truncate">{authorName}</span>
            <VerifiedBadge show={verifiedOf(post.author)} size={14} />
          </p>
        </Link>
        {viewer && !isOwner && <ReportPostButton postId={post.id} reportedId={post.user_id} />}
        {!isOwner && viewer && following !== null && (
          <FollowButton
            merchantId={post.user_id}
            viewerId={viewer.id}
            initial={following}
            size="sm"
            onChange={(f) => {
              setFollowing(f);
              if (followingCache && followingCache.uid === viewer.id) {
                if (f) followingCache.ids.add(post.user_id);
                else followingCache.ids.delete(post.user_id);
              }
            }}
          />
        )}
        <ActionMenu label="خيارات المنشور">
          {isOwner ? (
            <>
              <ActionMenuItem
                icon={Pencil}
                onSelect={() => {
                  setDraftTitle(shownTitle);
                  setDraftCaption(shownCaption);
                  setEditing(true);
                }}
              >
                تعديل
              </ActionMenuItem>
              <ActionMenuItem icon={Trash2} destructive onSelect={() => void deletePost()}>
                حذف
              </ActionMenuItem>
            </>
          ) : (
            <>
              <ActionMenuItem icon={EyeOff} onSelect={() => void hidePost()}>
                إخفاء المنشور
              </ActionMenuItem>
              <ActionMenuSub icon={Flag} label="إبلاغ">
                {REPORT_REASONS.map((reason) => (
                  <ActionMenuItem key={reason} icon={Flag} onSelect={() => void report(reason)}>
                    {reason}
                  </ActionMenuItem>
                ))}
              </ActionMenuSub>
            </>
          )}
        </ActionMenu>
        {editing && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-card p-5 text-right shadow-float">
                <h3 className="mb-4 font-display text-lg">تعديل المنشور</h3>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="العنوان"
                  className="mb-3 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm"
                />
                <textarea
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  placeholder="الوصف"
                  rows={5}
                  className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm"
                />
                <div className="mt-4 flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-pill bg-ink py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 rounded-pill bg-chip py-2.5 text-sm font-semibold">
                    إلغاء
                  </button>
                </div>
              </div>

              <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>حذف المنشور؟</DialogTitle>
                    <DialogDescription>سيتم حذف المنشور نهائياً ولا يمكن التراجع عنه.</DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmOpen(false)}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeletePost}
                      className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      حذف
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

      </div>

      {post.media_type !== "text" && post.image_url && (
        <div ref={boxRef} className="relative w-full aspect-square bg-chip">
          {post.media_type === "image" ? (
            <Link href={`/post/${post.id}`} className="block w-full h-full">
              <img loading="lazy" decoding="async" src={post.image_url} alt={post.title ?? ""} className="w-full h-full object-cover" />
            </Link>
          ) : (
            <>
              <video
                ref={videoRef}
                src={post.image_url}
                muted
                loop
                playsInline
                preload="metadata"
                poster={post.thumb_url ?? undefined}
                onClick={toggleSound}
                className="w-full h-full object-cover"
              />
              <button
                onClick={toggleSound}
                aria-label="الصوت"
                className="absolute bottom-3 left-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={toggleLike} className="flex items-center gap-1.5">
          <Heart size={22} className={liked ? "fill-red-500 text-red-500" : "text-ink"} />
          <span className="text-sm">{likeCount}</span>
        </button>
        <Link href={`/post/${post.id}`} className="flex items-center gap-1.5">
          <MessageCircle size={22} />
          <span className="text-sm">{post.comments}</span>
        </Link>
        <button onClick={share} aria-label="مشاركة">
          <Share2 size={20} />
        </button>
        <button onClick={toggleSave} aria-label="حفظ" className="ml-auto">
          <Bookmark size={22} className={saved ? "fill-ink text-ink" : "text-ink"} />
        </button>
      </div>

      {post.product_id && !isOwner && (
        <CartButton productId={post.product_id} onAdd={addToCart} className="w-[calc(100%-32px)] mx-4 mb-3" />
      )}

      {(shownTitle || shownCaption) && (
        <Link href={`/post/${post.id}`} className="block px-4 pb-4">
          {shownTitle && <h2 className="font-display text-base">{shownTitle}</h2>}
          {shownCaption && <p className="text-sm text-ink/80 mt-1 line-clamp-3">{shownCaption}</p>}
          {post.hashtags && post.hashtags.length > 0 && (
            <p className="text-xs text-muted mt-2">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
          )}
        </Link>
      )}
    </div>
  );
}
