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

  assert.equal(typeof document, "object");
  assert.ok(document);
  assert.ok(Array.isArray(document.nodes));
  assert.ok(document.nodes.length >= 8);

  const serialized = JSON.stringify(document);
  assert.match(serialized, /Project Spec/);
  assert.match(serialized, /Intro paragraph\./);
  assert.match(serialized, /Capture requirements/);
  assert.match(serialized, /Implement parser/);
  assert.match(serialized, /Ship beta/);
  assert.match(serialized, /Keep the AI interface concise\./);
  assert.match(serialized, /const ready = true;/);
  assert.match(serialized, /Name/);
  assert.match(serialized, /Status/);
  assert.match(serialized, /API/);
  assert.match(serialized, /Done/);
});

test("parseMarkdownDocument preserves supported inline formatting in block content", () => {
  const document = parseMarkdownDocument(`## Priority

Use **\`P0\`** with *care*, _speed_, __focus__, ~~defer~~ and [docs](https://example.com/spec).

| Name | Priority |
| --- | --- |
| API | **\`P1\`** |
| Ops | escaped \\| pipe |
`);

  assert.deepEqual(document.nodes[0], {
    type: "heading_2",
    rich_text: [{ type: "text", text: { content: "Priority" } }],
  });

  assert.deepEqual(document.nodes[1], {
    type: "paragraph",
    rich_text: [
      { type: "text", text: { content: "Use " } },
      {
        type: "text",
        text: { content: "P0" },
        annotations: { bold: true, code: true },
      },
      { type: "text", text: { content: " with " } },
      {
        type: "text",
        text: { content: "care" },
        annotations: { italic: true },
      },
      { type: "text", text: { content: ", " } },
      {
        type: "text",
        text: { content: "speed" },
        annotations: { italic: true },
      },
      { type: "text", text: { content: ", " } },
      {
        type: "text",
        text: { content: "focus" },
        annotations: { bold: true },
      },
      { type: "text", text: { content: ", " } },
      {
        type: "text",
        text: { content: "defer" },
        annotations: { strikethrough: true },
      },
      { type: "text", text: { content: " and " } },
      {
        type: "text",
        text: {
          content: "docs",
          link: { url: "https://example.com/spec" },
        },
      },
      { type: "text", text: { content: "." } },
    ],
  });

  assert.deepEqual(document.nodes[2], {
    type: "table",
    hasHeaderRow: true,
    rows: [
      [
        [{ type: "text", text: { content: "Name" } }],
        [{ type: "text", text: { content: "Priority" } }],
      ],
      [
        [{ type: "text", text: { content: "API" } }],
        [
          {
            type: "text",
            text: { content: "P1" },
            annotations: { bold: true, code: true },
          },
        ],
      ],
      [
        [{ type: "text", text: { content: "Ops" } }],
        [{ type: "text", text: { content: "escaped | pipe" } }],
      ],
    ],
  });
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

test("parseMarkdownDocument keeps fenced code blocks literal", () => {
  const document = parseMarkdownDocument(`\`\`\`md
**\`P0\`** and [docs](https://example.com)
\`\`\``);

  assert.deepEqual(document.nodes, [
    {
      type: "code",
      language: "md",
      rich_text: [
        {
          type: "text",
          text: {
            content: "**`P0`** and [docs](https://example.com)",
          },
        },
      ],
    },
  ]);
});

test("parseMarkdownDocument supports nested lists and continuation lines", () => {
  const document = parseMarkdownDocument(`- Parent item
  continuation line
  - Child _one_
  - [x] Child two
1. Numbered parent
  1. Nested __bold__
`);

  assert.deepEqual(document.nodes, [
    {
      type: "bulleted_list_item",
      rich_text: [{ type: "text", text: { content: "Parent item continuation line" } }],
      children: [
        {
          type: "bulleted_list_item",
          rich_text: [
            { type: "text", text: { content: "Child " } },
            {
              type: "text",
              text: { content: "one" },
              annotations: { italic: true },
            },
          ],
        },
        {
          type: "to_do",
          checked: true,
          rich_text: [{ type: "text", text: { content: "Child two" } }],
        },
      ],
    },
    {
      type: "numbered_list_item",
      rich_text: [{ type: "text", text: { content: "Numbered parent" } }],
      children: [
        {
          type: "numbered_list_item",
          rich_text: [
            { type: "text", text: { content: "Nested " } },
            {
              type: "text",
              text: { content: "bold" },
              annotations: { bold: true },
            },
          ],
        },
      ],
    },
  ]);
});

test("parseMarkdownDocument keeps escaped and word-internal underscores literal", () => {
  const document = parseMarkdownDocument(String.raw`Escaped \*literal\* and foo_bar_baz stay literal while _italic_ works.`);

  assert.deepEqual(document.nodes, [
    {
      type: "paragraph",
      rich_text: [
        { type: "text", text: { content: "Escaped *literal* and foo_bar_baz stay literal while " } },
        {
          type: "text",
          text: { content: "italic" },
          annotations: { italic: true },
        },
        { type: "text", text: { content: " works." } },
      ],
    },
  ]);
});

test("parseMarkdownDocument rejects unsupported markdown constructs in strict mode", () => {
  assert.throws(() => parseMarkdownDocument("#### Too deep"), /unsupported|heading/i);
  assert.throws(() => parseMarkdownDocument("* wrong list marker"), /unsupported|list/i);
  assert.throws(() => parseMarkdownDocument("![diagram](https://example.com/a.png)"), /unsupported|image/i);
  assert.throws(
    () =>
      parseMarkdownDocument(`Paragraph
  continuation`),
    /unsupported|indented/i,
  );
});
