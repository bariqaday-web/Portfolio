import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthCallbackUrl, safeAuthNextPath } from "./auth-redirect.ts";

test("auth callbacks prefer the configured canonical site origin", () => {
  const result = new URL(buildAuthCallbackUrl("https://temporary.app.github.dev", "/home", "https://salix.example"));
  assert.equal(result.origin, "https://salix.example");
  assert.equal(result.pathname, "/auth/callback");
  assert.equal(result.searchParams.get("next"), "/home");
});

test("auth callback builder keeps a safe internal destination", () => {
  const result = new URL(buildAuthCallbackUrl("http://localhost:3000", "/profile/settings"));
  assert.equal(result.origin, "http://localhost:3000");
  assert.equal(result.searchParams.get("next"), "/profile/settings");
});

test("auth callback rejects protocol-relative and backslash redirect paths", () => {
  assert.equal(safeAuthNextPath("//attacker.example", "https://salix.example"), "/home");
  assert.equal(safeAuthNextPath("/\\attacker.example", "https://salix.example"), "/home");
});