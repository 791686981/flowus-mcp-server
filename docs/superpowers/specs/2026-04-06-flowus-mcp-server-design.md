# FlowUS MCP Server Design Spec

## Overview

A hand-written MCP server for the FlowUS API, providing full coverage of all API capabilities. Built to replace the limited official FlowUS MCP which only supports 3 block types and lacks rich text formatting, database filtering, and User API.

**Target users**: Internal team use
**Transport**: stdio
**Language**: TypeScript
**MCP SDK**: `@modelcontextprotocol/sdk`

## Motivation

The official FlowUS MCP has significant gaps:

| Capability | Official MCP | This Server |
|-----------|-------------|-------------|
| Block types | 3 (paragraph, bulleted_list, to_do) | 20+ (all types) |
| Rich text | Plain text only | Full: bold, italic, color, mentions, equations |
| Block update | rich_text and checked only | Content, type change, colors, archive |
| Database query | Pagination only | Pagination (filter/sort per FlowUS API support) |
| User API | Missing | Supported |
| Recursive children | Missing | Supported |
| Composite tools | None | create_page_with_content, read_page_content |

## Project Structure

```
flowus-mcp-server/
  package.json
  tsconfig.json
  src/
    index.ts              # Entry: init MCP Server, register all tools, start stdio transport
    client.ts             # FlowUsClient: HTTP requests, auth, error handling
    tools/
      pages.ts            # createPage, getPage, updatePage
      blocks.ts           # getBlock, getBlockChildren, appendBlocks, updateBlock, deleteBlock
      databases.ts        # createDatabase, getDatabase, queryDatabase, updateDatabase
      search.ts           # searchPages
      users.ts            # getMe
      composites.ts       # createPageWithContent, readPageContent
    schemas/
      blocks.ts           # All block type schemas (20+ types)
      properties.ts       # Page property schemas (15 types)
      common.ts           # Shared: rich_text, annotations, icon, color
  docs/
    flowus-api-docs/      # Existing API reference docs
```

## Architecture

### Entry Point (`src/index.ts`)

- Creates MCP `Server` instance with `{ capabilities: { tools: {} } }`
- Instantiates `FlowUsClient` with token from env
- Imports and calls registration functions from each tools/ module
- Connects via `StdioServerTransport`

### HTTP Client (`src/client.ts`)

`FlowUsClient` class encapsulates all HTTP communication:

- **Base URL**: configurable via `FLOWUS_API_BASE` env, defaults to `https://api.flowus.cn/v1`
- **Auth**: `Authorization: Bearer <FLOWUS_TOKEN>` header on every request
- **Methods**: `get(path)`, `post(path, body)`, `patch(path, body)`, `delete(path)`
- **Uses**: Node.js native `fetch` (Node 18+), no external HTTP library
- **Error handling**: Catches HTTP errors and converts to structured error messages

### Tool Registration Pattern

Each tools/ module exports a `register(server, client)` function:

```typescript
// tools/pages.ts
export function register(server: Server, client: FlowUsClient) {
  server.setRequestHandler(CallToolRequestSchema, ...);
  // or use server.tool() helper if available
}
```

The index.ts calls each register function in sequence.

## Tool Inventory

### Pages (3 tools)

#### `create_page`
- **API**: `POST /v1/pages`
- **Params**: `parent` (optional, page_id or database_id), `properties` (title + any db properties), `icon`, `cover`
- **Notes**: When parent is omitted, page is created at default location

#### `get_page`
- **API**: `GET /v1/pages/{page_id}`
- **Params**: `page_id` (required)
- **Returns**: Page object with all properties, parent info, icon, cover

#### `update_page`
- **API**: `PATCH /v1/pages/{page_id}`
- **Params**: `page_id` (required), `properties`, `icon`, `cover`, `archived`

### Blocks (5 tools)

#### `get_block`
- **API**: `GET /v1/blocks/{block_id}`
- **Params**: `block_id` (required)

#### `get_block_children`
- **API**: `GET /v1/blocks/{block_id}/children`
- **Params**: `block_id` (required), `page_size` (optional, max 100), `start_cursor` (optional), `recursive` (optional, default false)

#### `append_block_children`
- **API**: `PATCH /v1/blocks/{block_id}/children`
- **Params**: `block_id` (required), `children` (array of block objects), `after` (optional, insert after this block ID)
- **Supported block types**: paragraph, heading_1/2/3, bulleted_list_item, numbered_list_item, to_do, quote, toggle, code, callout, equation, link_to_page, divider, bookmark, embed, image, file, table, table_row, column_list, column, synced_block, template
- **Limit**: Max 100 blocks per request

#### `update_block`
- **API**: `PATCH /v1/blocks/{block_id}`
- **Params**: `block_id` (required), `type` (optional, change block type), `data` (block content), `archived` (optional)
- **Supports**: Updating rich_text, changing block type, setting text_color/background_color, toggling checked for to_do

#### `delete_block`
- **API**: `DELETE /v1/blocks/{block_id}`
- **Params**: `block_id` (required)
- **Warning**: Irreversible, deletes block and all children

### Databases (4 tools)

#### `create_database`
- **API**: `POST /v1/databases`
- **Params**: `parent` (page_id, required), `title`, `properties` (schema definition), `icon`, `is_inline`

#### `get_database`
- **API**: `GET /v1/databases/{database_id}`
- **Params**: `database_id` (required)

#### `query_database`
- **API**: `POST /v1/databases/{database_id}/query`
- **Params**: `database_id` (required), `page_size` (optional, max 100), `start_cursor` (optional)
- **Returns**: List of page objects (database records) with all properties

#### `update_database`
- **API**: `PATCH /v1/databases/{database_id}`
- **Params**: `database_id` (required), `title`, `properties` (add/update/remove), `icon`, `cover`, `archived`

### Search (1 tool)

#### `search_pages`
- **API**: `POST /v1/search`
- **Params**: `query` (required), `page_size` (optional, max 100), `start_cursor` (optional)
- **Scope**: Searches within bot's authorized pages

### Users (1 tool)

#### `get_me`
- **API**: `GET /v1/users/me`
- **Params**: None
- **Returns**: Bot creator's user info (id, name, email, avatar_url)

### Composite Tools (2 tools)

#### `create_page_with_content`
- **Internal**: Calls `POST /v1/pages` then `PATCH /v1/blocks/{page_id}/children`
- **Params**: Same as create_page, plus `children` (array of block objects)
- **Purpose**: Create a page and populate it with content in one tool call

#### `read_page_content`
- **Internal**: Calls `GET /v1/pages/{page_id}` then `GET /v1/blocks/{page_id}/children` (recursive)
- **Params**: `page_id` (required), `recursive` (optional, default true)
- **Returns**: Page properties + full block tree
- **Purpose**: Read complete page content in one tool call

## Schema Definitions

### `schemas/common.ts`

**RichText**: Array of rich text objects, each one of:
- `text` type: `{ type: "text", text: { content: string, link?: { url: string } }, annotations?: Annotations }`
- `mention` type: `{ type: "mention", mention: { type: "user"|"page"|"date", user?: {id}, page?: {id}, date?: {start, end?, time_zone?} } }`
- `equation` type: `{ type: "equation", data: { expression: string } }`

**Annotations**: `{ bold?, italic?, strikethrough?, underline?, code?, color? }` — all optional booleans, color is Color enum

**Color**: `"default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red"`

**Icon**: `{ emoji: string }` or `{ type: "external", external: { url: string } }`

**Cover**: `{ type: "external", external: { url: string } }`

### `schemas/blocks.ts`

Each block type follows the pattern:
```typescript
{
  type: "<block_type>",
  data: {
    // type-specific fields
  }
}
```

Block types and their data fields:

| Type | Data Fields |
|------|------------|
| paragraph | rich_text, text_color?, background_color? |
| heading_1/2/3 | rich_text, text_color?, background_color? |
| bulleted_list_item | rich_text, text_color?, background_color? |
| numbered_list_item | rich_text, text_color?, background_color? |
| to_do | rich_text, checked, text_color?, background_color? |
| quote | rich_text, text_color?, background_color? |
| toggle | rich_text, text_color?, background_color? |
| code | rich_text, language |
| callout | rich_text, icon, text_color?, background_color? |
| equation | expression |
| link_to_page | page_id |
| divider | (empty) |
| bookmark | url, caption? |
| embed | url, caption? |
| image | type ("file"\|"external"), file?\|external?, caption? |
| file | type ("file"\|"external"), file?\|external?, caption? |
| table | table_width, has_column_header, has_row_header |
| table_row | cells (RichText[][]) |
| column_list | (empty, children are columns) |
| column | (empty, contains child blocks) |

### `schemas/properties.ts`

Page property types for create/update:

| Type | Value Format |
|------|-------------|
| title | `{ title: [RichText] }` |
| rich_text | `{ rich_text: [RichText] }` |
| number | `{ number: number }` |
| checkbox | `{ checkbox: boolean }` |
| select | `{ select: { name: string } }` |
| multi_select | `{ multi_select: [{ name: string }] }` |
| date | `{ date: { start: string, end?: string } }` |
| url | `{ url: string }` |
| email | `{ email: string }` |
| phone_number | `{ phone_number: string }` |
| people | `{ people: [{ id: string }] }` |
| files | `{ files: [{ name: string, external: { url: string } }] }` |
| relation | `{ relation: [{ id: string }] }` |

Read-only types (returned by API, cannot set): formula, created_time, created_by, last_edited_time, last_edited_by

## Error Handling

`FlowUsClient` translates HTTP errors to AI-readable messages:

| HTTP Status | Error Message |
|------------|---------------|
| 400 | `"Parameter error: {api_message}"` |
| 401 | `"Authentication failed. Check that FLOWUS_TOKEN is correct."` |
| 403 | `"Permission denied. Ensure the bot has been added to the target page with appropriate permissions."` |
| 404 | `"Resource not found: {id}"` |
| 429 | `"Rate limit exceeded. Please retry later."` |
| 5xx | `"FlowUS server error. Please retry later."` |

MCP tool responses use `isError: true` for failures so AI clients can distinguish success from failure.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FLOWUS_TOKEN` | Yes | FlowUS Bot Token |
| `FLOWUS_API_BASE` | No | API base URL, defaults to `https://api.flowus.cn/v1` |

### MCP Client Configuration

```json
{
  "mcpServers": {
    "flowus": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "FLOWUS_TOKEN": "your_bot_token_here"
      }
    }
  }
}
```

## Dependencies

**Runtime**:
- `@modelcontextprotocol/sdk` — MCP protocol implementation
- `zod` — Runtime parameter validation

**Dev**:
- `typescript`
- `tsx` — Dev mode runner

No external HTTP library (uses Node.js native fetch).

## API Rate Limits (from FlowUS docs)

- Read operations: 1000 requests/minute
- Write operations: 100 requests/minute
- Batch operations: 10 requests/minute
- Max blocks per append: 100
- Max page_size: 100
- Max nesting depth: 50

## Non-Goals

- SSE/Streamable HTTP transport (stdio only for now)
- npm publishing (internal team use)
- Database query filter/sort (FlowUS API docs mention it but MCP parameter support is unclear — will add if API supports it)
- File upload (FlowUS API uses external URLs for files, no direct upload)
- Webhook/event subscriptions
