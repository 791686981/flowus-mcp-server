import { z } from "zod";
import { ApiIconSchema } from "../schemas/api/common.js";
import { InputIconSchema } from "../schemas/input/common.js";

const EMOJI_SHORTHAND_PATTERN =
  /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u200D|\uFE0F)+$/u;

type InputIcon = z.input<typeof InputIconSchema>;
type ApiIcon = z.output<typeof ApiIconSchema>;

export function normalizeIcon(icon: InputIcon): ApiIcon {
  const parsedIcon = InputIconSchema.parse(icon);

  if (typeof parsedIcon === "string") {
    if (!EMOJI_SHORTHAND_PATTERN.test(parsedIcon)) {
      throw new Error(`Unsupported icon shorthand: ${parsedIcon}`);
    }

    return ApiIconSchema.parse({ emoji: parsedIcon });
  }

  return ApiIconSchema.parse(parsedIcon);
}
