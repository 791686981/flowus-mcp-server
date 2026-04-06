import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { BlockChildrenSchema, BlockDataSchema, BlockTypeEnum } from "../schemas/blocks.js";

export function registerBlockTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "get_block",
    "Retrieve a single block by ID from FlowUS.",
    {
      block_id: z.string().describe("The block ID to retrieve"),
    },
    async ({ block_id }) => {
      const result = await client.get(`/blocks/${block_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
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
      const params: Record<string, string> = {};
      if (page_size !== undefined) params.page_size = String(page_size);
      if (start_cursor) params.start_cursor = start_cursor;
      if (recursive !== undefined) params.recursive = String(recursive);

      const result = await client.get(`/blocks/${block_id}/children`, params);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "append_block_children",
    "Append child blocks to a page or block. Supports all block types: paragraph, headings, lists, to_do, quote, toggle, code, callout, equation, divider, bookmark, embed, image, file, table, and more.",
    {
      block_id: z.string().describe("The parent block or page ID to append to"),
      children: BlockChildrenSchema,
      after: z
        .string()
        .optional()
        .describe("Block ID to insert after. If omitted, appends to the end."),
    },
    async ({ block_id, children, after }) => {
      const body: Record<string, unknown> = { children };
      if (after) body.after = after;

      const result = await client.patch(`/blocks/${block_id}/children`, body);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
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
    async ({ block_id, ...body }) => {
      const result = await client.patch(`/blocks/${block_id}`, body);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
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
      const result = await client.delete(`/blocks/${block_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
