import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FlowUsClient } from "../../src/client.js";

type ToolRegistrar = (server: McpServer, client: FlowUsClient) => void;

type ToolRegistry = {
  _registeredTools: Record<string, RegisteredTool>;
};

export function createToolRunner(register: ToolRegistrar, client: FlowUsClient) {
  const server = new McpServer({
    name: "flowus-mcp-test",
    version: "0.0.0-test",
  });

  register(server, client);

  const tools = (server as unknown as ToolRegistry)._registeredTools;

  return {
    server,
    getTool(name: string) {
      return tools[name];
    },
    async callTool(name: string, args: Record<string, unknown>) {
      const tool = tools[name];
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      if (typeof tool.handler !== "function") {
        throw new Error(`Tool handler is not callable: ${name}`);
      }

      return tool.handler(args, {} as never);
    },
  };
}
