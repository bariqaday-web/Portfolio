"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type BrandedActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  children?: ReactNode
  destructive?: boolean
  busy?: boolean
  disabled?: boolean
}

export function BrandedActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  destructive = false,
  busy = false,
  disabled = false,
}: BrandedActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={busy || disabled}
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              destructive ? "bg-red-600" : "bg-ink"
            }`}
          >
            {busy ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
