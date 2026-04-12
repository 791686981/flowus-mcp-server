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

function normalizeChildBlock(child: Record<string, unknown>) {
  const typedChild = child as {
    type: BlockType;
    data: Record<string, unknown>;
    children?: InputBlockChildren;
  };

  if (!RICH_TEXT_BLOCK_TYPES.has(typedChild.type)) {
    if (hasUnsupportedNonTextShorthand(typedChild.data)) {
      throw new Error(`Unsupported shorthand for block type "${typedChild.type}"`);
    }

    return {
      ...typedChild,
      ...(typedChild.children ? { children: normalizeBlockChildren(typedChild.children) } : {}),
    };
  }

  const normalizedData = normalizeTextBlockData(typedChild.data);

  if (typedChild.type === "callout") {
      return {
        ...typedChild,
        data: {
          ...normalizedData,
          icon: normalizeIcon(typedChild.data.icon as Parameters<typeof normalizeIcon>[0]),
        },
        ...(typedChild.children ? { children: normalizeBlockChildren(typedChild.children) } : {}),
      };
  }

  return {
    ...typedChild,
    data: normalizedData,
    ...(typedChild.children ? { children: normalizeBlockChildren(typedChild.children) } : {}),
  };
}

export function normalizeBlockChildren(children: InputBlockChildren): ApiBlockChildren {
  const parsedChildren = InputBlockChildrenSchema.parse(children) as Array<Record<string, unknown>>;
  const normalizedChildren = parsedChildren.map((child) => normalizeChildBlock(child));

  return ApiBlockChildrenSchema.parse(normalizedChildren);
}
