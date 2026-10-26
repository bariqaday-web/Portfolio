import assert from "node:assert/strict";
import test from "node:test";
import { extractLast4Digits, maskPaymentValue, sanitizeTransferName } from "./payment.ts";

test("extracts the final four digits from a bank reference", () => {
  assert.equal(extractLast4Digits("1234 5678 9012 3456"), "3456");
  assert.equal(extractLast4Digits("SA-1020304050"), "4050");
  assert.equal(extractLast4Digits("abc"), "");
});

test("masks transfer identifiers without hiding the last four digits", () => {
  assert.equal(maskPaymentValue("1234567890123456"), "••••3456");
  assert.equal(maskPaymentValue("ABCD1234567890"), "••••7890");
});

test("sanitizes the payer name before saving it", () => {
  assert.equal(sanitizeTransferName("  ahmed ali  "), "ahmed ali");
  assert.equal(sanitizeTransferName("  "), "");
});
