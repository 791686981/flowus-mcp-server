import { z } from "zod";
import { type FlowUsLocalErrorStage, localStageError } from "../client.js";
import { CoverSchema, IconSchema } from "../schemas/common.js";
import { InputIconSchema } from "../schemas/input/common.js";
import { InputPagePropertiesSchema } from "../schemas/input/properties.js";
import { normalizeIcon } from "../normalizers/icon.js";
import { normalizePageProperties } from "../normalizers/properties.js";
import { PagePropertiesSchema } from "../schemas/properties.js";

export const PageParentSchema = z.object({
  page_id: z.string().optional().describe("Parent page ID"),
  database_id: z.string().optional().describe("Parent database ID"),
});

const NormalizedPagePayloadSchema = z.object({
  parent: PageParentSchema.optional(),
  properties: PagePropertiesSchema.optional(),
  icon: IconSchema.optional(),
  cover: CoverSchema.optional(),
});

const CreatePagePayloadSchema = z.object({
  parent: PageParentSchema.optional(),
  properties: PagePropertiesSchema,
  icon: IconSchema.optional(),
  cover: CoverSchema.optional(),
});

function parseSchemaForStage<Schema extends z.ZodTypeAny>(
  stage: FlowUsLocalErrorStage,
  schema: Schema,
  value: unknown,
): z.output<Schema> {
  try {
    return schema.parse(value);
  } catch (error) {
    throw localStageError(stage, error);
  }
}

export function parseAndNormalize<
  InputSchema extends z.ZodTypeAny,
  OutputSchema extends z.ZodTypeAny,
>(
  inputSchema: InputSchema,
  value: unknown,
  normalize: (parsedValue: z.output<InputSchema>) => unknown,
  outputSchema: OutputSchema,
): z.output<OutputSchema> {
  const parsedValue = parseSchemaForStage("input", inputSchema, value);

  let normalizedValue: unknown;
  try {
    normalizedValue = normalize(parsedValue);
  } catch (error) {
    throw localStageError("normalization", error);
  }

  return parseSchemaForStage("payload", outputSchema, normalizedValue);
}

export function parseAndNormalizeOptional<
  InputSchema extends z.ZodTypeAny,
  OutputSchema extends z.ZodTypeAny,
>(
  inputSchema: InputSchema,
  value: unknown,
  normalize: (parsedValue: z.output<InputSchema>) => unknown,
  outputSchema: OutputSchema,
): z.output<OutputSchema> | undefined {
  if (value === undefined) {
    return undefined;
  }

  return parseAndNormalize(inputSchema, value, normalize, outputSchema);
}

export function normalizePagePayloadFields(args: {
  parent?: unknown;
  properties?: unknown;
  icon?: unknown;
  cover?: unknown;
}) {
  const body: Record<string, unknown> = {};

  if (args.parent !== undefined) {
    body.parent = parseSchemaForStage("input", PageParentSchema, args.parent);
  }

  if (args.properties !== undefined) {
    body.properties = parseAndNormalize(
      InputPagePropertiesSchema,
      args.properties,
      normalizePageProperties,
      PagePropertiesSchema,
    );
  }

  const normalizedIcon = parseAndNormalizeOptional(
    InputIconSchema,
    args.icon,
    normalizeIcon,
    IconSchema,
  );
  if (normalizedIcon !== undefined) {
    body.icon = normalizedIcon;
  }

  if (args.cover !== undefined) {
    body.cover = parseSchemaForStage("input", CoverSchema, args.cover);
  }

  return parseSchemaForStage("payload", NormalizedPagePayloadSchema, body);
}

export function buildCreatePagePayload(args: {
  parent?: unknown;
  properties: unknown;
  icon?: unknown;
  cover?: unknown;
}) {
  return parseSchemaForStage(
    "payload",
    CreatePagePayloadSchema,
    normalizePagePayloadFields(args),
  );
}
