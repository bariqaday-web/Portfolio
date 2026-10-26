import { supabase } from "./supabase";
import { toast } from "sonner";
import { assertDifferentParties } from "./party-guard.ts";


export type InboxItem = {

conversation_id: string;

partner_id: string;

partner_name: string;

partner_username: string | null;

partner_avatar: string | null;
  partner_verified?: boolean;

partner_role: string;

last_message: string | null;

last_at: string | null;

unread: number;

pinned: boolean;

};


export type ChatMessage = {

id: string;

conversation_id: string;

sender_id: string;

content: string;

media_url?: string | null;

media_type?: "image" | "audio" | "video" | "file" | "call" | null;
  call_status?: "completed" | "missed" | "declined" | null;
  call_duration?: number | null;

reply_to_id?: string | null;
optimisticPreview?: string;

meta?: any;

is_pinned?: boolean;

created_at: string;

read_at?: string | null;

};


export async function getInbox(userId: string): Promise<InboxItem[]> {

const { data: convs, error: conversationsError } = await supabase

.from("conversations")

.select(

`

id,

last_message_at,

customer_id,

merchant_id,

customer_cleared_at,

merchant_cleared_at,

customer_pinned,

merchant_pinned,

customer:profiles_public!customer_id(id, full_name, username, avatar_url, role, store_name, verified_at),

merchant:profiles_public!merchant_id(id, full_name, username, avatar_url, role, store_name, verified_at)

`

)

.or(`customer_id.eq.${userId},merchant_id.eq.${userId}`)

.order("last_message_at", { ascending: false, nullsFirst: false });


if (conversationsError) throw new Error(conversationsError.message);
if (!convs) return [];


const items: InboxItem[] = [];

for (const c of convs as any[]) {

const isCustomer = c.customer_id === userId;

const partner = isCustomer ? c.merchant : c.customer;

if (!partner) continue;


const clearedAt = isCustomer ? c.customer_cleared_at : c.merchant_cleared_at;

const pinned = isCustomer ? c.customer_pinned : c.merchant_pinned;


let lastQuery = supabase

.from("messages")

.select("content, created_at")

.eq("conversation_id", c.id)

.order("created_at", { ascending: false })

.limit(1);

if (clearedAt) lastQuery = lastQuery.gt("created_at", clearedAt);

const { data: lastMsg, error: lastMessageError } = await lastQuery.maybeSingle();
if (lastMessageError) throw new Error(lastMessageError.message);


if (clearedAt && !lastMsg) continue;


let unreadQuery = supabase

.from("messages")

.select("*", { count: "exact", head: true })

.eq("conversation_id", c.id)

.neq("sender_id", userId)

.is("read_at", null);

if (clearedAt) unreadQuery = unreadQuery.gt("created_at", clearedAt);

const { count: unread, error: unreadError } = await unreadQuery;
if (unreadError) throw new Error(unreadError.message);


items.push({

conversation_id: c.id,

partner_id: partner.id,

partner_name: partner.store_name || partner.full_name || partner.username || "مستخدم",

partner_username: partner.username,

partner_avatar: partner.avatar_url,
      partner_verified: !!partner.verified_at,

partner_role: partner.role || "customer",

last_message: lastMsg?.content ?? null,

last_at: lastMsg?.created_at ?? c.last_message_at,

unread: unread ?? 0,

pinned,

});

}


return items.sort((a, b) => Number(b.pinned) - Number(a.pinned));

}


export async function getMessages(convId: string, userId?: string): Promise<ChatMessage[]> {

let query = supabase

.from("messages")

.select("*")

.eq("conversation_id", convId)

.order("created_at", { ascending: true });


if (userId) {

const { data: conv } = await supabase

.from("conversations")

.select("customer_id, customer_cleared_at, merchant_cleared_at")

.eq("id", convId)

.maybeSingle();

if (conv) {

const clearedAt = conv.customer_id === userId ? conv.customer_cleared_at : conv.merchant_cleared_at;

if (clearedAt) query = query.gt("created_at", clearedAt);

}

}


const { data } = await query;

return (data || []) as ChatMessage[];

}


export async function sendMessage(

userId: string,

convId: string,

content: string,

mediaUrl?: string,

mediaType?: "image" | "audio" | "video",

replyToId?: string,

meta?: Record<string, unknown>

) {

if (content.length > 1000) {

throw new Error("الحد الأقصى للرسالة هو 1000 حرف فقط.");

}


const { data, error } = await supabase

.from("messages")

.insert({

conversation_id: convId,

sender_id: userId,

content: content.trim(),

media_url: mediaUrl || null,

media_type: mediaType || null,

reply_to_id: replyToId || null,

meta: meta || null,

})

.select()

.single();


if (error) {

if (error.code === "42501" || error.message?.includes("row-level security")) {

throw new Error("لا يمكنك إرسال رسالة، يبدو أن أحد الطرفين قام بالحظر.");

}

throw error;

}


await supabase

.from("conversations")

.update({ last_message_at: new Date().toISOString() })

.eq("id", convId);


void maybeTriggerAssistant(convId, userId, content.trim(), meta);


return data as ChatMessage;

}


export async function deleteMessage(msgId: string, userId: string) {

await supabase.from("messages").delete().eq("id", msgId).eq("sender_id", userId);

}


export async function togglePinMessage(msgId: string, currentPinStatus: boolean) {

await supabase.from("messages").update({ is_pinned: !currentPinStatus }).eq("id", msgId);

}


export async function markAsRead(convId: string, userId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", convId)
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) console.error("markAsRead failed:", error.message);
  const { error: notificationError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("target_type", "conversation")
    .eq("target_id", convId)
    .in("type", ["message", "call"])
    .is("read_at", null);
  if (notificationError) console.error("markConversationNotificationsAsRead failed:", notificationError.message);
}


export function subscribeToMessages(
  convId: string,
  onNewMessage: (msg: ChatMessage) => void,
  onUpdateMessage?: (msg: ChatMessage) => void
) {
  return supabase
    .channel(`chat:${convId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
      (payload) => onNewMessage(payload.new as ChatMessage)
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
      (payload) => onUpdateMessage?.(payload.new as ChatMessage)
    )
    .subscribe();
}

async function startAssistantTyping(conversationId: string, merchantId: string) {
  const channel = supabase.channel(`conversation-presence:${conversationId}`, {
    config: { private: true },
  });
  const subscribed = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => resolve(false), 3000);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve(true);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
  if (!subscribed) {
    console.error("Could not subscribe to assistant typing updates", { conversationId });
    void supabase.removeChannel(channel);
    return async () => {};
  }
  const cleanupTimeout = setTimeout(() => {
    void supabase.removeChannel(channel);
  }, 45_000);

  const result = await channel.send({
    type: "broadcast",
    event: "assistant-typing",
    payload: { userId: merchantId, isTyping: true },
  });
  if (result !== "ok") {
    console.error("Could not publish assistant typing status", { conversationId, result });
  }

  return async () => {
    clearTimeout(cleanupTimeout);
    const stopResult = await channel.send({
      type: "broadcast",
      event: "assistant-typing",
      payload: { userId: merchantId, isTyping: false },
    });
    if (stopResult !== "ok") {
      console.error("Could not clear assistant typing status", { conversationId, stopResult });
    }
    await supabase.removeChannel(channel);
  };
}


export async function createConversation(customerId: string, merchantId: string): Promise<string> {

assertDifferentParties(customerId, merchantId);

const { data: existing, error: lookupError } = await supabase

.from("conversations")

.select("id")

.or(

`and(customer_id.eq.${customerId},merchant_id.eq.${merchantId}),and(customer_id.eq.${merchantId},merchant_id.eq.${customerId})`

)

.maybeSingle();

if (lookupError) throw lookupError;

if (existing) return existing.id;


const { data, error } = await supabase

.from("conversations")

.insert({ customer_id: customerId, merchant_id: merchantId })

.select("id")

.single();


if (error) throw error;

return data.id;

}


export async function clearConversation(convId: string, userId: string) {
 const { data: conv, error: readError } = await supabase
   .from("conversations")
   .select("customer_id, merchant_id")
   .eq("id", convId)
   .maybeSingle();
 if (readError) throw new Error(readError.message);
 if (!conv || (conv.customer_id !== userId && conv.merchant_id !== userId)) {
   throw new Error("المحادثة غير موجودة أو لا تملك صلاحية حذفها");
 }

 const field = conv.customer_id === userId ? "customer_cleared_at" : "merchant_cleared_at";
 const { data, error } = await supabase
   .from("conversations")
   .update({ [field]: new Date().toISOString() })
   .eq("id", convId)
   .select("id");
 if (error) throw new Error(error.message);
 if (!data?.length) throw new Error("لم يتم حذف المحادثة، تحقق من صلاحياتك");
}


export async function togglePinConversation(convId: string, userId: string, pinned: boolean) {
  const { data: conv, error: readError } = await supabase
    .from("conversations")
    .select("customer_id, merchant_id")
    .eq("id", convId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!conv || (conv.customer_id !== userId && conv.merchant_id !== userId)) {
    throw new Error("المحادثة غير موجودة أو لا تملك صلاحية تثبيتها");
  }

  const field = conv.customer_id === userId ? "customer_pinned" : "merchant_pinned";
  const { data, error } = await supabase
    .from("conversations")
    .update({ [field]: pinned })
    .eq("id", convId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("لم يتم تثبيت المحادثة، تحقق من صلاحياتك");
}


export async function maybeTriggerAssistant(conversationId: string, senderId: string, content: string, meta?: unknown) {
  try {
    const { data: conv } = await supabase
      .from("conversations")
      .select("customer_id, merchant_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return;
    if (senderId !== conv.customer_id) return;
    if (meta && typeof meta === "object" && "from_bot" in meta && meta.from_bot) return;
    if (content.startsWith("🛍️ ")) return;

    const recipientId = conv.merchant_id;
    const context = meta && typeof meta === "object"
      ? ["name", "title", "text", "caption", "description"]
          .flatMap((key) => {
            const value = (meta as Record<string, unknown>)[key];
            return typeof value === "string" && value.trim() ? [value.trim()] : [];
          })
          .join(" ")
          .slice(0, 500)
      : "";

    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData.session?.access_token;
    if (!jwt) return;

    const { data: assistantProfile, error: assistantProfileError } = await supabase
      .from("profiles_public")
      .select("assistant_enabled")
      .eq("id", recipientId)
      .maybeSingle();
    if (assistantProfileError) {
      console.error("Could not check whether the store assistant is enabled", assistantProfileError);
    }
    const stopTyping = assistantProfile?.assistant_enabled
      ? await startAssistantTyping(conversationId, recipientId)
      : async () => {};
    const response = await fetch("/api/assistant-reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ conversationId, customerMessage: content, recipientId, context }),
    });
    await stopTyping();
    if (!response.ok) {
      console.error("Assistant reply request failed", {
        status: response.status,
        conversationId,
      });
    }
  } catch (error) {
    console.error("Could not request an assistant reply", error);
  }
}
