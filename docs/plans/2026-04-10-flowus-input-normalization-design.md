# FlowUS MCP Input Normalization Redesign

## Overview

This redesign focuses on one outcome: significantly improving MCP tool call success rate for AI-driven usage.

Today, the server mixes three concerns in the same layer:
- tool-facing input shapes
- FlowUS API payload shapes
- human-readable guidance in descriptions

That makes the system brittle in both directions: some schemas are too strict for realistic AI shorthand, while others are so loose that invalid payloads pass through until the FlowUS API rejects them.

The redesign introduces a clear three-stage input pipeline:
1. tool input schema (AI-friendly)
2. normalizer (expand shorthand into canonical structures)
3. FlowUS API payload schema (strict)

The result should be fewer silent failures, fewer “looks successful but did nothing” cases, and much clearer error messages.

## Goals

- Accept common AI shorthand for high-frequency inputs.
- Normalize shorthand into canonical FlowUS payloads before any API call.
- Validate canonical payloads locally with strict schemas.
- Improve error messages so failures are attributable to the correct layer.
- Keep rollout incremental: fix the most failure-prone tools first.

## Non-Goals

- Full redesign of all tools in one pass.
- Adding brand-new FlowUS capabilities.
- Event sourcing, plugin systems, or generalized schema inference.
- Guessing user intent beyond predictable shorthand expansion.

## Current Failure Modes

### 1. Page property schemas are too loose

`PagePropertiesSchema` is currently `z.record(z.string(), z.unknown())`.

Effects:
- invalid property shapes pass local validation
- FlowUS rejects malformed payloads later
- the MCP server cannot explain what was wrong locally
- updates may appear to succeed while changing nothing meaningful

### 2. Some high-frequency inputs are too strict

Examples:
- `icon: "📁"` should be accepted and normalized to `{ emoji: "📁" }`
- `properties.title: "EP04 - 校审流程"` should be accepted and normalized into a complete title property object
- `rich_text: "hello"` or `rich_text: ["a", "b"]` should be accepted and expanded into rich text items

### 3. Tool schemas and API schemas are conflated

The current tool layer mostly accepts the same structure the FlowUS API expects.
That is too low-level for AI callers and forces verbose exact JSON in many places where shorthand is safe and predictable.

### 4. Errors are not layered clearly

The current client translates HTTP errors reasonably well, but the server does not clearly distinguish:
- invalid tool input
- invalid normalized payload
- valid local payload rejected by remote API

## Recommended Architecture

## Layer 1: Input Schemas

Purpose: accept user- and AI-friendly shorthand.

Examples of allowed shorthand:
- `icon: "📁"`
- `properties: { title: "Project Page" }`
- `rich_text: "hello"`
- `rich_text: ["line 1", "line 2"]`
- `callout.icon: "💡"`

These schemas should be permissive where shorthand is well-defined, but not permissive in a way that encourages guesswork.

Suggested location:
- `src/schemas/input/common.ts`
- `src/schemas/input/properties.ts`
- `src/schemas/input/blocks.ts`

## Layer 2: Normalizers

Purpose: convert accepted shorthand into canonical FlowUS request structures.

Rules:
- only normalize predictable shorthand
- do not infer ambiguous property types
- normalizers remain small and type-specific
- normalized output must always be validated again

Suggested location:
- `src/normalizers/icon.ts`
- `src/normalizers/rich_text.ts`
- `src/normalizers/properties.ts`
- `src/normalizers/blocks.ts`

## Layer 3: API Payload Schemas

Purpose: guarantee that outbound payloads are structurally correct before they reach the FlowUS API.

These schemas should model the strict canonical payload format used by FlowUS.

Suggested location:
- `src/schemas/api/common.ts`
- `src/schemas/api/properties.ts`
- `src/schemas/api/blocks.ts`

## Tool Execution Pattern

Each tool should follow the same pipeline:

1. parse with input schema
2. normalize
3. parse with strict API payload schema
4. send request through client
5. return success or layered error response

Pseudo-flow:

```ts
const parsedInput = InputSchema.parse(args);
const normalized = normalizeSomething(parsedInput);
const payload = ApiSchema.parse(normalized);
return jsonResponse(await client.patch(path, payload));
```

## Normalization Rules

## `icon`

Supported shorthand:
- emoji string -> `{ emoji: string }`
- existing structured object -> unchanged

Rejected:
- arbitrary strings that are neither emoji nor valid external icon objects

## `rich_text`

Supported shorthand:
- string -> single `text` rich text item
- string[] -> multiple `text` items
- partial text items missing `type: "text"` -> normalize when safe

Rejected:
- mixed ambiguous objects that cannot be safely mapped to FlowUS rich text segments

## `properties.title`

Supported shorthand:
- `title: "Page Title"`

Normalized form:

```json
{
  "type": "title",
  "title": [
    {
      "type": "text",
      "text": { "content": "Page Title" }
    }
  ]
}
```

This is the single most important fix because page and database page creation frequently fail here.

## Textual block `data.rich_text`

Supported shorthand for paragraph-like blocks:
- string
- string[]
- already-structured rich text arrays

Applies first to:
- paragraph
- heading_1
- heading_2
- heading_3
- bulleted_list_item
- numbered_list_item
- quote
- toggle
- to_do
- code
- callout

## Priority Rollout

## Batch 1: High-value, high-frequency fixes

Target files:
- `src/schemas/common.ts`
- `src/schemas/properties.ts`
- `src/schemas/blocks.ts`
- `src/tools/pages.ts`
- `src/tools/composites.ts`
- `src/tools/blocks.ts`

Primary outcomes:
- page title shorthand works
- emoji icon shorthand works
- text and block rich text shorthand works
- `create_page_with_content` reuses the same normalization logic

## Batch 2: Expand strict schema coverage

Target areas:
- database property normalization
- more block subtypes
- files, people, relation convenience shapes
- stricter validation for update payloads

This batch should happen only after Batch 1 is stable.

## File Layout Recommendation

```text
src/
  client.ts
  index.ts
  normalizers/
    icon.ts
    rich_text.ts
    properties.ts
    blocks.ts
  schemas/
    api/
      common.ts
      properties.ts
      blocks.ts
    input/
      common.ts
      properties.ts
      blocks.ts
  tools/
    pages.ts
    blocks.ts
    databases.ts
    composites.ts
    search.ts
    users.ts
  utils/
    validation.ts
```

The current top-level schema files can be converted into barrel exports during migration to avoid a single large refactor.

## Error Handling Design

The server should classify errors by stage.

### Input validation error

Meaning: caller input does not match supported shorthand or structured input.

Examples:
- malformed icon string
- unsupported property shorthand
- invalid block shorthand shape

### Normalization error

Meaning: input looked plausible, but could not be transformed safely.

Examples:
- ambiguous property value where type cannot be inferred safely
- mixed invalid rich text shorthand

### API payload validation error

Meaning: normalization completed, but canonical payload still does not satisfy strict local FlowUS schema.

Examples:
- malformed property object after transform
- invalid block payload for the chosen block type

### Remote API error

Meaning: payload passed local validation but FlowUS rejected it.

Examples:
- permission issues
- parent restrictions
- server-side constraints not modeled locally

## Testing Strategy

The redesign should rely on local deterministic tests rather than remote integration calls.

Recommended test coverage:
- unit tests for each normalizer
- unit tests for shorthand acceptance on page tools
- unit tests for block rich text normalization
- regression tests for the exact title/icon cases previously observed

Suggested test runner:
- use `tsx --test` with Node's built-in `node:test`
- avoid adding a new heavy test framework unless later needed

## Success Criteria

The redesign is successful when all of the following are true:

- `create_page` accepts `properties.title: "..."` and sends valid FlowUS title payloads
- `update_page` accepts `icon: "📁"` and sends valid icon payloads
- `create_page_with_content` reuses the same normalization pipeline as `create_page`
- text-style blocks accept rich text shorthand without silent failures
- invalid shorthand is rejected locally with clear messages
- outbound payloads are validated strictly before client requests

## Recommendation Summary

The best improvement for this project is not adding more tools. It is making the existing tools harder to misuse.

The recommended path is:
- keep the tool surface area stable
- introduce input/api schema separation
- add predictable normalizers for the most common shorthand
- roll out changes in two batches, starting with pages, composites, and block text content

That will yield the largest improvement in real-world AI calling success while keeping the codebase maintainable.
