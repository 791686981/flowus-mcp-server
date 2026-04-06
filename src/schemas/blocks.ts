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
    `Block data object. Structure depends on block type.

Text blocks (paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, quote, toggle):
  { "rich_text": [{ "type": "text", "text": { "content": "Hello" } }], "text_color"?: "default", "background_color"?: "default" }

to_do (checked is REQUIRED):
  { "rich_text": [...], "checked": true/false }

code (language is REQUIRED):
  { "rich_text": [{ "type": "text", "text": { "content": "code here" } }], "language": "JavaScript" }

callout (icon is REQUIRED):
  { "rich_text": [...], "icon": { "emoji": "💡" }, "background_color"?: "yellow" }

equation: { "expression": "E=mc^2" }
link_to_page: { "page_id": "uuid" }
divider: {}
bookmark: { "url": "https://..." }
embed: { "url": "https://..." }
image/file: { "type": "external", "external": { "url": "https://..." } }
table: { "table_width": 3, "has_column_header": true, "has_row_header": false }
table_row: { "cells": [[{ "type": "text", "text": { "content": "cell" } }]] }
column_list/column: {}

IMPORTANT: rich_text items MUST have "type": "text" field. Simplest form: [{ "type": "text", "text": { "content": "Hello" } }]
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
