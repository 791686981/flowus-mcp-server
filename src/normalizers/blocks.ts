import { z } from "zod";
import {
  ApiBlockChildrenSchema,
  BlockTypeEnum,
} from "../schemas/api/blocks.js";
import { InputRichTextSchema } from "../schemas/input/common.js";
import { InputBlockChildrenSchema } from "../schemas/input/blocks.js";
import { normalizeIcon } from "./icon.js";
import { normalizeRichText } from "./rich_text.js";

type InputBlockChildren = z.input<typeof InputBlockChildrenSchema>;
type ApiBlockChildren = z.output<typeof ApiBlockChildrenSchema>;
type BlockType = z.infer<typeof BlockTypeEnum>;

const RICH_TEXT_BLOCK_TYPES = new Set<BlockType>([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "toggle",
  "to_do",
  "code",
  "callout",
]);

function normalizeTextBlockData(data: Record<string, unknown>) {
  return {
    ...data,
    rich_text: normalizeRichText(InputRichTextSchema.parse(data.rich_text)),
  };
}

function hasUnsupportedNonTextShorthand(data: Record<string, unknown>) {
  return (
    "rich_text" in data ||
    (typeof data.icon === "string")
  );
}

export function normalizeBlockChildren(children: InputBlockChildren): ApiBlockChildren {
  const parsedChildren = InputBlockChildrenSchema.parse(children);

  const normalizedChildren = parsedChildren.map((child) => {
    if (!RICH_TEXT_BLOCK_TYPES.has(child.type)) {
      if (hasUnsupportedNonTextShorthand(child.data)) {
        throw new Error(`Unsupported shorthand for block type "${child.type}"`);
      }

      return child;
    }

    const normalizedData = normalizeTextBlockData(child.data);

    if (child.type === "callout") {
      return {
        ...child,
        data: {
          ...normalizedData,
          icon: normalizeIcon(child.data.icon),
        },
      };
    }

    return {
      ...child,
      data: normalizedData,
    };
  });

  return ApiBlockChildrenSchema.parse(normalizedChildren);
}
