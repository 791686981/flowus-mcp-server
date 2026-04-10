import { z } from "zod";
import {
  ApiAnnotationsSchema,
  ApiCoverSchema,
  ApiIconSchema,
  ApiRichTextItemSchema,
} from "../api/common.js";

export const InputIconSchema = z
  .union([
    z.string().min(1).describe("Emoji shorthand, e.g. '📄'"),
    ApiIconSchema,
  ])
  .describe("Page or block icon. Supports emoji shorthand or canonical icon objects");

const InputTextRichTextItemSchema = z.object({
  text: z.object({
    content: z.string().describe("Text content"),
    link: z.object({ url: z.string() }).optional().describe("Optional hyperlink"),
  }),
  annotations: ApiAnnotationsSchema,
});

export const InputRichTextItemSchema = z.union([
  ApiRichTextItemSchema,
  InputTextRichTextItemSchema,
]);

export const InputRichTextSchema = z
  .union([
    z.string().describe("String shorthand for a single rich text item"),
    z
      .array(z.string())
      .describe("String array shorthand for multiple text rich text items"),
    z.array(InputRichTextItemSchema),
  ])
  .describe("Rich text input. Accepts shorthand or canonical rich text arrays");

export const InputCoverSchema = ApiCoverSchema;
