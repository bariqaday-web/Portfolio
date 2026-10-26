"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, PhoneCall, ShoppingBag, Megaphone, UserRound, CheckCheck } from "lucide-react";
import { useProfile } from "@/lib/useProfile";
import { useNotifications, type AppNotification } from "@/lib/useNotificationRecords";

const icons = {
  general: Bell,
  like: Heart,
  comment: MessageCircle,
  follow: UserRound,
  message: MessageCircle,
  call: PhoneCall,
  order: ShoppingBag,
  ad: Megaphone,
};

function timeAgo(value: string | null) {
  if (!value) return "نشاط جديد";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function NotificationRow({ item }: { item: AppNotification }) {
  const Icon = icons[item.kind];
  return (
    <Link href={item.href} className="flex items-start gap-3 border-b border-line/60 px-4 py-4 hover:bg-chip/60">
      <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip text-ink">
        {item.actorAvatarUrl ? (
          <img src={item.actorAvatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <Icon size={18} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-6">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{item.message}</span>
        <span className="mt-1 block text-[11px] text-muted">{timeAgo(item.createdAt)}</span>
      </span>
    </Link>
  );
}

export default function NotificationsPage() {
  const { user, loading: profileLoading } = useProfile();
  const { items, loading, error, markAllRead } = useNotifications(user?.id ?? null);
  const marked = useRef(false);

  useEffect(() => {
    if (!loading && !profileLoading && user && !marked.current) {
      markAllRead();
      marked.current = true;
    }
  }, [loading, profileLoading, user, markAllRead]);

  return (
    <section className="mx-auto min-h-[60vh] max-w-2xl">
      <header className="border-b border-line pb-4">
        <h1 className="text-xl font-bold">الإشعارات</h1>
      </header>

      {loading || profileLoading ? (
        <div className="py-12 text-center text-sm text-muted">جارٍ تحميل الإشعارات…</div>
      ) : error ? (
        <div role="alert" className="py-12 text-center text-sm text-red-700">
          تعذّر تحميل الإشعارات: {error}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <CheckCheck size={28} className="text-muted" />
          <p className="mt-3 text-sm font-semibold">لا توجد إشعارات بعد</p>
        </div>
      ) : (
        <>
          <div className="-mx-4">{items.map((item) => <NotificationRow key={item.id} item={item} />)}</div>
        </>
      )}
    </section>
  );
}
