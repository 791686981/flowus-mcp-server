import type { InlineRichText, InlineTextAnnotations } from "./types.js";

type InlineParseState = Pick<
  InlineTextAnnotations,
  "bold" | "italic" | "strikethrough" | "code"
>;

type InlineRenderOptions = {
  escapePipes?: boolean;
};

type ParseResult = {
  items: InlineRichText[];
  index: number;
  closed: boolean;
};

function isWhitespace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9]/.test(char);
}

function canOpenDelimiter(source: string, start: number, delimiter: string): boolean {
  const previous = start > 0 ? source[start - 1] : undefined;
  const next = source[start + delimiter.length];

  if (next === undefined || isWhitespace(next)) {
    return false;
  }

  if (delimiter.includes("_")) {
    return !(isWordChar(previous) && isWordChar(next));
  }

  return true;
}

function normalizeAnnotations(
  annotations: InlineParseState | InlineRichText["annotations"] | undefined,
): InlineRichText["annotations"] | undefined {
  if (!annotations) {
    return undefined;
  }

  const normalized: InlineRichText["annotations"] = {};
  if (annotations.bold) {
    normalized.bold = true;
  }
  if (annotations.italic) {
    normalized.italic = true;
  }
  if (annotations.strikethrough) {
    normalized.strikethrough = true;
  }
  if ("underline" in annotations && annotations.underline) {
    normalized.underline = true;
  }
  if (annotations.code) {
    normalized.code = true;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function sameAnnotations(
  left: InlineRichText["annotations"] | undefined,
  right: InlineRichText["annotations"] | undefined,
): boolean {
  return (
    Boolean(left?.bold) === Boolean(right?.bold) &&
    Boolean(left?.italic) === Boolean(right?.italic) &&
    Boolean(left?.strikethrough) === Boolean(right?.strikethrough) &&
    Boolean(left?.underline) === Boolean(right?.underline) &&
    Boolean(left?.code) === Boolean(right?.code)
  );
}

function sameLink(
  left: InlineRichText["text"]["link"] | undefined,
  right: InlineRichText["text"]["link"] | undefined,
): boolean {
  return left?.url === right?.url;
}

function appendRichTextItem(items: InlineRichText[], item: InlineRichText | null) {
  if (!item || item.text.content.length === 0) {
    return;
  }

  const previous = items[items.length - 1];
  if (
    previous &&
    sameAnnotations(previous.annotations, item.annotations) &&
    sameLink(previous.text.link, item.text.link)
  ) {
    previous.text.content += item.text.content;
    return;
  }

  items.push(item);
}

function appendRichTextItems(items: InlineRichText[], nextItems: InlineRichText[]) {
  nextItems.forEach((item) => appendRichTextItem(items, item));
}

function createTextItem(
  content: string,
  options: {
    annotations?: InlineParseState | InlineRichText["annotations"];
    link?: { url: string };
  } = {},
): InlineRichText | null {
  if (!content) {
    return null;
  }

  const annotations = normalizeAnnotations(options.annotations);
  return {
    type: "text",
    text: {
      content,
      ...(options.link ? { link: options.link } : {}),
    },
    ...(annotations ? { annotations } : {}),
  };
}

function parseCodeSpan(
  source: string,
  start: number,
  state: InlineParseState,
): { items: InlineRichText[]; index: number } | null {
  let tickCount = 1;
  while (source[start + tickCount] === "`") {
    tickCount += 1;
  }

  const delimiter = "`".repeat(tickCount);
  const end = source.indexOf(delimiter, start + tickCount);
  if (end === -1) {
    return null;
  }

  const item = createTextItem(source.slice(start + tickCount, end), {
    annotations: {
      ...state,
      code: true,
    },
  });

  return {
    items: item ? [item] : [],
    index: end + tickCount,
  };
}

function parseLinkDestination(
  source: string,
  start: number,
): { url: string; index: number } | null {
  let depth = 1;
  let index = start;
  let url = "";

  while (index < source.length) {
    const char = source[index] ?? "";
    if (char === "\\") {
      const escaped = source[index + 1];
      if (escaped) {
        url += escaped;
        index += 2;
        continue;
      }
    }

    if (char === "(") {
      depth += 1;
      url += char;
      index += 1;
      continue;
    }

    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return {
          url: url.trim(),
          index: index + 1,
        };
      }
      url += char;
      index += 1;
      continue;
    }

    url += char;
    index += 1;
  }

  return null;
}

function applyLink(items: InlineRichText[], url: string): InlineRichText[] {
  return items.map((item) => ({
    ...item,
    text: {
      ...item.text,
      link: { url },
    },
  }));
}

function parseDelimited(
  source: string,
  start: number,
  delimiter: string,
  state: InlineParseState,
): { items: InlineRichText[]; index: number } | null {
  const parsed = parseSequence(source, start + delimiter.length, state, delimiter);
  if (!parsed.closed) {
    return null;
  }

  return {
    items: parsed.items,
    index: parsed.index,
  };
}

function parseLink(
  source: string,
  start: number,
  state: InlineParseState,
): { items: InlineRichText[]; index: number } | null {
  const label = parseSequence(source, start + 1, state, "]");
  if (!label.closed || source[label.index] !== "(") {
    return null;
  }

  const destination = parseLinkDestination(source, label.index + 1);
  if (!destination || !destination.url) {
    return null;
  }

  return {
    items: applyLink(label.items, destination.url),
    index: destination.index,
  };
}

function parseSequence(
  source: string,
  start: number,
  state: InlineParseState,
  stopDelimiter?: string,
): ParseResult {
  const items: InlineRichText[] = [];
  let buffer = "";
  let index = start;

  const flush = () => {
    appendRichTextItem(items, createTextItem(buffer, { annotations: state }));
    buffer = "";
  };

  while (index < source.length) {
    if (stopDelimiter && source.startsWith(stopDelimiter, index)) {
      flush();
      return {
        items,
        index: index + stopDelimiter.length,
        closed: true,
      };
    }

    if (source[index] === "\\") {
      const escaped = source[index + 1];
      if (escaped) {
        buffer += escaped;
        index += 2;
        continue;
      }
    }

    if (source.startsWith("**", index)) {
      flush();
      if (canOpenDelimiter(source, index, "**")) {
        const parsed = parseDelimited(source, index, "**", {
          ...state,
          bold: true,
        });
        if (parsed) {
          appendRichTextItems(items, parsed.items);
          index = parsed.index;
          continue;
        }
      }
      buffer += "**";
      index += 2;
      continue;
    }

    if (source.startsWith("__", index)) {
      flush();
      if (canOpenDelimiter(source, index, "__")) {
        const parsed = parseDelimited(source, index, "__", {
          ...state,
          bold: true,
        });
        if (parsed) {
          appendRichTextItems(items, parsed.items);
          index = parsed.index;
          continue;
        }
      }
      buffer += "__";
      index += 2;
      continue;
    }

    if (source.startsWith("~~", index)) {
      flush();
      const parsed = parseDelimited(source, index, "~~", {
        ...state,
        strikethrough: true,
      });
      if (parsed) {
        appendRichTextItems(items, parsed.items);
        index = parsed.index;
        continue;
      }
      buffer += "~~";
      index += 2;
      continue;
    }

    if (source[index] === "*") {
      flush();
      if (canOpenDelimiter(source, index, "*")) {
        const parsed = parseDelimited(source, index, "*", {
          ...state,
          italic: true,
        });
        if (parsed) {
          appendRichTextItems(items, parsed.items);
          index = parsed.index;
          continue;
        }
      }
      buffer += "*";
      index += 1;
      continue;
    }

    if (source[index] === "_") {
      flush();
      if (canOpenDelimiter(source, index, "_")) {
        const parsed = parseDelimited(source, index, "_", {
          ...state,
          italic: true,
        });
        if (parsed) {
          appendRichTextItems(items, parsed.items);
          index = parsed.index;
          continue;
        }
      }
      buffer += "_";
      index += 1;
      continue;
    }

    if (source[index] === "[") {
      flush();
      const parsed = parseLink(source, index, state);
      if (parsed) {
        appendRichTextItems(items, parsed.items);
        index = parsed.index;
        continue;
      }
      buffer += "[";
      index += 1;
      continue;
    }

    if (source[index] === "`") {
      flush();
      const parsed = parseCodeSpan(source, index, state);
      if (parsed) {
        appendRichTextItems(items, parsed.items);
        index = parsed.index;
        continue;
      }
      buffer += "`";
      index += 1;
      continue;
    }

    buffer += source[index] ?? "";
    index += 1;
  }

  flush();
  return {
    items,
    index,
    closed: false,
  };
}

function escapeMarkdownText(text: string, options: InlineRenderOptions): string {
  let escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/([`*_[\]~])/g, "\\$1");

  if (options.escapePipes) {
    escaped = escaped.replace(/\|/g, "\\|");
  }

  return escaped;
}

function renderCodeSpan(content: string): string {
  const backtickRuns = content.match(/`+/g) ?? [];
  const maxRun = backtickRuns.reduce((longest, run) => Math.max(longest, run.length), 0);
  const delimiter = "`".repeat(Math.max(1, maxRun + 1));
  const padded =
    content.startsWith("`") ||
    content.endsWith("`") ||
    content.startsWith(" ") ||
    content.endsWith(" ")
      ? ` ${content} `
      : content;

  return `${delimiter}${padded}${delimiter}`;
}

function renderGroup(items: InlineRichText[], options: InlineRenderOptions): string {
  const first = items[0];
  if (!first) {
    return "";
  }

  let rendered = items
    .map((item) => {
      if (item.annotations?.code) {
        return renderCodeSpan(item.text.content);
      }
      return escapeMarkdownText(item.text.content, options);
    })
    .join("");

  if (first.annotations?.bold && first.annotations?.italic) {
    rendered = `***${rendered}***`;
  } else {
    if (first.annotations?.bold) {
      rendered = `**${rendered}**`;
    }
    if (first.annotations?.italic) {
      rendered = `*${rendered}*`;
    }
  }

  if (first.annotations?.strikethrough) {
    rendered = `~~${rendered}~~`;
  }

  if (first.text.link?.url) {
    const escapedUrl = first.text.link.url.replace(/\\/g, "\\\\").replace(/\)/g, "\\)");
    rendered = `[${rendered}](${escapedUrl})`;
  }

  return rendered;
}

function isTextRichTextItem(item: unknown): item is InlineRichText {
  return (
    Boolean(item) &&
    typeof item === "object" &&
    (item as { type?: unknown }).type === "text" &&
    typeof (item as { text?: { content?: unknown } }).text?.content === "string"
  );
}

function canGroup(left: InlineRichText, right: InlineRichText): boolean {
  return (
    Boolean(left.annotations?.bold) === Boolean(right.annotations?.bold) &&
    Boolean(left.annotations?.italic) === Boolean(right.annotations?.italic) &&
    Boolean(left.annotations?.strikethrough) === Boolean(right.annotations?.strikethrough) &&
    left.text.link?.url === right.text.link?.url
  );
}

export function parseInlineRichText(markdown: string): InlineRichText[] {
  return parseSequence(markdown, 0, {}).items;
}

export function plainTextToRichText(content: string): InlineRichText[] {
  return content ? [{ type: "text", text: { content } }] : [];
}

export function richTextToPlainText(richText: unknown): string {
  if (!Array.isArray(richText)) {
    return "";
  }

  return richText
    .map((item) => {
      if (isTextRichTextItem(item)) {
        return item.text.content;
      }
      if (item && typeof item === "object" && typeof (item as { type?: unknown }).type === "string") {
        return `[unsupported-rich-text type="${String((item as { type: string }).type)}"]`;
      }
      return "[unsupported-rich-text]";
    })
    .join("");
}

export function renderInlineRichText(
  richText: unknown,
  options: InlineRenderOptions = {},
): string {
  if (!Array.isArray(richText)) {
    return "";
  }

  const output: string[] = [];
  let group: InlineRichText[] = [];

  const flush = () => {
    if (group.length > 0) {
      output.push(renderGroup(group, options));
      group = [];
    }
  };

  richText.forEach((item) => {
    if (isTextRichTextItem(item)) {
      const normalized: InlineRichText = {
        type: "text",
        text: {
          content: item.text.content,
          ...(item.text.link ? { link: item.text.link } : {}),
        },
        ...(item.annotations ? { annotations: item.annotations } : {}),
      };

      if (group.length === 0 || canGroup(group[group.length - 1]!, normalized)) {
        group.push(normalized);
        return;
      }

      flush();
      group.push(normalized);
      return;
    }

    flush();
    if (item && typeof item === "object" && typeof (item as { type?: unknown }).type === "string") {
      output.push(`[unsupported-rich-text type="${String((item as { type: string }).type)}"]`);
      return;
    }
    output.push("[unsupported-rich-text]");
  });

  flush();
  return output.join("");
}
