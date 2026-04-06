import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";

export function registerUserTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "get_me",
    "Get information about the bot's creator (current user). Returns user ID, name, email, and avatar.",
    {},
    async () => {
      const result = await client.get("/users/me");
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
