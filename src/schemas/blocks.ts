import { z } from "zod";
import { RichTextSchema, ColorSchema, IconSchema } from "./common.js";

export const BlockTypeEnum = z.enum([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "quote",
  "toggle",
  "code",
  "callout",
  "equation",
  "link_to_page",
  "divider",
  "bookmark",
  "embed",
  "image",
  "file",
  "table",
  "table_row",
  "column_list",
  "column",
  "synced_block",
  "template",
]);

export const BlockDataSchema = z
  .record(z.string(), z.unknown())
  .describe(
    `Block data object. Structure depends on block type:
- Text blocks (paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, quote, toggle): { rich_text: RichText[], text_color?: Color, background_color?: Color }
- to_do: { rich_text: RichText[], checked: boolean, text_color?: Color, background_color?: Color }
- code: { rich_text: RichText[], language: string }
- callout: { rich_text: RichText[], icon: { emoji: "..." }, text_color?: Color, background_color?: Color }
- equation: { expression: "LaTeX string" }
- link_to_page: { page_id: "uuid" }
- divider: {}
- bookmark: { url: "https://...", caption?: RichText[] }
- embed: { url: "https://...", caption?: RichText[] }
- image/file: { type: "external", external: { url: "https://..." }, caption?: RichText[] }
- table: { table_width: number, has_column_header: boolean, has_row_header: boolean }
- table_row: { cells: RichText[][] }
- column_list/column: {}
Rich text simplest form: [{ type: "text", text: { content: "Hello" } }]
Color values: default, gray, brown, orange, yellow, green, blue, purple, pink, red`,
  );

export const BlockObjectSchema = z.object({
  type: BlockTypeEnum.describe("Block type"),
  data: BlockDataSchema,
});

export const BlockChildrenSchema = z
  .array(BlockObjectSchema)
  .min(1)
  .max(100)
  .describe("Array of block objects to append (max 100 per request)");
