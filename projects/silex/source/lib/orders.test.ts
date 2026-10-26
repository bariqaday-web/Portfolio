import test from "node:test";
import assert from "node:assert/strict";

import { buildOrderPayload, createCartOrder, isMissingItemsColumnError, missingOrderColumn } from "./orders.ts";
import { assertDifferentParties } from "./party-guard.ts";

test("buildOrderPayload includes items JSON for supported schema", () => {
  const payload = buildOrderPayload(
    "customer-1",
    "merchant-2",
    42.5,
    [{ id: "p1", name: "قميص", price: 20, image: "img1", qty: 2, color: "أحمر", size: "L" }],
    "اسم العميل",
    "07700000000",
  );

  assert.equal(payload.customer_id, "customer-1");
  assert.equal(payload.merchant_id, "merchant-2");
  assert.equal(payload.total, 42.5);
  assert.equal(payload.customer_name, "اسم العميل");
  assert.equal(payload.customer_phone, "07700000000");
  assert.deepEqual(payload.items, [{
    id: "p1",
    name: "قميص",
    price: 20,
    image: "img1",
    qty: 2,
    color: "أحمر",
    size: "L",
  }]);
});

test("isMissingItemsColumnError detects missing column failures", () => {
  const error = { message: "Could not find 'items' column of 'orders'" } as { message: string };
  assert.equal(isMissingItemsColumnError(error), true);
  assert.equal(missingOrderColumn({ message: "Could not find the 'total' column of 'orders' in the schema cache" }), "total");
  assert.equal(isMissingItemsColumnError({ message: "duplicate key value" } as { message: string }), false);
  assert.equal(missingOrderColumn({ message: "Could not find the 'total' column of 'profiles'" }), null);
});

test("merchant cannot be the customer for their own order or conversation", () => {
  assert.throws(
    () => assertDifferentParties("merchant-1", "merchant-1"),
    /لا يمكنك حجز منتجات متجرك أو مراسلة نفسك/,
  );
  assert.doesNotThrow(() => assertDifferentParties("customer-1", "merchant-1"));
});

test("self-purchase is rejected before an order reaches Supabase", async () => {
  await assert.rejects(
    createCartOrder("merchant-1", {
      merchantId: "merchant-1",
      name: "متجري",
      items: [],
      count: 0,
      total: 0,
    }),
    /لا يمكنك حجز منتجات متجرك أو مراسلة نفسك/,
  );
});
