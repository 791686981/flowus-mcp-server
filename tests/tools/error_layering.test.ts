import assert from "node:assert/strict";
import test from "node:test";
import { FlowUsClientError } from "../../src/client.js";
import { registerPageTools } from "../../src/tools/pages.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("local normalization errors are returned before any api call", async () => {
  const client = createFakeFlowUsClient();
  const runner = createToolRunner(registerPageTools, client);

  const result = await runner.callTool("update_page", {
    page_id: "page_123",
    icon: "folder",
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /^Local normalization error:/);
  assert.equal(client.requests.length, 0);
});

test("remote FlowUsClientError messages remain categorized as remote failures", async () => {
  const client = createFakeFlowUsClient();
  client.patch = async (path: string, body?: unknown) => {
    client.requests.push({ method: "patch", path, body });
    throw new FlowUsClientError(400, "parameter_error", "Parameter error: bad payload");
  };

  const runner = createToolRunner(registerPageTools, client);

  const result = await runner.callTool("update_page", {
    page_id: "page_123",
    icon: { emoji: "📁" },
  });

  assert.equal(result.isError, true);
  assert.equal(result.content[0].text, "Parameter error: bad payload");
  assert.equal(client.requests.length, 1);
});
