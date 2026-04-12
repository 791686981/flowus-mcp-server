import assert from "node:assert/strict";
import test from "node:test";
import { registerBlockTools } from "../../src/tools/blocks.js";
import { createFakeFlowUsClient } from "../helpers/fake_client.js";
import { createToolRunner } from "../helpers/mcp_tool_runner.js";

test("append_block_children normalizes shorthand blocks before patching", async () => {
  const client = createFakeFlowUsClient();
  client.setResponse("patch", { results: [] });

  const runner = createToolRunner(registerBlockTools, client);

  await runner.callTool("append_block_children", {
    block_id: "page_123",
    children: [
      {
        type: "bulleted_list_item",
        data: {
          rich_text: "hello",
        },
        children: [
          {
            type: "to_do",
            data: {
              checked: true,
              rich_text: "child",
            },
          },
        ],
      },
      {
        type: "callout",
        data: {
          rich_text: "note",
          icon: "💡",
        },
      },
    ],
  });

  assert.deepEqual(client.lastRequest, {
    method: "patch",
    path: "/blocks/page_123/children",
    body: {
      children: [
        {
          type: "bulleted_list_item",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "hello",
                },
              },
            ],
          },
          children: [
            {
              type: "to_do",
              data: {
                checked: true,
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "child",
                    },
                  },
                ],
              },
            },
          ],
        },
        {
          type: "callout",
          data: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "note",
                },
              },
            ],
            icon: {
              emoji: "💡",
            },
          },
        },
      ],
    },
  });
});
