import test from "node:test";
import assert from "node:assert/strict";

import { isLegacyCampaignPaymentError } from "./payment.ts";

test("detects legacy campaign payment RPC mismatches", () => {
  assert.equal(
    isLegacyCampaignPaymentError({ message: "Could not find the function public.submit_campaign_payment(uuid, text, text, text, text, text)" }),
    true,
  );
  assert.equal(
    isLegacyCampaignPaymentError({ message: "Could not find the function public.submit_campaign_payment(uuid, text, text, text)" }),
    true,
  );
  assert.equal(
    isLegacyCampaignPaymentError({ message: "column p_payer_name does not exist" }),
    true,
  );
  assert.equal(
    isLegacyCampaignPaymentError({ message: "duplicate key value violates unique constraint" }),
    false,
  );
});
