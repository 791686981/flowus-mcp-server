import type { BlockNode, CodeBlockNode, ParagraphLikeNode, TableNode, ToDoNode } from "./types.js";
import { parseInlineRichText, plainTextToRichText } from "./inline_rich_text.js";

export type ParsedMarkdownDocument = {
  nodes: BlockNode[];
};

const TABLE_SEPARATOR_RE = /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/;

function text(content: string) {
  return parseInlineRichText(content);
}

function plainText(content: string) {
  return plainTextToRichText(content);
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
  if (/^[ \t]+/.test(line) && !/^[ \t]+(?:- |\d+\.\s|- \[[ xX]\]\s)/.test(line)) {
    throw new Error("Unsupported indented markdown block in strict markdown mode");
  }
}

function indentationWidth(line: string): number {
  let width = 0;
  let index = 0;

  while (index < line.length) {
    const char = line[index] ?? "";
    if (char === " ") {
      width += 1;
      index += 1;
      continue;
    }
    if (char === "\t") {
      width += 2;
      index += 1;
      continue;
    }
    break;
  }

  return width;
}

function trimLeadingIndent(line: string): string {
  return line.replace(/^[ \t]+/, "");
}

type ParsedListLine =
  | { type: "bulleted_list_item"; content: string }
  | { type: "numbered_list_item"; content: string }
  | { type: "to_do"; content: string; checked: boolean };

function parseListLine(trimmed: string): ParsedListLine | null {
  const todoMatch = trimmed.match(/^- \[([ xX])\]\s+(.+)$/);
  if (todoMatch) {
    return {
      type: "to_do",
      checked: todoMatch[1].toLowerCase() === "x",
      content: todoMatch[2],
    };
  }

  const bulletMatch = trimmed.match(/^- (.+)$/);
  if (bulletMatch) {
    return {
      type: "bulleted_list_item",
      content: bulletMatch[1],
    };
  }

  const numberedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
  if (numberedMatch) {
    return {
      type: "numbered_list_item",
      content: numberedMatch[1],
    };
  }

  return null;
}

function isListLineAtIndent(line: string, indent: number): boolean {
  if (!line.trim()) {
    return false;
  }

  return indentationWidth(line) === indent && parseListLine(trimLeadingIndent(line)) !== null;
}

function createListNode(parsed: ParsedListLine): ParagraphLikeNode | ToDoNode {
  if (parsed.type === "to_do") {
    return {
      type: "to_do",
      checked: parsed.checked,
      rich_text: text(parsed.content),
    };
  }

  return {
    type: parsed.type,
    rich_text: text(parsed.content),
  };
}

function parseList(lines: string[], start: number, indent: number): { nodes: BlockNode[]; nextIndex: number } {
  const nodes: BlockNode[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      break;
    }

    if (indentationWidth(line) !== indent) {
      break;
    }

    const parsedLine = parseListLine(trimLeadingIndent(line));
    if (!parsedLine) {
      break;
    }

    const node = createListNode(parsedLine);
    let combinedContent = parsedLine.content;
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index] ?? "";
      if (!nextLine.trim()) {
        break;
      }

      const nextIndent = indentationWidth(nextLine);
      const nextTrimmed = trimLeadingIndent(nextLine);

      if (nextIndent < indent) {
        break;
      }

      if (nextIndent === indent && parseListLine(nextTrimmed)) {
        break;
      }

      if (nextIndent > indent) {
        if (parseListLine(nextTrimmed)) {
          const { nodes: children, nextIndex } = parseList(lines, index, nextIndent);
          node.children = [...(node.children ?? []), ...children];
          index = nextIndex;
          continue;
        }

        combinedContent += ` ${nextTrimmed}`;
        if ("rich_text" in node) {
          node.rich_text = text(combinedContent);
        }
        index += 1;
        continue;
      }

      break;
    }

    nodes.push(node);
  }

  return {
    nodes,
    nextIndex: index,
  };
}

function parseTableRow(line: string): TableNode["rows"][number] {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    throw new Error("Malformed table row");
  }

  const cells: string[] = [];
  let cell = "";
  let index = trimmed.startsWith("|") ? 1 : 0;
  const end = trimmed.endsWith("|") ? trimmed.length - 1 : trimmed.length;
  let codeDelimiter: string | null = null;

  while (index < end) {
    const char = trimmed[index] ?? "";

    if (char === "\\") {
      const escaped = trimmed[index + 1];
      if (escaped) {
        cell += `\\${escaped}`;
        index += 2;
        continue;
      }
    }

    if (codeDelimiter) {
      if (trimmed.startsWith(codeDelimiter, index)) {
        cell += codeDelimiter;
        index += codeDelimiter.length;
        codeDelimiter = null;
        continue;
      }
      cell += char;
      index += 1;
      continue;
    }

    if (char === "`") {
      let tickCount = 1;
      while (trimmed[index + tickCount] === "`") {
        tickCount += 1;
      }
      codeDelimiter = "`".repeat(tickCount);
      cell += codeDelimiter;
      index += tickCount;
      continue;
    }

    if (char === "|") {
      cells.push(cell.trim());
      cell = "";
      index += 1;
      continue;
    }

    cell += char;
    index += 1;
  }

  cells.push(cell.trim());
  return cells.map((value) => parseInlineRichText(value));
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

  const rows: TableNode["rows"] = [header];
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
        rich_text: plainText(buffer.join("\n")),
      };
      nodes.push(node);
      index += 1;
      continue;
    }

    const listLine = parseListLine(trimmed);
    if (listLine) {
      const { nodes: listNodes, nextIndex } = parseList(lines, index, indentationWidth(line));
      nodes.push(...listNodes);
      index = nextIndex;
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
      if (indentationWidth(next) > 0) {
        throw new Error("Unsupported indented markdown block in strict markdown mode");
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
