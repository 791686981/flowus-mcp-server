import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { jsonResponse, errorResponse } from "../client.js";

type SearchResult = {
  object?: string;
  [key: string]: unknown;
};

type SearchResponse = {
  object: "list";
  results: SearchResult[];
  has_more: boolean;
  next_cursor: string | null;
  [key: string]: unknown;
};

function filterPageResults(results: SearchResult[]) {
  return results.filter((result) => result.object === "page");
}

export function registerSearchTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "search_pages",
    "Search for pages within the bot's authorized scope in FlowUS. Supports full-text and semantic search. This server filters out any non-page search results returned by FlowUS.",
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
    async ({ query, page_size, start_cursor }) => {
      try {
        const targetPageCount = page_size ?? 50;
        const results: SearchResult[] = [];
        let cursor = start_cursor;
        let hasMore = true;
        let lastResponse: SearchResponse | undefined;

        while (hasMore && results.length < targetPageCount) {
          const response = await client.post<SearchResponse>("/search", {
            query,
            page_size: targetPageCount - results.length,
            ...(cursor ? { start_cursor: cursor } : {}),
          });
          lastResponse = response;
          results.push(...filterPageResults(response.results));
          hasMore = response.has_more;
          cursor = response.next_cursor ?? undefined;
        }

        return jsonResponse({
          object: lastResponse?.object ?? "list",
          results,
          has_more: hasMore,
          next_cursor: cursor ?? null,
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
