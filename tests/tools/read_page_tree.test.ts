import assert from "node:assert/strict";
import test from "node:test";
import { registerCompositeTools } from "../../src/tools/composites.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("read_page_tree returns child page and child database counts with numbered tree nodes", async () => {
  const client = createFakeFlowUsClient();
  client.get = async (path: string, params?: Record<string, string>) => {
    client.requests.push({ method: "get", path, params });

    if (path === "/pages/root_page") {
      return {
        id: "root_page",
        url: "https://flowus.cn/docs/root_page",
        properties: {
          title: {
            type: "title",
            title: [{ type: "text", text: { content: "根目录" } }],
          },
        },
      };
    }

    if (path === "/blocks/root_page/children") {
      return {
        results: [
          {
            id: "child_page_a",
            type: "child_page",
            data: {
              title: "子页 A",
            },
          },
          {
            id: "child_db_1",
            type: "child_database",
            data: {
              title: "子数据库 1",
            },
          },
          {
            id: "paragraph_1",
            type: "paragraph",
            data: {
              rich_text: [{ type: "text", text: { content: "无关正文" } }],
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      };
    }

    if (path === "/blocks/child_page_a/children") {
      return {
        results: [
          {
            id: "child_page_b",
            type: "child_page",
            data: {
              title: "子页 B",
            },
          },
        ],
        has_more: false,
        next_cursor: null,
      };
    }

    if (path === "/blocks/child_page_b/children") {
      return {
        results: [],
        has_more: false,
        next_cursor: null,
      };
    }

    throw new Error(`Unexpected get path: ${path}`);
  };

  const runner = createToolRunner(registerCompositeTools, client);

  const result = await runner.callTool("read_page_tree", {
    page_id: "root_page",
  });

  const payload = JSON.parse(result.content[0].text);

  assert.equal(payload.page.id, "root_page");
  assert.deepEqual(payload.summary, {
    direct_child_page_count: 1,
    direct_child_database_count: 1,
    descendant_page_count: 2,
    descendant_database_count: 1,
    max_depth_applied: null,
  });
  assert.deepEqual(payload.tree, {
    id: "root_page",
    type: "page",
    title: "根目录",
    number: "1",
    direct_child_page_count: 1,
    direct_child_database_count: 1,
    children: [
      {
        id: "child_page_a",
        type: "child_page",
        title: "子页 A",
        number: "1.1",
        direct_child_page_count: 1,
        direct_child_database_count: 0,
        children: [
          {
            id: "child_page_b",
            type: "child_page",
            title: "子页 B",
            number: "1.1.1",
            direct_child_page_count: 0,
            direct_child_database_count: 0,
            children: [],
          },
        ],
      },
      {
        id: "child_db_1",
        type: "child_database",
        title: "子数据库 1",
        number: "1.2",
        direct_child_page_count: 0,
        direct_child_database_count: 0,
        children: [],
      },
    ],
  });
  assert.deepEqual(client.requests, [
    {
      method: "get",
      path: "/pages/root_page",
      params: undefined,
    },
    {
      method: "get",
      path: "/blocks/root_page/children",
      params: {
        page_size: "100",
      },
    },
    {
      method: "get",
      path: "/blocks/child_page_a/children",
      params: {
        page_size: "100",
      },
    },
    {
      method: "get",
      path: "/blocks/child_page_b/children",
      params: {
        page_size: "100",
      },
    },
  ]);
});

test("read_page_tree respects max_depth when building the child tree", async () => {
  const client = createFakeFlowUsClient();
  client.get = async (path: string, params?: Record<string, string>) => {
    client.requests.push({ method: "get", path, params });

    if (path === "/pages/root_page") {
      return {
        id: "root_page",
        properties: {
          title: {
            type: "title",
            title: [{ type: "text", text: { content: "深度测试" } }],
          },
        },
      };
    }

    if (path === "/blocks/root_page/children") {
      return {
        results: [
          {
            id: "child_page_a",
            type: "child_page",
            data: {
              title: "子页 A",
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

  const result = await runner.callTool("read_page_tree", {
    page_id: "root_page",
    max_depth: 1,
  });

  const payload = JSON.parse(result.content[0].text);

  assert.deepEqual(payload.summary, {
    direct_child_page_count: 1,
    direct_child_database_count: 0,
    descendant_page_count: 1,
    descendant_database_count: 0,
    max_depth_applied: 1,
  });
  assert.deepEqual(payload.tree.children, [
    {
      id: "child_page_a",
      type: "child_page",
      title: "子页 A",
      number: "1.1",
      direct_child_page_count: 0,
      direct_child_database_count: 0,
      children: [],
    },
  ]);
  assert.deepEqual(client.requests, [
    {
      method: "get",
      path: "/pages/root_page",
      params: undefined,
    },
    {
      method: "get",
      path: "/blocks/root_page/children",
      params: {
        page_size: "100",
      },
    },
  ]);
});
