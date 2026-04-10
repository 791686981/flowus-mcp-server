import assert from "node:assert/strict";
import test from "node:test";
import { registerPageTools } from "../../src/tools/pages.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("update_page accepts icon emoji shorthand and sends canonical payload", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { id: "page_123" });

  const runner = createToolRunner(registerPageTools, client);

  await runner.callTool("update_page", {
    page_id: "page_123",
    icon: "📁",
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/pages/page_123",
    body: {
      icon: {
        emoji: "📁",
      },
    },
  });
});
