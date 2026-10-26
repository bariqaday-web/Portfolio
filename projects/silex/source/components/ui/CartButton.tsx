"use client";

import { ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart, type CartLine } from "@/lib/cart-context";

export function CartButton({
  productId,
  onAdd,
  match,
  size = "sm",
  className = "",
}: {
  productId: string;
  onAdd: () => unknown | Promise<unknown>;
  match?: (line: CartLine) => boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  const { lines, isMerchant, remove } = useCart();
  const [busy, setBusy] = useState(false);
  const cartLine = lines.find((line) => (match ? match(line) : line.product.id === productId));
  const base = `rounded-pill ${size === "lg" ? "py-3.5" : "py-2.5"} text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${className}`;

  if (isMerchant !== false) return null;

  if (cartLine) {
    return (
      <button type="button" onClick={() => remove(cartLine.key)} className={`${base} border-2 border-ink text-ink bg-transparent`}>
        <X size={16} strokeWidth={2.5} />
        إزالة من السلة
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await Promise.resolve(onAdd());
        } catch {
          // The caller reports any operation-specific error.
        } finally {
          setBusy(false);
        }
      }}
      className={`${base} bg-ink text-white disabled:opacity-60`}
    >
      <ShoppingBag size={15} />
      {busy ? "جارٍ الإضافة..." : "أضف للسلة"}
    </button>
  );
}
