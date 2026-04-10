import assert from "node:assert/strict";
import test from "node:test";
import { normalizeIcon } from "../../src/normalizers/icon.js";

test("normalizeIcon expands emoji shorthand", () => {
  assert.deepEqual(normalizeIcon("📁"), { emoji: "📁" });
});

test("normalizeIcon preserves canonical icon objects", () => {
  const icon = { emoji: "📁" };
  assert.deepEqual(normalizeIcon(icon), icon);
});

test("normalizeIcon rejects arbitrary strings", () => {
  assert.throws(() => normalizeIcon("folder"));
});
