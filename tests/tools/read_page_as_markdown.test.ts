import assert from "node:assert/strict";
import test from "node:test";
import { registerCompositeTools } from "../../src/tools/composites.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("read_page_as_markdown returns markdown, page metadata, and block mapping", async () => {
  const client = createFakeFlowUsClient();
  client.get = async (path: string, params?: Record<string, string>) => {
    client.requests.push({ method: "get", path, params });

    if (path === "/pages/page_123") {
      return {
        id: "page_123",
        properties: {
          title: {
            type: "title",
            title: [{ type: "text", text: { content: "Project Spec" } }],
          },
        },
      };
    }

    if (path === "/blocks/page_123/children") {
      return {
        results: [
          {
            id: "block_1",
            type: "paragraph",
            data: {
              rich_text: [{ type: "text", text: { content: "First paragraph" } }],
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      };
    }

    throw new Error(`Unexpected get path: ${path}`);
  };

  const runner = createToolRunner(registerCompositeTools, client);

  assert.ok(runner.getTool("read_page_as_markdown"));

  const result = await runner.callTool("read_page_as_markdown", {
    page_id: "page_123",
  });

  const payload = JSON.parse(result.content[0].text);

  assert.equal(payload.page.id, "page_123");
  assert.match(payload.markdown, /Project Spec/);
  assert.match(payload.markdown, /First paragraph/);
  assert.equal(payload.metadata.block_map[0].block_id, "block_1");
  assert.deepEqual(client.requests, [
    {
      method: "get",
      path: "/pages/page_123",
      params: undefined,
    },
    {
      method: "get",
      path: "/blocks/page_123/children",
      params: {
        page_size: "100",
        recursive: "true",
      },
    },
  ]);
});
