import { z } from "zod";
import {
  ApiBlockChildrenSchema,
  BlockTypeEnum,
} from "../schemas/api/blocks.js";
import { InputIconSchema, InputRichTextSchema } from "../schemas/input/common.js";
import { InputBlockChildrenSchema } from "../schemas/input/blocks.js";
import { normalizeIcon } from "./icon.js";
import { normalizeRichText } from "./rich_text.js";

type InputBlockChildren = z.input<typeof InputBlockChildrenSchema>;
type InputBlockChild = {
  type: string;
  data: Record<string, unknown>;
  children?: InputBlockChildren;
};
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

function normalizeTemplateBlockData(data: Record<string, unknown>) {
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

function normalizeChildBlock(child: InputBlockChild) {
  const normalizedChildren = Array.isArray(child.children)
    ? normalizeBlockChildren(child.children as InputBlockChildren)
    : undefined;

  if (RICH_TEXT_BLOCK_TYPES.has(child.type as BlockType)) {
    const normalizedData = normalizeTextBlockData(child.data as Record<string, unknown>);

    if (child.type === "callout") {
      return {
        ...child,
        data: {
          ...normalizedData,
          icon: normalizeIcon(InputIconSchema.parse(child.data.icon)),
        },
        ...(normalizedChildren ? { children: normalizedChildren } : {}),
      };
    }

    return {
      ...child,
      data: normalizedData,
      ...(normalizedChildren ? { children: normalizedChildren } : {}),
    };
  }

  if (child.type === "template") {
    return {
      ...child,
      data: normalizeTemplateBlockData(child.data),
      ...(normalizedChildren ? { children: normalizedChildren } : {}),
    };
  }

  if (hasUnsupportedNonTextShorthand(child.data as Record<string, unknown>)) {
    throw new Error(`Unsupported shorthand for block type "${child.type as string}"`);
  }

  return {
    ...child,
    ...(normalizedChildren ? { children: normalizedChildren } : {}),
  };
}

export function normalizeBlockChildren(children: InputBlockChildren): ApiBlockChildren {
  const parsedChildren = InputBlockChildrenSchema.parse(children) as InputBlockChild[];

  const normalizedChildren = parsedChildren.map((child) => normalizeChildBlock(child));

  return ApiBlockChildrenSchema.parse(normalizedChildren);
}
