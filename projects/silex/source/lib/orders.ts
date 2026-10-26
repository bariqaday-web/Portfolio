import type { MerchantGroup } from "./whatsapp";
import { assertDifferentParties } from "./party-guard.ts";

export type OrderLine = {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  color?: string | null;
  size?: string | null;
};

export function buildOrderPayload(
  customerId: string,
  merchantId: string,
  total: number,
  items: OrderLine[],
  customerName: string,
  customerPhone: string | null,
) {
  const itemsCount = items.reduce((sum, it) => sum + it.qty, 0);
  return {
    customer_id: customerId,
    merchant_id: merchantId,
    customer_name: customerName,
    customer_phone: customerPhone,
    status: "قيد المعالجة",
    total,
    total_amount: Math.round(total),
    items,
    items_count: itemsCount,
  };
}

export function missingOrderColumn(error: { message?: string } | null | undefined): "total" | "items" | null {
  if (!error?.message) return null;
  const message = error.message.toLowerCase();
  if (!message.includes("orders")) return null;
  const missing = message.includes("could not find") || message.includes("does not exist");
  if (!missing) return null;
  if (message.includes("total")) return "total";
  if (message.includes("items")) return "items";
  return null;
}

export const isMissingItemsColumnError = (error: { message?: string } | null | undefined) =>
  missingOrderColumn(error) === "items";

export function buildOrderLines(group: MerchantGroup): OrderLine[] {
  return group.items.map(({ product, qty, color, size }) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    qty,
    color: color ?? null,
    size: size ?? null,
  }));
}

export async function createCartOrder(customerId: string, group: MerchantGroup) {
  assertDifferentParties(customerId, group.merchantId);
  const { supabase } = await import("./supabase");
  const items = buildOrderLines(group);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, whatsapp")
    .eq("id", customerId)
    .maybeSingle();

  const customerName = profile?.full_name || profile?.username || "عميل";
  const customerPhone = profile?.whatsapp || null;

  const payload = buildOrderPayload(customerId, group.merchantId, group.total, items, customerName, customerPhone);

  try {
    let insertPayload: Record<string, unknown> = payload;
    let missingItems = false;
    let result = await supabase.from("orders").insert(insertPayload).select("id").maybeSingle();
    for (let attempt = 0; result.error && attempt < 2; attempt += 1) {
      const missingColumn = missingOrderColumn(result.error);
      if (!missingColumn || !(missingColumn in insertPayload)) {
        throw new Error(result.error.message);
      }
      insertPayload = { ...insertPayload };
      delete insertPayload[missingColumn];
      missingItems ||= missingColumn === "items";
      result = await supabase.from("orders").insert(insertPayload).select("id").maybeSingle();
    }
    if (result.error) throw new Error(result.error.message);
    if (!result.data?.id) throw new Error("تعذّر إنشاء الطلب في قاعدة البيانات");
    const order = result.data;
    if (!missingItems) return order;

    const { error: orderItemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        merchant_id: group.merchantId,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.qty,
        color: item.color ?? null,
        size: item.size ?? null,
        image: item.image ?? null,
        line_total: Number(item.price) * Number(item.qty),
      })),
    );

    if (orderItemsError) {
      const { error: rollbackError } = await supabase
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("customer_id", customerId);
      if (rollbackError) {
        throw new Error(`${orderItemsError.message}; تعذّر التراجع عن الطلب: ${rollbackError.message}`);
      }
      throw new Error(orderItemsError.message);
    }

    return order;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("تعذّر تسجيل الطلب");
  }
}
