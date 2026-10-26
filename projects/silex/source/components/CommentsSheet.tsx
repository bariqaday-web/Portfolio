"use client";

import { askReportReason } from "@/components/askReportReason";
import { VerifiedBadge, verifiedOf } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Drawer } from "vaul";
import { Send, User as UserIcon, Trash2, Flag, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createConversation, sendMessage } from "@/lib/chat";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionMenu, ActionMenuItem } from "@/components/ui/ActionMenu";
import { submitReport } from "@/lib/report";

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} د`;
  if (diffHour < 24) return `منذ ${diffHour} س`;
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  if (diffWeek < 5) return `منذ ${diffWeek} أسبوع`;
  return date.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: { full_name: string | null; username: string | null; avatar_url: string | null; verified_at?: string | null } | null;
};

export function CommentsSheet({
  postId,
  merchantId,
  postTitle,
  postCaption,
  open,
  onOpenChange,
  comments,
  setComments,
  viewer,
}: {
  postId: string;
  merchantId: string;
  postTitle: string | null;
  postCaption: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  comments: Comment[];
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>;
  viewer: any;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  async function send() {
    if (!viewer) {
      router.push("/login");
      return;
    }
    const t = text.trim();
    if (!t) return;
    const { data, error } = await supabase
      .from("post_comments")
      .insert({ post_id: postId, user_id: viewer.id, content: t })
      .select("id, user_id, content, created_at, author:profiles_public!user_id(full_name, username, avatar_url, verified_at)")
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      setText("");
      if (viewer.id !== merchantId && isQuestion(t)) {
        try {
          const conversationId = await createConversation(viewer.id, merchantId);
          await sendMessage(viewer.id, conversationId, t, undefined, undefined, undefined, {
            type: "post",
            title: postTitle ?? "",
            caption: postCaption ?? "",
          });
          toast.success("تم إرسال سؤالك للمتجر عبر المحادثة");
        } catch (messageError) {
          console.error("Could not forward post question to the store assistant", messageError);
          toast.error("تم نشر تعليقك، لكن تعذّر إرسال السؤال للمحادثة");
        }
      }
    } else {
      toast.error("تعذّر نشر التعليق");
    }
  }

  function isQuestion(value: string) {
    return /[؟?]|(?:^|\s)(?:كم|بكم|شكد|شلون|كيف|وين|منين|هل|شنو|ماذا|متى|ممكن|متوفر|موجود|موجودة|عندكم|باقي|السعر|سعر|توصيل|يوصل|مقاس|لون)(?:\s|$)/i.test(value);
  }

  async function deleteComment(commentId: string) {
    setDeleteTargetId(commentId);
  }

  async function confirmDeleteComment() {
    if (!deleteTargetId) return;
    const commentId = deleteTargetId;
    setDeleteTargetId(null);
    const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("تم حذف التعليق");
    } else {
      toast.error("تعذّر حذف التعليق");
    }
  }

  function startEdit(c: Comment) {
    setEditingId(c.id);
    setEditText(c.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(commentId: string) {
    const t = editText.trim();
    if (!t) return;
    const { error } = await supabase.from("post_comments").update({ content: t }).eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: t } : c)));
      setEditingId(null);
      setEditText("");
      toast.success("تم حفظ تعديل التعليق");
    } else {
      toast.error("تعذّر حفظ التعديل");
    }
  }

  async function reportComment(c: Comment) {
    if (!viewer) {
      router.push("/login");
      return;
    }
    const reason = await askReportReason();
    if (!reason?.trim()) return;
    try {
      const submitted = await submitReport(
        "comment",
        c.id,
        reason.trim(),
        `نص التعليق: ${c.content.slice(0, 200)} | المنشور: ${postId}`,
      );
      if (!submitted) {
        toast.error("تعذر إرسال البلاغ");
        return;
      }
      toast.success("تم إرسال البلاغ، شكراً لك");
    } catch (error) {
      console.error("Could not submit comment report", error);
      toast.error("تعذر إرسال البلاغ");
    }
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="bg-paper flex flex-col rounded-t-2xl fixed bottom-0 left-0 right-0 max-h-[80vh] z-50 mx-auto max-w-lg md:bottom-auto md:top-[12vh] md:max-h-[76vh] md:rounded-2xl">
          {/* مقبض السحب */}
          <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-chip" />

          <Drawer.Title className="text-sm font-display text-center py-3 border-b border-chip">
            التعليقات
          </Drawer.Title>

          {/* قائمة التعليقات - تمرير داخلي فقط */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted text-center py-10">لا توجد تعليقات بعد، كن أول من يعلّق</p>
            ) : (
              comments.map((c) => {
                const isCommentOwner = viewer?.id === c.user_id;
                const isEditing = editingId === c.id;
                return (
                  <div key={c.id} className="relative bg-card rounded-xl p-3 border border-chip">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-chip flex items-center justify-center overflow-hidden">
                          {c.author?.avatar_url ? (
                            <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={11} className="text-ink/40" />
                          )}
                        </div>
                        <p className="text-xs font-semibold">
                          {c.author?.full_name ?? c.author?.username ?? "مستخدم"}<VerifiedBadge show={verifiedOf(c.author)} size={12} className="mr-1 align-middle" />
                        </p>
                        <span className="text-[10px] text-muted">{timeAgo(c.created_at)}</span>
                      </div>

                      {!isEditing && (
                        <ActionMenu label="خيارات التعليق" triggerClassName="size-8 shrink-0 translate-x-1">
                          {isCommentOwner ? (
                            <>
                              <ActionMenuItem icon={Pencil} onSelect={() => startEdit(c)}>
                                تعديل
                              </ActionMenuItem>
                              <ActionMenuItem icon={Trash2} destructive onSelect={() => deleteComment(c.id)}>
                                حذف
                              </ActionMenuItem>
                            </>
                          ) : (
                            <ActionMenuItem icon={Flag} onSelect={() => void reportComment(c)}>
                              إبلاغ
                            </ActionMenuItem>
                          )}
                        </ActionMenu>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(c.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          autoFocus
                          className="flex-1 bg-chip rounded-full px-3 py-1.5 text-xs outline-none"
                        />
                        <button
                          onClick={() => saveEdit(c.id)}
                          disabled={!editText.trim()}
                          className="w-6 h-6 rounded-full bg-ink flex items-center justify-center text-white disabled:opacity-50"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-6 h-6 rounded-full bg-chip flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-ink/80 leading-relaxed">{c.content}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* شريط الكتابة - ثابت أسفل النافذة */}
          <div className="sticky bottom-0 bg-card border-t border-chip px-4 py-3">
            {viewer ? (
              <div className="flex items-center gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder="أضف تعليقاً..."
                  className="flex-1 bg-chip rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted"
                />
                <button
                  onClick={send}
                  disabled={!text.trim()}
                  className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-white disabled:opacity-50 hover:bg-ink/90"
                >
                  <Send size={16} />
                </button>
              </div>
            ) : (
              <Link href="/login" className="block text-center text-sm text-muted py-2">
                سجل الدخول لإضافة تعليق
              </Link>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حذف التعليق؟</DialogTitle>
            <DialogDescription>سيتم حذف هذا التعليق نهائياً ولا يمكن التراجع عنه.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteTargetId(null)}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={confirmDeleteComment}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              حذف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Drawer.Root>
  );
}
