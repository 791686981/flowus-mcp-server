import type {
  FlowUsTableBlock,
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

function flowUsCellToPlainText(cell: Array<{ type: string; text?: { content?: string } }>): string {
  return cell
    .map((item) => {
      if (item.type === "text" && typeof item.text?.content === "string") {
        return item.text.content;
      }
      throw new Error("Only text rich_text items are supported in table cells");
    })
    .join("");
}

export function flowusTableToTableNode(table: FlowUsTableBlock): TableNode {
  const width = table.data?.table_width ?? 0;
  const hasHeaderRow = Boolean(table.data?.has_column_header);
  const rows = table.children ?? [];
  if (width <= 0 || rows.length === 0) {
    throw new Error("Table must contain column width and at least one row");
  }

  const markdownRows = rows.map((row, index) => {
    if (!row.data?.cells) {
      throw new Error(`Row ${index + 1} is missing cells`);
    }
    if (row.data.cells.length !== width) {
      throw new Error(`Row ${index + 1} has mismatched column width`);
    }
    return row.data.cells.map((cell) => flowUsCellToPlainText(cell));
  });

  return {
    type: "table",
    rows: markdownRows,
    hasHeaderRow,
  };
}
