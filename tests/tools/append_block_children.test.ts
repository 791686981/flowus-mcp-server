import assert from "node:assert/strict";
import test from "node:test";
import { registerBlockTools } from "../../src/tools/blocks.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("append_block_children normalizes shorthand blocks before patching", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });

  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "paragraph",
        data: {
          rich_text: "hello",
        },
      },
      {
        type: "callout",
        data: {
          rich_text: "note",
          icon: "💡",
        },
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "hello",
                },
              },
            ],
          },
        },
        {
          type: "callout",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "note",
                },
              },
            ],
            icon: {
              emoji: "💡",
            },
          },
        },
      ],
    },
  });
});

test("append_block_children rejects the after parameter until FlowUS supports positional insertion", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  const result = await runner.callTool("append_block_children", {
    block_id: "page_123",
    after: "block_456",
    children: [
      {
        type: "paragraph",
        data: {
          rich_text: "hello",
        },
      },
    ],
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /after parameter is not supported/i);
  assert.equal(client.requests.length, 0);
});

test("append_block_children preserves table row children when provided", async () => {
  const client = createFakeFlowUsClient();
  client.patch = async (path: string, body?: unknown) => {
    client.requests.push({ method: "patch", path, body });
    if (path === "/blocks/page_123/children") {
      return {
        results: [
          {
            id: "table_123",
            type: "table",
          },
        ],
      };
    }

    return { results: [] };
  };
  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "table",
        data: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
        },
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
        ],
      },
    ],
  });

  assert.deepEqual(client.requests[0], {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
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
  assert.deepEqual(client.requests[1], {
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
      ],
    },
  });
});

test("append_block_children preserves nested paragraph children when provided", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });
  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "paragraph",
        data: {
          rich_text: "父段落",
        },
        children: [
          {
            type: "paragraph",
            data: {
              rich_text: "子段落",
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "paragraph",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "父段落",
                },
              },
            ],
          },
          children: [
            {
              type: "paragraph",
              data: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "子段落",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });
});

test("append_block_children preserves nested column layouts when provided", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });
  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "column_list",
        data: {},
        children: [
          {
            type: "column",
            data: {},
            children: [
              {
                type: "paragraph",
                data: {
                  rich_text: "左栏",
                },
              },
            ],
          },
          {
            type: "column",
            data: {},
            children: [
              {
                type: "paragraph",
                data: {
                  rich_text: "右栏",
                },
              },
            ],
          },
        ],
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "column_list",
          data: {},
          children: [
            {
              type: "column",
              data: {},
              children: [
                {
                  type: "paragraph",
                  data: {
                    rich_text: [
                      {
                        type: "text",
                        text: {
                          content: "左栏",
                        },
                      },
                    ],
                  },
                },
              ],
            },
            {
              type: "column",
              data: {},
              children: [
                {
                  type: "paragraph",
                  data: {
                    rich_text: [
                      {
                        type: "text",
                        text: {
                          content: "右栏",
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  });
});

test("append_block_children rejects malformed equation blocks before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  await assert.rejects(
    () =>
      runner.callTool("append_block_children", {
        block_id: "page_123",
        children: [
          {
            type: "equation",
            data: {},
          },
        ],
      }),
    /expression/i,
  );

  assert.equal(client.requests.length, 0);
});

test("append_block_children rejects malformed link_to_page blocks before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  await assert.rejects(
    () =>
      runner.callTool("append_block_children", {
        block_id: "page_123",
        children: [
          {
            type: "link_to_page",
            data: {},
          },
        ],
      }),
    /page_id/i,
  );

  assert.equal(client.requests.length, 0);
});

test("append_block_children rejects non-column children inside column_list blocks", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  await assert.rejects(
    () =>
      runner.callTool("append_block_children", {
        block_id: "page_123",
        children: [
          {
            type: "column_list",
            data: {},
            children: [
              {
                type: "paragraph",
                data: {
                  rich_text: "非法直接子块",
                },
              },
            ],
          },
        ],
      }),
    /column/i,
  );

  assert.equal(client.requests.length, 0);
});

test("append_block_children normalizes template rich text payloads", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });
  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "template",
        data: {
          rich_text: "新建模板",
        },
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "template",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "新建模板",
                },
              },
            ],
          },
        },
      ],
    },
  });
});

test("append_block_children rejects malformed template blocks before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  await assert.rejects(
    () =>
      runner.callTool("append_block_children", {
        block_id: "page_123",
        children: [
          {
            type: "template",
            data: {},
          },
        ],
      }),
    /rich_text/i,
  );

  assert.equal(client.requests.length, 0);
});

test("append_block_children preserves original synced_block children when provided", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });
  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "synced_block",
        data: {
          synced_from: null,
        },
        children: [
          {
            type: "paragraph",
            data: {
              rich_text: "原始同步块内容",
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "synced_block",
          data: {
            synced_from: null,
          },
          children: [
            {
              type: "paragraph",
              data: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "原始同步块内容",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  });
});

test("append_block_children rejects editable children on duplicated synced_block", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  await assert.rejects(
    () =>
      runner.callTool("append_block_children", {
        block_id: "page_123",
        children: [
          {
            type: "synced_block",
            data: {
              synced_from: {
                block_id: "block_456",
              },
            },
            children: [
              {
                type: "paragraph",
                data: {
                  rich_text: "不应该直接编辑复制同步块",
                },
              },
            ],
          },
        ],
      }),
    /synced_from|children/i,
  );

  assert.equal(client.requests.length, 0);
});

test("append_block_children accepts canonical media blocks", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });
  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "bookmark",
        data: {
          url: "https://example.com/bookmark",
          caption: [
            {
              type: "text",
              text: {
                content: "书签说明",
              },
            },
          ],
        },
      },
      {
        type: "embed",
        data: {
          url: "https://example.com/embed",
          caption: [
            {
              type: "text",
              text: {
                content: "内嵌说明",
              },
            },
          ],
        },
      },
      {
        type: "image",
        data: {
          type: "external",
          external: {
            url: "https://example.com/image.png",
          },
          caption: [
            {
              type: "text",
              text: {
                content: "图片说明",
              },
            },
          ],
        },
      },
      {
        type: "file",
        data: {
          type: "external",
          external: {
            url: "https://example.com/file.pdf",
          },
          caption: [
            {
              type: "text",
              text: {
                content: "文件说明",
              },
            },
          ],
        },
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "bookmark",
          data: {
            url: "https://example.com/bookmark",
            caption: [
              {
                type: "text",
                text: {
                  content: "书签说明",
                },
              },
            ],
          },
        },
        {
          type: "embed",
          data: {
            url: "https://example.com/embed",
            caption: [
              {
                type: "text",
                text: {
                  content: "内嵌说明",
                },
              },
            ],
          },
        },
        {
          type: "image",
          data: {
            type: "external",
            external: {
              url: "https://example.com/image.png",
            },
            caption: [
              {
                type: "text",
                text: {
                  content: "图片说明",
                },
              },
            ],
          },
        },
        {
          type: "file",
          data: {
            type: "external",
            external: {
              url: "https://example.com/file.pdf",
            },
            caption: [
              {
                type: "text",
                text: {
                  content: "文件说明",
                },
              },
            ],
          },
        },
      ],
    },
  });
});

test("append_block_children rejects malformed bookmark blocks before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerBlockTools, client);

  await assert.rejects(
    () =>
      runner.callTool("append_block_children", {
        block_id: "page_123",
        children: [
          {
            type: "bookmark",
            data: {
              caption: [],
            },
          },
        ],
      }),
    /url/i,
  );
  assert.equal(client.requests.length, 0);
});
