"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, X, ShoppingBag, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { createCartOrder } from "@/lib/orders";
import {
  buildOrderMessage,
  colorName,
  getWhatsappNumbers,
  groupByMerchant,
  waLink,
} from "@/lib/whatsapp";
import { supabase } from "@/lib/supabase";
import ScreenHeader from "@/components/ScreenHeader";
import { BookChatButton } from "@/components/BookChatButton";
import { useProfile } from "@/lib/useProfile";
import { PageLoading } from "@/components/ui/Skeleton";

export default function CartPage() {
  const router = useRouter();
  const { lines, setQty, remove, isMerchant } = useCart();
  const { user, loading } = useProfile();
  const [whatsappNumbers, setWhatsappNumbers] = useState<Record<string, string>>({});
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(true);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);
  const [whatsappRetry, setWhatsappRetry] = useState(0);
  const [orderingWhatsapp, setOrderingWhatsapp] = useState<string | null>(null);

  const groups = groupByMerchant(lines);
  const merchantKey = groups.map((group) => group.merchantId).sort().join(",");

  useEffect(() => {
    if (isMerchant) router.replace("/home");
  }, [isMerchant, router]);

  useEffect(() => {
    if (isMerchant !== false) {
      setLoadingWhatsapp(false);
      return;
    }
    let active = true;
    setLoadingWhatsapp(true);
    setWhatsappError(null);
    getWhatsappNumbers(merchantKey ? merchantKey.split(",") : [])
      .then((numbers) => {
        if (active) setWhatsappNumbers(numbers);
      })
      .catch((error) => {
        if (active) {
          setWhatsappNumbers({});
          const message = error instanceof Error ? error.message : "تعذّر تحميل أرقام واتساب";
          setWhatsappError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (active) setLoadingWhatsapp(false);
      });
    return () => {
      active = false;
    };
  }, [merchantKey, whatsappRetry, isMerchant]);

  async function orderOnWhatsApp(group: (typeof groups)[number], number: string) {
    if (orderingWhatsapp) return;
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      toast.error("اسمح بفتح النوافذ المنبثقة لإكمال الطلب عبر واتساب");
      return;
    }
    popup.opener = null;
    setOrderingWhatsapp(group.merchantId);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) {
        popup.close();
        window.location.assign("/login");
        return;
      }
      if (data.user.id === group.merchantId) {
        popup.close();
        toast.error("لا يمكنك حجز منتجات متجرك");
        return;
      }
      await createCartOrder(data.user.id, group);
      const origin = window.location.origin;
      popup.location.href = waLink(number, buildOrderMessage(group.name, group.items, origin));
      toast.success("تم حفظ الطلب، وواتساب جاهز لإرساله إلى المتجر");
    } catch (error) {
      popup.close();
      console.error("Could not save cart order for WhatsApp", error);
      toast.error("تعذّر حفظ الطلب، ولم يُفتح واتساب. حاول مجدداً.");
    } finally {
      setOrderingWhatsapp(null);
    }
  }

  if (loading || isMerchant === null || isMerchant) return <PageLoading />;

  return (
    <div>
      <ScreenHeader title="سلة التسوّق" />

      {lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 mt-24">
          <div className="w-16 h-16 rounded-full bg-chip flex items-center justify-center mb-4">
            <ShoppingBag size={22} className="text-muted" />
          </div>
          <p className="font-display text-[18px]">سلتك فارغة</p>
          <p className="text-sm text-muted mt-1">المنتجات التي تضيفها ستظهر هنا.</p>
          <Link
            href="/home"
            className="mt-6 bg-ink text-white rounded-pill px-6 py-3 text-sm font-semibold"
          >
            ابدأ التسوّق
          </Link>
        </div>
      ) : (
        groups.map((g) => {
          const btn = "block text-center rounded-pill py-4 text-sm font-semibold mt-5 w-full";
          return (
            <section key={g.merchantId} className="mt-6">
              <h2 className="font-display text-[18px] px-6 md:px-10">{g.name}</h2>

              <div className="md:grid md:grid-cols-[1fr_360px] md:gap-8 md:px-10">
                <div className="px-6 mt-4 flex flex-col gap-4 md:px-0">
                  {g.items.map((line) => {
                    const { product, qty, color, size } = line as typeof line & { key: string };
                    const key = (line as typeof line & { key: string }).key;
                    return (
                      <div key={key} className="flex gap-3 bg-card rounded-card p-3 shadow-soft">
                        <div className="relative w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                          <Image src={product.image} alt={product.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display text-[15px] leading-tight line-clamp-2">
                              {product.name}
                            </h3>
                            <button onClick={() => remove(key)} aria-label="حذف">
                              <X size={15} className="text-muted shrink-0" />
                            </button>
                          </div>
                          {(color || size) && (
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
                              {color && (
                                <>
                                  <span
                                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span>{colorName(color)}</span>
                                </>
                              )}
                              {size && <span>مقاس {size}</span>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-semibold text-sm">${product.price}</span>
                            <div className="flex items-center gap-3 bg-chip rounded-pill px-2 py-1">
                              <button onClick={() => setQty(key, qty - 1)} aria-label="إنقاص">
                                <Minus size={13} />
                              </button>
                              <span className="text-xs font-semibold w-3 text-center">{qty}</span>
                              <button onClick={() => setQty(key, qty + 1)} aria-label="زيادة">
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-6 mt-6 md:px-0 md:mt-4">
                  <div className="bg-card rounded-card p-5 shadow-soft space-y-2">
                    <div className="flex justify-between text-sm text-ink/70">
                      <span>عدد المنتجات</span>
                      <span>{g.count}</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold pt-2 border-t border-line mt-2">
                      <span>الإجمالي</span>
                      <span>${g.total.toFixed(2)}</span>
                    </div>
                  </div>

                  {user?.id === g.merchantId ? (
                    <p className={`${btn} border border-amber-200 bg-amber-50 px-4 text-amber-900`}>
                      هذا منتج من متجرك؛ لا يمكنك حجزه أو مراسلة نفسك.
                    </p>
                  ) : (
                    <>
                      <BookChatButton
                        merchantId={g.merchantId}
                        beforeSend={(customerId) => createCartOrder(customerId, g)}
                        afterSend={() => toast.success("تم حفظ الطلب وإرساله إلى الدردشة")}
                        items={g.items.map((it) => ({
                          id: it.product.id,
                          name: it.product.name,
                          price: it.product.price,
                          image: it.product.image,
                          qty: it.qty,
                          color: it.color,
                          size: it.size,
                        }))}
                        message={`الإجمالي: $${g.total.toFixed(2)} — الدفع كاش عند الاستلام.`}
                        label={`حجز بالدردشة مع ${g.name}`}
                        className={`${btn} bg-ink text-white flex items-center justify-center gap-2`}
                      />
                      {loadingWhatsapp ? (
                        <button type="button" disabled className={`${btn} bg-[#25D366] text-white opacity-60`}>
                          جارٍ تحميل واتساب…
                        </button>
                      ) : whatsappError ? (
                        <button
                          type="button"
                          onClick={() => setWhatsappRetry((attempt) => attempt + 1)}
                          className={`${btn} border border-amber-300 bg-amber-50 text-amber-900`}
                        >
                          تعذّر تحميل رقم واتساب · إعادة المحاولة
                        </button>
                      ) : whatsappNumbers[g.merchantId] ? (
                        <button
                          type="button"
                          onClick={() => void orderOnWhatsApp(g, whatsappNumbers[g.merchantId])}
                          disabled={orderingWhatsapp !== null}
                          className={`${btn} flex items-center justify-center gap-2 bg-[#25D366] text-white disabled:opacity-60`}
                        >
                          <MessageCircle size={17} />
                          {orderingWhatsapp === g.merchantId ? "جارٍ الإرسال…" : `إرسال الطلب عبر واتساب · ${g.name}`}
                        </button>
                      ) : (
                        <button type="button" disabled className={`${btn} bg-chip text-muted`}>
                          رقم واتساب غير مسجل لهذا المتجر
                        </button>
                      )}
                    </>
                  )}

                  <p className="text-xs text-muted text-center mt-3">
                    الدفع كاش عند الاستلام، والاتفاق على التسليم مباشرة مع التاجر.
                  </p>
                </div>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
