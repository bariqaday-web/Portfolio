import test from "node:test";
import assert from "node:assert/strict";
import { isUsefulSearchSuggestion } from "./search-suggestions.ts";

test("keeps meaningful Arabic product names and removes obvious noise", () => {
  assert.equal(isUsefulSearchSuggestion("سيارات"), true);
  assert.equal(isUsefulSearchSuggestion("سياره"), true);
  assert.equal(isUsefulSearchSuggestion("قماش قطع كشمير"), true);
  assert.equal(isUsefulSearchSuggestion("ههه"), false);
  assert.equal(isUsefulSearchSuggestion("فف٤٤"), false);
  assert.equal(isUsefulSearchSuggestion("لالاتىنم"), false);
  assert.equal(isUsefulSearchSuggestion("ه"), false);
});
