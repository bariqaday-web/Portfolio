"use client";

import { BannedScreen } from "@/components/BannedScreen";
import { CallProvider } from "@/components/CallProvider";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Home, Compass, User, MessageCircle, Plus, PlusSquare, Search, ShoppingBag, Settings, Store } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { SupportChatButton } from "@/components/SupportChatButton";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { toast } from "sonner";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const hasOwnScreenHeader = [
    "/search",
    "/store/",
    "/category",
    "/cart",
    "/people",
    "/chat",
    "/notifications",
    "/profile/settings",
    "/profile/merchant-setup",
    "/profile/blocked",
    "/profile/studio",
    "/post/",
    "/product/",
  ].some((path) => pathname.startsWith(path));

  const isAuthPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/delete-account";

  const [ready, setReady] = useState(false);
  const [isMerchant, setIsMerchant] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [banned, setBanned] = useState<{ reason: string | null } | null>(null);

  useEffect(() => {
    if (isAuthPage) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user.id ?? null);
      if (!data.session) {
        try { sessionStorage.setItem("after_login", pathname); } catch {}
        router.replace("/onboarding");
      } else setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setCurrentUserId(session?.user.id ?? null);
      if (!session) router.replace("/onboarding");
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname, isAuthPage, router]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("auth") !== "login_success") return;
    toast.success("تم تسجيل الدخول بنجاح");
    url.searchParams.delete("auth");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [pathname]);

  useEffect(() => {
    if (isAuthPage) return;
    let alive = true;
    if (!currentUserId) {
      setIsMerchant(false);
      setIsAdmin(false);
      setBanned(null);
      return;
    }
    const uid = currentUserId;
    const checkProfile = async () => {
      const { data: profile, error } = await supabase
        .from("my_profile")
        .select("role, banned_at, ban_reason")
        .eq("id", uid)
        .maybeSingle();
      if (error) {
        console.error("Could not verify account status", error);
        return;
      }
      if (!alive) return;
      setIsMerchant(profile?.role === "merchant");
      setIsAdmin(profile?.role === "admin");
      setBanned(profile?.banned_at ? { reason: profile.ban_reason ?? null } : null);
    };

    void checkProfile();
    const interval = window.setInterval(() => void checkProfile(), 15_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void checkProfile();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const channel = supabase
      .channel(`account-status-${uid}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${uid}`,
      }, () => void checkProfile())
      .subscribe();

    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, isAuthPage]);

  useEffect(() => {
    if (pathname === "/cart" && isMerchant) router.replace("/home");
  }, [pathname, isMerchant, router]);

  useEffect(() => {
    if (!currentUserId || isAuthPage) return;
    let active = true;
    const recordUsage = async () => {
      try {
        const now = new Date();
        const hourKey = `usage-hour:${currentUserId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}:${now.getHours()}`;
        const lastActiveKey = `usage-last-active:${currentUserId}`;
        const lastActiveAt = Number(localStorage.getItem(lastActiveKey) ?? 0);
        const recordUsageHour = !localStorage.getItem(hourKey);
        if (!recordUsageHour && now.getTime() - lastActiveAt < 5 * 60_000) return;

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const token = data.session?.access_token;
        if (!token) return;

        const response = await fetch("/api/analytics/usage", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            timezoneOffsetMinutes: now.getTimezoneOffset(),
            recordUsageHour,
          }),
        });
        if (!response.ok) {
          console.error("Could not record app usage", { status: response.status });
          return;
        }
        if (active) {
          localStorage.setItem(lastActiveKey, String(now.getTime()));
          if (recordUsageHour) localStorage.setItem(hourKey, "1");
        }
      } catch (error) {
        console.error("Could not record app usage", error);
      }
    };

    void recordUsage();
    return () => {
      active = false;
    };
  }, [currentUserId, isAuthPage, pathname]);

  useEffect(() => {
    if (!currentUserId || isAuthPage) return;
    let alive = true;
    const channel = supabase.channel(`user-presence:${currentUserId}`, {
      config: { private: true, presence: { key: currentUserId } },
    });
    const trackOnline = async () => {
      if (document.visibilityState !== "visible") {
        const status = await channel.untrack();
        if (status !== "ok") console.error("Could not mark user presence as offline", status);
        return;
      }
      const status = await channel.track({ online_at: new Date().toISOString() });
      if (status !== "ok") {
        console.error("Could not publish user presence", status);
      }
    };
    const heartbeat = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const token = data.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Presence heartbeat failed (${response.status})`);
      } catch (error) {
        if (alive) console.error("Could not update last seen time", error);
      }
    };
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") {
        void trackOnline();
        void heartbeat();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("Could not subscribe to user presence", error);
      }
    });
    const interval = window.setInterval(() => void heartbeat(), 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void trackOnline();
        void heartbeat();
      } else {
        void trackOnline();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, isAuthPage]);

  if (pathname.startsWith("/admin")) return <>{children}</>;
  if (pathname.startsWith("/dashboard")) {
    return (
      <CallProvider>
        {children}
      </CallProvider>
    );
  }

  if (isAuthPage) {
    return <main className="min-h-screen w-full bg-[#ECE9E2]">{children}</main>;
  }

  if (!ready) return <PageSkeleton />;

  if (banned) return <BannedScreen reason={banned.reason} />;

  const navItems = isMerchant
    ? [
        { label: "الرئيسية", href: "/home", icon: Home },
        { label: "استكشف", href: "/category", icon: Compass },
        { label: "نشر", href: "/profile/studio", icon: PlusSquare },
        { label: "الدردشة", href: "/chat", icon: MessageCircle },
        { label: "لوحة التاجر", href: "/dashboard", icon: Store },
        { label: "حسابي", href: "/profile", icon: User },
      ]
    : [
        { label: "الرئيسية", href: "/home", icon: Home },
        { label: "استكشف", href: "/category", icon: Compass },
        { label: "الدردشة", href: "/chat", icon: MessageCircle },
        { label: "حسابي", href: "/profile", icon: User },
      ];

  const mobileNavItems = [
    { label: "الرئيسية", href: "/home", icon: Home },
    { label: "استكشف", href: "/category", icon: Compass },
    { label: "نشر", href: isMerchant ? "/profile/studio" : "/profile/merchant-setup", icon: Plus },
    { label: "الدردشة", href: "/chat", icon: MessageCircle },
    { label: "حسابي", href: "/profile", icon: User },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <CallProvider>
    <div className="min-h-screen bg-paper text-[#1e3a5f]">
      {/* شريط جانبي - كمبيوتر */}
      <aside className="hidden md:flex fixed top-0 bottom-0 right-0 w-64 flex-col border-l-2 border-[#1e3a5f]/15 bg-paper p-4 z-40">
        <Link href="/home" className="px-3 py-4 mb-2">
          <Logo className="h-8 w-auto text-[#1e3a5f]" />
        </Link>
        <nav className="flex flex-col gap-1">
          {[...navItems, { label: "بحث", href: "/search", icon: Search }].map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                  active ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/60 hover:bg-[#1e3a5f]/5 hover:text-[#1e3a5f]"
                }`}
              >
                <Icon size={20} className={active ? "stroke-[2.5px]" : "stroke-[1.75px]"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[#1e3a5f]/15 pt-3">
          {!isAdmin && <SupportChatButton variant="sidebar" className="mb-3" />}
          {!isMerchant && (
            <Link
              href="/cart"
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
                isActive("/cart") ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/70 hover:bg-[#1e3a5f]/5"
              }`}
            >
              <span className="relative">
                <ShoppingBag size={20} />
              </span>
              السلة
            </Link>
          )}
                    <NotificationBell
            userId={currentUserId}
            showLabel
            className={`transition-colors ${isActive("/notifications") ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/70 hover:bg-[#1e3a5f]/5"} flex items-center gap-3 rounded-xl px-3 py-3 text-sm`}
          />
          <Link
            href="/profile/app-settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors ${
              isActive("/profile/app-settings") ? "bg-[#1e3a5f]/10 font-bold" : "text-[#1e3a5f]/70 hover:bg-[#1e3a5f]/5"
            }`}
          >
            <Settings size={20} />
            الإعدادات
          </Link>
        </div>
      </aside>

      {/* هيدر علوي - موبايل */}
      <header className={`${hasOwnScreenHeader ? "hidden" : "flex"} md:hidden sticky top-0 z-40 h-14 items-center justify-between bg-transparent px-4 [filter:drop-shadow(0_2px_5px_rgba(17,17,17,0.10))]`}>
        <Link href="/home" aria-label="الرئيسية">
          <Logo className="h-7 w-auto text-[#1e3a5f]" />
        </Link>
        <div className="flex items-center gap-1">
          {!isAdmin && (
            <SupportChatButton className="gap-1.5 border-transparent bg-primary/[0.06] px-2.5 text-primary hover:bg-primary/10" />
          )}
          {isMerchant && (
            <Link
              href="/dashboard"
              aria-label="متجري"
              title="متجري"
              className="flex size-11 items-center justify-center rounded-full hover:bg-[#1e3a5f]/5"
            >
              <Store size={18} />
            </Link>
          )}
          <NotificationBell
            userId={currentUserId}
            className="flex size-11 items-center justify-center rounded-full bg-transparent hover:bg-[#1e3a5f]/5"
          />
          {!isMerchant && (
            <Link
              href="/cart"
              aria-label="السلة"
              className="relative flex size-11 items-center justify-center rounded-full bg-transparent hover:bg-[#1e3a5f]/5"
            >
              <ShoppingBag size={18} />
            </Link>
          )}
                  </div>
      </header>

      <main className="w-full px-4 py-4 pb-24 md:mr-64 md:w-[calc(100%_-_16rem)] md:pb-6">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* شريط سفلي - موبايل */}
      <nav aria-label="التنقل الرئيسي" className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-paper px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mx-auto grid min-h-14 max-w-md grid-cols-5 items-center">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isCreate = item.label === "نشر";
            const active = isCreate
              ? pathname === item.href || pathname.startsWith(`${item.href}/`)
              : item.label === "حسابي"
                ? pathname === "/profile"
                : isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  isCreate
                    ? "text-[#1e3a5f]"
                    : active
                      ? "font-bold text-[#1e3a5f]"
                      : "text-[#1e3a5f]/55 hover:text-[#1e3a5f]"
                }`}
              >
                {isCreate ? (
                  <span className="flex size-11 -translate-y-2 items-center justify-center rounded-full bg-[#1e3a5f] text-white shadow-[0_4px_12px_rgba(30,58,95,0.28)]">
                    <Icon size={23} strokeWidth={2.4} />
                  </span>
                ) : (
                  <Icon size={20} className={active ? "stroke-[2.5px]" : "stroke-[1.75px]"} />
                )}
                <span className={isCreate ? "-mt-2 font-semibold" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
    </CallProvider>
  );
}
