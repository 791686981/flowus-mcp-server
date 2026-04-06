#!/usr/bin/env node
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FlowUsClient } from "./client.js";
import { registerPageTools } from "./tools/pages.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerDatabaseTools } from "./tools/databases.js";
import { registerSearchTools } from "./tools/search.js";
import { registerUserTools } from "./tools/users.js";
import { registerCompositeTools } from "./tools/composites.js";

const token = process.env.FLOWUS_TOKEN;
if (!token) {
  console.error("Error: FLOWUS_TOKEN environment variable is required.");
  console.error("Get your bot token from FlowUS integration settings.");
  process.exit(1);
}

const apiBase = process.env.FLOWUS_API_BASE;
const client = new FlowUsClient(token, apiBase);

const server = new McpServer({
  name: "flowus-mcp-server",
  version: "1.0.0",
});

registerPageTools(server, client);
registerBlockTools(server, client);
registerDatabaseTools(server, client);
registerSearchTools(server, client);
registerUserTools(server, client);
registerCompositeTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("FlowUS MCP Server running on stdio");
