# FlowUS Input Normalization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the FlowUS MCP server so common AI shorthand inputs are normalized into strict FlowUS payloads before requests are sent, significantly improving tool call success rate.

**Architecture:** Split validation into three stages: AI-friendly input schemas, focused normalizers, and strict API payload schemas. Reuse the same normalization pipeline across page, composite, and block tools so high-frequency inputs behave consistently.

**Tech Stack:** TypeScript, Zod, `@modelcontextprotocol/sdk`, Node.js built-in `node:test`, `tsx`

---

### Task 1: Add a lightweight test harness for normalization regressions

**Files:**
- Modify: `package.json`
- Create: `tests/helpers/fake_client.ts`
- Create: `tests/helpers/mcp_tool_runner.ts`
- Create: `tests/smoke/tool_registration.test.ts`

**Step 1: Add a test script**

Update `package.json` to add:

```json
{
  "scripts": {
    "test": "tsx --test tests/**/*.test.ts"
  }
}
```

**Step 2: Create a minimal fake client helper**

Add `tests/helpers/fake_client.ts` with a fake object exposing `get`, `post`, `patch`, and `delete`, each recording the last payload.

**Step 3: Create a simple tool execution helper**

Add `tests/helpers/mcp_tool_runner.ts` to instantiate an `McpServer`, register a selected tool module, and invoke the tool handler with test args.

**Step 4: Write a failing smoke test**

Create `tests/smoke/tool_registration.test.ts` asserting that page tools still register without throwing.

**Step 5: Run the smoke test**

Run:

```bash
npm test -- tests/smoke/tool_registration.test.ts
```

Expected: PASS after harness setup.

**Step 6: Commit**

```bash
git add package.json tests/helpers/fake_client.ts tests/helpers/mcp_tool_runner.ts tests/smoke/tool_registration.test.ts
git commit -m "test: add lightweight MCP tool test harness"
```

---

### Task 2: Split common schemas into input-facing and strict API-facing variants

**Files:**
- Create: `src/schemas/input/common.ts`
- Create: `src/schemas/api/common.ts`
- Modify: `src/schemas/common.ts`
- Test: `tests/schemas/common_schemas.test.ts`

**Step 1: Write the failing schema tests**

Add `tests/schemas/common_schemas.test.ts` covering:
- input schema accepts `icon: "📁"`
- api schema rejects `icon: "📁"`
- input rich text schema accepts `"hello"` and `["a", "b"]`
- api rich text schema only accepts canonical rich text arrays

**Step 2: Run the tests to confirm failure**

Run:

```bash
npm test -- tests/schemas/common_schemas.test.ts
```

Expected: FAIL because the new schema files do not exist yet.

**Step 3: Implement input common schemas**

Create `src/schemas/input/common.ts` for shorthand-friendly icon and rich text inputs.

**Step 4: Implement strict API common schemas**

Create `src/schemas/api/common.ts` for canonical FlowUS icon and rich text structures.

**Step 5: Turn `src/schemas/common.ts` into a compatibility barrel**

Export the strict API schemas by default from `src/schemas/common.ts`, plus named exports for input schemas if needed during migration.

**Step 6: Re-run the schema tests**

Run:

```bash
npm test -- tests/schemas/common_schemas.test.ts
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/schemas/input/common.ts src/schemas/api/common.ts src/schemas/common.ts tests/schemas/common_schemas.test.ts
git commit -m "refactor: split common schemas into input and api layers"
```

---

### Task 3: Add focused normalizers for icon and rich text

**Files:**
- Create: `src/normalizers/icon.ts`
- Create: `src/normalizers/rich_text.ts`
- Test: `tests/normalizers/icon.test.ts`
- Test: `tests/normalizers/rich_text.test.ts`

**Step 1: Write failing icon normalizer tests**

Cover:
- `"📁"` -> `{ emoji: "📁" }`
- structured icon objects pass through unchanged
- invalid string input throws a local error

**Step 2: Write failing rich text normalizer tests**

Cover:
- `"hello"` -> canonical single text item
- `["a", "b"]` -> canonical text item array
- partially structured text items are normalized when safe

**Step 3: Run the normalizer tests to confirm failure**

Run:

```bash
npm test -- tests/normalizers/icon.test.ts tests/normalizers/rich_text.test.ts
```

Expected: FAIL because normalizer modules do not exist yet.

**Step 4: Implement `normalizeIcon`**

Create `src/normalizers/icon.ts` with a narrow, predictable transform. Do not guess URLs or arbitrary strings beyond explicitly supported forms.

**Step 5: Implement `normalizeRichText`**

Create `src/normalizers/rich_text.ts` to expand string and string-array shorthand into canonical rich text arrays.

**Step 6: Re-run normalizer tests**

Run:

```bash
npm test -- tests/normalizers/icon.test.ts tests/normalizers/rich_text.test.ts
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/normalizers/icon.ts src/normalizers/rich_text.ts tests/normalizers/icon.test.ts tests/normalizers/rich_text.test.ts
git commit -m "feat: add icon and rich text normalizers"
```

---

### Task 4: Replace loose page property handling with typed input/api schemas and property normalization

**Files:**
- Create: `src/schemas/input/properties.ts`
- Create: `src/schemas/api/properties.ts`
- Create: `src/normalizers/properties.ts`
- Modify: `src/schemas/properties.ts`
- Test: `tests/normalizers/properties.test.ts`
- Test: `tests/tools/pages_title_normalization.test.ts`

**Step 1: Write failing property normalization tests**

Cover:
- `properties: { title: "EP04 - 校审流程" }` normalizes into a full title property object
- already canonical title properties are preserved
- unsupported shorthand for arbitrary property keys is rejected clearly

**Step 2: Write a failing page tool regression test**

Create `tests/tools/pages_title_normalization.test.ts` asserting that `create_page` sends a canonical title property payload when invoked with a string title.

**Step 3: Run the tests to confirm failure**

Run:

```bash
npm test -- tests/normalizers/properties.test.ts tests/tools/pages_title_normalization.test.ts
```

Expected: FAIL.

**Step 4: Implement input property schemas**

Create `src/schemas/input/properties.ts` with explicit support for shorthand title input and selected common property shapes.

**Step 5: Implement strict API property schemas**

Create `src/schemas/api/properties.ts` with canonical FlowUS property structures.

**Step 6: Implement `normalizePageProperties`**

Create `src/normalizers/properties.ts` and explicitly normalize `title` first. Avoid broad type guessing for unrelated property names.

**Step 7: Make `src/schemas/properties.ts` a migration barrel**

Keep existing imports working temporarily while new code adopts input/api separation.

**Step 8: Re-run tests**

Run:

```bash
npm test -- tests/normalizers/properties.test.ts tests/tools/pages_title_normalization.test.ts
```

Expected: PASS.

**Step 9: Commit**

```bash
git add src/schemas/input/properties.ts src/schemas/api/properties.ts src/normalizers/properties.ts src/schemas/properties.ts tests/normalizers/properties.test.ts tests/tools/pages_title_normalization.test.ts
git commit -m "refactor: add typed page property normalization"
```

---

### Task 5: Refactor page and composite tools to use the three-stage pipeline

**Files:**
- Modify: `src/tools/pages.ts`
- Modify: `src/tools/composites.ts`
- Create: `src/utils/validation.ts`
- Test: `tests/tools/pages_icon_normalization.test.ts`
- Test: `tests/tools/composites_page_creation.test.ts`

**Step 1: Write failing page icon tests**

Cover:
- `update_page` accepts `icon: "📁"`
- payload sent to `client.patch()` uses canonical icon structure

**Step 2: Write failing composite tests**

Cover:
- `create_page_with_content` reuses the same title normalization path as `create_page`
- page creation and block append stay separate in error reporting

**Step 3: Run tests to confirm failure**

Run:

```bash
npm test -- tests/tools/pages_icon_normalization.test.ts tests/tools/composites_page_creation.test.ts
```

Expected: FAIL.

**Step 4: Add a small shared validation helper**

Create `src/utils/validation.ts` with helpers to:
- parse input
- normalize
- parse strict API payload

**Step 5: Refactor `create_page` and `update_page`**

Update `src/tools/pages.ts` so page tools use the new input schema + normalizer + strict API schema pipeline.

**Step 6: Refactor `create_page_with_content`**

Update `src/tools/composites.ts` so page creation reuses the same page normalization codepath.

**Step 7: Re-run tests**

Run:

```bash
npm test -- tests/tools/pages_icon_normalization.test.ts tests/tools/composites_page_creation.test.ts
```

Expected: PASS.

**Step 8: Commit**

```bash
git add src/tools/pages.ts src/tools/composites.ts src/utils/validation.ts tests/tools/pages_icon_normalization.test.ts tests/tools/composites_page_creation.test.ts
git commit -m "refactor: apply normalization pipeline to page tools"
```

---

### Task 6: Normalize block text content for append operations

**Files:**
- Create: `src/schemas/input/blocks.ts`
- Create: `src/schemas/api/blocks.ts`
- Create: `src/normalizers/blocks.ts`
- Modify: `src/schemas/blocks.ts`
- Modify: `src/tools/blocks.ts`
- Test: `tests/normalizers/blocks.test.ts`
- Test: `tests/tools/append_block_children.test.ts`

**Step 1: Write failing block normalization tests**

Cover:
- text-style block `data.rich_text: "hello"` becomes canonical rich text
- `callout.icon: "💡"` becomes canonical icon structure
- unsupported shorthand for non-text block data throws locally

**Step 2: Write a failing append regression test**

Assert that `append_block_children` converts shorthand-rich-text children into valid API payloads before calling `client.patch()`.

**Step 3: Run tests to confirm failure**

Run:

```bash
npm test -- tests/normalizers/blocks.test.ts tests/tools/append_block_children.test.ts
```

Expected: FAIL.

**Step 4: Implement input/api block schemas and block normalizer**

Add `src/schemas/input/blocks.ts`, `src/schemas/api/blocks.ts`, and `src/normalizers/blocks.ts`, keeping scope limited to high-frequency text-like blocks first.

**Step 5: Refactor `append_block_children`**

Update `src/tools/blocks.ts` so append operations normalize children before strict API validation.

**Step 6: Re-run tests**

Run:

```bash
npm test -- tests/normalizers/blocks.test.ts tests/tools/append_block_children.test.ts
```

Expected: PASS.

**Step 7: Commit**

```bash
git add src/schemas/input/blocks.ts src/schemas/api/blocks.ts src/normalizers/blocks.ts src/schemas/blocks.ts src/tools/blocks.ts tests/normalizers/blocks.test.ts tests/tools/append_block_children.test.ts
git commit -m "feat: normalize block shorthand before append requests"
```

---

### Task 7: Improve layered error reporting without changing client transport behavior

**Files:**
- Modify: `src/client.ts`
- Modify: `src/tools/pages.ts`
- Modify: `src/tools/blocks.ts`
- Modify: `src/tools/composites.ts`
- Test: `tests/tools/error_layering.test.ts`

**Step 1: Write failing error-layering tests**

Cover:
- invalid shorthand raises a local input or normalization error before API call
- remote `FlowUsClientError` remains categorized as remote API failure

**Step 2: Run the tests to confirm failure**

Run:

```bash
npm test -- tests/tools/error_layering.test.ts
```

Expected: FAIL.

**Step 3: Introduce consistent local error messages**

Keep `FlowUsClient` focused on remote/network errors. Add clear local-stage messages in the tool pipeline for:
- input validation
- normalization
- strict payload validation

**Step 4: Re-run tests**

Run:

```bash
npm test -- tests/tools/error_layering.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/client.ts src/tools/pages.ts src/tools/blocks.ts src/tools/composites.ts tests/tools/error_layering.test.ts
git commit -m "fix: distinguish local validation errors from remote api errors"
```

---

### Task 8: Run the full targeted suite and document supported shorthand explicitly

**Files:**
- Modify: `README.md`
- Modify: `docs/plans/2026-04-10-flowus-input-normalization-design.md`

**Step 1: Run the targeted test suite**

Run:

```bash
npm test
```

Expected: PASS.

**Step 2: Update README usage notes**

Add a short section documenting supported shorthand examples for:
- page titles
- emoji icons
- rich text
- text-style block content

**Step 3: Update the design doc if implementation changes any assumptions**

Keep the design doc aligned with the actual rollout that shipped.

**Step 4: Commit**

```bash
git add README.md docs/plans/2026-04-10-flowus-input-normalization-design.md
git commit -m "docs: document supported shorthand normalization"
```
