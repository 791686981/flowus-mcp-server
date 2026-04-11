import type {
  InlineRichText,
  NormalizedTable,
  TableCell,
  TableNode,
} from "./types.js";

function toInlineRichText(cell: unknown): InlineRichText {
  if (typeof cell === "string") {
    return { type: "text", text: { content: cell } };
  }

  if (
    cell &&
    typeof cell === "object" &&
    (cell as { type?: string }).type === "text" &&
    typeof (cell as { text?: { content?: unknown } }).text?.content === "string"
  ) {
    return { type: "text", text: { content: (cell as { text: { content: string } }).text.content } };
  }

  throw new Error("Only inline text content is supported in table cells");
}

function toCell(cell: unknown): TableCell {
  return { rich_text: [toInlineRichText(cell)] };
}

export function normalizeTable(node: TableNode): NormalizedTable {
  if (!Array.isArray(node.rows) || node.rows.length === 0) {
    throw new Error("Table must contain at least one row");
  }

  const width = node.rows[0].length;
  if (width === 0) {
    throw new Error("Table rows cannot be empty");
  }

  const normalizedRows = node.rows.map((row, index) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`Row ${index + 1} has mismatched column width`);
    }
    return row.map(toCell);
  });

  return {
    width,
    hasHeaderRow: Boolean(node.hasHeaderRow),
    rows: normalizedRows,
  };
}
