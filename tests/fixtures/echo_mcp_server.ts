import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "echo-mcp-fixture",
  version: "0.0.0-test",
});

server.tool(
  "echo_json",
  "Return a JSON text payload for client fixture tests.",
  {
    name: z.string(),
  },
  async ({ name }) => ({
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ greeting: `Hello, ${name}` }),
      },
    ],
  }),
);

server.tool(
  "always_fail",
  "Return a tool error for client fixture tests.",
  {},
  async () => ({
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: "fixture failed",
      },
    ],
  }),
);

await server.connect(new StdioServerTransport());
