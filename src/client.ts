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

export class FlowUsClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, baseUrl?: string) {
    this.token = token;
    this.baseUrl = baseUrl ?? "https://api.flowus.cn/v1";
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

    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = this.formatError(response.status, errorBody);
      throw new FlowUsClientError(
        response.status,
        (errorBody as Record<string, unknown>).code as string ?? "unknown_error",
        message,
      );
    }

    return response.json() as Promise<T>;
  }

  private formatError(status: number, body: unknown): string {
    const msg =
      (body as Record<string, unknown>)?.message as string ?? "Unknown error";
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
