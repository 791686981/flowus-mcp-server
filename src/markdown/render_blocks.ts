import { flowusTableToTableNode } from "./tables.js";
import { renderInlineRichText, richTextToPlainText } from "./inline_rich_text.js";
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

type BlockRenderContext = {
  depth: number;
  index: number;
  path: string;
};

function supportsNestedMarkdownChildren(type: string): boolean {
  return type === "bulleted_list_item" || type === "numbered_list_item" || type === "to_do";
}

function listIndent(depth: number): string {
  return "  ".repeat(depth);
}

function renderTable(block: FlowUsBlock): string {
  const table = flowusTableToTableNode(block as Parameters<typeof flowusTableToTableNode>[0]);
  const rows = table.rows.map(
    (row) =>
      `| ${row
        .map((cell) => renderInlineRichText(Array.isArray(cell) ? cell : [cell], { escapePipes: true }))
        .join(" | ")} |`,
  );
  if (!table.hasHeaderRow || rows.length === 0) {
    return rows.join("\n");
  }

  const separator = `| ${table.rows[0].map(() => "---").join(" | ")} |`;
  return [rows[0], separator, ...rows.slice(1)].join("\n");
}

function renderBlockLine(block: FlowUsBlock, depth: number): { markdown: string; unsupported?: UnsupportedBlockEntry } {
  const text = renderInlineRichText(block.data?.rich_text);
  const indent = listIndent(depth);

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
      return { markdown: `${indent}- ${text}` };
    case "numbered_list_item":
      return { markdown: `${indent}1. ${text}` };
    case "to_do": {
      const checked = Boolean(block.data?.checked);
      return { markdown: `${indent}- [${checked ? "x" : " "}] ${text}` };
    }
    case "quote":
      return { markdown: `> ${text}` };
    case "code": {
      const language =
        typeof block.data?.language === "string" ? block.data.language : "";
      const codeText = richTextToPlainText(block.data?.rich_text);
      return { markdown: `\`\`\`${language}\n${codeText}\n\`\`\`` };
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

function renderBlockTree(
  block: FlowUsBlock,
  context: BlockRenderContext,
): {
  lines: string[];
  block_map: RenderedBlockMapEntry[];
  unsupported_blocks: UnsupportedBlockEntry[];
} {
  const { markdown, unsupported } = renderBlockLine(block, context.depth);
  const lines = markdown.split("\n");
  const blockMap: RenderedBlockMapEntry[] = [{
    block_id: block.id,
    type: block.type,
    line_start: 1,
    line_end: lines.length,
    path: context.path,
  }];
  const unsupportedBlocks: UnsupportedBlockEntry[] = unsupported ? [unsupported] : [];

  if (
    supportsNestedMarkdownChildren(block.type) &&
    Array.isArray(block.children) &&
    block.children.length > 0
  ) {
    block.children.forEach((child, childIndex) => {
      const renderedChild = renderBlockTree(child as FlowUsBlock, {
        depth: context.depth + 1,
        index: childIndex,
        path: `${context.path}.children.${childIndex}`,
      });

      const lineOffset = lines.length;
      lines.push(...renderedChild.lines);
      blockMap.push(
        ...renderedChild.block_map.map((entry) => ({
          ...entry,
          line_start: entry.line_start + lineOffset,
          line_end: entry.line_end + lineOffset,
        })),
      );
      unsupportedBlocks.push(...renderedChild.unsupported_blocks);
    });
  }

  return {
    lines,
    block_map: blockMap,
    unsupported_blocks: unsupportedBlocks,
  };
}

export function renderBlocksToMarkdown(blocks: FlowUsBlock[]): RenderResult {
  const lines: string[] = [];
  const blockMap: RenderedBlockMapEntry[] = [];
  const unsupportedBlocks: UnsupportedBlockEntry[] = [];

  blocks.forEach((block, index) => {
    const rendered = renderBlockTree(block, {
      depth: 0,
      index,
      path: `blocks.${index}`,
    });
    if (lines.length > 0) {
      lines.push("");
    }

    const start = lines.length + 1;
    lines.push(...rendered.lines);
    blockMap.push(
      ...rendered.block_map.map((entry) => ({
        ...entry,
        line_start: entry.line_start + start - 1,
        line_end: entry.line_end + start - 1,
      })),
    );
    unsupportedBlocks.push(...rendered.unsupported_blocks);
  });

  return {
    markdown: lines.join("\n"),
    metadata: {
      block_map: blockMap,
      unsupported_blocks: unsupportedBlocks,
    },
  };
}
