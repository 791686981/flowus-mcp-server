import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { jsonResponse, errorResponse } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import {
  CreateDatabasePropertiesSchema,
  UpdateDatabasePropertiesSchema,
} from "../schemas/properties.js";

export function registerDatabaseTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_database",
    "Create a new database (multi-dimensional table) under a page in FlowUS. NOTE: Databases must have a parent page. If you want the database visible in the sidebar, first create a page WITHOUT parent (so it appears in sidebar), then create the database under that page.",
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
      properties: CreateDatabasePropertiesSchema.describe("Database property schema definitions"),
      icon: IconSchema.optional(),
      is_inline: z.boolean().optional().describe("If true, create as inline database"),
    },
    async (args) => {
      try {
        return jsonResponse(await client.post("/databases", args));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "get_database",
    "Retrieve a FlowUS database's structure, including all property definitions.",
    {
      database_id: z.string().describe("The database ID to retrieve"),
    },
    async ({ database_id }) => {
      try {
        return jsonResponse(await client.get(`/databases/${database_id}`));
      } catch (error) {
        return errorResponse(error);
      }
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
      try {
        const body: Record<string, unknown> = {};
        if (page_size !== undefined) body.page_size = page_size;
        if (start_cursor) body.start_cursor = start_cursor;

        return jsonResponse(await client.post(`/databases/${database_id}/query`, body));
      } catch (error) {
        return errorResponse(error);
      }
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
      properties: UpdateDatabasePropertiesSchema.optional().describe(
        "Properties to add/update. Set a property key to null to delete it.",
      ),
      icon: IconSchema.optional(),
      cover: CoverSchema.optional(),
      archived: z.boolean().optional().describe("Set to true to archive the database"),
    },
    async ({ database_id, title, properties, icon, cover, archived }) => {
      try {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (properties !== undefined) body.properties = properties;
        if (icon !== undefined) body.icon = icon;
        if (cover !== undefined) body.cover = cover;
        if (archived !== undefined) body.archived = archived;

        return jsonResponse(await client.patch(`/databases/${database_id}`, body));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
