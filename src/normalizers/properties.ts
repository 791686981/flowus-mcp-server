import { z } from "zod";
import { ApiPagePropertiesSchema, ApiTitlePropertySchema } from "../schemas/api/properties.js";
import { InputPagePropertiesSchema } from "../schemas/input/properties.js";
import { normalizeRichText } from "./rich_text.js";

type InputPageProperties = z.input<typeof InputPagePropertiesSchema>;
type ApiPageProperties = z.output<typeof ApiPagePropertiesSchema>;

function normalizeTitleProperty(value: unknown) {
  if (typeof value === "string") {
    return {
      id: "title",
      type: "title" as const,
      title: normalizeRichText(value),
    };
  }

  return ApiTitlePropertySchema.parse(value);
}

function normalizeGenericProperty(name: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("type" in value)) {
    throw new Error(`Unsupported shorthand for property "${name}"`);
  }

  return value;
}

export function normalizePageProperties(properties: InputPageProperties): ApiPageProperties {
  const parsedProperties = InputPagePropertiesSchema.parse(properties);

  const normalized = Object.fromEntries(
    Object.entries(parsedProperties).map(([name, value]) => {
      if (name === "title") {
        return [name, normalizeTitleProperty(value)];
      }

      return [name, normalizeGenericProperty(name, value)];
    }),
  );

  return ApiPagePropertiesSchema.parse(normalized);
}
