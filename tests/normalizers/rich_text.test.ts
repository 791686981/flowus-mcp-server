import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRichText } from "../../src/normalizers/rich_text.js";

test("normalizeRichText expands string shorthand", () => {
  assert.deepEqual(normalizeRichText("hello"), [
    {
      type: "text",
      text: { content: "hello" },
    },
  ]);
});

test("normalizeRichText expands string arrays", () => {
  assert.deepEqual(normalizeRichText(["a", "b"]), [
    {
      type: "text",
      text: { content: "a" },
    },
    {
      type: "text",
      text: { content: "b" },
    },
  ]);
});

test("normalizeRichText fills in safe text item defaults", () => {
  assert.deepEqual(
    normalizeRichText([
      {
        text: { content: "hello" },
      },
    ]),
    [
      {
        type: "text",
        text: { content: "hello" },
      },
    ],
  );
});
