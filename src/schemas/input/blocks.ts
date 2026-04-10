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

export const InputGenericBlockObjectSchema = z.object({
  type: NonNormalizedBlockTypeEnum,
  data: InputGenericBlockDataSchema,
});

export const InputBlockDataSchema = z.union([
  InputCalloutBlockDataSchema,
  InputCodeBlockDataSchema,
  InputToDoBlockDataSchema,
  InputTextBlockDataSchema,
  InputGenericBlockDataSchema,
]);

export const InputBlockObjectSchema = z.union([
  InputCalloutBlockObjectSchema,
  InputCodeBlockObjectSchema,
  InputToDoBlockObjectSchema,
  InputRichTextBlockObjectSchema,
  InputGenericBlockObjectSchema,
]);

export const InputBlockChildrenSchema = z
  .array(InputBlockObjectSchema)
  .min(1)
  .max(100)
  .describe("Array of block objects to append (max 100 per request)");

export { BlockTypeEnum };
