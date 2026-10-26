"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MessageCircle } from "lucide-react";

type MessageNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  target_type: string | null;
  target_id: string | null;
  actor_avatar_url: string | null;
  created_at: string;
};

let lastMessageSoundAt = 0;

function displayTime(value: string) {
  return new Date(value).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });
}

export function MessageNotificationListener({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`message-notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        ({ new: raw }) => {
          const notification = raw as MessageNotification;
          if (
            !["message", "call"].includes(notification.type) ||
            notification.target_type !== "conversation" ||
            !notification.target_id
          ) return;
          if (document.visibilityState !== "visible") return;
          if (pathname === `/chat/${notification.target_id}`) return;

          const now = Date.now();
          if (now - lastMessageSoundAt >= 2000) {
            lastMessageSoundAt = now;
            const audio = new Audio("/sounds/notification.wav");
            void audio.play().catch((error: unknown) => {
              console.warn("Could not play the message notification sound", error);
            });
          }

          toast.custom((toastId) => (
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastId);
                router.push(`/chat/${notification.target_id}`);
              }}
              className="surface-card flex w-[calc(100vw-2rem)] max-w-md items-center gap-3 border-e-4 border-e-primary p-3 text-right text-ink shadow-float transition-colors hover:bg-secondary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={`${notification.title}: ${notification.body}`}
            >
              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-chip">
                {notification.actor_avatar_url ? (
                  <img src={notification.actor_avatar_url} alt="" className="size-full object-cover" />
                ) : (
                  <MessageCircle size={19} className="text-primary" aria-hidden="true" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold leading-5">{notification.title}</span>
                  <time className="shrink-0 text-[10px] text-muted">{displayTime(notification.created_at)}</time>
                </span>
                <span className="line-clamp-2 text-xs leading-5 text-muted">{notification.body}</span>
              </span>
            </button>
          ), { duration: 8000, position: "top-center" });
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("Could not subscribe to message notifications", error);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [pathname, router, userId]);

  return null;
}
