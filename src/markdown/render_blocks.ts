import { flowusTableToTableNode } from "./tables.js";
import type { RenderedBlockMapEntry, UnsupportedBlockEntry } from "./types.js";

type FlowUsBlock = {
  id: string;
  type: string;
  data?: Record<string, unknown>;
  children?: unknown[];
};

type RenderResult = {
  markdown: string;
  metadata: {
    block_map: RenderedBlockMapEntry[];
    unsupported_blocks: UnsupportedBlockEntry[];
  };
};

function richTextToPlainText(richText: unknown): string {
  if (!Array.isArray(richText)) {
    return "";
  }

  return richText
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        (item as { type?: string }).type === "text" &&
        typeof (item as { text?: { content?: unknown } }).text?.content === "string"
      ) {
        return (item as { text: { content: string } }).text.content;
      }
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { type?: unknown }).type === "string"
      ) {
        return `[unsupported-rich-text type="${String((item as { type: string }).type)}"]`;
      }
      return "[unsupported-rich-text]";
    })
    .join("");
}

function renderTable(block: FlowUsBlock): string {
  const table = flowusTableToTableNode(block as Parameters<typeof flowusTableToTableNode>[0]);
  const rows = table.rows.map((row) => `| ${row.join(" | ")} |`);
  if (!table.hasHeaderRow || rows.length === 0) {
    return rows.join("\n");
  }

  const separator = `| ${table.rows[0].map(() => "---").join(" | ")} |`;
  return [rows[0], separator, ...rows.slice(1)].join("\n");
}

function renderBlock(block: FlowUsBlock): { markdown: string; unsupported?: UnsupportedBlockEntry } {
  const text = richTextToPlainText(block.data?.rich_text);

  switch (block.type) {
    case "paragraph":
      return { markdown: text };
    case "heading_1":
      return { markdown: `# ${text}` };
    case "heading_2":
      return { markdown: `## ${text}` };
    case "heading_3":
      return { markdown: `### ${text}` };
    case "bulleted_list_item":
      return { markdown: `- ${text}` };
    case "numbered_list_item":
      return { markdown: `1. ${text}` };
    case "to_do": {
      const checked = Boolean(block.data?.checked);
      return { markdown: `- [${checked ? "x" : " "}] ${text}` };
    }
    case "quote":
      return { markdown: `> ${text}` };
    case "code": {
      const language =
        typeof block.data?.language === "string" ? block.data.language : "";
      return { markdown: `\`\`\`${language}\n${text}\n\`\`\`` };
    }
    case "divider":
      return { markdown: "---" };
    case "table":
      return { markdown: renderTable(block) };
    default:
      return {
        markdown: `[flowus-block type="${block.type}" id="${block.id}"]`,
        unsupported: {
          block_id: block.id,
          type: block.type,
          reason: "Unsupported block type for markdown rendering",
        },
      };
  }
}

export function renderBlocksToMarkdown(blocks: FlowUsBlock[]): RenderResult {
  const lines: string[] = [];
  const blockMap: RenderedBlockMapEntry[] = [];
  const unsupportedBlocks: UnsupportedBlockEntry[] = [];

  blocks.forEach((block, index) => {
    const { markdown, unsupported } = renderBlock(block);
    if (lines.length > 0) {
      lines.push("");
    }

    const start = lines.length + 1;
    const chunkLines = markdown.split("\n");
    lines.push(...chunkLines);
    const end = lines.length;

    blockMap.push({
      block_id: block.id,
      type: block.type,
      line_start: start,
      line_end: end,
      path: `blocks.${index}`,
    });

    if (unsupported) {
      unsupportedBlocks.push(unsupported);
    }
  });

  return {
    markdown: lines.join("\n"),
    metadata: {
      block_map: blockMap,
      unsupported_blocks: unsupportedBlocks,
    },
  };
}
