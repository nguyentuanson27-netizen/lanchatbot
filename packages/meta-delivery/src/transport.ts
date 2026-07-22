export interface HttpRequest {
  readonly method: "POST";
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: unknown;
}

export interface HttpTransport {
  request(request: HttpRequest): Promise<HttpResponse>;
}

export type TransmissionPhase = "PRE_TRANSMISSION" | "POST_DISPATCH";

/**
 * Transport implementations must report whether the request could have left
 * this process. The message is intentionally never propagated to domain output.
 */
export class HttpTransportFailure extends Error {
  readonly code: string;
  readonly phase: TransmissionPhase;

  constructor(code: string, phase: TransmissionPhase, _unsafeDetail?: string) {
    // Never retain provider bodies, tokens, recipients or URLs in the error.
    super(code);
    this.name = "HttpTransportFailure";
    this.code = code;
    this.phase = phase;
  }
}

export type FakeHttpStep =
  | { readonly type: "response"; readonly response: HttpResponse }
  | { readonly type: "failure"; readonly failure: HttpTransportFailure };

/** Test/development transport. It never opens a socket. */
export class FakeHttpTransport implements HttpTransport {
  readonly calls: HttpRequest[] = [];
  private readonly steps: FakeHttpStep[];

  constructor(steps: readonly FakeHttpStep[]) {
    this.steps = [...steps];
  }

  async request(request: HttpRequest): Promise<HttpResponse> {
    this.calls.push(request);
    const step = this.steps.shift();
    if (step === undefined) throw new Error("FAKE_HTTP_STEP_MISSING");
    if (step.type === "failure") throw step.failure;
    return step.response;
  }
}

/** Production fetch transport. It never logs or retains request secrets. */
export class FetchHttpTransport implements HttpTransport {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async request(request: HttpRequest): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.fetchImpl(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      const headers: Record<string, string> = {};
      for (const name of ["x-fb-trace-id", "retry-after"]) {
        const value = response.headers.get(name);
        if (value) headers[name] = value;
      }
      return { status: response.status, headers, body };
    } catch (error) {
      const code =
        error instanceof Error && error.name === "AbortError"
          ? "META_HTTP_TIMEOUT"
          : "META_HTTP_NETWORK_ERROR";
      // After fetch is invoked, transmission outcome cannot be proven.
      throw new HttpTransportFailure(code, "POST_DISPATCH");
    } finally {
      clearTimeout(timeout);
    }
  }
}
