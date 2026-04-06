import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import { PagePropertiesSchema } from "../schemas/properties.js";
import { BlockChildrenSchema } from "../schemas/blocks.js";

export function registerCompositeTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_page_with_content",
    "Create a new page AND populate it with content blocks in a single operation. Combines page creation and block appending. IMPORTANT: By default, DO NOT specify parent — this creates the page at the top level where the user can see it in the sidebar. Only specify parent.page_id when the user explicitly asks to create a sub-page under a specific page. Pages created with parent are hidden from the sidebar and can only be found via search or direct link.",
    {
      parent: z
        .object({
          page_id: z.string().optional().describe("Parent page ID"),
          database_id: z.string().optional().describe("Parent database ID"),
        })
        .optional()
        .describe("Parent location. WARNING: Setting this makes the page hidden from sidebar. Only set when user explicitly wants a sub-page."),
      properties: PagePropertiesSchema.describe(
        "Page properties. At minimum, include a title property.",
      ),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
      children: BlockChildrenSchema.describe("Content blocks to add to the page"),
    },
    async ({ children, ...pageArgs }) => {
      const body: Record<string, unknown> = { properties: pageArgs.properties };
      if (pageArgs.parent) body.parent = pageArgs.parent;
      if (pageArgs.icon) body.icon = pageArgs.icon;
      if (pageArgs.cover) body.cover = pageArgs.cover;

      const page = (await client.post("/pages", body)) as { id: string };
      const blocks = await client.patch(`/blocks/${page.id}/children`, { children });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ page, blocks }, null, 2),
          },
        ],
      };
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
      const page = await client.get(`/pages/${page_id}`);
      const params: Record<string, string> = { page_size: "100" };
      if (recursive) params.recursive = "true";
      const blocks = await client.get(`/blocks/${page_id}/children`, params);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ page, blocks }, null, 2),
          },
        ],
      };
    },
  );
}
