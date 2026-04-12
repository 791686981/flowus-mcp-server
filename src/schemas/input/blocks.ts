import { z } from "zod";
import { ColorSchema } from "../common.js";
import { InputIconSchema, InputRichTextSchema } from "./common.js";
import {
  BlockTypeEnum,
  NonNormalizedBlockTypeEnum,
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

export const InputBlockDataSchema = z.union([
  InputCalloutBlockDataSchema,
  InputCodeBlockDataSchema,
  InputToDoBlockDataSchema,
  InputTextBlockDataSchema,
  InputGenericBlockDataSchema,
]);

export const InputBlockChildrenSchema: z.ZodTypeAny = z.lazy(() =>
  z.array(InputBlockObjectSchema).min(1).max(100),
).describe("Array of block objects to append (max 100 per request)");

export const InputRichTextBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: RichTextBlockTypeEnum,
    data: InputTextBlockDataSchema,
    children: InputBlockChildrenSchema.optional(),
  }),
);

export const InputToDoBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("to_do"),
    data: InputToDoBlockDataSchema,
    children: InputBlockChildrenSchema.optional(),
  }),
);

export const InputCodeBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("code"),
    data: InputCodeBlockDataSchema,
    children: InputBlockChildrenSchema.optional(),
  }),
);

export const InputCalloutBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: z.literal("callout"),
    data: InputCalloutBlockDataSchema,
    children: InputBlockChildrenSchema.optional(),
  }),
);

export const InputGenericBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    type: NonNormalizedBlockTypeEnum,
    data: InputGenericBlockDataSchema,
    children: InputBlockChildrenSchema.optional(),
  }),
);

export const InputBlockObjectSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    InputCalloutBlockObjectSchema,
    InputCodeBlockObjectSchema,
    InputToDoBlockObjectSchema,
    InputRichTextBlockObjectSchema,
    InputGenericBlockObjectSchema,
  ]),
);

export { BlockTypeEnum };
