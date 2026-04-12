import assert from "node:assert/strict";
import test from "node:test";
import { blocksFromMarkdown } from "../../src/markdown/blocks_from_markdown.js";
import type { BlockNode } from "../../src/markdown/types.js";

test("blocksFromMarkdown converts supported markdown nodes into canonical block payloads", () => {
  const nodes: BlockNode[] = [
    {
      type: "heading_1",
      rich_text: [
        { type: "text", text: { content: "Project Spec" } },
        {
          type: "text",
          text: { content: " P0" },
          annotations: { bold: true, code: true },
        },
      ],
    },
    {
      type: "paragraph",
      rich_text: [{ type: "text", text: { content: "Intro paragraph." } }],
    },
    {
      type: "bulleted_list_item",
      rich_text: [{ type: "text", text: { content: "Capture requirements" } }],
      children: [
        {
          type: "to_do",
          checked: true,
          rich_text: [{ type: "text", text: { content: "Ship nested" } }],
        },
      ],
    },
    {
      type: "numbered_list_item",
      rich_text: [{ type: "text", text: { content: "Implement parser" } }],
    },
    {
      type: "quote",
      rich_text: [{ type: "text", text: { content: "Keep it concise." } }],
    },
    {
      type: "to_do",
      checked: true,
      rich_text: [{ type: "text", text: { content: "Ship beta" } }],
    },
    {
      type: "code",
      language: "ts",
      rich_text: [{ type: "text", text: { content: "const ready = true;" } }],
    },
    {
      type: "divider",
    },
  ];

  const blocks = blocksFromMarkdown(nodes);

  assert.deepEqual(blocks, [
    {
      type: "heading_1",
      data: {
        rich_text: [
          { type: "text", text: { content: "Project Spec" } },
          {
            type: "text",
            text: { content: " P0" },
            annotations: { bold: true, code: true },
          },
        ],
      },
    },
    {
      type: "paragraph",
      data: {
        rich_text: [{ type: "text", text: { content: "Intro paragraph." } }],
      },
    },
    {
      type: "bulleted_list_item",
      data: {
        rich_text: [{ type: "text", text: { content: "Capture requirements" } }],
      },
      children: [
        {
          type: "to_do",
          data: {
            checked: true,
            rich_text: [{ type: "text", text: { content: "Ship nested" } }],
          },
        },
      ],
    },
    {
      type: "numbered_list_item",
      data: {
        rich_text: [{ type: "text", text: { content: "Implement parser" } }],
      },
    },
    {
      type: "quote",
      data: {
        rich_text: [{ type: "text", text: { content: "Keep it concise." } }],
      },
    },
    {
      type: "to_do",
      data: {
        checked: true,
        rich_text: [{ type: "text", text: { content: "Ship beta" } }],
      },
    },
    {
      type: "code",
      data: {
        language: "ts",
        rich_text: [{ type: "text", text: { content: "const ready = true;" } }],
      },
    },
    {
      type: "divider",
      data: {},
    },
  ]);
});

test("blocksFromMarkdown converts simple tables into a table block with table_row children", () => {
  const blocks = blocksFromMarkdown([
    {
      type: "table",
      hasHeaderRow: true,
      rows: [
        ["Name", "Status"],
        ["API", "Done"],
      ],
    },
  ]);

  assert.deepEqual(blocks, [
    {
      type: "table",
      data: {
        table_width: 2,
        has_column_header: true,
        has_row_header: false,
      },
      children: [
        {
          type: "table_row",
          data: {
            cells: [
              [{ type: "text", text: { content: "Name" } }],
              [{ type: "text", text: { content: "Status" } }],
            ],
          },
        },
        {
          type: "table_row",
          data: {
            cells: [
              [{ type: "text", text: { content: "API" } }],
              [{ type: "text", text: { content: "Done" } }],
            ],
          },
        },
      ],
    },
  ]);
});

test("blocksFromMarkdown fails locally for malformed table nodes", () => {
  assert.throws(
    () =>
      blocksFromMarkdown([
        {
          type: "table",
          hasHeaderRow: false,
          rows: [
            ["Name", "Status"],
            ["Only one"],
          ],
        },
      ]),
    /column width/i,
  );
});
