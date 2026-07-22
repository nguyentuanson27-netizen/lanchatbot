import type {
  PancakeHttpMethod,
  PancakeHttpRequest,
  PancakeHttpResponse,
  PancakeHttpTransport,
} from "./transport.js";

export interface PancakePageConfig {
  readonly pageId: string;
  readonly accessToken: string;
  readonly tagIds: Readonly<{
    NHAN_VIEN?: string;
    VAN_DON?: string;
    DA_CHOT_DON?: string;
    KHONG_UP_SALE?: string;
  }>;
}

export interface PancakeClientOptions {
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
}

export type AllowedPancakeOperation =
  | "GET_CONVERSATION_MESSAGES"
  | "LIST_CONVERSATIONS"
  | "ADD_CONVERSATION_TAG"
  | "REMOVE_CONVERSATION_TAG";

export interface PancakeConversationTimeWindow {
  readonly since: number;
  readonly until: number;
  readonly pageNumber?: number;
}

/**
 * The only provider operations available to this package. In particular there
 * is deliberately no customer-message/send operation.
 */
export class PancakeAllowListedClient {
  private readonly v1BaseUrl: string;
  private readonly v2BaseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    private readonly transport: PancakeHttpTransport,
    options: PancakeClientOptions = {},
  ) {
    this.v1BaseUrl = normalizeBaseUrl(
      options.baseUrl ?? "https://pages.fm/api/public_api/v1",
    );
    if (!this.v1BaseUrl.endsWith("/v1")) {
      throw new Error("PANCAKE_BASE_URL_VERSION_INVALID");
    }
    this.v2BaseUrl = `${this.v1BaseUrl.slice(0, -2)}v2`;
    this.timeoutMs = validateTimeout(options.timeoutMs ?? 10_000);
  }

  getConversationMessages(
    config: PancakePageConfig,
    conversationId: string,
  ): Promise<PancakeHttpResponse> {
    return this.request(
      this.v1BaseUrl,
      "GET_CONVERSATION_MESSAGES",
      "GET",
      `${conversationPath(config.pageId, conversationId)}/messages`,
      config.accessToken,
      {},
      null,
    );
  }

  listConversations(
    config: PancakePageConfig,
    window?: PancakeConversationTimeWindow,
  ): Promise<PancakeHttpResponse> {
    return this.request(
      this.v2BaseUrl,
      "LIST_CONVERSATIONS",
      "GET",
      `/pages/${encodeURIComponent(config.pageId)}/conversations`,
      config.accessToken,
      window === undefined
        ? {}
        : {
            since: String(window.since),
            until: String(window.until),
            page_number: String(window.pageNumber ?? 1),
          },
      null,
    );
  }

  addConversationTag(
    config: PancakePageConfig,
    conversationId: string,
    tagId: string,
  ): Promise<PancakeHttpResponse> {
    return this.request(
      this.v1BaseUrl,
      "ADD_CONVERSATION_TAG",
      "POST",
      `${conversationPath(config.pageId, conversationId)}/tags`,
      config.accessToken,
      {},
      JSON.stringify({ action: "add", tag_id: tagId }),
    );
  }

  removeConversationTag(
    config: PancakePageConfig,
    conversationId: string,
    tagId: string,
  ): Promise<PancakeHttpResponse> {
    return this.request(
      this.v1BaseUrl,
      "REMOVE_CONVERSATION_TAG",
      "POST",
      `${conversationPath(config.pageId, conversationId)}/tags`,
      config.accessToken,
      {},
      JSON.stringify({ action: "remove", tag_id: tagId }),
    );
  }

  private request(
    baseUrl: string,
    operation: AllowedPancakeOperation,
    method: PancakeHttpMethod,
    path: string,
    token: string,
    query: Readonly<Record<string, string>>,
    body: string | null,
  ): Promise<PancakeHttpResponse> {
    assertPancakeEndpointAllowed(operation, method, path);
    const request: PancakeHttpRequest = {
      method,
      url: `${baseUrl}${path}`,
      headers: {
        ...(body === null ? {} : { "content-type": "application/json" }),
      },
      query: { page_access_token: token, ...query },
      body,
      timeoutMs: this.timeoutMs,
    };
    return this.transport.request(request);
  }
}

export function assertPancakeEndpointAllowed(
  operation: AllowedPancakeOperation,
  method: PancakeHttpMethod,
  path: string,
): void {
  const conversations = /^\/pages\/[^/]+\/conversations$/;
  const tags = /^\/pages\/[^/]+\/conversations\/[^/]+\/tags$/;
  const messages = /^\/pages\/[^/]+\/conversations\/[^/]+\/messages$/;
  const allowed =
    (operation === "GET_CONVERSATION_MESSAGES" &&
      method === "GET" &&
      messages.test(path)) ||
    (operation === "LIST_CONVERSATIONS" &&
      method === "GET" &&
      conversations.test(path)) ||
    ((operation === "ADD_CONVERSATION_TAG" ||
      operation === "REMOVE_CONVERSATION_TAG") &&
      method === "POST" &&
      tags.test(path));
  if (!allowed) throw new Error("PANCAKE_ENDPOINT_FORBIDDEN");
}

function conversationPath(pageId: string, conversationId: string): string {
  if (pageId.trim() === "") throw new Error("PANCAKE_PAGE_ID_REQUIRED");
  if (conversationId.trim() === "") throw new Error("PANCAKE_CONVERSATION_ID_REQUIRED");
  return `/pages/${encodeURIComponent(pageId)}/conversations/${encodeURIComponent(conversationId)}`;
}

function normalizeBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") throw new Error("PANCAKE_BASE_URL_HTTPS_REQUIRED");
  if (
    parsed.hostname !== "pages.fm" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("PANCAKE_BASE_URL_FORBIDDEN");
  }
  return parsed.toString().replace(/\/$/, "");
}

function validateTimeout(value: number): number {
  if (!Number.isInteger(value) || value < 100 || value > 60_000) {
    throw new Error("PANCAKE_TIMEOUT_INVALID");
  }
  return value;
}
