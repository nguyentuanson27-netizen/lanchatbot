export interface PancakePosClientOptions {
  readonly baseUrl: string;
  readonly pageSize?: number;
  readonly timeoutMs?: number;
  readonly maxPages?: number;
  readonly fetchImpl?: typeof fetch;
  readonly sleep?: (ms: number) => Promise<void>;
}

export class PancakePosError extends Error {
  readonly code: string;
  readonly statusCode: number | null;

  constructor(code: string, statusCode: number | null) {
    super(code);
    this.name = "PancakePosError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Giữ đúng semantics retry của n8n: tối đa 3 lần, backoff 1s*lần thử;
 * status < 429 không retry, lỗi mạng hoặc 429+/5xx thì retry.
 */
export class PancakePosClient {
  private readonly baseUrl: string;
  private readonly pageSize: number;
  private readonly timeoutMs: number;
  private readonly maxPages: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: PancakePosClientOptions) {
    const baseUrl = options.baseUrl.trim().replace(/\/+$/u, "");
    if (!baseUrl) throw new Error("PANCAKE_POS_BASE_URL_REQUIRED");
    this.baseUrl = baseUrl;
    this.pageSize = Math.max(1, Math.min(500, options.pageSize ?? 100));
    this.timeoutMs = Math.max(5_000, Math.min(300_000, options.timeoutMs ?? 120_000));
    this.maxPages = Math.max(1, Math.min(2_000, options.maxPages ?? 500));
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep = options.sleep ?? defaultSleep;
  }

  private async requestPage(
    shopId: string,
    apiKey: string,
    pageNumber: number,
  ): Promise<{ data: Record<string, unknown>[]; totalPages: number }> {
    const query = new URLSearchParams({
      api_key: apiKey,
      page_number: String(pageNumber),
      page_size: String(this.pageSize),
      product_status: "not_locked",
      included_composite: "true",
    });
    const url = `${this.baseUrl}/shops/${encodeURIComponent(shopId)}/products/variations?${query.toString()}`;
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: "GET",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
          const error = new PancakePosError(`POS_HTTP_${response.status}`, response.status);
          if (response.status < 429) throw error;
          lastError = error;
          if (attempt < 3) await this.sleep(1_000 * attempt);
          continue;
        }
        const body = (await response.json()) as { data?: unknown; total_pages?: unknown };
        return {
          data: Array.isArray(body?.data) ? (body.data as Record<string, unknown>[]) : [],
          totalPages: Math.max(1, Number(body?.total_pages ?? 1)),
        };
      } catch (error) {
        if (error instanceof PancakePosError && error.statusCode !== null && error.statusCode < 429) throw error;
        lastError = error;
        if (attempt < 3) await this.sleep(1_000 * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new PancakePosError("POS_REQUEST_FAILED", null);
  }

  async fetchAllVariations(shopId: string, apiKey: string): Promise<Record<string, unknown>[]> {
    const all: Record<string, unknown>[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const result = await this.requestPage(shopId, apiKey, page);
      all.push(...result.data);
      totalPages = result.totalPages;
      page += 1;
      if (page > this.maxPages) throw new PancakePosError("POS_PAGINATION_LIMIT", null);
    } while (page <= totalPages);
    return all;
  }
}
