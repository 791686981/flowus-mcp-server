import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBlockChildren } from "../../src/normalizers/blocks.js";

test("normalizeBlockChildren expands text block rich text shorthand", () => {
  assert.deepEqual(
    normalizeBlockChildren([
      {
        type: "paragraph",
        data: {
          rich_text: "hello",
        },
      },
    ]),
    [
      {
        type: "paragraph",
        data: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "hello",
              },
            },
          ],
        },
      },
    ],
  );
});

test("normalizeBlockChildren expands callout icon shorthand", () => {
  assert.deepEqual(
    normalizeBlockChildren([
      {
        type: "callout",
        data: {
          rich_text: "note",
          icon: "💡",
        },
      },
    ]),
    [
      {
        type: "callout",
        data: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "note",
              },
            },
          ],
          icon: {
            emoji: "💡",
          },
        },
      },
    ],
  );
});

test("normalizeBlockChildren rejects shorthand on unsupported block types", () => {
  assert.throws(
    () =>
      normalizeBlockChildren([
        {
          type: "image",
          data: {
            type: "external",
            external: {
              url: "https://example.com/image.png",
            },
            rich_text: "hello",
          },
        },
      ]),
    /Unsupported shorthand for block type "image"/,
  );
});
