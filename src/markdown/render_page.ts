import { renderBlocksToMarkdown } from "./render_blocks.js";
import type { RenderedBlockMapEntry } from "./types.js";

type FlowUsPage = {
  properties?: Record<string, unknown>;
};

type FlowUsBlock = {
  id: string;
  type: string;
  data?: Record<string, unknown>;
  children?: unknown[];
};

type RenderPageOptions = {
  includeProperties?: boolean;
};

function countLines(text: string): number {
  return text.length === 0 ? 0 : text.split("\n").length;
}

function extractTitle(properties: Record<string, unknown> | undefined): string | undefined {
  if (!properties) {
    return undefined;
  }

  for (const value of Object.values(properties)) {
    if (
      value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "title" &&
      Array.isArray((value as { title?: unknown[] }).title)
    ) {
      const first = (value as { title: Array<{ text?: { content?: string } }> }).title[0];
      if (typeof first?.text?.content === "string") {
        return first.text.content;
      }
    }
  }

  return undefined;
}

function renderPageHeader(page: FlowUsPage): string {
  const properties = page.properties ?? {};
  const title = extractTitle(properties);
  const lines: string[] = [];

  if (title) {
    lines.push(`# ${title}`);
  }

  for (const [key, value] of Object.entries(properties)) {
    if (
      value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "title"
    ) {
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      lines.push(`- ${key}: ${String(value)}`);
    }
  }

  return lines.join("\n");
}

function offsetBlockMap(entries: RenderedBlockMapEntry[], offset: number): RenderedBlockMapEntry[] {
  return entries.map((entry) => ({
    ...entry,
    line_start: entry.line_start + offset,
    line_end: entry.line_end + offset,
  }));
}

export function renderPageToMarkdown(
  page: FlowUsPage,
  blocks: FlowUsBlock[],
  options: RenderPageOptions = {},
) {
  const includeProperties = options.includeProperties ?? true;
  const renderedBlocks = renderBlocksToMarkdown(blocks);

  if (!includeProperties) {
    return renderedBlocks;
  }

  const header = renderPageHeader(page);
  if (!header) {
    return renderedBlocks;
  }

  const headerLineCount = countLines(header);
  const markdown = renderedBlocks.markdown
    ? `${header}\n\n${renderedBlocks.markdown}`
    : header;

  return {
    markdown,
    metadata: {
      block_map: offsetBlockMap(renderedBlocks.metadata.block_map, headerLineCount + 1),
      unsupported_blocks: renderedBlocks.metadata.unsupported_blocks,
    },
  };
}
