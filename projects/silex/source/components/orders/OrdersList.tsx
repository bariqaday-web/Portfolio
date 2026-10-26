"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, PackageCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/lib/useProfile";
import { PageLoading } from "@/components/ui/Skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StoredItem = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  qty: number;
  color: string | null;
  size: string | null;
};

type OrderRow = {
  id: string;
  customer_id: string;
  merchant_id: string | null;
  status: string;
  total: number;
  items: unknown;
  created_at: string;
  customerName?: string;
};

type OrderStatus = "قيد المعالجة" | "في الطريق" | "تم التسليم";
const STATUSES: OrderStatus[] = ["قيد المعالجة", "في الطريق", "تم التسليم"];

function parseItems(value: unknown): StoredItem[] {
  let rows = value;
  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(rows)) return [];
  return rows.map((item: any) => ({
    id: String(item?.id ?? item?.product_id ?? ""),
    name: String(item?.name ?? item?.title ?? item?.product?.name ?? "منتج"),
    price: Number(item?.price ?? item?.product?.price ?? 0),
    image: item?.image ?? item?.image_url ?? item?.product?.image ?? null,
    qty: Math.max(1, Number(item?.qty ?? item?.quantity ?? 1)),
    color: item?.color ?? null,
    size: item?.size ?? null,
  }));
}

export function OrdersList({ mode }: { mode: "merchant" | "customer" }) {
  const { user, loading: profileLoading } = useProfile();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const ownerColumn = mode === "merchant" ? "merchant_id" : "customer_id";
    const { data, error: queryError } = await supabase
      .from("orders")
      .select("id, customer_id, merchant_id, customer_name, status, total_amount, created_at, order_items(product_id, product_name, unit_price, quantity)")
      .eq(ownerColumn, user.id)
      .order("created_at", { ascending: false });
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const rows: OrderRow[] = ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      merchant_id: r.merchant_id,
      status: r.status,
      total: Number(r.total_amount ?? 0),
      created_at: r.created_at,
      customerName: r.customer_name ?? undefined,
      items: (r.order_items ?? []).map((i: any) => ({
        id: i.product_id,
        name: i.product_name,
        price: Number(i.unit_price ?? 0),
        qty: i.quantity,
      })),
    }));
    if (mode === "merchant" && rows.length) {
      const customerIds = [...new Set(rows.map((row) => row.customer_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles_public").select("id, full_name, username").in("id", customerIds);
      const names = new Map((profiles ?? []).map((profile: any) => [profile.id, profile.full_name ?? profile.username ?? "زبون"]));
      rows.forEach((row) => { row.customerName = names.get(row.customer_id) ?? "زبون"; });
    }
    setOrders(rows);
    setError("");
    setLoading(false);
  }, [mode, user?.id]);

  useEffect(() => {
    if (profileLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
    const ownerColumn = mode === "merchant" ? "merchant_id" : "customer_id";
    const channel = supabase
      .channel(`orders-${mode}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `${ownerColumn}=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, mode, profileLoading, user?.id]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!orderId || !orders.some((order) => order.id === orderId)) return;
    setFocusedOrderId(orderId);
    document.getElementById(`order-${orderId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, orders]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    if (!user?.id || savingId) return;
    setSavingId(orderId);
    const { data, error: updateError } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .eq("merchant_id", user.id)
      .select("id")
      .maybeSingle();
    if (updateError || !data) {
      toast.error(updateError?.message ?? "تعذّر تحديث حالة الطلب");
      setSavingId(null);
      return;
    }
    setOrders((previous) => previous.map((order) => order.id === orderId ? { ...order, status } : order));
    toast.success("تم تحديث حالة الطلب");
    setSavingId(null);
  }

  if (profileLoading || loading) return <PageLoading />;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold">{mode === "merchant" ? "الطلبات الواردة" : "طلباتي"}</h1>
          <p className="mt-1 text-sm text-muted">{orders.length} طلب</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-full bg-chip"><ShoppingBag size={18} /></span>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">تعذّر تحميل الطلبات: {error}</p>}
      {!error && orders.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <PackageCheck size={30} className="text-muted" />
          <p className="mt-3 text-sm font-semibold">لا توجد طلبات بعد</p>
          {mode === "customer" && <Link href="/home" className="mt-4 text-sm font-semibold underline">تصفّح المنتجات</Link>}
        </div>
      )}

      {orders.map((order) => {
        const items = parseItems(order.items);
        const currentStatus = STATUSES.includes(order.status as OrderStatus) ? order.status as OrderStatus : STATUSES[0];
        return (
          <article
            key={order.id}
            id={`order-${order.id}`}
            className={`border-b py-4 transition-colors ${focusedOrderId === order.id ? "rounded-lg border-primary bg-primary/5 px-3 ring-2 ring-primary/30" : "border-border"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">طلب #{order.id.slice(0, 8)}</h2>
                <p className="mt-1 text-xs text-muted">
                  {new Date(order.created_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}
                  {mode === "merchant" && order.customerName ? ` · ${order.customerName}` : ""}
                </p>
              </div>
              {mode === "merchant" ? (
                <Select
                  value={currentStatus}
                  onValueChange={(value) => void updateStatus(order.id, value as OrderStatus)}
                  disabled={savingId === order.id}
                >
                  <SelectTrigger className="h-10 w-[180px] bg-card text-sm" aria-label={`حالة الطلب ${order.id.slice(0, 8)}`}>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="rounded-full bg-chip px-3 py-1.5 text-xs font-semibold">{order.status}</span>
              )}
            </div>

            <div className="mt-3 flex flex-col divide-y divide-border">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-3 py-3">
                  <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-chip">
                    {item.image ? <img src={item.image} alt="" className="size-full object-cover" /> : <ShoppingBag size={17} className="text-muted" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted">الكمية: {item.qty}{item.color ? ` · اللون: ${item.color}` : ""}{item.size ? ` · المقاس: ${item.size}` : ""}</p>
                  </div>
                  {item.id && <Link href={`/product/${item.id}`} aria-label={`عرض ${item.name}`} className="flex size-9 items-center justify-center rounded-full hover:bg-chip"><ArrowUpRight size={16} /></Link>}
                  <span className="text-sm font-semibold">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>الإجمالي · الدفع عند الاستلام</span>
              <span>${Number(order.total).toFixed(2)}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
