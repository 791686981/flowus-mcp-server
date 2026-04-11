import { normalizeTable } from "./tables.js";
import type { BlockNode, NormalizedTable } from "./types.js";

type CanonicalBlock =
  | {
      type:
        | "paragraph"
        | "heading_1"
        | "heading_2"
        | "heading_3"
        | "bulleted_list_item"
        | "numbered_list_item"
        | "quote";
      data: {
        rich_text: unknown[];
      };
    }
  | {
      type: "to_do";
      data: {
        checked: boolean;
        rich_text: unknown[];
      };
    }
  | {
      type: "code";
      data: {
        language: string;
        rich_text: unknown[];
      };
    }
  | {
      type: "divider";
      data: Record<string, never>;
    }
  | {
      type: "table";
      data: {
        table_width: number;
        has_column_header: boolean;
        has_row_header: boolean;
      };
      children: Array<{
        type: "table_row";
        data: {
          cells: unknown[][];
        };
      }>;
    };

function tableBlockFromNormalizedTable(table: NormalizedTable): CanonicalBlock {
  return {
    type: "table",
    data: {
      table_width: table.width,
      has_column_header: table.hasHeaderRow,
      has_row_header: false,
    },
    children: table.rows.map((row) => ({
      type: "table_row",
      data: {
        cells: row.map((cell) => cell.rich_text),
      },
    })),
  };
}

export function blocksFromMarkdown(nodes: BlockNode[]): CanonicalBlock[] {
  return nodes.map((node) => {
    switch (node.type) {
      case "paragraph":
      case "heading_1":
      case "heading_2":
      case "heading_3":
      case "bulleted_list_item":
      case "numbered_list_item":
      case "quote":
        return {
          type: node.type,
          data: {
            rich_text: node.rich_text,
          },
        };
      case "to_do":
        return {
          type: "to_do",
          data: {
            checked: node.checked,
            rich_text: node.rich_text,
          },
        };
      case "code":
        return {
          type: "code",
          data: {
            language: node.language ?? "plain text",
            rich_text: node.rich_text,
          },
        };
      case "divider":
        return {
          type: "divider",
          data: {},
        };
      case "table":
        return tableBlockFromNormalizedTable(normalizeTable(node));
      default: {
        const exhaustive: never = node;
        throw new Error(`Unsupported markdown node: ${String(exhaustive)}`);
      }
    }
  });
}
