"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Compass, User } from "lucide-react";

const items = [
  { href: "/home", icon: Home, label: "الرئيسية" },
  { href: "/category", icon: Compass, label: "استكشف" },
  { href: "/search", icon: Search, label: "بحث" },
  { href: "/profile", icon: User, label: "حسابي" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-40px)] max-w-[360px] md:hidden">
      <div className="flex items-center justify-between bg-ink rounded-pill px-5 py-3.5 shadow-float">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="relative flex items-center justify-center"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                className={active ? "text-white" : "text-white/45"}
              />
              {active && (
                <span className="absolute -bottom-2 w-1 h-1 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
