import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import { PagePropertiesSchema } from "../schemas/properties.js";

export function registerPageTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_page",
    "Create a new page in FlowUS. Can be a standalone page, a sub-page under another page, or a record in a database. IMPORTANT: Omit parent to create a top-level page visible in the sidebar. If parent is specified, the page will be nested inside that parent and may not appear in the sidebar.",
    {
      parent: z
        .object({
          page_id: z.string().optional().describe("Parent page ID"),
          database_id: z.string().optional().describe("Parent database ID"),
        })
        .optional()
        .describe("Parent location. Omit to create at default location."),
      properties: PagePropertiesSchema.describe(
        "Page properties. At minimum, include a title property.",
      ),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
    },
    async (args) => {
      const body: Record<string, unknown> = { properties: args.properties };
      if (args.parent) body.parent = args.parent;
      if (args.icon) body.icon = args.icon;
      if (args.cover) body.cover = args.cover;

      const result = await client.post("/pages", body);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "get_page",
    "Retrieve a FlowUS page by ID. Returns page properties, parent info, icon, and cover.",
    {
      page_id: z.string().describe("The page ID to retrieve"),
    },
    async ({ page_id }) => {
      const result = await client.get(`/pages/${page_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "update_page",
    "Update a FlowUS page's properties, icon, cover, or archive status.",
    {
      page_id: z.string().describe("The page ID to update"),
      properties: PagePropertiesSchema.optional().describe("Properties to update"),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
      archived: z.boolean().optional().describe("Set to true to archive the page"),
    },
    async ({ page_id, ...body }) => {
      const result = await client.patch(`/pages/${page_id}`, body);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
