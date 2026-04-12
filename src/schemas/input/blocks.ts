import { z } from "zod";
import { ColorSchema } from "../common.js";
import { ApiRichTextSchema } from "../api/common.js";
import { InputIconSchema, InputRichTextSchema } from "./common.js";
import {
  BlockTypeEnum,
  RichTextBlockTypeEnum,
} from "../api/blocks.js";

export const InputTextBlockDataSchema = z
  .object({
    rich_text: InputRichTextSchema,
    text_color: ColorSchema.optional(),
    background_color: ColorSchema.optional(),
  })
  .passthrough();

export const InputToDoBlockDataSchema = InputTextBlockDataSchema.extend({
  checked: z.boolean(),
});

export const InputCodeBlockDataSchema = InputTextBlockDataSchema.extend({
  language: z.string(),
});

export const InputCalloutBlockDataSchema = InputTextBlockDataSchema.extend({
  icon: InputIconSchema,
});

export const InputGenericBlockDataSchema = z.record(z.string(), z.unknown());

export const InputEquationBlockDataSchema = z
  .object({
    expression: z.string(),
  })
  .passthrough();

export const InputLinkToPageBlockDataSchema = z
  .object({
    page_id: z.string(),
  })
  .passthrough();

export const InputDividerBlockDataSchema = z.object({}).passthrough();

export const InputColumnListBlockDataSchema = z.object({}).passthrough();

export const InputColumnBlockDataSchema = z.object({}).passthrough();

export const InputTemplateBlockDataSchema = z
  .object({
    rich_text: InputRichTextSchema,
  })
  .passthrough();

export const InputSyncedFromSchema = z
  .object({
    block_id: z.string(),
  })
  .passthrough();

export const InputSyncedBlockDataSchema = z
  .object({
    synced_from: InputSyncedFromSchema.nullable(),
  })
  .passthrough();

export const InputTableRowBlockDataSchema = z
  .object({
    cells: z.array(ApiRichTextSchema),
  })
  .passthrough();

export const InputTableBlockDataSchema = z
  .object({
    table_width: z.number().int().positive(),
    has_column_header: z.boolean().optional(),
    has_row_header: z.boolean().optional(),
  })
  .passthrough();

const InputMediaExternalSchema = z.object({
  url: z.string(),
}).passthrough();

const InputMediaFileSchema = z.object({
  url: z.string(),
  expiry_time: z.string().optional(),
}).passthrough();

export const InputMediaBlockDataSchema = z
  .object({
    type: z.enum(["file", "external"]),
    file: InputMediaFileSchema.optional(),
    external: InputMediaExternalSchema.optional(),
    caption: ApiRichTextSchema.optional(),
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

export const InputLinkMediaBlockDataSchema = z
  .object({
    url: z.string(),
    caption: ApiRichTextSchema.optional(),
  })
  .passthrough();

export const InputRichTextBlockObjectSchema = z.object({
  type: RichTextBlockTypeEnum,
  data: InputTextBlockDataSchema,
});

export const InputToDoBlockObjectSchema = z.object({
  type: z.literal("to_do"),
  data: InputToDoBlockDataSchema,
});

export const InputCodeBlockObjectSchema = z.object({
  type: z.literal("code"),
  data: InputCodeBlockDataSchema,
});

export const InputCalloutBlockObjectSchema = z.object({
  type: z.literal("callout"),
  data: InputCalloutBlockDataSchema,
});

export const InputEquationBlockObjectSchema = z.object({
  type: z.literal("equation"),
  data: InputEquationBlockDataSchema,
});

export const InputLinkToPageBlockObjectSchema = z.object({
  type: z.literal("link_to_page"),
  data: InputLinkToPageBlockDataSchema,
});

export const InputDividerBlockObjectSchema = z.object({
  type: z.literal("divider"),
  data: InputDividerBlockDataSchema,
});

export const InputTemplateBlockObjectSchema = z.object({
  type: z.literal("template"),
  data: InputTemplateBlockDataSchema,
});

export const InputTableRowBlockObjectSchema = z.object({
  type: z.literal("table_row"),
  data: InputTableRowBlockDataSchema,
});

export const InputTableBlockObjectSchema = z
  .object({
    type: z.literal("table"),
    data: InputTableBlockDataSchema,
    children: z.array(InputTableRowBlockObjectSchema).optional(),
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

export const InputBookmarkBlockObjectSchema = z.object({
  type: z.literal("bookmark"),
  data: InputLinkMediaBlockDataSchema,
});

export const InputEmbedBlockObjectSchema = z.object({
  type: z.literal("embed"),
  data: InputLinkMediaBlockDataSchema,
});

export const InputImageBlockObjectSchema = z.object({
  type: z.literal("image"),
  data: InputMediaBlockDataSchema,
});

export const InputFileBlockObjectSchema = z.object({
  type: z.literal("file"),
  data: InputMediaBlockDataSchema,
});

export const InputColumnBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("column"),
    data: InputColumnBlockDataSchema,
    children: z.array(InputBlockObjectSchema).optional(),
  }),
);

export const InputColumnListBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("column_list"),
    data: InputColumnListBlockDataSchema,
    children: z.array(InputColumnBlockObjectSchema).optional(),
  }),
);

export const InputSyncedBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("synced_block"),
    data: InputSyncedBlockDataSchema,
    children: z.array(InputBlockObjectSchema).optional(),
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

export const InputGenericBlockObjectSchema = z.object({
  type: z.never(),
  data: InputGenericBlockDataSchema,
});

export const InputBlockDataSchema = z.union([
  InputCalloutBlockDataSchema,
  InputCodeBlockDataSchema,
  InputToDoBlockDataSchema,
  InputTextBlockDataSchema,
  InputEquationBlockDataSchema,
  InputLinkToPageBlockDataSchema,
  InputDividerBlockDataSchema,
  InputColumnListBlockDataSchema,
  InputColumnBlockDataSchema,
  InputTemplateBlockDataSchema,
  InputSyncedBlockDataSchema,
  InputTableRowBlockDataSchema,
  InputTableBlockDataSchema,
  InputMediaBlockDataSchema,
  InputLinkMediaBlockDataSchema,
  InputGenericBlockDataSchema,
]);

export const InputBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({
      type: RichTextBlockTypeEnum,
      data: InputTextBlockDataSchema,
      children: z.array(InputBlockObjectSchema).optional(),
    }),
    z.object({
      type: z.literal("to_do"),
      data: InputToDoBlockDataSchema,
      children: z.array(InputBlockObjectSchema).optional(),
    }),
    z.object({
      type: z.literal("callout"),
      data: InputCalloutBlockDataSchema,
      children: z.array(InputBlockObjectSchema).optional(),
    }),
    InputCodeBlockObjectSchema,
    InputEquationBlockObjectSchema,
    InputLinkToPageBlockObjectSchema,
    InputDividerBlockObjectSchema,
    InputTemplateBlockObjectSchema,
    InputTableRowBlockObjectSchema,
    InputTableBlockObjectSchema,
    InputBookmarkBlockObjectSchema,
    InputEmbedBlockObjectSchema,
    InputImageBlockObjectSchema,
    InputFileBlockObjectSchema,
    InputColumnListBlockObjectSchema,
    InputColumnBlockObjectSchema,
    InputSyncedBlockObjectSchema,
    InputGenericBlockObjectSchema,
  ]),
);

export const InputBlockChildrenSchema = z
  .array(InputBlockObjectSchema)
  .min(1)
  .max(100)
  .describe("Array of block objects to append (max 100 per request)");

export { BlockTypeEnum };
