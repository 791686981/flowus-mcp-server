import { z } from "zod";
import { ApiRichTextSchema } from "../schemas/api/common.js";
import { InputRichTextSchema } from "../schemas/input/common.js";

type InputRichText = z.input<typeof InputRichTextSchema>;
type ApiRichText = z.output<typeof ApiRichTextSchema>;

function createTextRichTextItem(content: string) {
  return {
    type: "text" as const,
    text: { content },
  };
}

function normalizeRichTextItem(item: Record<string, unknown>) {
  if ("type" in item) {
    return item;
  }

  if ("text" in item) {
    const normalized = {
      type: "text" as const,
      text: item.text,
    };

    if ("annotations" in item) {
      return {
        ...normalized,
        annotations: item.annotations,
      };
    }

    return normalized;
  }

  throw new Error("Unsupported rich text item shorthand");
}

export function normalizeRichText(richText: InputRichText): ApiRichText {
  const parsedRichText = InputRichTextSchema.parse(richText);

  if (typeof parsedRichText === "string") {
    return ApiRichTextSchema.parse([createTextRichTextItem(parsedRichText)]);
  }

  const normalizedItems = parsedRichText.map((item) => {
    if (typeof item === "string") {
      return createTextRichTextItem(item);
    }

    return normalizeRichTextItem(item);
  });

  return ApiRichTextSchema.parse(normalizedItems);
}
