import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import { DatabasePropertiesSchema } from "../schemas/properties.js";

export function registerDatabaseTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_database",
    "Create a new database (multi-dimensional table) under a page in FlowUS.",
    {
      parent: z.object({
        type: z.literal("page_id").default("page_id"),
        page_id: z.string().describe("Parent page ID"),
      }).describe("Parent page for the database"),
      title: z.array(
        z.object({
          type: z.literal("text").default("text"),
          text: z.object({
            content: z.string().describe("Database title text"),
          }),
        }),
      ).describe("Database title"),
      properties: DatabasePropertiesSchema.describe("Database property schema definitions"),
      icon: IconSchema.optional(),
      is_inline: z.boolean().optional().describe("If true, create as inline database"),
    },
    async (args) => {
      const result = await client.post("/databases", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "get_database",
    "Retrieve a FlowUS database's structure, including all property definitions.",
    {
      database_id: z.string().describe("The database ID to retrieve"),
    },
    async ({ database_id }) => {
      const result = await client.get(`/databases/${database_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "query_database",
    "Query records from a FlowUS database. Returns pages (records) with all their properties. Supports pagination.",
    {
      database_id: z.string().describe("The database ID to query"),
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
    },
    async ({ database_id, page_size, start_cursor }) => {
      const body: Record<string, unknown> = {};
      if (page_size !== undefined) body.page_size = page_size;
      if (start_cursor) body.start_cursor = start_cursor;

      const result = await client.post(`/databases/${database_id}/query`, body);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "update_database",
    "Update a FlowUS database's title, icon, cover, or properties. Can add, update, or remove property columns.",
    {
      database_id: z.string().describe("The database ID to update"),
      title: z
        .array(
          z.object({
            type: z.literal("text").default("text"),
            text: z.object({ content: z.string() }),
          }),
        )
        .optional()
        .describe("New database title"),
      properties: DatabasePropertiesSchema.optional().describe(
        "Properties to add/update. Set a property key to null to delete it.",
      ),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
      archived: z.boolean().optional().describe("Set to true to archive the database"),
    },
    async ({ database_id, ...body }) => {
      const result = await client.patch(`/databases/${database_id}`, body);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
