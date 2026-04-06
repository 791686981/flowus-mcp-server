# FlowUS MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hand-written MCP server that fully covers the FlowUS API, replacing the limited official MCP.

**Architecture:** TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport. Tools organized by API domain (pages, blocks, databases, search, users) plus composite tools. Shared `FlowUsClient` handles HTTP communication and error translation.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, Zod, Node.js native fetch

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript config targeting ES2022/Node |
| `src/index.ts` | Entry point: create server, register all tools, start stdio transport |
| `src/client.ts` | `FlowUsClient` class: HTTP get/post/patch/delete, auth, error handling |
| `src/schemas/common.ts` | Shared Zod schemas: RichText, Color, Icon, Cover |
| `src/schemas/blocks.ts` | Block object Zod schema with all 20+ types |
| `src/schemas/properties.ts` | Page property Zod schemas for all 15 types |
| `src/tools/pages.ts` | 3 tools: create_page, get_page, update_page |
| `src/tools/blocks.ts` | 5 tools: get_block, get_block_children, append_block_children, update_block, delete_block |
| `src/tools/databases.ts` | 4 tools: create_database, get_database, query_database, update_database |
| `src/tools/search.ts` | 1 tool: search_pages |
| `src/tools/users.ts` | 1 tool: get_me |
| `src/tools/composites.ts` | 2 tools: create_page_with_content, read_page_content |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: directory structure `src/tools/`, `src/schemas/`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "flowus-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for FlowUS API with full block type and rich text support",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "flowus-mcp-server": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p src/tools src/schemas
```

- [ ] **Step 4: Install dependencies**

```bash
npm install @modelcontextprotocol/sdk zod
npm install -D typescript tsx @types/node
```

- [ ] **Step 5: Verify build setup**

Create a minimal `src/index.ts`:

```typescript
console.error("FlowUS MCP Server starting...");
```

Run:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json package-lock.json src/index.ts
git commit -m "chore: scaffold project with dependencies and build config"
```

---

### Task 2: HTTP Client

**Files:**
- Create: `src/client.ts`

- [ ] **Step 1: Create FlowUsClient**

```typescript
// src/client.ts

export class FlowUsClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "FlowUsClientError";
  }
}

export class FlowUsClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl?: string) {
    this.token = token;
    this.baseUrl = baseUrl ?? "https://api.flowus.cn/v1";
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = this.formatError(response.status, errorBody);
      throw new FlowUsClientError(
        response.status,
        (errorBody as Record<string, unknown>).code as string ?? "unknown_error",
        message,
      );
    }

    return response.json() as Promise<T>;
  }

  private formatError(status: number, body: unknown): string {
    const msg =
      (body as Record<string, unknown>)?.message as string ?? "Unknown error";
    switch (status) {
      case 400:
        return `Parameter error: ${msg}`;
      case 401:
        return "Authentication failed. Check that FLOWUS_TOKEN is correct.";
      case 403:
        return "Permission denied. Ensure the bot has been added to the target page with appropriate permissions.";
      case 404:
        return `Resource not found. ${msg}`;
      case 429:
        return "Rate limit exceeded. Please retry later.";
      default:
        if (status >= 500)
          return `FlowUS server error (${status}). Please retry later.`;
        return `HTTP ${status}: ${msg}`;
    }
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/client.ts
git commit -m "feat: add FlowUsClient HTTP client with error handling"
```

---

### Task 3: Shared Schemas

**Files:**
- Create: `src/schemas/common.ts`
- Create: `src/schemas/blocks.ts`
- Create: `src/schemas/properties.ts`

- [ ] **Step 1: Create common schemas**

```typescript
// src/schemas/common.ts
import { z } from "zod";

export const ColorSchema = z
  .enum([
    "default",
    "gray",
    "brown",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "red",
  ])
  .optional()
  .describe("Color value");

export const AnnotationsSchema = z
  .object({
    bold: z.boolean().optional().describe("Bold text"),
    italic: z.boolean().optional().describe("Italic text"),
    strikethrough: z.boolean().optional().describe("Strikethrough text"),
    underline: z.boolean().optional().describe("Underlined text"),
    code: z.boolean().optional().describe("Code formatted text"),
    color: ColorSchema,
  })
  .optional()
  .describe("Text formatting options");

export const RichTextItemSchema = z.object({
  type: z.enum(["text", "mention", "equation"]).describe("Rich text segment type"),
  text: z
    .object({
      content: z.string().describe("Text content"),
      link: z.object({ url: z.string() }).optional().describe("Optional hyperlink"),
    })
    .optional()
    .describe("Text content (required when type is 'text')"),
  mention: z
    .object({
      type: z.enum(["user", "page", "date"]).describe("Mention type"),
      user: z.object({ id: z.string() }).optional().describe("User mention"),
      page: z.object({ id: z.string() }).optional().describe("Page mention"),
      date: z
        .object({
          start: z.string(),
          end: z.string().optional(),
          time_zone: z.string().optional(),
        })
        .optional()
        .describe("Date mention"),
    })
    .optional()
    .describe("Mention content (required when type is 'mention')"),
  equation: z
    .object({ expression: z.string() })
    .optional()
    .describe("LaTeX expression (required when type is 'equation')"),
  annotations: AnnotationsSchema,
});

export const RichTextSchema = z
  .array(RichTextItemSchema)
  .describe(
    "Rich text array. Simplest form: [{ type: 'text', text: { content: 'Hello' } }]",
  );

export const IconSchema = z
  .union([
    z.object({ emoji: z.string().describe("Emoji character, e.g. '📄'") }),
    z.object({
      type: z.literal("external"),
      external: z.object({ url: z.string().describe("Icon image URL") }),
    }),
  ])
  .describe("Page or block icon: emoji or external URL");

export const CoverSchema = z
  .object({
    type: z.literal("external"),
    external: z.object({ url: z.string().describe("Cover image URL") }),
  })
  .describe("Page cover image");
```

- [ ] **Step 2: Create block schemas**

```typescript
// src/schemas/blocks.ts
import { z } from "zod";
import { RichTextSchema, ColorSchema, IconSchema } from "./common.js";

export const BlockTypeEnum = z.enum([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "quote",
  "toggle",
  "code",
  "callout",
  "equation",
  "link_to_page",
  "divider",
  "bookmark",
  "embed",
  "image",
  "file",
  "table",
  "table_row",
  "column_list",
  "column",
  "synced_block",
  "template",
]);

export const BlockDataSchema = z
  .record(z.unknown())
  .describe(
    `Block data object. Structure depends on block type:
- Text blocks (paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, quote, toggle): { rich_text: RichText[], text_color?: Color, background_color?: Color }
- to_do: { rich_text: RichText[], checked: boolean, text_color?: Color, background_color?: Color }
- code: { rich_text: RichText[], language: string }
- callout: { rich_text: RichText[], icon: { emoji: "..." }, text_color?: Color, background_color?: Color }
- equation: { expression: "LaTeX string" }
- link_to_page: { page_id: "uuid" }
- divider: {}
- bookmark: { url: "https://...", caption?: RichText[] }
- embed: { url: "https://...", caption?: RichText[] }
- image/file: { type: "external", external: { url: "https://..." }, caption?: RichText[] }
- table: { table_width: number, has_column_header: boolean, has_row_header: boolean }
- table_row: { cells: RichText[][] }
- column_list/column: {}
Rich text simplest form: [{ type: "text", text: { content: "Hello" } }]
Color values: default, gray, brown, orange, yellow, green, blue, purple, pink, red`,
  );

export const BlockObjectSchema = z.object({
  type: BlockTypeEnum.describe("Block type"),
  data: BlockDataSchema,
});

export const BlockChildrenSchema = z
  .array(BlockObjectSchema)
  .min(1)
  .max(100)
  .describe("Array of block objects to append (max 100 per request)");
```

- [ ] **Step 3: Create property schemas**

```typescript
// src/schemas/properties.ts
import { z } from "zod";

export const PagePropertiesSchema = z
  .record(z.unknown())
  .describe(
    `Page properties object. Keys are property names, values depend on type:
- title: { type: "title", title: [{ text: { content: "Page Title" } }] }
- rich_text: { type: "rich_text", rich_text: [{ text: { content: "Text" } }] }
- number: { type: "number", number: 42 }
- checkbox: { type: "checkbox", checkbox: true }
- select: { type: "select", select: { name: "Option" } }
- multi_select: { type: "multi_select", multi_select: [{ name: "Tag1" }, { name: "Tag2" }] }
- date: { type: "date", date: { start: "2024-01-15", end?: "2024-01-16" } }
- url: { type: "url", url: "https://example.com" }
- email: { type: "email", email: "user@example.com" }
- phone_number: { type: "phone_number", phone_number: "+86 138-0013-8000" }
- people: { type: "people", people: [{ id: "user-uuid" }] }
- files: { type: "files", files: [{ name: "doc.pdf", external: { url: "https://..." } }] }
- relation: { type: "relation", relation: [{ id: "page-uuid" }] }`,
  );

export const DatabasePropertiesSchema = z
  .record(z.unknown())
  .describe(
    `Database property schema definitions. Keys are property IDs, values define the schema:
- title: { id: "title", name: "Name", type: "title" }
- rich_text: { id: "desc", name: "Description", type: "rich_text" }
- number: { id: "amt", name: "Amount", type: "number", number: { format: "number" } }
- checkbox: { id: "done", name: "Done", type: "checkbox" }
- select: { id: "status", name: "Status", type: "select", select: { options: [{ name: "Active", color: "green" }] } }
- multi_select: { id: "tags", name: "Tags", type: "multi_select", multi_select: { options: [{ name: "Tag", color: "blue" }] } }
- date: { id: "due", name: "Due Date", type: "date" }
- url/email/phone_number: { id: "...", name: "...", type: "url"|"email"|"phone_number" }
- people: { id: "owner", name: "Owner", type: "people" }
- files: { id: "att", name: "Attachments", type: "files" }
- relation: { id: "rel", name: "Related", type: "relation", relation: { database_id: "target-db-uuid" } }
Set a property to null to delete it.`,
  );
```

- [ ] **Step 4: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/schemas/
git commit -m "feat: add Zod schemas for blocks, properties, and common types"
```

---

### Task 4: Pages Tools

**Files:**
- Create: `src/tools/pages.ts`

- [ ] **Step 1: Create pages tools**

```typescript
// src/tools/pages.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import { PagePropertiesSchema } from "../schemas/properties.js";

export function registerPageTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_page",
    "Create a new page in FlowUS. Can be a standalone page, a sub-page under another page, or a record in a database.",
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
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/pages.ts
git commit -m "feat: add page tools (create, get, update)"
```

---

### Task 5: Blocks Tools

**Files:**
- Create: `src/tools/blocks.ts`

- [ ] **Step 1: Create blocks tools**

```typescript
// src/tools/blocks.ts
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
    async ({ block_id }) => {
      const result = await client.delete(`/blocks/${block_id}`);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/blocks.ts
git commit -m "feat: add block tools (get, children, append, update, delete)"
```

---

### Task 6: Database Tools

**Files:**
- Create: `src/tools/databases.ts`

- [ ] **Step 1: Create database tools**

```typescript
// src/tools/databases.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { IconSchema, CoverSchema, RichTextSchema } from "../schemas/common.js";
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
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/databases.ts
git commit -m "feat: add database tools (create, get, query, update)"
```

---

### Task 7: Search & Users Tools

**Files:**
- Create: `src/tools/search.ts`
- Create: `src/tools/users.ts`

- [ ] **Step 1: Create search tool**

```typescript
// src/tools/search.ts
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
```

- [ ] **Step 2: Create users tool**

```typescript
// src/tools/users.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";

export function registerUserTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "get_me",
    "Get information about the bot's creator (current user). Returns user ID, name, email, and avatar.",
    {},
    async () => {
      const result = await client.get("/users/me");
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/search.ts src/tools/users.ts
git commit -m "feat: add search and user tools"
```

---

### Task 8: Composite Tools

**Files:**
- Create: `src/tools/composites.ts`

- [ ] **Step 1: Create composite tools**

```typescript
// src/tools/composites.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { IconSchema, CoverSchema } from "../schemas/common.js";
import { PagePropertiesSchema } from "../schemas/properties.js";
import { BlockChildrenSchema } from "../schemas/blocks.js";

export function registerCompositeTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "create_page_with_content",
    "Create a new page AND populate it with content blocks in a single operation. Combines page creation and block appending.",
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
      children: BlockChildrenSchema.describe("Content blocks to add to the page"),
    },
    async ({ children, ...pageArgs }) => {
      // Step 1: Create the page
      const body: Record<string, unknown> = { properties: pageArgs.properties };
      if (pageArgs.parent) body.parent = pageArgs.parent;
      if (pageArgs.icon) body.icon = pageArgs.icon;
      if (pageArgs.cover) body.cover = pageArgs.cover;

      const page = (await client.post("/pages", body)) as { id: string };

      // Step 2: Append content blocks
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
      // Step 1: Get page properties
      const page = await client.get(`/pages/${page_id}`);

      // Step 2: Get child blocks
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
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/composites.ts
git commit -m "feat: add composite tools (create_page_with_content, read_page_content)"
```

---

### Task 9: Entry Point & Wiring

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Write the entry point**

Replace `src/index.ts` with:

```typescript
#!/usr/bin/env node
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FlowUsClient } from "./client.js";
import { registerPageTools } from "./tools/pages.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerDatabaseTools } from "./tools/databases.js";
import { registerSearchTools } from "./tools/search.js";
import { registerUserTools } from "./tools/users.js";
import { registerCompositeTools } from "./tools/composites.js";

const token = process.env.FLOWUS_TOKEN;
if (!token) {
  console.error("Error: FLOWUS_TOKEN environment variable is required.");
  console.error("Get your bot token from FlowUS integration settings.");
  process.exit(1);
}

const apiBase = process.env.FLOWUS_API_BASE;
const client = new FlowUsClient(token, apiBase);

const server = new McpServer({
  name: "flowus-mcp-server",
  version: "1.0.0",
});

registerPageTools(server, client);
registerBlockTools(server, client);
registerDatabaseTools(server, client);
registerSearchTools(server, client);
registerUserTools(server, client);
registerCompositeTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("FlowUS MCP Server running on stdio");
```

- [ ] **Step 2: Build the project**

```bash
npx tsc
```

Expected: Compiles with no errors. `dist/` directory created with all `.js` files.

- [ ] **Step 3: Verify the server starts**

```bash
FLOWUS_TOKEN=test node dist/index.js <<< '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

Expected: Server outputs a JSON-RPC response with server info and capabilities. It may hang waiting for more input — that's normal for stdio. Kill with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire up entry point with all tool registrations"
```

---

### Task 10: Build Verification & Cleanup

**Files:**
- Modify: `package.json` (if needed for bin shebang)
- No new files

- [ ] **Step 1: Full clean build**

```bash
rm -rf dist && npx tsc
```

Expected: No errors, `dist/` populated with all compiled files.

- [ ] **Step 2: Verify tool listing via MCP inspector (optional)**

If you have `@modelcontextprotocol/inspector` installed:

```bash
FLOWUS_TOKEN=test npx @modelcontextprotocol/inspector node dist/index.js
```

Or verify via JSON-RPC:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | FLOWUS_TOKEN=test node dist/index.js 2>/dev/null
```

Expected: Response includes all 16 tools: create_page, get_page, update_page, get_block, get_block_children, append_block_children, update_block, delete_block, create_database, get_database, query_database, update_database, search_pages, get_me, create_page_with_content, read_page_content.

- [ ] **Step 3: Add MCP client config example**

Verify this config works (add to your Claude Code or Cursor settings):

```json
{
  "mcpServers": {
    "flowus": {
      "command": "node",
      "args": ["/absolute/path/to/flowus-mcp-serve/dist/index.js"],
      "env": {
        "FLOWUS_TOKEN": "your_actual_bot_token"
      }
    }
  }
}
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: finalize build and verify all 16 tools registered"
```
