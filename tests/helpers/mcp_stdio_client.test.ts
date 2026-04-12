import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { LiveMcpSession } from "./mcp_stdio_client.js";

const repoRoot = process.cwd();
const tsxBin = path.join(repoRoot, "node_modules", ".bin", "tsx");
const fixtureServer = path.join(repoRoot, "tests", "fixtures", "echo_mcp_server.ts");

test("LiveMcpSession lists tools and parses json responses over stdio", async () => {
  const session = new LiveMcpSession({
    command: tsxBin,
    args: [fixtureServer],
    cwd: repoRoot,
  });

  await session.start();

  try {
    const tools = await session.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === "echo_json"));

    const payload = await session.callJsonTool<{ greeting: string }>("echo_json", {
      name: "FlowUS",
    });

    assert.deepEqual(payload, { greeting: "Hello, FlowUS" });
  } finally {
    await session.close();
  }
});

test("LiveMcpSession throws when the tool returns an MCP error", async () => {
  const session = new LiveMcpSession({
    command: tsxBin,
    args: [fixtureServer],
    cwd: repoRoot,
  });

  await session.start();

  try {
    await assert.rejects(
      () => session.callJsonTool("always_fail", {}),
      /fixture failed/,
    );
  } finally {
    await session.close();
  }
});
