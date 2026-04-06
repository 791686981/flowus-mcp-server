import { z } from "zod";

export const ColorSchema = z
  .enum([
    "default",
    "gray",
    "brown",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "red",
  ])
  .optional()
  .describe("Color value");

export const AnnotationsSchema = z
  .object({
    bold: z.boolean().optional().describe("Bold text"),
    italic: z.boolean().optional().describe("Italic text"),
    strikethrough: z.boolean().optional().describe("Strikethrough text"),
    underline: z.boolean().optional().describe("Underlined text"),
    code: z.boolean().optional().describe("Code formatted text"),
    color: ColorSchema,
  })
  .optional()
  .describe("Text formatting options");

export const RichTextItemSchema = z.object({
  type: z.enum(["text", "mention", "equation"]).describe("Rich text segment type"),
  text: z
    .object({
      content: z.string().describe("Text content"),
      link: z.object({ url: z.string() }).optional().describe("Optional hyperlink"),
    })
    .optional()
    .describe("Text content (required when type is 'text')"),
  mention: z
    .object({
      type: z.enum(["user", "page", "date"]).describe("Mention type"),
      user: z.object({ id: z.string() }).optional().describe("User mention"),
      page: z.object({ id: z.string() }).optional().describe("Page mention"),
      date: z
        .object({
          start: z.string(),
          end: z.string().optional(),
          time_zone: z.string().optional(),
        })
        .optional()
        .describe("Date mention"),
    })
    .optional()
    .describe("Mention content (required when type is 'mention')"),
  equation: z
    .object({ expression: z.string() })
    .optional()
    .describe("LaTeX expression (required when type is 'equation')"),
  annotations: AnnotationsSchema,
});

export const RichTextSchema = z
  .array(RichTextItemSchema)
  .describe(
    "Rich text array. Simplest form: [{ type: 'text', text: { content: 'Hello' } }]",
  );

export const IconSchema = z
  .union([
    z.object({ emoji: z.string().describe("Emoji character, e.g. '📄'") }),
    z.object({
      type: z.literal("external"),
      external: z.object({ url: z.string().describe("Icon image URL") }),
    }),
  ])
  .describe("Page or block icon: emoji or external URL");

export const CoverSchema = z
  .object({
    type: z.literal("external"),
    external: z.object({ url: z.string().describe("Cover image URL") }),
  })
  .describe("Page cover image");
