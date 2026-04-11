import assert from "node:assert/strict";
import test from "node:test";
import { renderPageToMarkdown } from "../../src/markdown/render_page.js";

const page = {
  id: "page_1",
  properties: {
    title: {
      title: [{ type: "text", text: { content: "Project Spec" } }],
    },
    status: "Draft",
    owner: "AI Team",
  },
};

const blocks = [
  {
    id: "heading_1",
    type: "heading_1",
    data: {
      rich_text: [{ type: "text", text: { content: "Overview" } }],
    },
  },
  {
    id: "paragraph_1",
    type: "paragraph",
    data: {
      rich_text: [{ type: "text", text: { content: "Roll out the markdown interface first." } }],
    },
  },
];

test("renderPageToMarkdown includes title and properties when requested", () => {
  const result = renderPageToMarkdown(page, blocks, {
    includeProperties: true,
  });

  assert.match(result.markdown, /^# Project Spec$/m);
  assert.match(result.markdown, /^- status: Draft$/m);
  assert.match(result.markdown, /^- owner: AI Team$/m);
  assert.match(result.markdown, /^# Overview$/m);
  assert.match(result.markdown, /Roll out the markdown interface first\./);
});

test("renderPageToMarkdown omits page properties when disabled", () => {
  const result = renderPageToMarkdown(page, blocks, {
    includeProperties: false,
  });

  assert.doesNotMatch(result.markdown, /^# Project Spec$/m);
  assert.doesNotMatch(result.markdown, /^- status: Draft$/m);
  assert.doesNotMatch(result.markdown, /^- owner: AI Team$/m);
  assert.match(result.markdown, /^# Overview$/m);
});

test("renderPageToMarkdown returns metadata with line ranges", () => {
  const result = renderPageToMarkdown(page, blocks, {
    includeProperties: true,
  });

  assert.equal(result.metadata.unsupported_blocks.length, 0);
  assert.deepEqual(
    result.metadata.block_map.map((entry: { block_id: string }) => entry.block_id),
    ["heading_1", "paragraph_1"],
  );
  for (const entry of result.metadata.block_map) {
    assert.equal(typeof entry.line_start, "number");
    assert.equal(typeof entry.line_end, "number");
    assert.ok(entry.line_start >= 1);
    assert.ok(entry.line_end >= entry.line_start);
  }
});
