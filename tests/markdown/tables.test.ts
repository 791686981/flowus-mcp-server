import assert from "node:assert/strict";
import test from "node:test";
import { flowusTableToTableNode, normalizeTable } from "../../src/markdown/tables.js";
import type { FlowUsTableBlock, TableNode } from "../../src/markdown/types.js";

test("normalizeTable keeps simple tables well-formed", () => {
  const table: TableNode = {
    type: "table",
    rows: [
      ["Name", "Status"],
      ["API", "Done"],
    ],
    hasHeaderRow: true,
  };

  const normalized = normalizeTable(table);

  assert.equal(normalized.width, 2);
  assert.equal(normalized.hasHeaderRow, true);
  assert.deepEqual(normalized.rows, [
    [
      { rich_text: [{ type: "text", text: { content: "Name" } }] },
      { rich_text: [{ type: "text", text: { content: "Status" } }] },
    ],
    [
      { rich_text: [{ type: "text", text: { content: "API" } }] },
      { rich_text: [{ type: "text", text: { content: "Done" } }] },
    ],
  ]);
});

test("normalizeTable accepts canonical inline text cell objects", () => {
  const table: TableNode = {
    type: "table",
    rows: [
      [{ type: "text", text: { content: "Name" } }, "Status"],
      ["API", "Done"],
    ],
    hasHeaderRow: true,
  };

  const normalized = normalizeTable(table);

  assert.deepEqual(normalized.rows[0], [
    { rich_text: [{ type: "text", text: { content: "Name" } }] },
    { rich_text: [{ type: "text", text: { content: "Status" } }] },
  ]);
});

test("normalizeTable rejects rows with mismatched width", () => {
  const table: TableNode = {
    type: "table",
    rows: [
      ["Name", "Status"],
      ["Only one"],
    ],
    hasHeaderRow: false,
  };

  assert.throws(() => normalizeTable(table), /column width/i);
});

test("normalizeTable rejects block-level cell content", () => {
  const table: TableNode = {
    type: "table",
    rows: [["Name", { type: "paragraph", text: { content: "Bad" } } as never]],
    hasHeaderRow: false,
  };

  assert.throws(() => normalizeTable(table), /inline/i);
});

test("flowusTableToTableNode converts FlowUS table and rows to markdown table rows", () => {
  const table: FlowUsTableBlock = {
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
  };

  const node = flowusTableToTableNode(table);

  assert.equal(node.hasHeaderRow, true);
  assert.deepEqual(node.rows, [
    ["Name", "Status"],
    ["API", "Done"],
  ]);
});

test("flowusTableToTableNode rejects row width mismatch", () => {
  const table: FlowUsTableBlock = {
    id: "table_1",
    type: "table",
    data: {
      table_width: 2,
      has_column_header: false,
      has_row_header: false,
    },
    children: [
      {
        id: "row_1",
        type: "table_row",
        data: {
          cells: [[{ type: "text", text: { content: "Only one" } }]],
        },
      },
    ],
  };

  assert.throws(() => flowusTableToTableNode(table), /mismatched column width/i);
});
