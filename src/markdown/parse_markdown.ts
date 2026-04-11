import type { BlockNode, CodeBlockNode, ParagraphLikeNode, TableNode, ToDoNode } from "./types.js";

export type ParsedMarkdownDocument = {
  nodes: BlockNode[];
};

const TABLE_SEPARATOR_RE = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

function text(content: string) {
  return [{ type: "text" as const, text: { content } }];
}

function rejectUnsupportedSyntax(line: string, trimmed: string) {
  if (/^(#{4,})\s+/.test(trimmed)) {
    throw new Error("Unsupported heading level in strict markdown mode");
  }
  if (/^\*\s+/.test(trimmed)) {
    throw new Error("Unsupported unordered list marker in strict markdown mode");
  }
  if (/^!\[[^\]]*\]\([^)]+\)$/.test(trimmed)) {
    throw new Error("Unsupported image syntax in strict markdown mode");
  }
  if (/^[ \t]+(?:- |\* |\d+\.\s|- \[[ xX]\]\s)/.test(line)) {
    throw new Error("Unsupported nested list in strict markdown mode");
  }
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    throw new Error("Malformed table row");
  }

  return trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseTable(lines: string[], start: number): { node: TableNode; nextIndex: number } {
  const header = parseTableRow(lines[start] ?? "");
  const separator = lines[start + 1] ?? "";

  if (!TABLE_SEPARATOR_RE.test(separator)) {
    throw new Error("Malformed markdown table separator");
  }
  const separatorColumns = parseTableRow(separator);

  if (header.length === 0) {
    throw new Error("Markdown table header cannot be empty");
  }
  if (separatorColumns.length !== header.length) {
    throw new Error("Malformed markdown table: separator width mismatch");
  }

  const rows: string[][] = [header];
  let index = start + 2;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      break;
    }
    if (!line.includes("|")) {
      break;
    }

    const row = parseTableRow(line);
    if (row.length !== header.length) {
      throw new Error(`Malformed markdown table: row ${rows.length + 1} width mismatch`);
    }
    rows.push(row);
    index += 1;
  }

  return {
    node: {
      type: "table",
      rows,
      hasHeaderRow: true,
    },
    nextIndex: index,
  };
}

export function parseMarkdownDocument(markdown: string): ParsedMarkdownDocument {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: BlockNode[] = [];

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    rejectUnsupportedSyntax(line, trimmed);

    const tableCandidate = lines[index + 1] ?? "";
    if (trimmed.includes("|") && TABLE_SEPARATOR_RE.test(tableCandidate)) {
      const { node, nextIndex } = parseTable(lines, index);
      nodes.push(node);
      index = nextIndex;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const node: ParagraphLikeNode = {
        type: `heading_${level}` as ParagraphLikeNode["type"],
        rich_text: text(headingMatch[2]),
      };
      nodes.push(node);
      index += 1;
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      nodes.push({ type: "divider" });
      index += 1;
      continue;
    }

    const codeFenceMatch = trimmed.match(/^```(\S+)?$/);
    if (codeFenceMatch) {
      const buffer: string[] = [];
      index += 1;

      while (index < lines.length && !/^\s*```$/.test(lines[index] ?? "")) {
        buffer.push(lines[index] ?? "");
        index += 1;
      }

      if (index >= lines.length) {
        throw new Error("Unclosed fenced code block");
      }

      const node: CodeBlockNode = {
        type: "code",
        language: codeFenceMatch[1] || undefined,
        rich_text: text(buffer.join("\n")),
      };
      nodes.push(node);
      index += 1;
      continue;
    }

    const todoMatch = trimmed.match(/^- \[([ xX])\]\s+(.+)$/);
    if (todoMatch) {
      const node: ToDoNode = {
        type: "to_do",
        checked: todoMatch[1].toLowerCase() === "x",
        rich_text: text(todoMatch[2]),
      };
      nodes.push(node);
      index += 1;
      continue;
    }

    const bulletMatch = trimmed.match(/^- (.+)$/);
    if (bulletMatch) {
      nodes.push({
        type: "bulleted_list_item",
        rich_text: text(bulletMatch[1]),
      });
      index += 1;
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      nodes.push({
        type: "numbered_list_item",
        rich_text: text(numberedMatch[1]),
      });
      index += 1;
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      nodes.push({
        type: "quote",
        rich_text: text(quoteMatch[1]),
      });
      index += 1;
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    while (index < lines.length) {
      const next = lines[index] ?? "";
      const nextTrimmed = next.trim();
      const afterNext = lines[index + 1] ?? "";

      if (!nextTrimmed) {
        break;
      }
      if (
        /^(#{1,3})\s+/.test(nextTrimmed) ||
        /^- \[([ xX])\]\s+/.test(nextTrimmed) ||
        /^- /.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        /^>\s?/.test(nextTrimmed) ||
        /^```/.test(nextTrimmed) ||
        /^-{3,}$/.test(nextTrimmed) ||
        (nextTrimmed.includes("|") && TABLE_SEPARATOR_RE.test(afterNext))
      ) {
        break;
      }

      paragraphLines.push(nextTrimmed);
      index += 1;
    }

    nodes.push({
      type: "paragraph",
      rich_text: text(paragraphLines.join(" ")),
    });
  }

  return { nodes };
}
