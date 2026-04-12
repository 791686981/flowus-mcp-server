import assert from "node:assert/strict";
import test from "node:test";
import { registerDatabaseTools } from "../../src/tools/databases.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("create_database rejects property definitions that omit name", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerDatabaseTools, client);

  await assert.rejects(
    () =>
      runner.callTool("create_database", {
        parent: {
          page_id: "page_123",
        },
        title: [
          {
            text: {
              content: "任务管理",
            },
          },
        ],
        properties: {
          status: {
            id: "status",
            type: "select",
            select: {
              options: [{ name: "待办", color: "yellow" }],
            },
          },
        },
      }),
    /name/i,
  );
  assert.equal(client.requests.length, 0);
});

test("update_database allows null property values so columns can be deleted", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { id: "db_123" });

  const runner = createToolRunner(registerDatabaseTools, client);

  await runner.callTool("update_database", {
    database_id: "db_123",
    properties: {
      Obsolete: null,
    },
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/databases/db_123",
    body: {
      properties: {
        Obsolete: null,
      },
    },
  });
});
