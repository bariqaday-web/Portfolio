"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDown, MoreVertical } from "lucide-react";

const ActionMenuContext = createContext<(() => void) | null>(null);

export function ActionMenu({
  label,
  children,
  triggerClassName = "",
}: {
  label: string;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);
  const dialog = open ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-sm rounded-3xl border border-line/60 bg-card p-3 text-right text-ink shadow-2xl"
        style={{ direction: "rtl" }}
      >
        <p className="px-3 pb-2 pt-1 text-xs font-semibold text-muted">{label}</p>
        <ActionMenuContext.Provider value={close}>
          <div className="flex flex-col gap-1">{children}</div>
        </ActionMenuContext.Provider>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex size-9 items-center justify-center rounded-full bg-chip transition-colors hover:bg-chip/80 ${triggerClassName}`}
      >
        <MoreVertical size={17} />
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
    </>
  );
}

export function ActionMenuItem({
  icon: Icon,
  destructive = false,
  children,
  onSelect,
}: {
  icon: LucideIcon;
  destructive?: boolean;
  children: ReactNode;
  onSelect: () => void;
}) {
  const close = useContext(ActionMenuContext);
  return (
    <button
      type="button"
      onClick={() => {
        close?.();
        onSelect();
      }}
      className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm outline-none transition-colors hover:bg-chip focus-visible:bg-chip ${
        destructive ? "text-red-600" : "text-ink"
      }`}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export function ActionMenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const close = useContext(ActionMenuContext);
  return (
    <Link
      href={href}
      onClick={() => close?.()}
      className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ink outline-none transition-colors hover:bg-chip focus-visible:bg-chip"
    >
      <Icon size={18} aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}

export function ActionMenuSub({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-ink outline-none transition-colors hover:bg-chip focus-visible:bg-chip"
      >
        <Icon size={18} aria-hidden="true" />
        <span className="flex-1 text-right">{label}</span>
        <ChevronDown size={16} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && <div className="mr-5 flex flex-col gap-1 border-r border-line pr-2">{children}</div>}
    </div>
  );
}
