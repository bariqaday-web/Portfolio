import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-paper px-5 py-8 text-ink">
      <div className="sticky top-0 z-30 -mx-5 -mt-8 mb-6 border-b border-line/70 bg-paper/95 px-5 py-3 backdrop-blur">
        <Link href="/profile/app-settings" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-ink/75 transition-colors hover:text-ink">
          <ArrowRight size={16} aria-hidden="true" />
          العودة إلى الإعدادات
        </Link>
      </div>
      <h1 className="font-display text-2xl">{title}</h1>
      <p className="mt-1 text-xs text-muted">آخر تحديث: {updated}</p>
      <div className="mt-6 space-y-6 text-sm leading-7 text-ink/85">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-base text-ink">{title}</h2>
      {children}
    </section>
  );
}
