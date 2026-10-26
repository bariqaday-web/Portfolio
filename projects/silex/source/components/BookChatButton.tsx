"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createConversation, sendMessage } from "@/lib/chat";

type CartItemMeta = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty?: number;
  color?: string | null;
  size?: string | null;
};

function itemMessage(it: CartItemMeta) {
  return `🛍️ ${it.name}`;
}

function isMissingMessageMetaColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const details = error as { message?: unknown; code?: unknown };
  const message = typeof details.message === "string" ? details.message.toLowerCase() : "";
  return (
    (message.includes("messages") && message.includes("meta") &&
      (message.includes("could not find") || message.includes("does not exist"))) ||
    (details.code === "PGRST204" && message.includes("meta"))
  );
}

export function BookChatButton({
  merchantId,
  message,
  productId,
  items,
  beforeSend,
  afterSend,
  label = "حجز بالدردشة",
  className = "",
}: {
  merchantId: string;
  message?: string;
  productId?: string;
  items?: CartItemMeta[];
  beforeSend?: (userId: string) => Promise<unknown>;
  afterSend?: (userId: string) => void;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id;
      if (!uid) return router.push("/login");
      if (uid === merchantId) {
        toast.error("لا يمكنك مراسلة نفسك أو حجز منتجات متجرك");
        return;
      }
      await beforeSend?.(uid);
      const convId = await createConversation(uid, merchantId);

      if (items && items.length > 0) {
        for (const it of items) {
          try {
            await sendMessage(
              uid,
              convId,
              itemMessage(it),
              undefined,
              undefined,
              undefined,
              {
                type: "product",
                id: it.id,
                name: it.name,
                price: it.price,
                image: it.image,
                qty: it.qty ?? 1,
                color: it.color ?? null,
                size: it.size ?? null,
              }
            );
          } catch (error) {
            if (!isMissingMessageMetaColumn(error)) throw error;
            const details = [
              `🛍️ ${it.name}`,
              `السعر: $${it.price} · الكمية: ${it.qty ?? 1}`,
              it.color ? `اللون: ${it.color}` : "",
              it.size ? `المقاس: ${it.size}` : "",
              it.image,
              `${window.location.origin}/product/${it.id}`,
            ].filter(Boolean).join("\n");
            await sendMessage(uid, convId, details);
          }
        }
        if (message) {
          await sendMessage(uid, convId, message);
        }
        afterSend?.(uid);
        router.push(`/chat/${convId}`);
        return;
      }

      const q = new URLSearchParams();
      if (message) q.set("draft", message.replace(/\n+/g, " — ").slice(0, 1000));
      if (productId) q.set("product", productId);
      const qs = q.toString();
      router.push(`/chat/${convId}${qs ? `?${qs}` : ""}`);
    } catch (e) {
      console.error("Could not complete the cart chat order", e);
      toast.error("تعذّر إرسال الطلب إلى الدردشة. تحقّق من اتصالك وحاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy} aria-busy={busy} className={`${className} disabled:opacity-60`}>
      {busy ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <MessageCircle size={15} />}
      <span>{busy ? "جارٍ تجهيز الحجز..." : label}</span>
    </button>
  );
}
