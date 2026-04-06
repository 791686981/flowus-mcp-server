import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";

export function registerSearchTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "search_pages",
    "Search for pages within the bot's authorized scope in FlowUS. Supports full-text and semantic search.",
    {
      query: z.string().describe("Search keywords. Use empty string to list all authorized pages."),
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
    async (args) => {
      const result = await client.post("/search", args);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
