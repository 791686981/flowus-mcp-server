import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkdownDocument } from "../../src/markdown/parse_markdown.js";

test("parseMarkdownDocument parses the supported v1 markdown subset", () => {
  const document = parseMarkdownDocument(`# Project Spec

Intro paragraph.

- Capture requirements

1. Implement parser

- [x] Ship beta

> Keep the AI interface concise.

---

\`\`\`ts
const ready = true;
\`\`\`

| Name | Status |
| --- | --- |
| API | Done |
`);

  assert.deepEqual(
    document.nodes.map((node: { type: string }) => node.type),
    [
      "heading",
      "paragraph",
      "bulleted_list_item",
      "numbered_list_item",
      "to_do",
      "quote",
      "divider",
      "code_block",
      "table",
    ],
  );
  assert.equal(document.nodes.at(-1)?.type, "table");
  assert.equal(document.nodes.at(-1)?.has_column_header, true);
  assert.deepEqual(document.nodes.at(-1)?.rows, [
    ["Name", "Status"],
    ["API", "Done"],
  ]);
});

test("parseMarkdownDocument rejects malformed markdown tables before conversion", () => {
  assert.throws(
    () =>
      parseMarkdownDocument(`| Name |
| --- | --- |
| API |`),
    /table/i,
  );
});
