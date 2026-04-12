import assert from "node:assert/strict";
import test from "node:test";
import { registerPageTools } from "../../src/tools/pages.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("create_page rejects parents that include both page_id and database_id", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerPageTools, client);

  await assert.rejects(
    () =>
      runner.callTool("create_page", {
        parent: {
          page_id: "page_123",
          database_id: "db_456",
        },
        properties: {
          title: "冲突父级",
        },
      }),
    /exactly one|page_id|database_id/i,
  );

  assert.equal(client.requests.length, 0);
});

test("create_page accepts a database parent when it is the only parent reference", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", { id: "page_123" });
  const runner = createToolRunner(registerPageTools, client);

  await runner.callTool("create_page", {
    parent: {
      database_id: "db_456",
    },
    properties: {
      title: "数据库记录",
    },
  });

  assert.deepEqual(client.lastRequest, {
    method: "post",
    path: "/pages",
    body: {
      parent: {
        database_id: "db_456",
      },
      properties: {
        title: {
          id: "title",
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: "数据库记录",
              },
            },
          ],
        },
      },
    },
  });
});
