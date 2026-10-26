"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Heart, Share2, Eye, ShoppingBag, MoreVertical, Pencil, Trash2, Check, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createConversation, sendMessage } from "@/lib/chat";
import { parseStoryAppearance, type Story, type StoryMerchant } from "@/lib/types";
import { FollowButton } from "./FollowButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DURATION = 5000;

type Viewer = { id: string; full_name: string | null; username: string | null 
  avatar_url?: string | null;
  store_name?: string | null;
};

interface Props {
  merchant: StoryMerchant;
  stories: Story[];
  viewerId: string | null;
  startIndex?: number;
  onClose: () => void;
  onSeen?: (storyId: string) => void;
  onHidden?: (storyId: string) => void;
  onDeleted?: (storyId: string) => void;
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  if (diffMin < 1) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  if (diffHour < 24) return `منذ ${diffHour} س`;
  return "منذ يوم";
}

export function StoryViewer({ merchant, stories: initialStories, viewerId, startIndex = 0, onClose, onSeen, onHidden, onDeleted }: Props) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [i, setI] = useState(startIndex);
  const elapsedRef = useRef(0);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const onCloseRef = useRef(onClose);
  const [liked, setLiked] = useState(false);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [sheet, setSheet] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const story = stories[i];
  const sid = story?.id;
  const isOwner = viewerId === merchant.id;
  const name = merchant.store_name ?? merchant.full_name ?? merchant.username ?? "متجر";
  const appearance = parseStoryAppearance(story?.bg_color);

  useEffect(() => {
    if (!story) onClose();
  }, [story, onClose]);

  useEffect(() => {
    if (!sid) return;
    let alive = true;
    setLiked(false);
    if (viewerId && !isOwner) {
      supabase
        .from("story_views")
        .upsert({ story_id: sid, viewer_id: viewerId }, { onConflict: "story_id,viewer_id", ignoreDuplicates: true })
        .then(() => onSeen?.(sid));
      supabase
        .from("story_likes")
        .select("story_id")
        .eq("story_id", sid)
        .eq("user_id", viewerId)
        .maybeSingle()
        .then(({ data }) => {
          if (alive) setLiked(!!data);
        });
    }
    if (isOwner) {
      supabase
        .from("story_views")
        .select("viewer:profiles_public!viewer_id(id, full_name, username, avatar_url, store_name)")
        .eq("story_id", sid)
        .order("viewed_at", { ascending: false })
        .then(({ data }) => {
          if (alive) setViewers(((data ?? []) as unknown as { viewer: Viewer }[]).map((r) => r.viewer));
        });
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid, viewerId, isOwner]);

  const running = !!sid && !sheet && !editing && !paused && !reply;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  function startStoryHold() {
    setPaused(true);
    holdTimerRef.current = setTimeout(() => {
      if ("vibrate" in navigator) navigator.vibrate(8);
      holdTimerRef.current = null;
    }, 450);
  }

  function endStoryHold() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    setPaused(false);
  }

  // الشريط والإغلاق التلقائي من عدّاد واحد: يتوقفان ويكملان معاً
  useEffect(() => {
    elapsedRef.current = 0;
    barsRef.current.forEach((el, j) => {
      if (el && j >= i) el.style.width = "0%";
    });
  }, [i, sid]);

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += Math.max(0, now - last);
      last = now;
      const p = Math.min(elapsedRef.current / DURATION, 1);
      const bar = barsRef.current[i];
      if (bar) bar.style.width = `${p * 100}%`;
      if (p >= 1) {
        elapsedRef.current = 0;
        if (i + 1 >= stories.length) onCloseRef.current();
        else setI(i + 1);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, i, stories.length]);

  if (!story) return null;

  function go(n: number) {
    if (n < 0) return;
    if (n >= stories.length) onClose();
    else setI(n);
  }

  function flash(msg: string) {
    toast.error(msg);
  }

  async function toggleLike() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    const next = !liked;
    setLiked(next);
    const { error } = next
      ? await supabase.from("story_likes").insert({ story_id: story.id, user_id: viewerId })
      : await supabase.from("story_likes").delete().eq("story_id", story.id).eq("user_id", viewerId);
    if (error) setLiked(!next);
  }

  async function share() {
    const url = `${location.origin}/home`;
    const text = `${name}: ${story.text}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success("تم نسخ الرابط");
      }
      if (viewerId) {
        await supabase.from("story_shares").insert({ story_id: story.id, user_id: viewerId });
      }
    } catch {
      /* أُلغيت المشاركة */
    }
  }

  async function messageOwner() {
    if (!viewerId) {
      router.push("/login");
      return;
    }
    try {
      const convId = await createConversation(viewerId, merchant.id);
      router.push(`/chat/${convId}?story=${story.id}`);
    } catch {
      flash("تعذّر فتح المحادثة");
    }
  }

  async function sendQuickReply() {
    const t = reply.trim();
    if (!t || sendingReply) return;
    if (!viewerId) {
      router.push("/login");
      return;
    }
    setSendingReply(true);
    try {
      const convId = await createConversation(viewerId, merchant.id);
      await sendMessage(viewerId, convId, t, undefined, undefined, undefined, {
        type: "story",
        id: story.id,
        text: story.text,
        bg: story.bg_color,
        image: story.image_url ?? null,
      });
      setReply("");
      toast.success("تم إرسال الرد");
    } catch {
      flash("تعذّر إرسال الرد");
    } finally {
      setSendingReply(false);
    }
  }

  function startEdit() {
    setEditText(story.text);
    setEditing(true);
    setShowMenu(false);
  }

  async function saveEdit() {
    const t = editText.trim();
    const { error } = await supabase.from("stories").update({ text: t }).eq("id", story.id);
    if (!error) {
      setStories((prev) => prev.map((s) => (s.id === story.id ? { ...s, text: t } : s)));
      setEditing(false);
      toast.success("تم حفظ تعديل القصة");
    } else {
      flash("تعذّر حفظ التعديل");
    }
  }

  async function deleteStory() {
    setDeleteConfirmOpen(true);
    setShowMenu(false);
  }

  async function confirmDeleteStory() {
    setDeleteConfirmOpen(false);
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) {
      flash("تعذّر الحذف");
      return;
    }
    onDeleted?.(story.id);
    toast.success("تم حذف القصة");
    const remaining = stories.filter((s) => s.id !== story.id);
    if (!remaining.length) {
      onClose();
      return;
    }
    setStories(remaining);
    setI((prev) => Math.min(prev, remaining.length - 1));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden">
      {/* خلفية ضبابية على الويب فقط - تملأ الفراغ حول البطاقة */}
      <div
        className="hidden md:block absolute inset-0 scale-110 blur-3xl opacity-60"
        style={{ background: story.image_url ? `url(${story.image_url}) center/cover` : story.bg_color }}
      />
      <div className="absolute inset-0 bg-black/70" />

      <div
        className="relative w-full h-full md:max-w-[420px] md:h-[92vh] md:rounded-[32px] overflow-hidden flex flex-col text-white shadow-2xl"
        style={{ background: appearance.background }}
      >
        {story.video_url ? (
          <video
            src={story.video_url}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : story.image_url ? (
          <img src={story.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : null}

        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[11] h-36 bg-gradient-to-b from-black/75 via-black/35 to-transparent" />

        <div className="absolute top-0 inset-x-0 z-20 px-3 pt-3 flex gap-1">
          {stories.map((s, j) => (
            <div key={s.id} className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden">
              <div
                ref={(el) => {
                  barsRef.current[j] = el;
                }}
                className="h-full bg-white"
                style={{ width: j < i ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        <button
          aria-label="السابق"
          onPointerDown={startStoryHold}
          onPointerUp={endStoryHold}
          onPointerCancel={endStoryHold}
          onPointerLeave={endStoryHold}
          onClick={() => go(i - 1)}
          className="absolute inset-y-0 right-0 w-1/2 z-10"
        />
        <button
          aria-label="التالي"
          onPointerDown={startStoryHold}
          onPointerUp={endStoryHold}
          onPointerCancel={endStoryHold}
          onPointerLeave={endStoryHold}
          onClick={() => go(i + 1)}
          className="absolute inset-y-0 left-0 w-1/2 z-10"
        />

        <div className="relative z-20 flex items-center gap-3 px-4 pt-9">
          <div className="w-9 h-9 rounded-full border border-white/40 bg-black/55 flex items-center justify-center text-sm font-display shrink-0 overflow-hidden shadow-lg">
            {merchant.avatar_url ? (
              <img src={merchant.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{name}<VerifiedBadge show={verifiedOf(merchant)} size={13} className="mr-1 align-middle" /></p>
            <p className="text-[11px] text-white/70">{timeAgo(story.created_at)}</p>
          </div>
          {!isOwner && <FollowButton merchantId={merchant.id} viewerId={viewerId} size="sm" onDark />}

          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                aria-label="خيارات"
                className="w-9 h-9 rounded-full border border-white/30 bg-black/60 shadow-lg flex items-center justify-center"
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <div className="absolute left-0 top-11 bg-card text-ink shadow-float rounded-xl overflow-hidden z-50 w-40 border border-chip">
                  <button
                    onClick={startEdit}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-chip"
                  >
                    <Pencil size={14} />
                    تعديل
                  </button>
                  <button
                    onClick={deleteStory}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-full border border-white/30 bg-black/60 shadow-lg flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {!editing && (
          <div className="absolute inset-0 z-[1] pointer-events-none">
            {story.text && (
              <p
                className={`absolute max-w-[84%] -translate-x-1/2 -translate-y-1/2 font-display leading-snug text-center break-words ${appearance.textStyle === "strong" ? "font-black" : "font-semibold"} ${appearance.textStyle === "label" ? "rounded-xl px-4 py-2" : ""}`}
                style={{
                  left: `${appearance.x}%`,
                  top: `${appearance.y}%`,
                  color: appearance.textColor,
                  fontSize: appearance.textSize,
                  background: appearance.textStyle === "label" ? "rgba(0,0,0,0.5)" : undefined,
                  textShadow:
                    appearance.textStyle === "label"
                      ? undefined
                      : appearance.textColor.toLowerCase() === "#111111"
                        ? "0 1px 8px rgba(255,255,255,0.8)"
                        : "0 2px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.95)",
                }}
              >
                {story.text}
              </p>
            )}
          </div>
        )}

        {editing && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-6">
            <div className="w-full flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value.slice(0, 120))}
                rows={3}
                autoFocus
                dir="auto"
                className="rounded-2xl border border-white/35 bg-black/65 px-4 py-3 text-center text-white shadow-xl outline-none backdrop-blur-md placeholder:text-white/75"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-pill border border-white/35 bg-black/60 py-3 text-sm font-semibold shadow-lg backdrop-blur-md"
                >
                  إلغاء
                </button>
                <button
                  onClick={saveEdit}
                  className="flex-1 bg-white text-black rounded-pill py-3 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        <div className="relative z-20 flex flex-col gap-3 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-24 pt-6 md:pb-6">
          {story.product_id && (
            <Link
              href={`/product/${story.product_id}`}
              className="self-center bg-white text-ink rounded-pill px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <ShoppingBag size={14} />
              عرض المنتج
            </Link>
          )}

          {isOwner ? (
            <button
              onClick={() => setSheet(true)}
              className="w-full h-11 rounded-pill border border-white/30 bg-black/65 shadow-lg backdrop-blur-md flex items-center justify-center gap-2 text-sm"
            >
              <Eye size={16} />
              {viewers.length} مشاهدة
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {/* حقل رد سريع */}
              <div className="flex-1 flex items-center gap-2 rounded-pill border border-white/35 bg-black/70 px-3 h-11 shadow-lg backdrop-blur-md">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendQuickReply();
                  }}
                  placeholder="أرسل رسالة للحساب..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/80"
                />
              </div>
              <button
                onClick={() => (reply.trim() ? void sendQuickReply() : void messageOwner())}
                disabled={sendingReply}
                aria-label={reply.trim() ? "إرسال الرد" : "فتح محادثة مع الحساب"}
                className="w-11 h-11 shrink-0 rounded-full border border-white/35 bg-black/70 shadow-lg backdrop-blur-md flex items-center justify-center"
              >
                <Send size={18} />
              </button>
              <button
                onClick={toggleLike}
                aria-label="إعجاب"
                className={`w-11 h-11 shrink-0 rounded-full border border-white/35 bg-black/70 shadow-lg backdrop-blur-md flex items-center justify-center ${liked ? "text-rose-300" : "text-white"}`}
              >
                <Heart size={18} fill={liked ? "currentColor" : "none"} />
              </button>
              <button
                onClick={share}
                aria-label="مشاركة"
                className="w-11 h-11 shrink-0 rounded-full border border-white/35 bg-black/70 shadow-lg backdrop-blur-md flex items-center justify-center"
              >
                <Share2 size={18} />
              </button>
            </div>
          )}
        </div>

        {sheet && (
          <div className="absolute inset-0 z-30 flex items-end bg-black/50" onClick={() => setSheet(false)}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[65%] overflow-y-auto bg-card text-ink rounded-t-card p-5"
            >
              <h3 className="font-display text-[18px] mb-3">المشاهدون ({viewers.length})</h3>
              {viewers.length === 0 ? (
                <p className="text-sm text-muted">لا مشاهدات بعد</p>
              ) : (
                <div className="divide-y divide-line">
                  {viewers.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => router.push(`/u/${v.id}`)}
                      className="flex w-full items-center gap-3 py-3 text-right text-sm"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-display">
                        {v.avatar_url ? (
                          <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (v.store_name ?? v.full_name ?? v.username ?? "؟").charAt(0)
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{v.store_name ?? v.full_name ?? "مستخدم"}</span>
                        {v.username && <span className="block text-xs text-muted">@{v.username}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>حذف القصة؟</DialogTitle>
              <DialogDescription>سيتم حذف هذه القصة نهائياً ولا يمكن التراجع عنها.</DialogDescription>
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
                onClick={confirmDeleteStory}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                حذف
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
