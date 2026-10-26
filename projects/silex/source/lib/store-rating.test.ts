import assert from "node:assert/strict";
import test from "node:test";
import { summarizeStoreRating } from "./store-rating.ts";

test("summarizes a merchant rating with a rounded average and review count", () => {
  const summary = summarizeStoreRating([
    { rating: 5 },
    { rating: 4 },
    { rating: 5 },
    { rating: 3 },
  ]);

  assert.equal(summary.average, 4.3);
  assert.equal(summary.count, 4);
  assert.equal(summary.label, "4.3");
});

test("keeps a zero rating and zero count when there are no reviews", () => {
  const summary = summarizeStoreRating([]);

  assert.equal(summary.average, 0);
  assert.equal(summary.count, 0);
  assert.equal(summary.label, "0.0");
});
