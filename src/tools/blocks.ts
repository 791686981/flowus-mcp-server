import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { FlowUsLocalError, jsonResponse, errorResponse } from "../client.js";
import { BlockChildrenSchema, BlockDataSchema, BlockTypeEnum } from "../schemas/blocks.js";
import { InputBlockChildrenSchema } from "../schemas/input/blocks.js";
import { normalizeBlockChildren } from "../normalizers/blocks.js";
import { parseAndNormalize } from "../utils/validation.js";
import { appendChildrenWithDeferredTableRows, type CanonicalBlock } from "../utils/append_children.js";
import { fetchPagedBlockChildren } from "../utils/block_children.js";

export function registerBlockTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "get_block",
    "Retrieve a single block by ID from FlowUS.",
    {
      block_id: z.string().describe("The block ID to retrieve"),
    },
    async ({ block_id }) => {
      try {
        return jsonResponse(await client.get(`/blocks/${block_id}`));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "get_block_children",
    "Get the child blocks of a page or block. Use this to read page content. Supports pagination.",
    {
      block_id: z.string().describe("The parent block or page ID"),
      page_size: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (max 100, default 50)"),
      start_cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response"),
      recursive: z
        .boolean()
        .optional()
        .describe("If true, recursively fetch all nested children (default false)"),
    },
    async ({ block_id, page_size, start_cursor, recursive }) => {
      try {
        return jsonResponse(
          await fetchPagedBlockChildren(client, block_id, {
            pageSize: page_size,
            startCursor: start_cursor,
            recursive,
          }),
        );
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "append_block_children",
    "Append child blocks to a page or block. Supports all block types: paragraph, headings, lists, to_do, quote, toggle, code, callout, equation, divider, bookmark, embed, image, file, table, and more. Note: the current FlowUS Blocks API only appends to the end; positional insertion via after is not supported.",
    {
      block_id: z.string().describe("The parent block or page ID to append to"),
      children: InputBlockChildrenSchema,
      after: z
        .string()
        .optional()
        .describe("Reserved for future positional insertion. The current FlowUS Blocks API does not support after and this server will reject it."),
    },
    async ({ block_id, children, after }) => {
      try {
        if (after) {
          throw new FlowUsLocalError(
            "input",
            "The after parameter is not supported because the current FlowUS Blocks API only appends children to the end.",
          );
        }

        const body: Record<string, unknown> = {
          children: parseAndNormalize(
            InputBlockChildrenSchema,
            children,
            normalizeBlockChildren,
            BlockChildrenSchema,
          ),
        };

        return jsonResponse(await appendChildrenWithDeferredTableRows(
          client,
          block_id,
          body.children as CanonicalBlock[],
        ));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "update_block",
    "Update a block's content, type, colors, or archive it. Can change block type (e.g. paragraph to heading).",
    {
      block_id: z.string().describe("The block ID to update"),
      type: BlockTypeEnum.optional().describe("New block type (to convert the block)"),
      data: BlockDataSchema.optional().describe("New block data/content"),
      archived: z.boolean().optional().describe("Set to true to archive (soft-delete) the block"),
    },
    async ({ block_id, type, data, archived }) => {
      try {
        const body: Record<string, unknown> = {};
        if (type !== undefined) body.type = type;
        if (data !== undefined) body.data = data;
        if (archived !== undefined) body.archived = archived;

        return jsonResponse(await client.patch(`/blocks/${block_id}`, body));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "delete_block",
    "Permanently delete a block and all its children. This action is irreversible.",
    {
      block_id: z.string().describe("The block ID to delete"),
    },
    {
      destructiveHint: true,
      idempotentHint: false,
    },
    async ({ block_id }) => {
      try {
        return jsonResponse(await client.delete(`/blocks/${block_id}`));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
