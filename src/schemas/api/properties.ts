import { z } from "zod";
import { ApiRichTextSchema } from "./common.js";

export const ApiTitlePropertySchema = z.object({
  id: z.string().optional(),
  type: z.literal("title"),
  title: ApiRichTextSchema,
});

const ApiGenericPagePropertySchema = z
  .object({
    type: z
      .string()
      .refine((value) => value !== "title", "Title properties must use the canonical title schema"),
  })
  .passthrough();

export const ApiPagePropertySchema = z.union([
  ApiTitlePropertySchema,
  ApiGenericPagePropertySchema,
]);

export const ApiPagePropertiesSchema = z
  .record(z.string(), ApiPagePropertySchema)
  .describe(
    "Canonical page properties keyed by property name. Title properties must use the FlowUS title payload shape.",
  );
