import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { FlowUsClientError, jsonResponse, errorResponse } from "../client.js";
import { blocksFromMarkdown } from "../markdown/blocks_from_markdown.js";
import { parseMarkdownDocument } from "../markdown/parse_markdown.js";
import { renderPageToMarkdown } from "../markdown/render_page.js";
import { CoverSchema } from "../schemas/common.js";
import { InputIconSchema } from "../schemas/input/common.js";
import { InputPagePropertiesSchema } from "../schemas/input/properties.js";
import { BlockChildrenSchema } from "../schemas/blocks.js";
import { PageParentSchema, buildCreatePagePayload } from "../utils/validation.js";

async function fetchAllBlockChildren(
  client: FlowUsClient,
  blockId: string,
  recursive: boolean,
) {
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
    }>(`/blocks/${blockId}/children`, params);

    allResults.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor ?? undefined;
  }

  return allResults;
}

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
        const allResults = await fetchAllBlockChildren(client, page_id, recursive);

        return jsonResponse({ page, blocks: { results: allResults, total: allResults.length } });
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "read_page_as_markdown",
    "Read a page and render its content as Markdown, with optional metadata for block mapping.",
    {
      page_id: z.string().describe("The page ID to read"),
      recursive: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true (default), recursively fetch all nested blocks"),
      include_properties: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true (default), include page title and simple properties in the markdown header"),
      include_metadata: z
        .boolean()
        .optional()
        .default(true)
        .describe("If true (default), include block mapping metadata and unsupported block diagnostics"),
    },
    async ({ page_id, recursive, include_properties, include_metadata }) => {
      try {
        const page = await client.get(`/pages/${page_id}`);
        const blocks = await fetchAllBlockChildren(client, page_id, recursive);
        const rendered = renderPageToMarkdown(
          page as { properties?: Record<string, unknown> },
          blocks as Array<{
            id: string;
            type: string;
            data?: Record<string, unknown>;
            children?: unknown[];
          }>,
          { includeProperties: include_properties },
        );

        return jsonResponse({
          page,
          markdown: rendered.markdown,
          metadata: include_metadata ? rendered.metadata : undefined,
        });
      } catch (error) {
        return errorResponse(error);
      }
    },
  );

  server.tool(
    "create_page_from_markdown",
    "Create a page from Markdown content while keeping page properties explicit. The markdown body is parsed into supported FlowUS blocks locally before any API call.",
    {
      parent: PageParentSchema
        .optional()
        .describe("Parent location. WARNING: Setting this makes the page hidden from sidebar. Only set when user explicitly wants a sub-page."),
      properties: InputPagePropertiesSchema.describe(
        "Page properties. At minimum, include a title property.",
      ),
      icon: InputIconSchema.optional(),
      cover: CoverSchema.optional(),
      markdown: z.string().describe("Markdown body content to parse into FlowUS blocks."),
      strict: z
        .boolean()
        .optional()
        .default(true)
        .describe("Reserved for future parser modes. Currently only strict parsing is supported."),
    },
    async ({ markdown, strict: _strict, ...pageArgs }) => {
      let page: { id: string } | undefined;

      try {
        const document = parseMarkdownDocument(markdown);
        const children = BlockChildrenSchema.parse(blocksFromMarkdown(document.nodes)) as Array<{
          type: string;
          data: Record<string, unknown>;
          children?: unknown[];
        }>;

        page = (await client.post("/pages", buildCreatePagePayload(pageArgs))) as { id: string };
        const blocks = await client.patch(`/blocks/${page.id}/children`, { children });

        return jsonResponse({
          page,
          blocks,
          summary: {
            parsed_block_count: children.length,
            parsed_table_count: document.nodes.filter((node) => node.type === "table").length,
          },
        });
      } catch (error) {
        if (page) {
          const msg = error instanceof FlowUsClientError ? error.message : String(error);
          return {
            isError: true as const,
            content: [{
              type: "text" as const,
              text: `Page created successfully (id: ${page.id}) but adding markdown content failed: ${msg}.`,
            }],
          };
        }
        return errorResponse(error);
      }
    },
  );
}
