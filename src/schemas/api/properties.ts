import { z } from "zod";
import { ApiColorSchema, ApiRichTextSchema } from "./common.js";

const StrictPropertyTypeEnum = z.enum([
  "title",
  "rich_text",
  "checkbox",
  "select",
  "multi_select",
  "date",
  "number",
  "people",
  "files",
  "url",
  "email",
  "phone_number",
  "relation",
]);

export const ApiTitlePropertySchema = z.object({
  id: z.string().optional(),
  type: z.literal("title"),
  title: ApiRichTextSchema,
}).passthrough();

const ApiSelectOptionSchema = z
  .object({
    id: z.string().optional(),
    name: z.string(),
    color: ApiColorSchema,
  })
  .passthrough();

const ApiRichTextPagePropertySchema = z
  .object({
    type: z.literal("rich_text"),
    rich_text: ApiRichTextSchema,
  })
  .passthrough();

const ApiCheckboxPagePropertySchema = z
  .object({
    type: z.literal("checkbox"),
    checkbox: z.boolean(),
  })
  .passthrough();

const ApiSelectPagePropertySchema = z
  .object({
    type: z.literal("select"),
    select: ApiSelectOptionSchema.nullable(),
  })
  .passthrough();

const ApiMultiSelectPagePropertySchema = z
  .object({
    type: z.literal("multi_select"),
    multi_select: z.array(ApiSelectOptionSchema),
  })
  .passthrough();

const ApiDateValueSchema = z
  .object({
    start: z.string(),
    end: z.string().nullable().optional(),
    time_zone: z.string().nullable().optional(),
  })
  .passthrough();

const ApiDatePagePropertySchema = z
  .object({
    type: z.literal("date"),
    date: ApiDateValueSchema.nullable(),
  })
  .passthrough();

const ApiNumberPagePropertySchema = z
  .object({
    type: z.literal("number"),
    number: z.number(),
  })
  .passthrough();

const ApiPersonReferenceSchema = z
  .object({
    id: z.string(),
    object: z.literal("user").optional(),
  })
  .passthrough();

const ApiPeoplePagePropertySchema = z
  .object({
    type: z.literal("people"),
    people: z.array(ApiPersonReferenceSchema),
  })
  .passthrough();

const ApiExternalFileSchema = z.object({
  url: z.string(),
}).passthrough();

const ApiInternalFileSchema = z.object({
  url: z.string(),
  expiry_time: z.string().optional(),
}).passthrough();

const ApiFileReferenceSchema = z
  .object({
    name: z.string(),
    type: z.enum(["file", "external"]).optional(),
    external: ApiExternalFileSchema.optional(),
    file: ApiInternalFileSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const sourceCount = Number(Boolean(value.external)) + Number(Boolean(value.file));
    if (sourceCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "File items must include exactly one of external or file",
        path: [],
      });
      return;
    }

    if (value.type === "external" && !value.external) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "External file items must include external.url",
        path: ["external"],
      });
    }

    if (value.type === "file" && !value.file) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Internal file items must include file.url",
        path: ["file"],
      });
    }
  })
  .passthrough();

const ApiFilesPagePropertySchema = z
  .object({
    type: z.literal("files"),
    files: z.array(ApiFileReferenceSchema),
  })
  .passthrough();

const ApiUrlPagePropertySchema = z
  .object({
    type: z.literal("url"),
    url: z.string(),
  })
  .passthrough();

const ApiEmailPagePropertySchema = z
  .object({
    type: z.literal("email"),
    email: z.string(),
  })
  .passthrough();

const ApiPhoneNumberPagePropertySchema = z
  .object({
    type: z.literal("phone_number"),
    phone_number: z.string(),
  })
  .passthrough();

const ApiRelationReferenceSchema = z
  .object({
    id: z.string(),
  })
  .passthrough();

const ApiRelationPagePropertySchema = z
  .object({
    type: z.literal("relation"),
    relation: z.array(ApiRelationReferenceSchema),
    has_more: z.boolean().optional(),
  })
  .passthrough();

const ApiGenericPagePropertySchema = z
  .object({
    type: z.string(),
  })
  .superRefine((value, ctx) => {
    if (StrictPropertyTypeEnum.options.includes(value.type as z.infer<typeof StrictPropertyTypeEnum>)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Property type "${value.type}" must use its canonical schema`,
        path: ["type"],
      });
    }
  })
  .passthrough();

export const ApiPagePropertySchema = z.union([
  ApiTitlePropertySchema,
  ApiRichTextPagePropertySchema,
  ApiCheckboxPagePropertySchema,
  ApiSelectPagePropertySchema,
  ApiMultiSelectPagePropertySchema,
  ApiDatePagePropertySchema,
  ApiNumberPagePropertySchema,
  ApiPeoplePagePropertySchema,
  ApiFilesPagePropertySchema,
  ApiUrlPagePropertySchema,
  ApiEmailPagePropertySchema,
  ApiPhoneNumberPagePropertySchema,
  ApiRelationPagePropertySchema,
  ApiGenericPagePropertySchema,
]);

export const ApiPagePropertiesSchema = z
  .record(z.string(), ApiPagePropertySchema)
  .describe(
    "Canonical page properties keyed by property name. Title properties must use the FlowUS title payload shape.",
  );
