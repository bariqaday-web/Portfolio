"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  kind: "general" | "like" | "comment" | "follow" | "message" | "call" | "order" | "ad";
  title: string;
  message: string;
  href: string;
  targetType: string | null;
  targetId: string | null;
  parentId: string | null;
  actorAvatarUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  target_type: string | null;
  target_id: string | null;
  parent_id: string | null;
  actor_avatar_url: string | null;
  read_at: string | null;
  created_at: string;
};

function getKind(type: string): AppNotification["kind"] {
  if (type.includes("campaign") || type === "ad") return "ad";
  if (type.includes("like")) return "like";
  if (type.includes("comment")) return "comment";
  if (type.includes("follow")) return "follow";
  if (type.includes("reply")) return "message";
  if (type.includes("share")) return "general";
  if (type.includes("call")) return "call";
  if (type.includes("message")) return "message";
  if (type.includes("order")) return "order";
  return "general";
}

function getHref(type: string, targetType: string | null, targetId: string | null, parentId: string | null): string {
  if (targetType === "comment" && targetId && parentId) {
    return `/post/${parentId}/comments?comment=${targetId}`;
  }
  if (targetType === "post" && targetId) return `/post/${targetId}`;
  if (targetType === "campaign" && targetId) return `/dashboard/ads?campaign=${targetId}`;
  if (targetType === "order" && targetId) return `/dashboard/orders?order=${targetId}`;
  if (targetType === "conversation" && targetId) return `/chat/${targetId}`;
  if (type.startsWith("story_")) return "/profile/stories";
  if (type === "admin_verification") return "/admin/verifications";
  if (type === "admin_campaign") return "/admin/campaigns";
  if (type === "admin_report") return "/admin/reports";
  if (type === "verification") return "/dashboard/verification";
  if (type === "campaign" || type === "ad") return "/dashboard/ads";
  if (type.includes("order")) return "/dashboard/orders";
  if (type.includes("like") || type.includes("comment")) return "/home";
  if (type.includes("follow")) return "/profile/followers";
  if (type.includes("message") || type.includes("call")) return "/chat";
  return "/notifications";
}

export function useNotifications(userId: string | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const pageSize = 1000;
    const rows: NotificationRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const withAvatar = await supabase
        .from("notifications")
        .select("id, title, body, type, target_type, target_id, parent_id, actor_avatar_url, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      let data = withAvatar.data as NotificationRow[] | null;
      let queryError = withAvatar.error;
      if (
        (queryError?.code === "42703" || queryError?.code === "PGRST204") &&
        queryError.message.includes("actor_avatar_url")
      ) {
        const withoutAvatar = await supabase
          .from("notifications")
          .select("id, title, body, type, target_type, target_id, parent_id, read_at, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        queryError = withoutAvatar.error;
        data = withoutAvatar.data
          ? withoutAvatar.data.map((row) => ({ ...row, actor_avatar_url: null })) as NotificationRow[]
          : null;
      }
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    setItems(rows.filter((row) => row.type !== "campaign_payment_review").map((row) => ({
        id: row.id,
        kind: getKind(row.type),
        title: row.title,
        message: row.body,
        href: getHref(row.type, row.target_type, row.target_id, row.parent_id),
        targetType: row.target_type,
        targetId: row.target_id,
        parentId: row.parent_id,
        actorAvatarUrl: row.actor_avatar_url,
        createdAt: row.created_at,
        readAt: row.read_at,
      })).filter((item) => item.kind !== "message" && item.kind !== "call"));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    void load();
    if (!userId) return;
    const timer = window.setInterval(() => void load(), 60000);
    const channelId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`notifications-${userId}-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const readAt = new Date().toISOString();
    setItems((previous) => previous.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) void load();
  }, [load, userId]);

  const markRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    setItems((previous) => previous.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item)));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", id)
      .is("read_at", null);
    if (error) void load();
  }, [load]);

  const unreadCount = items.reduce((count, item) => count + Number(!item.readAt), 0);
  return { items, loading, error, unreadCount, markAllRead, markRead };
}
