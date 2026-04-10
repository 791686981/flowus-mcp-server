import assert from "node:assert/strict";
import test from "node:test";
import { registerPageTools } from "../../src/tools/pages.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("create_page sends a canonical title property payload", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", { id: "page_123" });

  const runner = createToolRunner(registerPageTools, client);

  await runner.callTool("create_page", {
    properties: {
      title: "EP04 - 校审流程",
    },
  });

  assert.deepEqual(client.lastRequest, {
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
