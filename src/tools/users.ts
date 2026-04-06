import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../client.js";
import { jsonResponse, errorResponse } from "../client.js";

export function registerUserTools(server: McpServer, client: FlowUsClient) {
  server.tool(
    "get_me",
    "Get information about the bot's creator (current user). Returns user ID, name, email, and avatar.",
    {},
    async () => {
      try {
        return jsonResponse(await client.get("/users/me"));
      } catch (error) {
        return errorResponse(error);
      }
    },
  );
}
