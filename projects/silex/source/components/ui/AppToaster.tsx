"use client";

import { Toaster } from "sonner";
import type { CSSProperties } from "react";
import { CheckCircle2, XCircle, Info, TriangleAlert } from "lucide-react";

function BrandStatusIcon({
  status,
}: {
  status: "success" | "error" | "info" | "warning";
}) {
  const StatusIcon = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: TriangleAlert,
  }[status];

  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <svg aria-hidden="true" viewBox="0 0 40 40" className="size-6">
        <path
          d="M20 3C12.8 8.1 8 14.3 8 21c0 7.1 5.4 12.5 12 12.5S32 28.1 32 21c0-6.7-4.8-12.9-12-18Z"
          fill="currentColor"
        />
        <path d="M20 12c-3.2 3.2-5.2 6.2-5.2 9.2 0 3.5 2.3 6.2 5.2 6.2" fill="none" stroke="var(--surface)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span
        className={`absolute -bottom-1 -left-1 flex size-5 items-center justify-center rounded-full border-2 border-card ${
          status === "success"
            ? "bg-emerald-600 text-white"
            : status === "error"
              ? "bg-red-600 text-white"
              : status === "warning"
                ? "bg-amber-500 text-white"
                : "bg-primary text-white"
        }`}
      >
        <StatusIcon aria-hidden="true" className="size-3" strokeWidth={2.8} />
      </span>
    </span>
  );
}

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      dir="rtl"
      expand
      style={{ "--width": "min(28rem, calc(100vw - 2rem))" } as CSSProperties}
      visibleToasts={3}
      icons={{
        success: <BrandStatusIcon status="success" />,
        error: <BrandStatusIcon status="error" />,
        info: <BrandStatusIcon status="info" />,
        warning: <BrandStatusIcon status="warning" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-ink shadow-float",
          icon: "shrink-0",
          content: "min-w-0 flex-1 text-right",
          title: "text-sm font-bold leading-5",
          description: "mt-0.5 text-xs leading-5 text-muted",
          actionButton: "shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white",
          cancelButton: "shrink-0 rounded-full bg-chip px-3 py-2 text-xs font-semibold text-ink",
        },
      }}
    />
  );
}
