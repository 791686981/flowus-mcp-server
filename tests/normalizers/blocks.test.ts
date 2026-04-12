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

test("normalizeBlockChildren normalizes nested child blocks recursively", () => {
  assert.deepEqual(
    normalizeBlockChildren([
      {
        type: "bulleted_list_item",
        data: {
          rich_text: "parent",
        },
        children: [
          {
            type: "to_do",
            data: {
              checked: true,
              rich_text: "child",
            },
          },
        ],
      },
    ]),
    [
      {
        type: "bulleted_list_item",
        data: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "parent",
              },
            },
          ],
        },
        children: [
          {
            type: "to_do",
            data: {
              checked: true,
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "child",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  );
});

test("normalizeBlockChildren rejects shorthand on unsupported block types", () => {
  assert.throws(
    () =>
      normalizeBlockChildren([
        {
          type: "bookmark",
          data: {
            rich_text: "hello",
          },
        },
      ]),
    /Unsupported shorthand for block type "bookmark"/,
  );
});
