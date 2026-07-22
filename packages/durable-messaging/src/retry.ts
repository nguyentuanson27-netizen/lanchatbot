export type DurableErrorCategory =
  | "AUTH"
  | "CONFIG"
  | "INBOX"
  | "CONCURRENCY"
  | "OWNERSHIP"
  | "META_SEND"
  | "PANCAKE"
  | "INFRASTRUCTURE"
  | "UNKNOWN";

export type RetryDisposition =
  | "RETRYABLE"
  | "PERMANENT"
  | "AMBIGUOUS"
  | "SILENT_STOP"
  | "MANUAL_REVIEW";

export interface DurableFailure {
  readonly code: string;
  readonly category: DurableErrorCategory;
  readonly disposition: RetryDisposition;
  readonly retryAfterMs: number | null;
}

export interface ProviderFailureInput {
  readonly provider: "META" | "PANCAKE";
  readonly code: string;
  readonly httpStatus: number | null;
  readonly requestMayHaveBeenTransmitted: boolean;
  readonly retryAfterMs?: number | null;
}

export function classifyProviderFailure(input: ProviderFailureInput): DurableFailure {
  const category = input.provider === "META" ? "META_SEND" : "PANCAKE";
  if (
    input.provider === "META" &&
    input.httpStatus === null &&
    input.requestMayHaveBeenTransmitted
  ) {
    return { code: input.code, category, disposition: "AMBIGUOUS", retryAfterMs: null };
  }
  if (input.httpStatus === 401 || input.httpStatus === 403) {
    return { code: input.code, category: "AUTH", disposition: "PERMANENT", retryAfterMs: null };
  }
  if (input.httpStatus === 429 || (input.httpStatus !== null && input.httpStatus >= 500)) {
    return {
      code: input.code,
      category,
      disposition: "RETRYABLE",
      retryAfterMs: input.retryAfterMs ?? 1_000,
    };
  }
  return { code: input.code, category, disposition: "PERMANENT", retryAfterMs: null };
}

export function exponentialBackoffMs(attempt: number, baseMs = 500, maxMs = 60_000): number {
  const boundedAttempt = Math.max(0, Math.min(attempt, 16));
  return Math.min(maxMs, baseMs * 2 ** boundedAttempt);
}
