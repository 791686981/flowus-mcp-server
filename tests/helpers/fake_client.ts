import type { FlowUsClient } from "../../src/client.js";

type HttpMethod = "get" | "post" | "patch" | "delete";

type RequestRecord = {
  method: HttpMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
};

type ResponseMap = Record<HttpMethod, unknown>;

class FakeFlowUsClient {
  readonly requests: RequestRecord[] = [];
  readonly responses: ResponseMap = {
    get: {},
    post: {},
    patch: {},
    delete: {},
  };

  get lastRequest(): RequestRecord | undefined {
    return this.requests.at(-1);
  }

  setResponse(method: HttpMethod, value: unknown) {
    this.responses[method] = value;
  }

  async get(path: string, params?: Record<string, string>) {
    this.requests.push({ method: "get", path, params });
    return this.responses.get;
  }

  async post(path: string, body?: unknown) {
    this.requests.push({ method: "post", path, body });
    return this.responses.post;
  }

  async patch(path: string, body?: unknown) {
    this.requests.push({ method: "patch", path, body });
    return this.responses.patch;
  }

  async delete(path: string) {
    this.requests.push({ method: "delete", path });
    return this.responses.delete;
  }
}

export function createFakeFlowUsClient() {
  return new FakeFlowUsClient() as unknown as FlowUsClient & FakeFlowUsClient;
}

export type { FakeFlowUsClient, HttpMethod, RequestRecord };
