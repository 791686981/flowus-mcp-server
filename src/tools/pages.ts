import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { jsonResponse, errorResponse } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import { PagePropertiesSchema } from "../schemas/properties.js";
import { InputPagePropertiesSchema } from "../schemas/input/properties.js";
import { normalizePageProperties } from "../normalizers/properties.js";

export function registerPageTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_page",
    "Create a new page in FlowUS. Can be a standalone page, a sub-page under another page, or a record in a database. IMPORTANT: By default, DO NOT specify parent — this creates the page at the top level where the user can see it in the sidebar. Only specify parent.page_id when the user explicitly asks to create a sub-page under a specific page. Pages created with parent are hidden from the sidebar and can only be found via search or direct link.",
    {
      parent: z
        .object({
          page_id: z.string().optional().describe("Parent page ID"),
          database_id: z.string().optional().describe("Parent database ID"),
        })
        .optional()
        .describe("Parent location. WARNING: Setting this makes the page hidden from sidebar. Only set when user explicitly wants a sub-page."),
      properties: InputPagePropertiesSchema.describe(
        "Page properties. At minimum, include a title property.",
      ),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
    },
    async (args) => {
      try {
        const body: Record<string, unknown> = {
          properties: PagePropertiesSchema.parse(
            normalizePageProperties(args.properties),
          ),
        };
        if (args.parent) body.parent = args.parent;
        if (args.icon) body.icon = args.icon;
        if (args.cover) body.cover = args.cover;

        return jsonResponse(await client.post("/pages", body));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "get_page",
    "Retrieve a FlowUS page by ID. Returns page properties, parent info, icon, and cover.",
    {
      page_id: z.string().describe("The page ID to retrieve"),
    },
    async ({ page_id }) => {
      try {
        return jsonResponse(await client.get(`/pages/${page_id}`));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "update_page",
    "Update a FlowUS page's properties, icon, cover, or archive status.",
    {
      page_id: z.string().describe("The page ID to update"),
      properties: InputPagePropertiesSchema.optional().describe("Properties to update"),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
      archived: z.boolean().optional().describe("Set to true to archive the page"),
    },
    async ({ page_id, properties, icon, cover, archived }) => {
      try {
        const body: Record<string, unknown> = {};
        if (properties !== undefined) {
          body.properties = PagePropertiesSchema.parse(
            normalizePageProperties(properties),
          );
        }
        if (icon !== undefined) body.icon = icon;
        if (cover !== undefined) body.cover = cover;
        if (archived !== undefined) body.archived = archived;

        return jsonResponse(await client.patch(`/pages/${page_id}`, body));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
