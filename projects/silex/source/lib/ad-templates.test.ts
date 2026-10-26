import assert from "node:assert/strict";
import test from "node:test";
import { resolveCampaignStatus } from "./ad-templates.ts";

test("pending campaign becomes expired once its deadline has passed", () => {
  const now = Date.now();
  const expiredAt = new Date(now - 60_000).toISOString();

  assert.equal(resolveCampaignStatus("pending_review", expiredAt), "expired");
  assert.equal(resolveCampaignStatus("pending_payment", expiredAt), "expired");
});

test("active and non-expiring campaigns keep their original status", () => {
  assert.equal(resolveCampaignStatus("active", null), "active");
  assert.equal(resolveCampaignStatus("paused", null), "paused");
  assert.equal(resolveCampaignStatus("rejected", null), "rejected");
});
