import assert from "node:assert/strict";
import test from "node:test";
import { registerSearchTools } from "../../src/tools/search.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("search_pages filters non-page results out of the response", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("post", {
    object: "list",
    results: [
      { object: "database", id: "db_1" },
      { object: "page", id: "page_1" },
    ],
    has_more: false,
    next_cursor: null,
  });

  const runner = createToolRunner(registerSearchTools, client);

  const result = await runner.callTool("search_pages", {
    query: "flowus",
    page_size: 2,
  });

  const payload = JSON.parse(result.content[0].text);

  assert.deepEqual(payload.results, [
    { object: "page", id: "page_1" },
  ]);
  assert.deepEqual(client.lastRequest, {
    method: "post",
    path: "/search",
    body: {
      query: "flowus",
      page_size: 2,
    },
  });
});

test("search_pages keeps paging until it collects the requested number of pages", async () => {
  const client = createFakeFlowUsClient();
  const responses = [
    {
      object: "list",
      results: [
        { object: "database", id: "db_1" },
      ],
      has_more: true,
      next_cursor: "cursor_1",
    },
    {
      object: "list",
      results: [
        { object: "page", id: "page_1" },
      ],
      has_more: true,
      next_cursor: "cursor_2",
    },
    {
      object: "list",
      results: [
        { object: "page", id: "page_2" },
      ],
      has_more: false,
      next_cursor: null,
    },
  ];

  client.post = async (path: string, body?: unknown) => {
    client.requests.push({ method: "post", path, body });
    const next = responses.shift();
    if (!next) {
      throw new Error("Unexpected extra search request");
    }
    return next;
  };

  const runner = createToolRunner(registerSearchTools, client);

  const result = await runner.callTool("search_pages", {
    query: "runId",
    page_size: 2,
  });

  const payload = JSON.parse(result.content[0].text);

  assert.deepEqual(payload.results, [
    { object: "page", id: "page_1" },
    { object: "page", id: "page_2" },
  ]);
  assert.equal(payload.has_more, false);
  assert.equal(payload.next_cursor, null);
  assert.deepEqual(client.requests, [
    {
      method: "post",
      path: "/search",
      body: {
        query: "runId",
        page_size: 2,
      },
    },
    {
      method: "post",
      path: "/search",
      body: {
        query: "runId",
        page_size: 2,
        start_cursor: "cursor_1",
      },
    },
    {
      method: "post",
      path: "/search",
      body: {
        query: "runId",
        page_size: 1,
        start_cursor: "cursor_2",
      },
    },
  ]);
});
