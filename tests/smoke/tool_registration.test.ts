import assert from "node:assert/strict";
import test from "node:test";
import { registerPageTools } from "../../src/tools/pages.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("page tools register without throwing", () => {
  const client = createFakeFlowUsClient();

  assert.doesNotThrow(() => {
    const runner = createToolRunner(registerPageTools, client);
    assert.ok(runner.getTool("create_page"));
    assert.ok(runner.getTool("get_page"));
    assert.ok(runner.getTool("update_page"));
  });
});
