# FlowUS Markdown Tools Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add two AI-friendly Markdown tools to the FlowUS MCP server: one to read page content as Markdown with metadata, and one to create a page from Markdown content with simple table support.

**Architecture:** Keep the existing structured tools unchanged and add a dedicated Markdown conversion layer. Rendering and parsing live in focused modules, while the new MCP tools reuse the existing page/block validation and creation pipeline.

**Tech Stack:** TypeScript, Zod, `@modelcontextprotocol/sdk`, Node.js built-in `node:test`, `tsx`

---

### Task 1: Add Markdown conversion test coverage before implementation

**Files:**
- Create: `tests/markdown/render_blocks.test.ts`
- Create: `tests/markdown/parse_markdown.test.ts`
- Create: `tests/tools/read_page_as_markdown.test.ts`
- Create: `tests/tools/create_page_from_markdown.test.ts`

**Step 1: Write failing render tests**

Cover:
- paragraph, heading, list, quote, code, divider render to expected Markdown
- simple table blocks render to Markdown table syntax
- unsupported blocks emit placeholders and metadata entries

**Step 2: Write failing parse tests**

Cover:
- Markdown paragraphs, headings, lists, quotes, code blocks, to-dos parse into an intermediate representation
- simple Markdown tables parse into normalized row/cell structures
- malformed tables fail with a local error

**Step 3: Write failing tool tests**

Cover:
- `read_page_as_markdown` returns `markdown`, `page`, and metadata
- `create_page_from_markdown` creates a page and sends canonical children payloads

**Step 4: Run the focused tests to confirm failure**

Run:

```bash
npm test -- tests/markdown/render_blocks.test.ts tests/markdown/parse_markdown.test.ts tests/tools/read_page_as_markdown.test.ts tests/tools/create_page_from_markdown.test.ts
```

Expected: FAIL because the Markdown modules and tools do not exist yet.

**Step 5: Commit**

```bash
git add tests/markdown/render_blocks.test.ts tests/markdown/parse_markdown.test.ts tests/tools/read_page_as_markdown.test.ts tests/tools/create_page_from_markdown.test.ts
git commit -m "test: add failing coverage for markdown tools"
```

---

### Task 2: Introduce shared Markdown conversion types and table helpers

**Files:**
- Create: `src/markdown/types.ts`
- Create: `src/markdown/tables.ts`
- Test: `tests/markdown/tables.test.ts`

**Step 1: Write failing table helper tests**

Cover:
- valid simple tables normalize to a stable width and header flag
- row widths must match
- cells only accept inline content

**Step 2: Run the table helper tests**

Run:

```bash
npm test -- tests/markdown/tables.test.ts
```

Expected: FAIL because the helper modules do not exist yet.

**Step 3: Add shared Markdown conversion types**

Create `src/markdown/types.ts` with:
- intermediate node shapes for paragraph, heading, list item, quote, code block, divider, to-do, table
- metadata entry types for rendered block maps and unsupported blocks

**Step 4: Add table helper utilities**

Create `src/markdown/tables.ts` with helpers to:
- normalize parsed Markdown table rows
- assert equal column widths
- convert cell inline content into FlowUS rich text arrays
- convert FlowUS `table` + `table_row` blocks into Markdown table rows

**Step 5: Re-run tests**

Run:

```bash
npm test -- tests/markdown/tables.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/markdown/types.ts src/markdown/tables.ts tests/markdown/tables.test.ts
git commit -m "feat: add markdown table conversion helpers"
```

---

### Task 3: Implement Markdown rendering from FlowUS page content

**Files:**
- Create: `src/markdown/render_blocks.ts`
- Create: `src/markdown/render_page.ts`
- Test: `tests/markdown/render_blocks.test.ts`
- Test: `tests/markdown/render_page.test.ts`

**Step 1: Write failing page-render tests**

Cover:
- rendered Markdown includes title/properties when requested
- rendered Markdown omits properties when disabled
- metadata block map line ranges are returned

**Step 2: Run the render tests**

Run:

```bash
npm test -- tests/markdown/render_blocks.test.ts tests/markdown/render_page.test.ts
```

Expected: FAIL until the renderers exist.

**Step 3: Implement block-level renderer**

Create `src/markdown/render_blocks.ts` to render:
- paragraph
- headings
- bulleted and numbered list items
- to-dos
- quotes
- fenced code blocks
- divider
- simple tables
- unsupported block placeholders

**Step 4: Implement page-level renderer**

Create `src/markdown/render_page.ts` to:
- combine page metadata and rendered blocks
- track line ranges per block
- collect unsupported block diagnostics

**Step 5: Re-run render tests**

Run:

```bash
npm test -- tests/markdown/render_blocks.test.ts tests/markdown/render_page.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/markdown/render_blocks.ts src/markdown/render_page.ts tests/markdown/render_blocks.test.ts tests/markdown/render_page.test.ts
git commit -m "feat: add markdown rendering for flowus pages"
```

---

### Task 4: Add `read_page_as_markdown` tool

**Files:**
- Modify: `src/tools/composites.ts`
- Modify: `src/index.ts`
- Test: `tests/tools/read_page_as_markdown.test.ts`
- Test: `tests/smoke/tool_registration.test.ts`

**Step 1: Extend tool tests**

Add assertions that:
- `read_page_as_markdown` registers without throwing
- it fetches page and blocks through the existing client
- it returns Markdown plus metadata

**Step 2: Run the focused tool tests**

Run:

```bash
npm test -- tests/tools/read_page_as_markdown.test.ts tests/smoke/tool_registration.test.ts
```

Expected: FAIL until the tool is implemented.

**Step 3: Implement the new read tool**

Modify `src/tools/composites.ts` to add `read_page_as_markdown` and reuse the existing page/block fetch path currently used by `read_page_content`.

**Step 4: Ensure tool registration remains intact**

Update `src/index.ts` only if required by the new imports or helper wiring.

**Step 5: Re-run tests**

Run:

```bash
npm test -- tests/tools/read_page_as_markdown.test.ts tests/smoke/tool_registration.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/tools/composites.ts src/index.ts tests/tools/read_page_as_markdown.test.ts tests/smoke/tool_registration.test.ts
git commit -m "feat: add read_page_as_markdown tool"
```

---

### Task 5: Implement Markdown parsing into an intermediate representation

**Files:**
- Create: `src/markdown/parse_markdown.ts`
- Test: `tests/markdown/parse_markdown.test.ts`

**Step 1: Confirm parser scope in tests**

Cover:
- headings
- paragraphs
- bulleted and numbered lists
- to-dos
- quotes
- fenced code blocks
- horizontal rules
- simple tables

**Step 2: Run the parser tests**

Run:

```bash
npm test -- tests/markdown/parse_markdown.test.ts
```

Expected: FAIL until the parser exists.

**Step 3: Implement the parser**

Create `src/markdown/parse_markdown.ts` with a narrow parser that:
- accepts only the documented v1 subset
- produces intermediate nodes, not FlowUS payloads directly
- returns clear errors for unsupported or malformed constructs

**Step 4: Re-run tests**

Run:

```bash
npm test -- tests/markdown/parse_markdown.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/markdown/parse_markdown.ts tests/markdown/parse_markdown.test.ts
git commit -m "feat: add markdown parser for v1 subset"
```

---

### Task 6: Convert parsed Markdown into canonical FlowUS block children

**Files:**
- Create: `src/markdown/blocks_from_markdown.ts`
- Test: `tests/markdown/blocks_from_markdown.test.ts`

**Step 1: Write failing conversion tests**

Cover:
- paragraphs/headings/lists/quotes/to-dos/code blocks convert into canonical block payloads
- simple tables convert into one `table` block plus `table_row` child blocks
- malformed intermediate table nodes fail locally

**Step 2: Run the conversion tests**

Run:

```bash
npm test -- tests/markdown/blocks_from_markdown.test.ts
```

Expected: FAIL until the converter exists.

**Step 3: Implement the converter**

Create `src/markdown/blocks_from_markdown.ts` to:
- convert each supported intermediate node to FlowUS block objects
- reuse rich text helpers where possible
- emit canonical `table` / `table_row` payloads for simple tables

**Step 4: Re-run tests**

Run:

```bash
npm test -- tests/markdown/blocks_from_markdown.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/markdown/blocks_from_markdown.ts tests/markdown/blocks_from_markdown.test.ts
git commit -m "feat: convert markdown nodes into flowus blocks"
```

---

### Task 7: Add `create_page_from_markdown` tool

**Files:**
- Modify: `src/tools/composites.ts`
- Modify: `src/utils/validation.ts`
- Test: `tests/tools/create_page_from_markdown.test.ts`

**Step 1: Extend tool tests for page creation**

Add assertions that:
- `properties.title` still goes through canonical title normalization
- Markdown content becomes canonical `children`
- malformed Markdown fails before any remote API call

**Step 2: Run the focused tests**

Run:

```bash
npm test -- tests/tools/create_page_from_markdown.test.ts
```

Expected: FAIL until the tool exists.

**Step 3: Implement the new create tool**

Modify `src/tools/composites.ts` to:
- parse Markdown
- convert it to canonical FlowUS children
- create the page
- append the converted children
- return a summary and warnings

**Step 4: Reuse strict local validation**

If needed, extend `src/utils/validation.ts` so the Markdown-generated blocks are validated through the same canonical block pipeline used elsewhere.

**Step 5: Re-run tests**

Run:

```bash
npm test -- tests/tools/create_page_from_markdown.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/tools/composites.ts src/utils/validation.ts tests/tools/create_page_from_markdown.test.ts
git commit -m "feat: add create_page_from_markdown tool"
```

---

### Task 8: Update documentation and run the full regression suite

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-11-flowus-markdown-tools-design.md`
- Modify: `docs/plans/2026-04-11-flowus-markdown-tools.md`
- Test: `tests/**/*.test.ts`

**Step 1: Update README usage examples**

Document:
- `read_page_as_markdown`
- `create_page_from_markdown`
- supported Markdown subset
- table limitations

**Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

**Step 3: Manually inspect generated Markdown examples**

Verify at least one page example with:
- headings
- list items
- code block
- simple table

**Step 4: Commit**

```bash
git add README.md docs/plans/2026-04-11-flowus-markdown-tools-design.md docs/plans/2026-04-11-flowus-markdown-tools.md
git add tests src
git commit -m "docs: document markdown tool support"
```
