// src/client.ts

export class FlowUsClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "FlowUsClientError";
  }
}

const DEFAULT_TIMEOUT = 30_000;

export class FlowUsClient {
  private baseUrl: string;
  private token: string;
  private timeout: number;

  constructor(token: string, baseUrl?: string, timeout?: number) {
    this.token = token;
    this.baseUrl = baseUrl ?? "https://api.flowus.cn/v1";
    this.timeout = timeout ?? DEFAULT_TIMEOUT;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = this.formatError(response.status, errorBody);
        throw new FlowUsClientError(
          response.status,
          String((errorBody as Record<string, unknown>).code ?? "unknown_error"),
          message,
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof FlowUsClientError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new FlowUsClientError(0, "timeout", `Request timed out after ${this.timeout}ms: ${method} ${path}`);
      }
      throw new FlowUsClientError(0, "network_error", `Network error: ${String(error)}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private formatError(status: number, body: unknown): string {
    const msg =
      String((body as Record<string, unknown>)?.message ?? "Unknown error");
    switch (status) {
      case 400:
        return `Parameter error: ${msg}`;
      case 401:
        return "Authentication failed. Check that FLOWUS_TOKEN is correct.";
      case 403:
        return "Permission denied. Ensure the bot has been added to the target page with appropriate permissions.";
      case 404:
        return `Resource not found. ${msg}`;
      case 429:
        return "Rate limit exceeded. Please retry later.";
      default:
        if (status >= 500)
          return `FlowUS server error (${status}). Please retry later.`;
        return `HTTP ${status}: ${msg}`;
    }
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    return this.request<T>("GET", path, undefined, params);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }
}

// Helper to build MCP tool success responses
export function jsonResponse(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

// Helper to build MCP tool error responses
export function errorResponse(error: unknown) {
  const message = error instanceof FlowUsClientError
    ? error.message
    : `Unexpected error: ${String(error)}`;
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}
