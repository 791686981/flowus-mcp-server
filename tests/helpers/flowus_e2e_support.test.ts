import assert from "node:assert/strict";
import test from "node:test";
import {
  ArtifactTracker,
  buildOwnedTitle,
  parseJsonToolText,
  resolveFlowUsE2EConfig,
} from "./flowus_e2e_support.js";

test("resolveFlowUsE2EConfig disables live suite when opt-in env is absent", () => {
  const config = resolveFlowUsE2EConfig({});

  assert.equal(config.enabled, false);
  assert.match(config.skipReason ?? "", /FLOWUS_E2E=1/);
  assert.match(config.runId, /^\d{8}T\d{6}Z$/);
});

test("resolveFlowUsE2EConfig uses explicit run id and sandbox title", () => {
  const config = resolveFlowUsE2EConfig({
    FLOWUS_E2E: "1",
    FLOWUS_TOKEN: "token",
    FLOWUS_E2E_RUN_ID: "run-123",
  });

  assert.equal(config.enabled, true);
  assert.equal(config.runId, "run-123");
  assert.equal(config.sandboxTitle, "MCP E2E Sandbox run-123");
});

test("buildOwnedTitle prefixes case names with the run id", () => {
  assert.equal(buildOwnedTitle("run-123", "Markdown 项目说明"), "[run-123] Markdown 项目说明");
});

test("parseJsonToolText parses text payloads and throws on tool errors", () => {
  const parsed = parseJsonToolText<{ ok: boolean }>({
    content: [{ type: "text", text: "{\"ok\":true}" }],
  });

  assert.deepEqual(parsed, { ok: true });
  assert.throws(
    () => parseJsonToolText({ isError: true, content: [{ type: "text", text: "fixture failed" }] }),
    /fixture failed/,
  );
});

test("ArtifactTracker deduplicates artifacts and formats a cleanup report", () => {
  const tracker = new ArtifactTracker("run-123");

  tracker.trackSandboxRoot("page_root", "MCP E2E Sandbox run-123");
  tracker.trackPage("page_a", "[run-123] 文档页");
  tracker.trackPage("page_a", "[run-123] 文档页");
  tracker.trackDatabase("db_a", "[run-123] 数据库");
  tracker.trackBlock("block_a", "段落 block");

  assert.deepEqual(tracker.toCleanupSummary(), {
    runId: "run-123",
    sandboxRoot: {
      id: "page_root",
      label: "MCP E2E Sandbox run-123",
    },
    pages: [{ id: "page_a", label: "[run-123] 文档页" }],
    databases: [{ id: "db_a", label: "[run-123] 数据库" }],
    blocks: [{ id: "block_a", label: "段落 block" }],
  });
  assert.match(tracker.formatCleanupReport(), /page_root/);
  assert.match(tracker.formatCleanupReport(), /db_a/);
});
