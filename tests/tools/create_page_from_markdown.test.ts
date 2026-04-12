import assert from "node:assert/strict";
import test from "node:test";
import { registerCompositeTools } from "../../src/tools/composites.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("create_page_from_markdown creates a page and appends canonical markdown blocks", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", { id: "page_123" });
  client.setResponse("patch", { results: [] });

  const runner = createToolRunner(registerCompositeTools, client);

  assert.ok(runner.getTool("create_page_from_markdown"));

  const result = await runner.callTool("create_page_from_markdown", {
    properties: {
      title: "Markdown Spec",
    },
    markdown: `# Scope

Ship the markdown API first.`,
  });

  const payload = JSON.parse(result.content[0].text);

  assert.equal(payload.page.id, "page_123");
  assert.deepEqual(client.requests[0], {
    method: "post",
    path: "/pages",
    body: {
      properties: {
        title: {
          id: "title",
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: "Markdown Spec",
              },
            },
          ],
        },
      },
    },
  });
  assert.deepEqual(client.requests[1], {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "heading_1",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Scope",
                },
              },
            ],
          },
        },
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Ship the markdown API first.",
                },
              },
            ],
          },
        },
      ],
    },
  });
});

test("create_page_from_markdown fails locally for malformed markdown before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerCompositeTools, client);

  const result = await runner.callTool("create_page_from_markdown", {
    properties: {
      title: "Broken Markdown",
    },
    markdown: `| Name |
| --- | --- |
| API |`,
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /table/i);
  assert.equal(client.requests.length, 0);
});

test("create_page_from_markdown preserves table rows when appending markdown tables", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", { id: "page_123" });
  client.patch = async (path: string, body?: unknown) => {
    client.requests.push({ method: "patch", path, body });
    if (path === "/blocks/page_123/children") {
      return {
        results: [
          {
            id: "heading_123",
            type: "heading_1",
          },
          {
            id: "table_123",
            type: "table",
            data: {
              table_width: 2,
              has_column_header: false,
              has_row_header: false,
            },
          },
        ],
      };
    }

    return { results: [] };
  };

  const runner = createToolRunner(registerCompositeTools, client);

  await runner.callTool("create_page_from_markdown", {
    properties: {
      title: "Table Markdown",
    },
    markdown: `# 表格页

| 字段 | 值 |
| --- | --- |
| 状态 | 正常 |`,
  });

  assert.deepEqual(client.requests[1], {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "heading_1",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "表格页",
                },
              },
            ],
          },
        },
        {
          type: "table",
          data: {
            table_width: 2,
            has_column_header: true,
            has_row_header: false,
          },
        },
      ],
    },
  });
  assert.deepEqual(client.requests[2], {
    method: "patch",
    path: "/blocks/table_123/children",
    body: {
      children: [
        {
          type: "table_row",
          data: {
            cells: [
              [{ type: "text", text: { content: "字段" } }],
              [{ type: "text", text: { content: "值" } }],
            ],
          },
        },
        {
          type: "table_row",
          data: {
            cells: [
              [{ type: "text", text: { content: "状态" } }],
              [{ type: "text", text: { content: "正常" } }],
            ],
          },
        },
      ],
    },
  });
});
