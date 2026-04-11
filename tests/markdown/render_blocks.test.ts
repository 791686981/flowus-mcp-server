import assert from "node:assert/strict";
import test from "node:test";
import { renderBlocksToMarkdown } from "../../src/markdown/render_blocks.js";

test("renderBlocksToMarkdown renders core blocks, dividers, and simple tables", () => {
  const result = renderBlocksToMarkdown([
    {
      id: "heading_1",
      type: "heading_2",
      data: {
        rich_text: [{ type: "text", text: { content: "Summary" } }],
      },
    },
    {
      id: "paragraph_1",
      type: "paragraph",
      data: {
        rich_text: [{ type: "text", text: { content: "This page explains the rollout." } }],
      },
    },
    {
      id: "list_1",
      type: "bulleted_list_item",
      data: {
        rich_text: [{ type: "text", text: { content: "Capture requirements" } }],
      },
    },
    {
      id: "list_2",
      type: "numbered_list_item",
      data: {
        rich_text: [{ type: "text", text: { content: "Implement renderer" } }],
      },
    },
    {
      id: "todo_1",
      type: "to_do",
      data: {
        checked: true,
        rich_text: [{ type: "text", text: { content: "Ship the markdown interface" } }],
      },
    },
    {
      id: "quote_1",
      type: "quote",
      data: {
        rich_text: [{ type: "text", text: { content: "Ship the markdown interface first." } }],
      },
    },
    {
      id: "code_1",
      type: "code",
      data: {
        language: "ts",
        rich_text: [{ type: "text", text: { content: "const ready = true;" } }],
      },
    },
    {
      id: "divider_1",
      type: "divider",
      data: {},
    },
    {
      id: "table_1",
      type: "table",
      data: {
        table_width: 2,
        has_column_header: true,
        has_row_header: false,
      },
      children: [
        {
          id: "row_1",
          type: "table_row",
          data: {
            cells: [
              [{ type: "text", text: { content: "Name" } }],
              [{ type: "text", text: { content: "Status" } }],
            ],
          },
        },
        {
          id: "row_2",
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

  assert.match(result.markdown, /^## Summary$/m);
  assert.match(result.markdown, /This page explains the rollout\./);
  assert.match(result.markdown, /^- Capture requirements$/m);
  assert.match(result.markdown, /^1\. Implement renderer$/m);
  assert.match(result.markdown, /^- \[x\] Ship the markdown interface$/m);
  assert.match(result.markdown, /^> Ship the markdown interface first\.$/m);
  assert.match(result.markdown, /```ts[\s\S]*const ready = true;[\s\S]*```/m);
  assert.match(result.markdown, /^---$/m);
  assert.match(result.markdown, /^\| Name \| Status \|$/m);
  assert.match(result.markdown, /^\| API \| Done \|$/m);
  const blockIds = result.metadata.block_map.map(
    (entry: { block_id: string }) => entry.block_id,
  );
  for (const expectedId of [
    "heading_1",
    "paragraph_1",
    "list_1",
    "list_2",
    "todo_1",
    "quote_1",
    "code_1",
    "divider_1",
    "table_1",
  ]) {
    assert.ok(blockIds.includes(expectedId));
  }
  assert.deepEqual(result.metadata.unsupported_blocks, []);
});

test("renderBlocksToMarkdown emits placeholders and metadata for unsupported blocks", () => {
  const result = renderBlocksToMarkdown([
    {
      id: "embed_1",
      type: "embed",
      data: {
        url: "https://example.com/demo",
      },
    },
  ]);

  assert.match(result.markdown, /\[flowus-block type="embed" id="embed_1"\]/);
  assert.deepEqual(result.metadata.unsupported_blocks, [
    {
      block_id: "embed_1",
      type: "embed",
      reason: "Unsupported block type for markdown rendering",
    },
  ]);
});

test("renderBlocksToMarkdown does not silently drop non-text rich text segments", () => {
  const result = renderBlocksToMarkdown([
    {
      id: "paragraph_formula",
      type: "paragraph",
      data: {
        rich_text: [
          { type: "text", text: { content: "Energy: " } },
          { type: "equation", expression: "mc^2" },
        ],
      },
    },
  ]);

  assert.match(result.markdown, /Energy:/);
  assert.match(result.markdown, /\[unsupported-rich-text type="equation"\]/);
});
