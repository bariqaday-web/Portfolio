"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Tag, Check, ChevronRight, Pencil, RefreshCw, Crosshair } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  encodeStoryAppearance,
  STORY_COLORS,
  STORY_TEXT_COLORS,
  type Profile,
  type StoryTextStyle,
} from "@/lib/types";
import type { CapturedMedia } from "./StoryCamera";

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const STORY_MEDIA_FORMATS = {
  "image/jpeg": { type: "image", extension: "jpg" },
  "image/png": { type: "image", extension: "png" },
  "image/webp": { type: "image", extension: "webp" },
  "image/gif": { type: "image", extension: "gif" },
  "video/mp4": { type: "video", extension: "mp4" },
  "video/webm": { type: "video", extension: "webm" },
  "video/quicktime": { type: "video", extension: "mov" },
} as const;

export function StoryEditor({
  profile,
  products,
  initialMedia,
  onClose,
  onBack,
  onPublished,
}: {
  profile: Profile;
  products: { id: string; title: string }[];
  initialMedia: CapturedMedia | null;
  onBack: () => void;
  onClose: () => void;
  onPublished: (newStoryId: string) => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(STORY_COLORS[0]);
  const [textColor, setTextColor] = useState(STORY_TEXT_COLORS[0]);
  const [textStyle, setTextStyle] = useState<StoryTextStyle>("classic");
  const [textSize, setTextSize] = useState(28);
  const [productId, setProductId] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [textPos, setTextPos] = useState({ x: 50, y: 50 });

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragStart = useRef<{ pointerId: number; x: number; y: number; pos: { x: number; y: number } } | null>(null);
  const pinchStart = useRef<{ distance: number; size: number } | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const MAX_CHARS = 40;

  const hasMedia = !!initialMedia;
  const isVideo = initialMedia?.type === "video";

  useEffect(() => {
    return () => {
      if (initialMedia) URL.revokeObjectURL(initialMedia.url);
    };
  }, [initialMedia]);

  function startTextGesture(e: React.PointerEvent) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragStart.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, pos: textPos };
      return;
    }
    if (pointers.current.size >= 2) {
      const [first, second] = Array.from(pointers.current.values());
      pinchStart.current = { distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)), size: textSize };
      dragStart.current = null;
    }
  }

  function endTextGesture(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      dragStart.current = null;
      pinchStart.current = null;
    } else if (pointers.current.size === 1) {
      const [pointerId, point] = Array.from(pointers.current.entries())[0];
      dragStart.current = { pointerId, x: point.x, y: point.y, pos: textPos };
      pinchStart.current = null;
    }
  }

  function onMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size >= 2 && pinchStart.current) {
      const [first, second] = Array.from(pointers.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      setTextSize(Math.min(42, Math.max(18, pinchStart.current.size * distance / pinchStart.current.distance)));
      return;
    }

    if (!canvasRef.current || dragStart.current?.pointerId !== e.pointerId) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = dragStart.current.pos.x + ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const y = dragStart.current.pos.y + ((e.clientY - dragStart.current.y) / rect.height) * 100;
    setTextPos({ x: Math.min(90, Math.max(10, x)), y: Math.min(90, Math.max(10, y)) });
  }

  async function publish() {
    const t = text.trim();
    if (!hasMedia && !t) {
      setErr("اكتب نصاً أو أضف وسائط");
      return;
    }

    setBusy(true);
    setErr("");
    setProgress(15);

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;
    let mediaType: "text" | "image" | "video" = "text";

    if (initialMedia) {
      const mimeType = initialMedia.blob.type.split(";")[0]?.trim().toLowerCase() ?? "";
      const format = Object.hasOwn(STORY_MEDIA_FORMATS, mimeType)
        ? STORY_MEDIA_FORMATS[mimeType as keyof typeof STORY_MEDIA_FORMATS]
        : null;
      if (!format || initialMedia.blob.size > MAX_MEDIA_BYTES || format.type !== initialMedia.type) {
        setErr("نوع الملف غير مدعوم أو يتجاوز الحد المسموح (50 ميغابايت).");
        toast.error("نوع الملف غير مدعوم أو يتجاوز الحد المسموح (50 ميغابايت).");
        setBusy(false);
        setProgress(0);
        return;
      }
      const path = `${profile.id}/${Date.now()}.${format.extension}`;
      setProgress(35);
      const { error: upErr } = await supabase.storage
        .from("stories")
        .upload(path, initialMedia.blob, { contentType: mimeType });
      if (upErr) {
        setErr(`تعذّر رفع الملف: ${upErr.message}`);
        toast.error(`تعذّر رفع الملف: ${upErr.message}`);
        setBusy(false);
        setProgress(0);
        return;
      }
      setProgress(75);
      const { data } = supabase.storage.from("stories").getPublicUrl(path);
      if (format.type === "video") {
        videoUrl = data.publicUrl;
        mediaType = "video";
      } else {
        imageUrl = data.publicUrl;
        mediaType = "image";
      }
    }

    setProgress(90);
    const { data: inserted, error } = await supabase
      .from("stories")
      .insert({
        merchant_id: profile.id,
        text: t,
        bg_color: encodeStoryAppearance({ background: color, textColor, textStyle, textSize, ...textPos }),
        image_url: imageUrl,
        video_url: videoUrl,
        media_type: mediaType,
        product_id: productId || null,
      })
      .select("id")
      .single();

    setProgress(100);

    if (error || !inserted) {
      setErr(`تعذّر النشر: ${error?.message ?? "خطأ غير معروف"}`);
      toast.error("تعذّر نشر القصة، حاول مجدداً");
      setBusy(false);
      setProgress(0);
      return;
    }

    setTimeout(() => {
      setBusy(false);
      toast.success("تم نشر القصة");
      onPublished(inserted.id);
    }, 200);
  }

  return (
    <div className="fixed inset-0 z-[60] isolate bg-black flex items-center justify-center">
      <div className="relative w-full h-full md:max-w-[400px] md:h-[88vh] md:rounded-[28px] overflow-hidden bg-black flex flex-col">
        {/* منطقة القصة */}
        <div
          ref={canvasRef}
          onPointerMove={onMove}
          onPointerUp={endTextGesture}
          onPointerCancel={endTextGesture}
          className="absolute inset-0"
          style={{ background: hasMedia ? "#000" : color }}
        >
          {hasMedia && !isVideo && (
            <img src={initialMedia!.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {hasMedia && isVideo && (
            <video
              ref={videoPreviewRef}
              src={initialMedia!.url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          )}

          {hasMedia && (
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/50" />
          )}

          <div
            onPointerDown={startTextGesture}
            className="absolute cursor-move select-none touch-none w-[84%] max-w-[280px] z-[1]"
            style={{ left: `${textPos.x}%`, top: `${textPos.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="اكتب هنا"
              rows={2}
              dir="auto"
              ref={textInputRef}
              className={`w-full resize-none text-center leading-relaxed outline-none transition-[font-size] duration-100 ${
                textStyle === "strong" ? "font-black" : "font-semibold"
              } ${textStyle === "label" ? "rounded-xl px-3 py-2" : "bg-transparent px-1 py-0.5"} ${textColor.toLowerCase() === "#111111" ? "placeholder:text-black/65" : "placeholder:text-white/85"}`}
              style={{
                color: textColor,
                fontSize: textSize,
                lineHeight: textStyle === "label" ? 1.45 : 1.35,
                padding: textStyle === "label" ? "0.5rem 0.75rem" : "0.1rem 0.15rem",
                background: textStyle === "label" ? "rgba(0,0,0,0.6)" : undefined,
                textShadow:
                  textStyle === "label"
                    ? "none"
                    : textColor.toLowerCase() === "#111111"
                      ? "0 1px 8px rgba(255,255,255,0.8)"
                      : "0 2px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.95)",
              }}
            />
          </div>
        </div>

        {/* الشريط العلوي */}
        <div className="relative z-20 flex items-center justify-between px-4 pt-4">
          <button
            onClick={onBack}
            aria-label="رجوع"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <ChevronRight size={20} />
          </button>

          <div className="flex min-w-0 items-center gap-2 text-white">
            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-black/55 text-sm font-semibold shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              ) : (
                (profile.store_name ?? profile.full_name ?? profile.username ?? "؟").charAt(0)
              )}
            </span>
            <span className="max-w-28 truncate text-xs font-semibold">
              {profile.store_name ?? profile.full_name ?? profile.username ?? "قصتي"}
            </span>
          </div>

          <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-[10px] text-white" dir="ltr">
            {text.length}/{MAX_CHARS}
          </span>

          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* الأدوات الجانبية */}
        <div className="absolute top-20 left-4 z-20 flex flex-col items-center gap-3">
          {!hasMedia && (
            <button
              type="button"
              onClick={() => {
                const current = STORY_COLORS.indexOf(color);
                setColor(STORY_COLORS[(current + 1) % STORY_COLORS.length]);
              }}
              aria-label="تغيير لون الخلفية"
              title="تغيير لون الخلفية"
              className="relative size-11 overflow-hidden rounded-full border-2 border-white shadow-lg transition-transform active:scale-90"
              style={{ background: color }}
            >
              <RefreshCw size={16} className="absolute bottom-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white" />
            </button>
          )}

          {products.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowProducts((v) => !v)}
                aria-label="ربط منتج"
                className={`w-11 h-11 rounded-full backdrop-blur-md flex items-center justify-center transition shadow-lg ${
                  productId ? "bg-white text-black" : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                <Tag size={19} />
              </button>

              {showProducts && (
                <div className="absolute left-14 top-0 bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl z-30 w-48 max-h-56 overflow-y-auto">
                  <button
                    onClick={() => {
                      setProductId("");
                      setShowProducts(false);
                    }}
                    className="text-right px-3 py-2 rounded-xl text-xs text-white/70 hover:bg-white/10 flex items-center justify-between"
                  >
                    بدون منتج
                    {!productId && <Check size={13} />}
                  </button>
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setProductId(p.id);
                        setShowProducts(false);
                      }}
                      className="text-right px-3 py-2 rounded-xl text-xs text-white hover:bg-white/10 flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{p.title}</span>
                      {productId === p.id && <Check size={13} className="shrink-0 text-amber-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => {
                setTextStyle("classic");
                textInputRef.current?.focus();
              }}
              aria-label="كتابة النص بالخط العادي"
              title="كتابة النص بالخط العادي"
              className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition shadow-lg"
            >
              <Pencil size={18} />
            </button>
          </div>
        </div>

        {/* الجزء السفلي */}
        <div className="relative z-20 mt-auto pb-24 pt-3 flex flex-col gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent md:pb-6">
          <div className="mx-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5">
              {STORY_TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  aria-label={`لون النص ${c}`}
                  className="w-5 h-5 rounded-full border border-white/50 transition-transform"
                  style={{
                    background: c,
                    transform: textColor === c ? "scale(1.2)" : "scale(1)",
                    boxShadow: textColor === c ? "0 0 0 2px #fff" : "none",
                  }}
                />
              ))}
            </div>

            <div className="h-7 w-px bg-white/20" />

            <label className="flex min-w-0 flex-1 items-center gap-2 text-[10px] text-white/80">
              <span className="shrink-0">حجم النص</span>
              <input
                type="range"
                min={18}
                max={42}
                value={textSize}
                onChange={(event) => setTextSize(Number(event.target.value))}
                aria-label="حجم نص القصة"
                className="h-1.5 min-w-0 flex-1 cursor-pointer accent-white"
              />
            </label>

            <button
              type="button"
              onClick={() => setTextPos({ x: 50, y: 50 })}
              aria-label="توسيط النص"
              title="توسيط النص"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <Crosshair size={16} />
            </button>
          </div>

          {err && (
            <p className="mx-4 text-xs text-red-300 bg-red-500/20 backdrop-blur-md rounded-xl px-3 py-2 text-center border border-red-500/30">
              {err}
            </p>
          )}

          <button
            onClick={publish}
            disabled={busy}
            className="mx-4 h-12 rounded-full bg-white text-black text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 shadow-xl hover:bg-neutral-100 transition active:scale-[0.98]"
          >
            {busy ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جارٍ النشر… {progress}%</span>
              </>
            ) : (
              <span>مشاركة القصة</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
