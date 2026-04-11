import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTable } from "../../src/markdown/tables.js";
import type { TableNode } from "../../src/markdown/types.js";

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
    rows: [["Name", { type: "paragraph", text: "Bad" }]],
    hasHeaderRow: false,
  };

  assert.throws(() => normalizeTable(table), /inline/i);
});
