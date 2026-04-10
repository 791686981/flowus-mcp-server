import assert from "node:assert/strict";
import test from "node:test";
import { normalizePageProperties } from "../../src/normalizers/properties.js";

const canonicalTitleProperty = {
  id: "title",
  type: "title",
  title: [
    {
      type: "text",
      text: {
        content: "EP04 - 校审流程",
      },
    },
  ],
};

test("normalizePageProperties expands title shorthand", () => {
  assert.deepEqual(
    normalizePageProperties({ title: "EP04 - 校审流程" }),
    { title: canonicalTitleProperty },
  );
});

test("normalizePageProperties preserves canonical title properties", () => {
  assert.deepEqual(
    normalizePageProperties({ title: canonicalTitleProperty }),
    { title: canonicalTitleProperty },
  );
});

test("normalizePageProperties rejects unsupported shorthand", () => {
  assert.throws(
    () => normalizePageProperties({ status: "Draft" }),
    /Unsupported shorthand for property "status"/,
  );
});
