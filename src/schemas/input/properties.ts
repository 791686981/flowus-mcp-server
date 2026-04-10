import { z } from "zod";
import { ApiTitlePropertySchema } from "../api/properties.js";

export const InputTitlePropertySchema = z.union([
  z.string().describe("Title shorthand"),
  ApiTitlePropertySchema,
]);

export const InputPagePropertiesSchema = z
  .object({
    title: InputTitlePropertySchema.optional(),
  })
  .catchall(z.unknown())
  .describe(
    "Page properties input. Supports title shorthand; other property keys currently require canonical FlowUS property objects.",
  );
