"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

export default function ScreenHeader({
  title,
  right,
}: {
  title?: string;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-paper/95 px-3 backdrop-blur-md md:static md:h-16 md:px-8 md:pt-4 md:pb-2 md:backdrop-blur-none">
      <button
        onClick={() => router.back()}
        className="icon-control size-10 shrink-0 text-ink"
        aria-label="رجوع"
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
      {title ? <h1 className="min-w-0 flex-1 truncate px-2 text-center text-base font-semibold md:text-lg">{title}</h1> : <span className="flex-1" />}
      {right ?? <div className="size-10 shrink-0" />}
    </div>
  );
}
