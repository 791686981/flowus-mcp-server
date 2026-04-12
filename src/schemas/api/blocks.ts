import { z } from "zod";
import { ColorSchema, IconSchema, RichTextSchema } from "../common.js";

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

export const RichTextBlockTypeEnum = z.enum([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "toggle",
]);

export const NonNormalizedBlockTypeEnum = z.enum([
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

export const ApiTextBlockDataSchema = z
  .object({
    rich_text: RichTextSchema,
    text_color: ColorSchema.optional(),
    background_color: ColorSchema.optional(),
  })
  .passthrough();

export const ApiToDoBlockDataSchema = ApiTextBlockDataSchema.extend({
  checked: z.boolean(),
});

export const ApiCodeBlockDataSchema = ApiTextBlockDataSchema.extend({
  language: z.string(),
});

export const ApiCalloutBlockDataSchema = ApiTextBlockDataSchema.extend({
  icon: IconSchema,
});

export const ApiGenericBlockDataSchema = z.record(z.string(), z.unknown());

export const ApiBlockDataSchema = z.union([
  ApiCalloutBlockDataSchema,
  ApiCodeBlockDataSchema,
  ApiToDoBlockDataSchema,
  ApiTextBlockDataSchema,
  ApiGenericBlockDataSchema,
]);

export const ApiBlockChildrenSchema: z.ZodTypeAny = z.lazy(() =>
  z.array(ApiBlockObjectSchema).min(1).max(100),
).describe("Array of block objects to append (max 100 per request)");

export const ApiRichTextBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: RichTextBlockTypeEnum,
    data: ApiTextBlockDataSchema,
    children: ApiBlockChildrenSchema.optional(),
  }),
);

export const ApiToDoBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("to_do"),
    data: ApiToDoBlockDataSchema,
    children: ApiBlockChildrenSchema.optional(),
  }),
);

export const ApiCodeBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("code"),
    data: ApiCodeBlockDataSchema,
    children: ApiBlockChildrenSchema.optional(),
  }),
);

export const ApiCalloutBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("callout"),
    data: ApiCalloutBlockDataSchema,
    children: ApiBlockChildrenSchema.optional(),
  }),
);

export const ApiGenericBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: NonNormalizedBlockTypeEnum,
    data: ApiGenericBlockDataSchema,
    children: ApiBlockChildrenSchema.optional(),
  }),
);

export const ApiBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    ApiCalloutBlockObjectSchema,
    ApiCodeBlockObjectSchema,
    ApiToDoBlockObjectSchema,
    ApiRichTextBlockObjectSchema,
    ApiGenericBlockObjectSchema,
  ]),
);
