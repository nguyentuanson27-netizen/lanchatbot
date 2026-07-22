export type PancakeHttpMethod = "GET" | "POST";

export interface PancakeHttpRequest {
  readonly method: PancakeHttpMethod;
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  /** Sensitive query values must be redacted by every production transport/logger. */
  readonly query: Readonly<Record<string, string>>;
  readonly body: string | null;
  readonly timeoutMs: number;
}

export interface PancakeHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface PancakeHttpTransport {
  request(request: PancakeHttpRequest): Promise<PancakeHttpResponse>;
}

export class PancakeTransportFailure extends Error {
  readonly code: string;

  constructor(code: string, _unsafeDetail?: string) {
    // Never retain provider bodies, tokens, conversation IDs or URLs here.
    super(code);
    this.name = "PancakeTransportFailure";
    this.code = code;
  }
}

export type FakePancakeHttpStep =
  | { readonly type: "response"; readonly response: PancakeHttpResponse }
  | { readonly type: "failure"; readonly failure: PancakeTransportFailure };

/** Test/development transport. It never opens a socket. */
export class FakePancakeHttpTransport implements PancakeHttpTransport {
  readonly calls: PancakeHttpRequest[] = [];
  private readonly steps: FakePancakeHttpStep[];

  constructor(steps: readonly FakePancakeHttpStep[]) {
    this.steps = [...steps];
  }

  async request(request: PancakeHttpRequest): Promise<PancakeHttpResponse> {
    this.calls.push(request);
    const step = this.steps.shift();
    if (step === undefined) throw new Error("FAKE_PANCAKE_HTTP_STEP_MISSING");
    if (step.type === "failure") throw step.failure;
    return step.response;
  }
}

/** Production transport restricted to requests already allow-listed by the client. */
export class FetchPancakeHttpTransport implements PancakeHttpTransport {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async request(
    request: PancakeHttpRequest,
  ): Promise<PancakeHttpResponse> {
    const url = new URL(request.url);
    for (const [name, value] of Object.entries(request.query)) {
      url.searchParams.set(name, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method: request.method,
        headers: request.headers,
        ...(request.body === null ? {} : { body: request.body }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      const retryAfter = response.headers.get("retry-after");
      return {
        status: response.status,
        headers: retryAfter ? { "retry-after": retryAfter } : {},
        body,
      };
    } catch (error) {
      throw new PancakeTransportFailure(
        error instanceof Error && error.name === "AbortError"
          ? "PANCAKE_HTTP_TIMEOUT"
          : "PANCAKE_HTTP_NETWORK_ERROR",
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
