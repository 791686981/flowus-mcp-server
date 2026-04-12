type ToolTextContent = {
  type: string;
  text?: string;
};

type ToolResultLike = {
  isError?: boolean;
  content?: ToolTextContent[];
};

type ArtifactEntry = {
  id: string;
  label: string;
};

export type FlowUsE2EConfig = {
  enabled: boolean;
  runId: string;
  sandboxTitle: string;
  skipReason?: string;
};

function buildDefaultRunId(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildOwnedTitle(runId: string, label: string) {
  return `[${runId}] ${label}`;
}

export function resolveFlowUsE2EConfig(
  env: NodeJS.ProcessEnv,
  now = new Date(),
): FlowUsE2EConfig {
  const runId = env.FLOWUS_E2E_RUN_ID?.trim() || buildDefaultRunId(now);
  const enabled = env.FLOWUS_E2E === "1" && Boolean(env.FLOWUS_TOKEN);

  const missing: string[] = [];
  if (env.FLOWUS_E2E !== "1") missing.push("set FLOWUS_E2E=1");
  if (!env.FLOWUS_TOKEN) missing.push("provide FLOWUS_TOKEN");

  return {
    enabled,
    runId,
    sandboxTitle: `MCP E2E Sandbox ${runId}`,
    skipReason: enabled
      ? undefined
      : `Live FlowUS E2E disabled: ${missing.join("; ")}`,
  };
}

export function parseJsonToolText<T>(result: ToolResultLike): T {
  const textContent = result.content?.find((item) => item.type === "text")?.text;

  if (result.isError) {
    throw new Error(textContent || "MCP tool returned an error without text content.");
  }

  if (!textContent) {
    throw new Error("MCP tool did not return text content.");
  }

  try {
    return JSON.parse(textContent) as T;
  } catch (error) {
    throw new Error(`Failed to parse MCP tool JSON response: ${String(error)}`);
  }
}

export class ArtifactTracker {
  private sandboxRoot?: ArtifactEntry;
  private readonly pages = new Map<string, ArtifactEntry>();
  private readonly databases = new Map<string, ArtifactEntry>();
  private readonly blocks = new Map<string, ArtifactEntry>();

  constructor(private readonly runId: string) {}

  trackSandboxRoot(id: string, label: string) {
    this.sandboxRoot = { id, label };
  }

  trackPage(id: string, label: string) {
    this.pages.set(id, { id, label });
  }

  trackDatabase(id: string, label: string) {
    this.databases.set(id, { id, label });
  }

  trackBlock(id: string, label: string) {
    this.blocks.set(id, { id, label });
  }

  toCleanupSummary() {
    return {
      runId: this.runId,
      sandboxRoot: this.sandboxRoot,
      pages: [...this.pages.values()],
      databases: [...this.databases.values()],
      blocks: [...this.blocks.values()],
    };
  }

  formatCleanupReport() {
    return JSON.stringify(this.toCleanupSummary(), null, 2);
  }
}
