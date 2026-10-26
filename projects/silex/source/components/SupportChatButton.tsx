"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Headphones, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createConversation } from "@/lib/chat";
import { supabase } from "@/lib/supabase";

type SupportChatButtonProps = {
  variant?: "header" | "sidebar";
  className?: string;
};

export function SupportChatButton({ variant = "header", className = "" }: SupportChatButtonProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  async function openSupportChat() {
    if (starting) return;
    setStarting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = authData.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile) throw new Error("تعذّر التحقق من نوع الحساب");
      if (profile.role === "admin") {
        toast.info("يمكنك استقبال رسائل الدعم من صندوق المحادثات");
        router.push("/chat");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (adminError) throw adminError;
      if (!admin) {
        toast.error("الدعم الفني غير متاح حالياً، حاول مجدداً لاحقاً");
        return;
      }

      const conversationId = await createConversation(user.id, admin.id);
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Could not open support chat", error);
      toast.error("تعذّر فتح محادثة الدعم، حاول مجدداً");
    } finally {
      setStarting(false);
    }
  }

  const isSidebar = variant === "sidebar";

  return (
    <button
      type="button"
      onClick={() => void openSupportChat()}
      disabled={starting}
      aria-label="التواصل مع الدعم الفني"
      title="التواصل مع الدعم الفني"
      className={`group flex shrink-0 items-center justify-center gap-2 transition-colors disabled:cursor-wait disabled:opacity-70 ${
        isSidebar
          ? "w-full rounded-2xl border border-primary/15 bg-primary/[0.04] px-3 py-3 text-right hover:border-primary/30 hover:bg-primary/[0.07]"
          : "min-h-10 rounded-full border border-primary/20 bg-card px-1.5 text-primary hover:bg-primary/[0.05] sm:px-3"
      } ${className}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ${
          isSidebar ? "size-10" : "size-8"
        }`}
      >
        {starting ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
        ) : (
          <Headphones className="size-5" strokeWidth={2} aria-hidden="true" />
        )}
      </span>
      <span className={`min-w-0 ${isSidebar ? "flex-1" : "hidden sm:block"}`}>
        <span className={`block font-semibold ${isSidebar ? "text-sm" : "text-xs"}`}>الدعم الفني</span>
        {isSidebar && <span className="mt-0.5 block text-[11px] leading-4 text-muted">نساعدك في حل أي مشكلة</span>}
      </span>
    </button>
  );
}
