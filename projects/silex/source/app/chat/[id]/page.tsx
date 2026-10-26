"use client";

import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, X, ShieldAlert, Flag, User as UserIcon, Trash2, Reply, Mic, Phone, Video, Play, CircleAlert } from "lucide-react";
import {
  getMessages,
  sendMessage,
  deleteMessage,
  markAsRead,
  subscribeToMessages,
  clearConversation,
  ChatMessage,
} from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { useCall } from "@/components/CallProvider";
import { ChatImage } from "@/components/ChatImage";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { VoiceMessage } from "@/components/VoiceMessage";
import { getProduct } from "@/lib/catalog";
import { parseStoryAppearance, type Story, type StoryMerchant } from "@/lib/types";
import { StoryViewer } from "@/components/StoryViewer";
import { ActionMenu, ActionMenuItem } from "@/components/ui/ActionMenu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REPORT_REASONS = ["محتوى غير لائق", "إزعاج أو تحرش", "احتيال أو نصب", "سبب آخر"];

const QUICK_REPLIES = ["كم السعر؟", "هل متوفر؟", "كم مدة التوصيل؟", "هل يوجد خصم؟"];

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const convId = params.id as string;
  const { startCall, inCall } = useCall();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [isCustomer, setIsCustomer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"image" | "video" | null>(null);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [quickRepliesDismissed, setQuickRepliesDismissed] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [attachStory, setAttachStory] = useState<{ id: string; text: string; bg: string; image: string | null } | null>(null);
  const [storyStatus, setStoryStatus] = useState<Record<string, "unavailable">>({});
  const [activeStory, setActiveStory] = useState<{ story: Story; merchant: StoryMerchant } | null>(null);
  const [attachProduct, setAttachProduct] = useState<{ id: string; name: string; price: number; image: string } | null>(null);
  const [partnerVerified, setPartnerVerified] = useState(false);
  const [partner, setPartner] = useState<{
    id: string;
    name: string;
    avatar: string | null;
  } | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationPresenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let presenceChannels: ReturnType<typeof supabase.channel>[] = [];
    let alive = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !alive) return;
      setUserId(user.id);
      try {
        const sp = new URLSearchParams(window.location.search);
        const pid = sp.get("product");
        if (pid) {
          getProduct(pid).then((pr) => {
            if (pr) setAttachProduct({ id: pr.id, name: pr.name, price: pr.price, image: pr.image });
          });
        }
        const sid = sp.get("story");
        if (sid) {
          supabase
            .from("stories")
            .select("id, text, bg_color, image_url, expires_at")
            .eq("id", sid)
            .maybeSingle()
            .then(({ data: st }) => {
              if (st) {
                setAttachStory({ id: st.id, text: st.text ?? "", bg: st.bg_color, image: st.image_url });
                if (new Date(st.expires_at).getTime() <= Date.now()) {
                  setStoryStatus((current) => ({ ...current, [st.id]: "unavailable" }));
                }
              }
            });
        }
        const d = sp.get("draft");
        if (d) {
          setText(d.slice(0, 1000));
          window.history.replaceState(null, "", window.location.pathname);
        }
      } catch {}

      const { data: conv } = await supabase
        .from("conversations")
        .select("customer_id, merchant_id, customer:profiles_public!customer_id(id, full_name, username, avatar_url, store_name, verified_at), merchant:profiles_public!merchant_id(id, full_name, username, avatar_url, store_name, verified_at)")
        .eq("id", convId)
        .maybeSingle();

      if (conv && alive) {
        setIsCustomer((conv as any).customer_id === user.id);
        const other = (conv as any).customer_id === user.id ? (conv as any).merchant : (conv as any).customer;
        if (other) {
          setPartner({
            id: other.id,
            name: other.store_name || other.full_name || other.username || "مستخدم",
            avatar: other.avatar_url,
          });
          setPartnerVerified(!!other.verified_at);

          const roomChannel = supabase
            .channel(`conversation-presence:${convId}`, {
              config: { private: true, presence: { key: user.id } },
            })
            .on("presence", { event: "sync" }, () => {
              const state = roomChannel.presenceState<Record<string, unknown>>();
              const partnerPresence = state[other.id] ?? [];
              setPartnerTyping(partnerPresence.some((presence) => presence.typing === true));
            })
            .on("broadcast", { event: "assistant-typing" }, ({ payload }) => {
              if (payload?.userId === other.id) {
                setAssistantTyping(payload.isTyping === true);
              }
            })
            .subscribe((status, error) => {
              if (status === "SUBSCRIBED") {
                void roomChannel.track({ typing: false });
              } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.error("Could not subscribe to conversation presence", error);
              }
            });
          const partnerPresenceChannel = supabase
            .channel(`user-presence:${other.id}`, {
              config: { private: true, presence: { key: other.id } },
            })
            .on("presence", { event: "sync" }, () => {
              const state = partnerPresenceChannel.presenceState();
              setPartnerOnline(Boolean(state[other.id]?.length));
            })
            .subscribe((status, error) => {
              if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                console.error("Could not subscribe to partner presence", error);
              }
            });
          conversationPresenceRef.current = roomChannel;
          presenceChannels = [roomChannel, partnerPresenceChannel];
        }
      }

      let msgs: ChatMessage[] = [];
      try {
        msgs = await getMessages(convId, user.id);
      } catch (error) {
        console.error("Could not load conversation messages", error);
        toast.error("تعذّر تحميل المحادثة");
      }
      if (!alive) return;
      setMessages(msgs);
      setMessagesLoaded(true);
      setQuickRepliesDismissed(msgs.some((message) => message.sender_id === user.id));
      await markAsRead(convId, user.id);

      const channel = subscribeToMessages(
        convId,
        (newMsg) => {
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          markAsRead(convId, user.id);
        },
        (updated) => {
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      );

      unsub = () => channel.unsubscribe();
    }

    init();
    return () => {
      alive = false;
      unsub?.();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      conversationPresenceRef.current = null;
      presenceChannels.forEach((channel) => {
        void channel.untrack();
        void supabase.removeChannel(channel);
      });
    };
  }, [convId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    };
  }, [mediaPreview]);

  function handlePickMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const kind = f.type.startsWith("video") ? "video" : "image";
    setMediaFile(f);
    setMediaKind(kind);
    setMediaPreview(URL.createObjectURL(f));
    setMediaPreviewOpen(true);
  }

  function clearSelectedMedia() {
    setMediaFile(null);
    setMediaPreview(null);
    setMediaKind(null);
    setMediaPreviewOpen(false);
  }

  function updateTyping(value: string) {
    setText(value);
    const channel = conversationPresenceRef.current;
    if (!channel || !userId) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    void channel.track({ typing: value.trim().length > 0 });
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        void channel.track({ typing: false });
      }, 1500);
    }
  }

  async function handleSend() {
    if ((!text.trim() && !mediaFile && !attachProduct && !attachStory) || !userId || sending) return;
    setSending(true);
    const value = text || (attachProduct ? `🛍️ ${attachProduct.name}` : attachStory ? "📖 رد على قصة" : "");
    const reply = replyTo?.id;
    const file = mediaFile;
    const kind = mediaKind;
    const prod = attachProduct;
    const stor = attachStory;
    const optimisticId = `optimistic:${crypto.randomUUID()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      conversation_id: convId,
      sender_id: userId,
      content: value || (kind === "video" ? "🎥 فيديو" : kind === "image" ? "📷 صورة" : ""),
      media_type: kind,
      media_url: null,
      reply_to_id: reply ?? null,
      meta: prod
        ? { type: "product", id: prod.id, name: prod.name, price: prod.price, image: prod.image }
        : stor
          ? { type: "story", id: stor.id, text: stor.text, bg: stor.bg, image: stor.image }
          : undefined,
      optimisticPreview: file ? mediaPreview ?? undefined : undefined,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimisticMessage]);

    try {
      let mediaPath: string | undefined;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${convId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat").upload(path, file);
        if (upErr) throw upErr;
        mediaPath = path;
      }

      const sentMessage = await sendMessage(
        userId,
        convId,
        value || (kind === "video" ? "🎥 فيديو" : kind === "image" ? "📷 صورة" : ""),
        mediaPath,
        kind ?? undefined,
        reply,
        prod ? { type: "product", id: prod.id, name: prod.name, price: prod.price, image: prod.image } : stor ? { type: "story", id: stor.id, text: stor.text, bg: stor.bg, image: stor.image } : undefined
      );
      setMessages((current) =>
        current.some((message) => message.id === sentMessage.id)
          ? current.filter((message) => message.id !== optimisticId)
          : current.map((message) => message.id === optimisticId ? sentMessage : message)
      );
      setText("");
      void conversationPresenceRef.current?.track({ typing: false });
      setReplyTo(null);
      clearSelectedMedia();
      setAttachProduct(null);
      setAttachStory(null);
      setQuickRepliesDismissed(true);
    } catch (err: any) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      toast.error(err.message || "حدث خطأ أثناء الإرسال");
    } finally {
      setSending(false);
    }
  }

  async function handleSendVoice(blob: Blob, duration: number) {
    if (!userId) return;
    setSending(true);
    setShowRecorder(false);
    try {
      const mime = (blob.type || "audio/webm").split(";")[0];
      const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const path = `${convId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat").upload(path, blob, { contentType: mime });
      if (upErr) throw upErr;
      await sendMessage(userId, convId, "🎤 رسالة صوتية", path, "audio", replyTo?.id);
      setQuickRepliesDismissed(true);
      setReplyTo(null);
    } catch (err: any) {
      toast.error(err.message || "تعذّر إرسال الرسالة الصوتية");
    } finally {
      setSending(false);
    }
  }

  async function confirmDelete() {
    if (!userId || !deleteTarget) return;
    await deleteMessage(deleteTarget, userId);
    setMessages((prev) => prev.filter((m) => m.id !== deleteTarget));
    setDeleteTarget(null);
  }

  async function handleClearChat() {
    if (!userId) return;
    setConfirmAction({
      title: "حذف المحادثة؟",
      description: "سيتم حذف هذه المحادثة من عندك فقط، ولن تظهر لك بعد الآن. هل تريد المتابعة؟",
      confirmLabel: "حذف",
      destructive: true,
      onConfirm: async () => {
        await clearConversation(convId, userId);
        toast.success("تم حذف المحادثة من قائمتك");
        router.push("/chat");
      },
    });
  }

  async function handleBlock() {
    if (!userId || !partner) return;
    setConfirmAction({
      title: "حظر المستخدم؟",
      description: `هل تريد حظر ${partner.name}؟ سيتم إخفاء المحادثة من قائمة الدردشات الخاصة بك.`,
      confirmLabel: "حظر",
      destructive: true,
      onConfirm: async () => {
        const { error } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: partner.id });
        if (error) {
          toast.error("تعذّر الحظر، حاول مجدداً");
          return;
        }
        toast.success("تم حظر المستخدم");
        router.push("/chat");
      },
    });
  }

  async function submitReport() {
    if (!userId || !partner) return;
    const reason = reportDetails.trim() ? `${reportReason}: ${reportDetails.trim()}` : reportReason;
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_id: partner.id,
      conversation_id: convId,
      reason,
    });
    setShowReport(false);
    setReportDetails("");
    if (error) {
      toast.error("تعذّر إرسال البلاغ، حاول مجدداً");
      return;
    }
    toast.success("تم إرسال البلاغ، شكراً لك");
  }

  function findMessage(id: string | null | undefined) {
    return id ? messages.find((m) => m.id === id) : undefined;
  }

  async function openReferencedStory(storyId: string | undefined) {
    if (!storyId || storyStatus[storyId]) return;
    const { data: story, error } = await supabase
      .from("stories")
      .select("id, merchant_id, text, bg_color, image_url, video_url, media_type, product_id, created_at, expires_at")
      .eq("id", storyId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) {
      console.error("Could not open story from chat", error);
      toast.error("تعذّر فتح القصة، تحقق من الاتصال وحاول مجدداً");
      return;
    }
    if (!story) {
      setStoryStatus((current) => ({ ...current, [storyId]: "unavailable" }));
      toast.info("انتهت القصة أو لم تعد متاحة");
      return;
    }

    const { data: owner, error: ownerError } = await supabase
      .from("profiles_public")
      .select("id, full_name, username, avatar_url, whatsapp, store_name")
      .eq("id", story.merchant_id)
      .maybeSingle();
    if (ownerError || !owner) {
      console.error("Could not load story owner", ownerError);
      toast.error("تعذّر فتح القصة، حاول مجدداً");
      return;
    }
    setActiveStory({
      story: story as Story,
      merchant: owner as StoryMerchant,
    });
  }

  return (
    <div className="max-w-2xl mx-auto h-screen bg-paper text-ink flex flex-col dir-rtl">
      <div className="p-3 border-b border-line/40 bg-paper/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-chip flex items-center justify-center shrink-0">
            ➔
          </button>
          {partner && (
            <Link href={`/u/${partner.id}`} className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 rounded-full bg-chip overflow-hidden flex items-center justify-center shrink-0">
                {partner.avatar ? (
                  <img src={partner.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={16} className="text-ink/40" />
                )}
                {partnerOnline && (
                  <span
                    title="متصل الآن"
                    aria-label="متصل الآن"
                    className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-paper bg-emerald-500"
                  />
                )}
              </div>
              <span className="flex min-w-0 flex-col">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-semibold text-sm">{partner.name}</span>
                  <VerifiedBadge show={partnerVerified} size={14} />
                </span>
                <span className={`text-[10px] leading-4 ${partnerOnline ? "text-emerald-600" : "text-muted"}`}>
                  {partnerTyping
                    ? "يكتب الآن..."
                    : assistantTyping
                      ? "المساعد يكتب الآن..."
                      : partnerOnline
                        ? "متصل الآن"
                        : "غير متصل"}
                </span>
              </span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {partner && (
            <>
              <button
                onClick={() => startCall({ conversationId: convId, calleeId: partner.id, kind: "voice" })}
                disabled={inCall}
                className="w-9 h-9 rounded-full bg-chip flex items-center justify-center disabled:opacity-40"
                aria-label="مكالمة صوتية"
              >
                <Phone size={16} />
              </button>
              <button
                onClick={() => startCall({ conversationId: convId, calleeId: partner.id, kind: "video" })}
                disabled={inCall}
                className="w-9 h-9 rounded-full bg-chip flex items-center justify-center disabled:opacity-40"
                aria-label="مكالمة فيديو"
              >
                <Video size={16} />
              </button>
            </>
          )}
          <ActionMenu label="خيارات المحادثة">
            <ActionMenuItem icon={Trash2} destructive onSelect={() => void handleClearChat()}>
              حذف المحادثة
            </ActionMenuItem>
            <ActionMenuItem icon={Flag} onSelect={() => setShowReport(true)}>
              إبلاغ
            </ActionMenuItem>
            <ActionMenuItem icon={ShieldAlert} destructive onSelect={() => void handleBlock()}>
              حظر المستخدم
            </ActionMenuItem>
          </ActionMenu>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!messagesLoaded ? (
          <div aria-label="جارٍ تحميل الرسائل" className="space-y-4 py-2">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className={`flex ${item % 2 ? "justify-end" : "justify-start"}`}>
                <div className={`w-3/5 space-y-2 rounded-2xl bg-chip/70 p-3 ${item % 2 ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                  <div className="h-3 w-4/5 animate-pulse rounded-full bg-line/70" />
                  <div className="h-3 w-2/5 animate-pulse rounded-full bg-line/70" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted py-10">ابدأ المحادثة الآن</p>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === userId;
            const quoted = findMessage(m.reply_to_id);
            const storyBackground = m.meta?.type === "story"
              ? parseStoryAppearance(m.meta.bg).background
              : undefined;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}>
                {m.meta?.type === "story" && (
                  <button
                    type="button"
                    onClick={() => void openReferencedStory(m.meta?.id)}
                    disabled={!m.meta?.id || !!storyStatus[m.meta.id]}
                    className={`surface-card relative mb-2 flex min-h-24 w-full max-w-[17rem] items-center gap-3 overflow-hidden p-2.5 text-right text-ink transition-colors ${
                      isMe ? "self-start" : "self-end"
                    } ${storyStatus[m.meta?.id ?? ""] ? "cursor-not-allowed opacity-80" : "hover:border-primary/30 hover:bg-secondary/40"}`}
                    aria-label={storyStatus[m.meta?.id ?? ""] ? "القصة منتهية أو غير متاحة" : "فتح القصة المشار إليها"}
                  >
                    <span
                      className="relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/50"
                      style={{ background: storyBackground }}
                    >
                      {m.meta.image && (
                        <img src={m.meta.image} alt="" className="absolute inset-0 size-full object-cover" />
                      )}
                      {!m.meta.image && (
                        <span className="line-clamp-4 px-1 text-center text-[9px] font-semibold text-white">
                          {m.meta.text || "قصة نصية"}
                        </span>
                      )}
                      {!storyStatus[m.meta?.id ?? ""] && (
                        <span className="relative flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                          <Play size={14} fill="currentColor" aria-hidden="true" />
                        </span>
                      )}
                      {storyStatus[m.meta?.id ?? ""] && (
                        <span className="relative flex size-7 items-center justify-center rounded-full bg-black/55 text-white">
                          <CircleAlert size={15} aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 py-1">
                      <span className="block text-[11px] font-bold text-primary">رد على قصة</span>
                      <span className="mt-1 line-clamp-2 block text-sm font-medium text-ink">
                        {m.meta.text || "قصة مصورة"}
                      </span>
                      <span className="mt-2 block text-[11px] font-semibold text-muted">
                        {storyStatus[m.meta?.id ?? ""] ? "انتهت القصة أو حُذفت" : "اضغط لعرض القصة"}
                      </span>
                    </span>
                  </button>
                )}
                <div
                  className={`group relative max-w-[82%] rounded-2xl p-3 text-sm leading-relaxed ${
                    isMe ? "bg-[#1e3a5f] text-white rounded-br-none" : "bg-slate-100 text-slate-800 rounded-bl-none"
                  }`}
                >
                  {quoted && (
                    <div className={`text-[11px] opacity-75 border-r-2 pr-2 mb-1.5 truncate ${isMe ? "border-white/50" : "border-ink/30"}`}>
                      {quoted.content}
                    </div>
                  )}

                  {m.media_type === "image" && m.optimisticPreview && (
                    <img src={m.optimisticPreview} alt="" className="mb-1.5 h-auto max-h-80 w-[min(72vw,18rem)] md:w-[22rem] rounded-xl object-cover" />
                  )}
                  {m.media_type === "image" && m.media_url && <ChatImage path={m.media_url} kind="image" />}
                  {m.media_type === "video" && m.optimisticPreview && (
                    <video src={m.optimisticPreview} controls className="mb-1.5 h-auto max-h-80 w-[min(72vw,18rem)] md:w-[22rem] rounded-xl object-cover" />
                  )}
                  {m.media_type === "video" && m.media_url && <ChatImage path={m.media_url} kind="video" />}
                  {m.media_type === "audio" && m.media_url && <VoiceMessage path={m.media_url} isMe={isMe} />}
                  {m.media_type === "call" && (() => {
                    const missed = m.call_status !== "completed";
                    const isVideo = m.content.includes("فيديو");
                    const CallIcon = isVideo ? Video : Phone;
                    const title = missed
                      ? m.call_status === "declined"
                        ? `مكالمة ${isVideo ? "فيديو" : "صوتية"} مرفوضة`
                        : `مكالمة ${isVideo ? "فيديو" : "صوتية"} فائتة`
                      : `مكالمة ${isVideo ? "فيديو" : "صوتية"}`;
                    const subtitle = missed
                      ? "لم يتم الرد"
                      : m.call_duration != null
                        ? `${Math.floor(m.call_duration / 60).toString().padStart(2, "0")}:${(m.call_duration % 60).toString().padStart(2, "0")}`
                        : "";
                    return (
                      <div className="flex items-center gap-2.5 min-w-[150px] py-0.5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            missed ? "bg-red-500/15" : isMe ? "bg-white/15" : "bg-ink/10"
                          }`}
                        >
                          <CallIcon size={15} className={missed ? "text-red-500" : ""} />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${missed ? "text-red-500" : ""}`}>{title}</p>
                          {subtitle && (
                            <p className={`text-[11px] mt-0.5 ${isMe ? "opacity-70" : "text-muted"}`}>{subtitle}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {m.meta?.type === "product" && (
                  <Link
                    href={`/product/${m.meta.id}`}
                    className="flex gap-2.5 bg-white/95 text-ink rounded-xl p-2 mb-2 w-56"
                  >
                    {m.meta.image ? (
                      <img src={m.meta.image} alt={m.meta.name ?? "المنتج"} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-chip shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold line-clamp-2">{m.meta.name}</p>
                      <p className="text-xs text-muted mt-1">${m.meta.price}</p>
                      {Number(m.meta.qty) > 1 && (
                        <p className="text-[11px] text-muted">الكمية: {m.meta.qty}</p>
                      )}
                      {(m.meta.color || m.meta.size) && (
                        <p className="text-[11px] text-muted">
                          {[m.meta.color && `اللون: ${m.meta.color}`, m.meta.size && `المقاس: ${m.meta.size}`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </Link>
                )}

                {m.meta?.type === "product_recommendations" && Array.isArray(m.meta.products) && (
                  <div className="mb-2 grid w-full min-w-[220px] gap-2">
                    {m.meta.products.map((product: {
                      id: string;
                      name: string;
                      price: number | null;
                      oldPrice: number | null;
                      image: string | null;
                    }) => {
                      const videoCover = Boolean(product.image && /\.(mp4|webm|mov|m4v|ogv)(?:$|[?#])/i.test(product.image));
                      return (
                        <Link
                          key={product.id}
                          href={`/product/${product.id}`}
                          className="flex min-w-0 items-center gap-2.5 rounded-xl bg-white p-2 text-ink transition hover:bg-chip"
                        >
                          <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-chip">
                            {product.image && (videoCover ? (
                              <video
                                src={product.image}
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(event) => {
                                  const video = event.currentTarget;
                                  if (video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
                                }}
                                className="size-full object-cover"
                              />
                            ) : (
                              <img src={product.image} alt="" className="size-full object-cover" />
                            ))}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block line-clamp-2 text-xs font-semibold">{product.name}</span>
                            <span className="mt-1 flex items-center gap-1.5 text-[11px]">
                              <span className="font-bold">${product.price ?? "السعر غير محدد"}</span>
                              {product.oldPrice != null && product.price != null && product.oldPrice > product.price && (
                                <span className="text-muted line-through">${product.oldPrice}</span>
                              )}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-primary px-2.5 py-1.5 text-[10px] font-semibold text-white">
                            عرض
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {m.content && m.media_type !== "call" && !(m.meta?.type === "product" && m.content === `🛍️ ${m.meta.name}`) && (
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70">
                    <span>{new Date(m.created_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}</span>
                    {isMe && <span>{m.read_at ? "✓✓" : "✓"}</span>}
                    {isMe && m.id.startsWith("optimistic:") && <span>جارٍ الإرسال</span>}
                  </div>

                </div>
                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <button
                    onClick={() => setReplyTo(m)}
                    className="flex items-center gap-1 text-[11px] text-muted border border-line/50 rounded-full px-2.5 py-1 hover:bg-chip transition"
                  >
                    <Reply size={12} />
                    رد
                  </button>
                  {isMe && (
                    <button
                      onClick={() => setDeleteTarget(m.id)}
                      className="flex items-center gap-1 text-[11px] text-red-600 border border-red-200 rounded-full px-2.5 py-1 hover:bg-red-500/5 transition"
                    >
                      <Trash2 size={12} />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="bg-chip border-t border-line/40 px-4 py-2 flex items-center justify-between text-xs text-ink/70">
          <span className="truncate">الرد على: {replyTo.content}</span>
          <button onClick={() => setReplyTo(null)} className="text-muted hover:text-ink shrink-0 mr-2">✕</button>
        </div>
      )}

      {attachStory && (
        <div className="border-t border-line/40 px-4 py-2 flex items-center gap-3">
          <div
            className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0"
            style={{ background: attachStory.bg }}
          >
            {attachStory.image && (
              <img src={attachStory.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
          </div>
          <p className="flex-1 min-w-0 text-xs text-muted truncate">رد على قصة: {attachStory.text || "صورة"}</p>
          <button onClick={() => setAttachStory(null)} className="text-muted hover:text-ink shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {attachProduct && (
        <div className="border-t border-line/40 px-4 py-2 flex items-center gap-3">
          <img src={attachProduct.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{attachProduct.name}</p>
            <p className="text-[11px] text-muted">${attachProduct.price}</p>
          </div>
          <button onClick={() => setAttachProduct(null)} className="text-muted hover:text-ink shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {mediaPreview && (
        <div className="border-t border-line/40 px-4 py-2 flex items-center gap-2">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-chip">
            {mediaKind === "video" ? (
              <video src={mediaPreview} className="w-full h-full object-cover" />
            ) : (
              <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
            )}
            <button
              onClick={clearSelectedMedia}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-xs text-muted">جاهز للإرسال</p>
        </div>
      )}

      {isCustomer && !quickRepliesDismissed && !showRecorder && (
        <div className="flex gap-2 overflow-x-auto bg-paper px-3 pt-2">
          {QUICK_REPLIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setText(q)}
              className="shrink-0 rounded-pill bg-chip px-3 py-1.5 text-xs"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-line/40 bg-paper">
        {showRecorder ? (
          <VoiceRecorder onSend={handleSendVoice} onCancel={() => setShowRecorder(false)} />
        ) : (
          <div className="flex items-center gap-2 bg-chip rounded-2xl p-1.5 focus-within:ring-1 focus-within:ring-ink/20 transition">
            <label className="p-2 text-muted hover:text-ink transition cursor-pointer shrink-0">
              <ImagePlus size={19} />
              <input type="file" accept="image/*,video/*" className="hidden" onChange={handlePickMedia} />
            </label>

            <input
              type="text"
              maxLength={1000}
              value={text}
              onChange={(e) => updateTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-transparent px-2 text-sm text-ink placeholder-muted focus:outline-none"
            />

            {text.trim() || mediaFile || attachProduct || attachStory ? (
              <button
                onClick={handleSend}
                disabled={sending}
                className="bg-ink hover:opacity-90 disabled:opacity-30 text-white font-bold p-2.5 rounded-xl text-sm transition shrink-0"
              >
                {sending ? "..." : "إرسال"}
              </button>
            ) : (
              <button onClick={() => setShowRecorder(true)} className="p-2 text-muted hover:text-ink transition shrink-0">
                <Mic size={19} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* نافذة تأكيد الحذف */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-paper rounded-3xl p-6 max-w-xs w-full text-center">
            <p className="text-sm font-semibold mb-1">حذف الرسالة؟</p>
            <p className="text-xs text-muted mb-5">لا يمكن التراجع عن هذا الإجراء</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-pill bg-chip text-sm font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-pill bg-red-600 text-white text-sm font-semibold"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmAction?.title}</DialogTitle>
            <DialogDescription>{confirmAction?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <button
              type="button"
              onClick={() => setConfirmAction(null)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!confirmAction) return;
                setConfirmAction(null);
                await confirmAction.onConfirm();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${confirmAction?.destructive ? "bg-red-600" : "bg-ink"}`}
            >
              {confirmAction?.confirmLabel}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mediaPreviewOpen} onOpenChange={(open) => !open && clearSelectedMedia()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>معاينة المرفق</DialogTitle>
            <DialogDescription>أضف تعليقاً اختيارياً أو ألغِ المرفق قبل إرساله. لن يُرفع الملف إلا عند الضغط على إرسال.</DialogDescription>
          </DialogHeader>
          {mediaPreview && (
            <div className="overflow-hidden rounded-xl bg-black/5">
              {mediaKind === "video" ? (
                <video src={mediaPreview} controls className="max-h-[55vh] w-full object-contain" />
              ) : (
                <img src={mediaPreview} alt="معاينة المرفق" className="max-h-[55vh] w-full object-contain" />
              )}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => updateTyping(e.target.value.slice(0, 1000))}
            maxLength={1000}
            rows={2}
            placeholder="أضف تعليقاً للمرفق (اختياري)"
            className="w-full resize-none rounded-xl bg-chip px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ink/10"
          />
          <DialogFooter className="sm:justify-end">
            <button
              type="button"
              onClick={clearSelectedMedia}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              إلغاء المرفق
            </button>
            <button
              type="button"
              onClick={() => setMediaPreviewOpen(false)}
              className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
            >
              متابعة
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activeStory && (
        <StoryViewer
          merchant={activeStory.merchant}
          stories={[activeStory.story]}
          viewerId={userId}
          onClose={() => setActiveStory(null)}
          onDeleted={() => {
            setStoryStatus((current) => ({ ...current, [activeStory.story.id]: "unavailable" }));
            setActiveStory(null);
          }}
        />
      )}

      {/* نافذة الإبلاغ */}
      {showReport && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div className="bg-paper w-full md:max-w-sm md:rounded-3xl rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[92dvh] overflow-y-auto">
            <h2 className="font-display text-[17px] mb-4">الإبلاغ عن {partner?.name}</h2>

            <div className="flex flex-col gap-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 bg-chip rounded-xl px-3 py-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reportReason === r}
                    onChange={() => setReportReason(r)}
                    className="accent-ink"
                  />
                  <span className="text-sm">{r}</span>
                </label>
              ))}
            </div>

            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="تفاصيل إضافية (اختياري)"
              rows={2}
              className="w-full bg-chip rounded-xl p-3 text-sm outline-none resize-none mb-4"
            />

            <div className="flex gap-2">
              <button onClick={() => setShowReport(false)} className="flex-1 py-2.5 rounded-pill bg-chip text-sm font-semibold">
                إلغاء
              </button>
              <button onClick={submitReport} className="flex-1 py-2.5 rounded-pill bg-ink text-white text-sm font-semibold">
                إرسال البلاغ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
