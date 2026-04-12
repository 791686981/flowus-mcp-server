import { normalizeTable } from "./tables.js";
import type { BlockNode, NormalizedTable, ParagraphLikeNode, ToDoNode } from "./types.js";

type CanonicalBlock = {
  type: string;
  data: Record<string, unknown>;
  children?: CanonicalBlock[];
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

function withChildren<T extends { children?: BlockNode[] }>(
  block: T,
  converted: CanonicalBlock,
): CanonicalBlock {
  if (!block.children || block.children.length === 0) {
    return converted;
  }

  return {
    ...converted,
    children: blocksFromMarkdown(block.children),
  };
}

function textBlockFromMarkdown(node: ParagraphLikeNode): CanonicalBlock {
  return withChildren(node, {
    type: node.type,
    data: {
      rich_text: node.rich_text,
    },
  });
}

function todoBlockFromMarkdown(node: ToDoNode): CanonicalBlock {
  return withChildren(node, {
    type: "to_do",
    data: {
      checked: node.checked,
      rich_text: node.rich_text,
    },
  });
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
        return textBlockFromMarkdown(node);
      case "to_do":
        return todoBlockFromMarkdown(node);
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
