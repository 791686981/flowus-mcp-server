import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { FlowUsClientError, jsonResponse, errorResponse } from "../client.js";
import { CoverSchema } from "../schemas/common.js";
import { InputIconSchema } from "../schemas/input/common.js";
import { InputPagePropertiesSchema } from "../schemas/input/properties.js";
import { BlockChildrenSchema } from "../schemas/blocks.js";
import { PageParentSchema, buildCreatePagePayload } from "../utils/validation.js";

export function registerCompositeTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_page_with_content",
    "Create a new page AND populate it with content blocks in a single operation. Combines page creation and block appending. IMPORTANT: By default, DO NOT specify parent — this creates the page at the top level where the user can see it in the sidebar. Only specify parent.page_id when the user explicitly asks to create a sub-page under a specific page. Pages created with parent are hidden from the sidebar and can only be found via search or direct link.",
    {
      parent: PageParentSchema
        .optional()
        .describe("Parent location. WARNING: Setting this makes the page hidden from sidebar. Only set when user explicitly wants a sub-page."),
      properties: InputPagePropertiesSchema.describe(
        "Page properties. At minimum, include a title property.",
      ),
      icon: InputIconSchema.optional(),
      cover: CoverSchema.optional(),
      children: BlockChildrenSchema.describe("Content blocks to add to the page"),
    },
    async ({ children, ...pageArgs }) => {
      // Step 1: Create the page
      let page: { id: string };
      try {
        page = (await client.post("/pages", buildCreatePagePayload(pageArgs))) as { id: string };
      } catch (error) {
        return errorResponse(error);
      }

      // Step 2: Append content blocks (page already created at this point)
      try {
        const blocks = await client.patch(`/blocks/${page.id}/children`, { children });
        return jsonResponse({ page, blocks });
      } catch (error) {
        const msg = error instanceof FlowUsClientError ? error.message : String(error);
        return {
          isError: true as const,
          content: [{
            type: "text" as const,
            text: `Page created successfully (id: ${page.id}) but adding content blocks failed: ${msg}. You can retry with append_block_children using this page ID.`,
          }],
        };
      }
    },
  );

  server.tool(
    "read_page_content",
    "Read a page's full content: properties and all child blocks. Optionally recursive to get nested blocks.",
    {
      page_id: z.string().describe("The page ID to read"),
      recursive: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true (default), recursively fetch all nested blocks"),
    },
    async ({ page_id, recursive }) => {
      try {
        const page = await client.get(`/pages/${page_id}`);

        // Fetch all blocks with pagination
        const allResults: unknown[] = [];
        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
          const params: Record<string, string> = { page_size: "100" };
          if (recursive) params.recursive = "true";
          if (cursor) params.start_cursor = cursor;

          const response = await client.get<{
            results: unknown[];
            has_more: boolean;
            next_cursor: string | null;
          }>(`/blocks/${page_id}/children`, params);

          allResults.push(...response.results);
          hasMore = response.has_more;
          cursor = response.next_cursor ?? undefined;
        }

        return jsonResponse({ page, blocks: { results: allResults, total: allResults.length } });
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
