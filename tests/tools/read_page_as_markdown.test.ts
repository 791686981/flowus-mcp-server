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
      },
    },
  ]);
});

test("read_page_as_markdown recursively hydrates nested table rows before rendering", async () => {
  const client = createFakeFlowUsClient();
  client.get = async (path: string, params?: Record<string, string>) => {
    client.requests.push({ method: "get", path, params });

    if (path === "/pages/page_456") {
      return {
        id: "page_456",
        properties: {
          title: {
            type: "title",
            title: [{ type: "text", text: { content: "Table Spec" } }],
          },
        },
      };
    }

    if (path === "/blocks/page_456/children") {
      return {
        results: [
          {
            id: "table_1",
            type: "table",
            has_children: true,
            data: {
              table_width: 2,
              has_column_header: true,
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      };
    }

    if (path === "/blocks/table_1/children") {
      return {
        results: [
          {
            id: "row_1",
            type: "table_row",
            data: {
              cells: [
                [{ type: "text", text: { content: "字段" } }],
                [{ type: "text", text: { content: "值" } }],
              ],
            },
          },
          {
            id: "row_2",
            type: "table_row",
            data: {
              cells: [
                [{ type: "text", text: { content: "状态" } }],
                [{ type: "text", text: { content: "正常" } }],
              ],
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

  const result = await runner.callTool("read_page_as_markdown", {
    page_id: "page_456",
  });

  const payload = JSON.parse(result.content[0].text);

  assert.match(payload.markdown, /\| 字段 \| 值 \|/);
  assert.match(payload.markdown, /\| 状态 \| 正常 \|/);
  assert.deepEqual(client.requests, [
    {
      method: "get",
      path: "/pages/page_456",
      params: undefined,
    },
    {
      method: "get",
      path: "/blocks/page_456/children",
      params: {
        page_size: "100",
      },
    },
    {
      method: "get",
      path: "/blocks/table_1/children",
      params: {
        page_size: "100",
      },
    },
  ]);
});
