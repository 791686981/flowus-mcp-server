import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, type StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ArtifactTracker, parseJsonToolText } from "./flowus_e2e_support.js";

type ToolArguments = Record<string, unknown>;

export type LiveMcpSessionOptions = StdioServerParameters & {
  clientName?: string;
  clientVersion?: string;
  runId?: string;
};

export class LiveMcpSession {
  readonly tracker?: ArtifactTracker;
  private readonly client: Client;
  private readonly transport: StdioClientTransport;
  private readonly stderrChunks: string[] = [];

  constructor(options: LiveMcpSessionOptions) {
    this.client = new Client({
      name: options.clientName ?? "flowus-e2e-test-client",
      version: options.clientVersion ?? "0.0.0-test",
    });
    this.transport = new StdioClientTransport({
      ...options,
      stderr: options.stderr ?? "pipe",
    });
    this.tracker = options.runId ? new ArtifactTracker(options.runId) : undefined;
  }

  async start() {
    const stderr = this.transport.stderr;
    if (stderr) {
      stderr.setEncoding("utf8");
      stderr.on("data", (chunk) => {
        this.stderrChunks.push(String(chunk));
      });
    }

    await this.client.connect(this.transport);
  }

  async close() {
    await this.transport.close();
  }

  async listTools() {
    return this.client.listTools();
  }

  async callTool(name: string, args: ToolArguments) {
    return this.client.callTool({
      name,
      arguments: args,
    });
  }

  async callJsonTool<T>(name: string, args: ToolArguments) {
    return parseJsonToolText<T>(await this.callTool(name, args));
  }

  getCapturedStderr() {
    return this.stderrChunks.join("");
  }
}
