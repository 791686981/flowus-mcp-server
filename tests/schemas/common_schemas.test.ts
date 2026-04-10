import assert from "node:assert/strict";
import test from "node:test";
import { InputIconSchema, InputRichTextSchema } from "../../src/schemas/input/common.js";
import { ApiIconSchema, ApiRichTextSchema } from "../../src/schemas/api/common.js";

test("input icon schema accepts emoji shorthand", () => {
  assert.equal(InputIconSchema.parse("📁"), "📁");
});

test("api icon schema rejects emoji shorthand", () => {
  assert.throws(() => ApiIconSchema.parse("📁"));
});

test("input rich text schema accepts string shorthand", () => {
  assert.equal(InputRichTextSchema.parse("hello"), "hello");
  assert.deepEqual(InputRichTextSchema.parse(["a", "b"]), ["a", "b"]);
});

test("api rich text schema only accepts canonical arrays", () => {
  const canonical = [
    {
      type: "text",
      text: { content: "hello" },
    },
  ];

  assert.deepEqual(ApiRichTextSchema.parse(canonical), canonical);
  assert.throws(() => ApiRichTextSchema.parse("hello"));
  assert.throws(() => ApiRichTextSchema.parse(["a", "b"]));
});
