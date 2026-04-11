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

test("parseMarkdownDocument rejects malformed markdown tables before conversion", () => {
  assert.throws(
    () =>
      parseMarkdownDocument(`| Name |
| --- | --- |
| API |`),
    /table/i,
  );
});

test("parseMarkdownDocument rejects unsupported markdown constructs in strict mode", () => {
  assert.throws(() => parseMarkdownDocument("#### Too deep"), /unsupported|heading/i);
  assert.throws(() => parseMarkdownDocument("* wrong list marker"), /unsupported|list/i);
  assert.throws(() => parseMarkdownDocument("![diagram](https://example.com/a.png)"), /unsupported|image/i);
  assert.throws(
    () =>
      parseMarkdownDocument(`- parent
  - child`),
    /unsupported|nested list/i,
  );
});
