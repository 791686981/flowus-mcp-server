import assert from "node:assert/strict";
import test from "node:test";
import { registerPageTools } from "../../src/tools/pages.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("update_page rejects malformed select properties before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerPageTools, client);

  const result = await runner.callTool("update_page", {
    page_id: "page_123",
    properties: {
      状态: {
        type: "select",
      },
    },
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /select/i);
  assert.equal(client.requests.length, 0);
});

test("update_page accepts canonical rich_text, checkbox, select, multi_select, and date properties", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { id: "page_123" });
  const runner = createToolRunner(registerPageTools, client);

  await runner.callTool("update_page", {
    page_id: "page_123",
    properties: {
      描述: {
        type: "rich_text",
        rich_text: [
          {
            type: "text",
            text: {
              content: "继续推进",
            },
          },
        ],
      },
      完成: {
        type: "checkbox",
        checkbox: true,
      },
      状态: {
        type: "select",
        select: {
          name: "进行中",
        },
      },
      标签: {
        type: "multi_select",
        multi_select: [
          { name: "API" },
          { name: "回归" },
        ],
      },
      时间: {
        type: "date",
        date: {
          start: "2026-04-12T10:00:00",
          end: "2026-04-12T18:00:00",
        },
      },
    },
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/pages/page_123",
    body: {
      properties: {
        描述: {
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: {
                content: "继续推进",
              },
            },
          ],
        },
        完成: {
          type: "checkbox",
          checkbox: true,
        },
        状态: {
          type: "select",
          select: {
            name: "进行中",
          },
        },
        标签: {
          type: "multi_select",
          multi_select: [
            { name: "API" },
            { name: "回归" },
          ],
        },
        时间: {
          type: "date",
          date: {
            start: "2026-04-12T10:00:00",
            end: "2026-04-12T18:00:00",
          },
        },
      },
    },
  });
});

test("update_page accepts canonical number, url, email, phone_number, people, files, and relation properties", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { id: "page_123" });
  const runner = createToolRunner(registerPageTools, client);

  await runner.callTool("update_page", {
    page_id: "page_123",
    properties: {
      预算: {
        type: "number",
        number: 45000,
      },
      官网: {
        type: "url",
        url: "https://example.com",
      },
      邮箱: {
        type: "email",
        email: "contact@example.com",
      },
      电话: {
        type: "phone_number",
        phone_number: "+86 138-0013-8000",
      },
      负责人: {
        type: "people",
        people: [
          { id: "user-1" },
          { id: "user-2" },
        ],
      },
      附件: {
        type: "files",
        files: [
          {
            name: "文档.pdf",
            external: {
              url: "https://example.com/document.pdf",
            },
          },
        ],
      },
      关联项目: {
        type: "relation",
        relation: [
          { id: "page-1" },
          { id: "page-2" },
        ],
      },
    },
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/pages/page_123",
    body: {
      properties: {
        预算: {
          type: "number",
          number: 45000,
        },
        官网: {
          type: "url",
          url: "https://example.com",
        },
        邮箱: {
          type: "email",
          email: "contact@example.com",
        },
        电话: {
          type: "phone_number",
          phone_number: "+86 138-0013-8000",
        },
        负责人: {
          type: "people",
          people: [
            { id: "user-1" },
            { id: "user-2" },
          ],
        },
        附件: {
          type: "files",
          files: [
            {
              name: "文档.pdf",
              external: {
                url: "https://example.com/document.pdf",
              },
            },
          ],
        },
        关联项目: {
          type: "relation",
          relation: [
            { id: "page-1" },
            { id: "page-2" },
          ],
        },
      },
    },
  });
});

test("update_page rejects malformed relation properties before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerPageTools, client);

  const result = await runner.callTool("update_page", {
    page_id: "page_123",
    properties: {
      关联项目: {
        type: "relation",
        relation: [
          {},
        ],
      },
    },
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /relation/i);
  assert.equal(client.requests.length, 0);
});
