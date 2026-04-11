# FlowUS MCP Markdown Tools Design

## Overview

This design adds an AI-friendly Markdown layer on top of the existing structured FlowUS MCP tools.

The current server is accurate but low-level:
- reads return raw page and block JSON
- writes require explicit FlowUS block payloads

That is workable for deterministic integrations, but inefficient for AI agents. For reading tasks, the JSON is noisy and expensive to interpret. For writing tasks, requiring canonical block JSON increases tool-call failures because the model must produce nested FlowUS-specific structures exactly.

The redesign keeps the current structured tools as the precise low-level API and adds a higher-level Markdown interface for common AI workflows.

## Goals

- Return page content in concise Markdown that AI models can consume directly.
- Preserve optional metadata so Markdown output can still be traced back to FlowUS blocks.
- Allow page creation from Markdown content without forcing AI callers to construct block JSON.
- Support Markdown tables for the common case of simple tabular content.
- Reuse the existing validation and page creation pipeline where possible.

## Non-Goals

- Replacing all existing structured tools.
- Supporting full Markdown fidelity for every FlowUS block type in v1.
- Inferring page properties from Markdown body content.
- Supporting in-place page replacement or block-level Markdown patching in v1.

## Recommended Tool Surface

V1 should expose exactly two new tools:

1. `read_page_as_markdown`
2. `create_page_from_markdown`

This keeps the AI-facing surface small while preserving the existing structured tools for exact control.

## Why Not Replace the Existing Structured Tools

The structured tools remain necessary for:
- exact block-level edits
- special FlowUS block types that do not map cleanly to Markdown
- future workflows that need stable block IDs and canonical FlowUS payloads

The new Markdown tools should be an additive AI layer, not a replacement API.

## Tool 1: `read_page_as_markdown`

### Purpose

Read a FlowUS page and render its content as Markdown that is concise and readable for AI agents.

### Proposed Input

```ts
{
  page_id: string
  recursive?: boolean
  include_properties?: boolean
  include_metadata?: boolean
}
```

Default values:
- `recursive = true`
- `include_properties = true`
- `include_metadata = true`

### Proposed Output

```ts
{
  page: unknown
  markdown: string
  metadata?: {
    block_map: Array<{
      block_id: string
      type: string
      line_start: number
      line_end: number
      path: string
    }>
    unsupported_blocks: Array<{
      block_id: string
      type: string
      reason: string
    }>
  }
  warnings?: string[]
}
```

### Rendering Rules

- page title and selected properties may be rendered in a short front section when `include_properties` is enabled
- text blocks render as standard Markdown
- supported simple tables render as Markdown tables
- unsupported or lossy block types render as explicit placeholders and are also listed in `unsupported_blocks`
- `metadata.block_map` records the relationship between rendered Markdown ranges and FlowUS block IDs

### Why Metadata Should Be Kept

Markdown is the primary AI-facing output, but metadata remains important for:
- future block-level targeting
- debugging lossy conversions
- diagnosing unsupported content
- later adding block-aware editing tools without redesigning the read path

## Tool 2: `create_page_from_markdown`

### Purpose

Create a new page from Markdown content while keeping page properties explicit and deterministic.

### Proposed Input

```ts
{
  markdown: string
  properties: Record<string, unknown>
  parent?: {
    page_id?: string
    database_id?: string
  }
  icon?: unknown
  cover?: unknown
  strict?: boolean
}
```

Constraints:
- `properties` must still be passed explicitly
- `properties.title` remains required by the existing page creation logic
- `strict = true` by default

### Proposed Output

```ts
{
  page: unknown
  blocks: unknown
  summary: {
    parsed_block_count: number
    parsed_table_count: number
  }
  warnings?: string[]
}
```

### Why Properties Stay Explicit

Page properties and page body have different failure modes.

Markdown is well-suited for page body content. It is not a reliable container for inferring:
- title
- parent
- icon
- cover
- database property payloads

Keeping those explicit avoids ambiguous parsing and prevents accidental data-shape guessing.

## Markdown Scope for V1

Supported block shapes:
- paragraphs
- heading 1/2/3
- bulleted lists
- numbered lists
- to-do lists
- quotes
- fenced code blocks
- horizontal rules
- links
- bold, italic, inline code
- simple Markdown tables

Out of scope for v1:
- complex embeds
- bookmarks with rich metadata
- images and files embedded from Markdown syntax
- toggle blocks
- callouts
- columns
- synced blocks
- direct page-content replacement
- block-level append-from-Markdown

## Table Support

Markdown table support is worth adding in v1, but only for the simple case.

### Why Tables Are Not Free

FlowUS tables are not a single flat block. They are a parent `table` block with child `table_row` blocks, and each row contains `cells: RichText[][]`.

This means the converter must handle:
- explicit table width
- optional column header flags
- row normalization
- cell-level inline rich text conversion
- validation that each row has the same number of columns

That is manageable if the scope is constrained.

### V1 Table Rules

- support GFM-style simple tables only
- every row must have the same number of columns
- first row becomes the column header row
- set `has_column_header = true` when a Markdown header row is present
- cells only support inline Markdown content
- reject multi-line or block-level cell content
- reject malformed tables instead of guessing

This keeps the round-trip behavior understandable and minimizes silent corruption.

## Architecture

The implementation should introduce a dedicated Markdown conversion layer without coupling rendering and parsing logic directly into the tool handlers.

Suggested modules:

```text
src/
  markdown/
    render_page.ts
    render_blocks.ts
    parse_markdown.ts
    blocks_from_markdown.ts
    tables.ts
    types.ts
```

High-level flow:

1. `read_page_as_markdown`
   - fetch page
   - fetch blocks
   - render Markdown
   - attach metadata and warnings

2. `create_page_from_markdown`
   - parse Markdown into an intermediate representation
   - convert supported nodes to FlowUS block children
   - validate through existing input/api schemas
   - create page and append content using existing helpers

## Error Handling

The Markdown tools should fail explicitly when the content cannot be mapped safely.

Rules:
- unsupported syntax returns a local parse or conversion error
- malformed tables return a clear validation message with the offending row
- no silent downgrade from complex unsupported blocks into plain text
- warnings are allowed for non-fatal lossy reads, but writes should stay strict by default

## Testing Strategy

The implementation needs both conversion-unit tests and tool-level tests.

Read-path tests:
- rich text blocks render as expected Markdown
- simple tables render correctly
- unsupported blocks create placeholders and metadata entries
- block map line ranges stay stable

Write-path tests:
- paragraphs/headings/lists convert into canonical block payloads
- simple tables convert into `table` + `table_row` payloads
- malformed tables fail locally before any API call
- `create_page_from_markdown` reuses the canonical page property normalization path

## Recommended Rollout

### Phase 1

- add Markdown rendering utilities
- add `read_page_as_markdown`
- support core text blocks and placeholders

### Phase 2

- add Markdown parsing utilities
- add `create_page_from_markdown`
- support core text blocks and simple tables

### Phase 3

- expand block coverage only after v1 behavior is stable

## Recommendation

Build the Markdown layer as a small, explicit compatibility surface for AI agents:
- concise Markdown for reads
- strict Markdown-to-block conversion for page creation
- metadata preserved for future precision
- simple tables supported now, not deferred

This produces a better AI experience without weakening the structured FlowUS toolchain.
