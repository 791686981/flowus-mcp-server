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

export const NonNormalizedBlockTypeEnum = z.never();

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

export const ApiEquationBlockDataSchema = z
  .object({
    expression: z.string(),
  })
  .passthrough();

export const ApiLinkToPageBlockDataSchema = z
  .object({
    page_id: z.string(),
  })
  .passthrough();

export const ApiDividerBlockDataSchema = z.object({}).passthrough();

export const ApiColumnListBlockDataSchema = z.object({}).passthrough();

export const ApiColumnBlockDataSchema = z.object({}).passthrough();

export const ApiTemplateBlockDataSchema = z
  .object({
    rich_text: RichTextSchema,
  })
  .passthrough();

export const ApiSyncedFromSchema = z
  .object({
    block_id: z.string(),
  })
  .passthrough();

export const ApiSyncedBlockDataSchema = z
  .object({
    synced_from: ApiSyncedFromSchema.nullable(),
  })
  .passthrough();

export const ApiTableRowBlockDataSchema = z
  .object({
    cells: z.array(RichTextSchema),
  })
  .passthrough();

export const ApiTableBlockDataSchema = z
  .object({
    table_width: z.number().int().positive(),
    has_column_header: z.boolean().optional(),
    has_row_header: z.boolean().optional(),
  })
  .passthrough();

const ApiMediaExternalSchema = z.object({
  url: z.string(),
}).passthrough();

const ApiMediaFileSchema = z.object({
  url: z.string(),
  expiry_time: z.string().optional(),
}).passthrough();

const ApiMediaBlockDataSchema = z
  .object({
    type: z.enum(["file", "external"]),
    file: ApiMediaFileSchema.optional(),
    external: ApiMediaExternalSchema.optional(),
    caption: RichTextSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const sourceCount = Number(Boolean(value.external)) + Number(Boolean(value.file));
    if (sourceCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Media blocks must include exactly one of external or file",
        path: [],
      });
      return;
    }

    if (value.type === "external" && !value.external) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "External media blocks must include external.url",
        path: ["external"],
      });
    }

    if (value.type === "file" && !value.file) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Internal media blocks must include file.url",
        path: ["file"],
      });
    }
  })
  .passthrough();

const ApiLinkMediaBlockDataSchema = z
  .object({
    url: z.string(),
    caption: RichTextSchema.optional(),
  })
  .passthrough();

export const ApiRichTextBlockObjectSchema = z.object({
  type: RichTextBlockTypeEnum,
  data: ApiTextBlockDataSchema,
});

export const ApiToDoBlockObjectSchema = z.object({
  type: z.literal("to_do"),
  data: ApiToDoBlockDataSchema,
});

export const ApiCodeBlockObjectSchema = z.object({
  type: z.literal("code"),
  data: ApiCodeBlockDataSchema,
});

export const ApiCalloutBlockObjectSchema = z.object({
  type: z.literal("callout"),
  data: ApiCalloutBlockDataSchema,
});

export const ApiEquationBlockObjectSchema = z.object({
  type: z.literal("equation"),
  data: ApiEquationBlockDataSchema,
});

export const ApiLinkToPageBlockObjectSchema = z.object({
  type: z.literal("link_to_page"),
  data: ApiLinkToPageBlockDataSchema,
});

export const ApiDividerBlockObjectSchema = z.object({
  type: z.literal("divider"),
  data: ApiDividerBlockDataSchema,
});

export const ApiTemplateBlockObjectSchema = z.object({
  type: z.literal("template"),
  data: ApiTemplateBlockDataSchema,
});

export const ApiTableRowBlockObjectSchema = z.object({
  type: z.literal("table_row"),
  data: ApiTableRowBlockDataSchema,
});

export const ApiTableBlockObjectSchema = z
  .object({
    type: z.literal("table"),
    data: ApiTableBlockDataSchema,
    children: z.array(ApiTableRowBlockObjectSchema).optional(),
  })
  .superRefine((block, ctx) => {
    if (!block.children) {
      return;
    }

    for (const [index, row] of block.children.entries()) {
      if (row.data.cells.length !== block.data.table_width) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Table row ${index + 1} cell count must match table_width`,
          path: ["children", index, "data", "cells"],
        });
      }
    }
  });

export const ApiBookmarkBlockObjectSchema = z.object({
  type: z.literal("bookmark"),
  data: ApiLinkMediaBlockDataSchema,
});

export const ApiEmbedBlockObjectSchema = z.object({
  type: z.literal("embed"),
  data: ApiLinkMediaBlockDataSchema,
});

export const ApiImageBlockObjectSchema = z.object({
  type: z.literal("image"),
  data: ApiMediaBlockDataSchema,
});

export const ApiFileBlockObjectSchema = z.object({
  type: z.literal("file"),
  data: ApiMediaBlockDataSchema,
});

export const ApiColumnBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("column"),
    data: ApiColumnBlockDataSchema,
    children: z.array(ApiBlockObjectSchema).optional(),
  }),
);

export const ApiColumnListBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("column_list"),
    data: ApiColumnListBlockDataSchema,
    children: z.array(ApiColumnBlockObjectSchema).optional(),
  }),
);

export const ApiSyncedBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("synced_block"),
    data: ApiSyncedBlockDataSchema,
    children: z.array(ApiBlockObjectSchema).optional(),
  }).superRefine((block, ctx) => {
    if (block.data.synced_from !== null && block.children && block.children.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "synced_block with synced_from cannot include editable children",
        path: ["children"],
      });
    }
  }),
);

export const ApiGenericBlockObjectSchema = z.object({
  type: NonNormalizedBlockTypeEnum,
  data: ApiGenericBlockDataSchema,
});

export const ApiBlockDataSchema = z.union([
  ApiCalloutBlockDataSchema,
  ApiCodeBlockDataSchema,
  ApiToDoBlockDataSchema,
  ApiTextBlockDataSchema,
  ApiEquationBlockDataSchema,
  ApiLinkToPageBlockDataSchema,
  ApiDividerBlockDataSchema,
  ApiColumnListBlockDataSchema,
  ApiColumnBlockDataSchema,
  ApiTemplateBlockDataSchema,
  ApiSyncedBlockDataSchema,
  ApiTableRowBlockDataSchema,
  ApiTableBlockDataSchema,
  ApiMediaBlockDataSchema,
  ApiLinkMediaBlockDataSchema,
  ApiGenericBlockDataSchema,
]);

export const ApiBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({
      type: RichTextBlockTypeEnum,
      data: ApiTextBlockDataSchema,
      children: z.array(ApiBlockObjectSchema).optional(),
    }),
    z.object({
      type: z.literal("to_do"),
      data: ApiToDoBlockDataSchema,
      children: z.array(ApiBlockObjectSchema).optional(),
    }),
    z.object({
      type: z.literal("callout"),
      data: ApiCalloutBlockDataSchema,
      children: z.array(ApiBlockObjectSchema).optional(),
    }),
    ApiCodeBlockObjectSchema,
    ApiEquationBlockObjectSchema,
    ApiLinkToPageBlockObjectSchema,
    ApiDividerBlockObjectSchema,
    ApiTemplateBlockObjectSchema,
    ApiTableRowBlockObjectSchema,
    ApiTableBlockObjectSchema,
    ApiBookmarkBlockObjectSchema,
    ApiEmbedBlockObjectSchema,
    ApiImageBlockObjectSchema,
    ApiFileBlockObjectSchema,
    ApiColumnListBlockObjectSchema,
    ApiColumnBlockObjectSchema,
    ApiSyncedBlockObjectSchema,
    ApiGenericBlockObjectSchema,
  ]),
);

export const ApiBlockChildrenSchema = z
  .array(ApiBlockObjectSchema)
  .min(1)
  .max(100)
  .describe("Array of block objects to append (max 100 per request)");
