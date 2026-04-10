import assert from "node:assert/strict";
import test from "node:test";
import { registerCompositeTools } from "../../src/tools/composites.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

const pageCreationArgs = {
  properties: {
    title: "EP04 - 校审流程",
  },
  children: [
    {
      type: "paragraph",
      data: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "第一段",
            },
          },
        ],
      },
    },
  ],
};

test("create_page_with_content reuses the canonical title normalization path", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", { id: "page_123" });
  client.setResponse("patch", { results: [] });

  const runner = createToolRunner(registerCompositeTools, client);

  await runner.callTool("create_page_with_content", pageCreationArgs);

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
                content: "EP04 - 校审流程",
              },
            },
          ],
        },
      },
    },
  });
});

test("create_page_with_content keeps append failures separate in the response", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", { id: "page_123" });
  client.patch = async (path: string, body?: unknown) => {
    client.requests.push({ method: "patch", path, body });
    throw new Error("append failed");
  };

  const runner = createToolRunner(registerCompositeTools, client);

  const result = await runner.callTool("create_page_with_content", pageCreationArgs);

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /Page created successfully \(id: page_123\)/);
  assert.match(result.content[0].text, /append failed/);
  assert.deepEqual(client.requests[1], {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: pageCreationArgs.children,
    },
  });
});
