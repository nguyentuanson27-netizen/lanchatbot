/**
 * Product Image Recognition V2 — Gemini Embedding 2 client (Phase 1, Task 1.2).
 *
 * Vertex AI, model `gemini-embedding-2`, image-only, exactly 3072 dimensions,
 * location `us` served by `aiplatform.us.rep.googleapis.com`, method
 * `:embedContent`, authenticated with the existing Google Cloud service account.
 *
 * The legacy `multimodalembedding@001:predict` contract (`instances`,
 * `parameters.dimension`, `predictions[].imageEmbedding`) is deliberately NOT
 * reused: this is a different request and response schema, not a model rename.
 *
 * Nothing in this module logs. The OAuth token, the assertion, the auth header and
 * the embedding vector never leave it except as the validated return value.
 */
import {
  createServiceAccountAssertion,
  type VertexServiceAccount,
} from "./vertex.js";
import {
  RECOGNITION_V2_EMBEDDING_DIMENSION,
  RECOGNITION_V2_EMBEDDING_MODEL,
  RECOGNITION_V2_VERTEX_HOST,
  RECOGNITION_V2_VERTEX_LOCATION,
  RECOGNITION_V2_VERTEX_METHOD,
} from "./media-recognition-v2-config.js";

/** The narrow port both the catalog publisher and realtime recognition consume. */
export interface RecognitionImageEmbeddingPort {
  embedCutout(imagePng: Buffer, signal: AbortSignal): Promise<readonly number[]>;
}

export class GeminiEmbedding2Error extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = "GeminiEmbedding2Error";
    this.code = code;
    this.retryable = retryable;
  }
}

export interface GeminiEmbedding2ClientOptions {
  readonly projectId: string;
  readonly serviceAccount: VertexServiceAccount;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * `POST https://aiplatform.us.rep.googleapis.com/v1/projects/<id>/locations/us
 *  /publishers/google/models/gemini-embedding-2:embedContent`
 */
export function geminiEmbedding2Endpoint(projectId: string): string {
  return `https://${RECOGNITION_V2_VERTEX_HOST}/v1/projects/${encodeURIComponent(projectId)}`
    + `/locations/${RECOGNITION_V2_VERTEX_LOCATION}/publishers/google/models/`
    + `${RECOGNITION_V2_EMBEDDING_MODEL}:${RECOGNITION_V2_VERTEX_METHOD}`;
}

/** `content.parts[].inlineData` with the base64 cutout PNG; image input only. */
export function geminiEmbedding2RequestBody(
  imagePng: Buffer,
): Record<string, unknown> {
  return {
    content: {
      parts: [
        {
          inlineData: {
            mimeType: "image/png",
            data: imagePng.toString("base64"),
          },
        },
      ],
    },
  };
}

/**
 * Validate `response.embedding.values`: exactly 3072 entries, every one a real
 * finite number. A 1408D legacy vector, a NaN, an Infinity or a string all fail.
 */
export function parseGeminiEmbedding2Response(body: unknown): readonly number[] {
  const embedding = record(record(body).embedding);
  const values = embedding.values;
  if (!Array.isArray(values)) {
    throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_RESPONSE_INVALID", false);
  }
  if (values.length !== RECOGNITION_V2_EMBEDDING_DIMENSION) {
    throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_DIMENSION_INVALID", false);
  }
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_VALUE_INVALID", false);
    }
  }
  return values as readonly number[];
}

export class GeminiEmbedding2Client implements RecognitionImageEmbeddingPort {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private accessToken: { readonly value: string; readonly expiresAt: number } | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(private readonly options: GeminiEmbedding2ClientOptions) {
    if (!options.projectId.trim()) throw new Error("VERTEX_PROJECT_ID_REQUIRED");
    if (!options.serviceAccount.email.includes("@")) {
      throw new Error("VERTEX_EMAIL_INVALID");
    }
    if (!options.serviceAccount.privateKey.includes("PRIVATE KEY")) {
      throw new Error("VERTEX_PRIVATE_KEY_INVALID");
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = Math.max(250, Math.min(60_000, options.timeoutMs ?? 15_000));
  }

  private async token(signal: AbortSignal): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt - 60_000 > this.now()) {
      return this.accessToken.value;
    }
    if (this.tokenRefreshPromise) return this.tokenRefreshPromise;
    const refresh = this.refreshToken(signal);
    this.tokenRefreshPromise = refresh;
    try {
      return await refresh;
    } finally {
      if (this.tokenRefreshPromise === refresh) this.tokenRefreshPromise = null;
    }
  }

  private async refreshToken(signal: AbortSignal): Promise<string> {
    const assertion = createServiceAccountAssertion(
      this.options.serviceAccount,
      this.now(),
    );
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      const response = await this.fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion,
        }),
        signal: controller.signal,
      });
      const body = record(await response.json().catch(() => null));
      if (!response.ok || typeof body.access_token !== "string") {
        throw new GeminiEmbedding2Error(
          response.status >= 500
            ? "GEMINI_EMBEDDING_AUTH_RETRYABLE"
            : "GEMINI_EMBEDDING_AUTH_FAILED",
          response.status >= 500,
        );
      }
      const expiresIn = typeof body.expires_in === "number" ? body.expires_in : 3_600;
      this.accessToken = {
        value: body.access_token,
        expiresAt: this.now() + expiresIn * 1_000,
      };
      return body.access_token;
    } catch (error) {
      if (error instanceof GeminiEmbedding2Error) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GeminiEmbedding2Error(
          signal.aborted
            ? "GEMINI_EMBEDDING_CANCELLED"
            : "GEMINI_EMBEDDING_AUTH_TIMEOUT",
          true,
        );
      }
      throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_AUTH_FAILED", true);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }

  async embedCutout(
    imagePng: Buffer,
    signal: AbortSignal,
  ): Promise<readonly number[]> {
    if (signal.aborted) {
      throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_CANCELLED", false);
    }
    if (imagePng.byteLength === 0) {
      throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_INPUT_EMPTY", false);
    }
    const accessToken = await this.token(signal);
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      const response = await this.fetchImpl(
        geminiEmbedding2Endpoint(this.options.projectId),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(geminiEmbedding2RequestBody(imagePng)),
          signal: controller.signal,
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) this.accessToken = null;
        throw new GeminiEmbedding2Error(
          response.status === 429
            ? "GEMINI_EMBEDDING_RATE_LIMITED"
            : response.status === 401 || response.status === 403
              ? "GEMINI_EMBEDDING_AUTH_FAILED"
              : response.status >= 500
                ? "GEMINI_EMBEDDING_RETRYABLE"
                : "GEMINI_EMBEDDING_FAILED",
          response.status === 429 || response.status >= 500,
        );
      }
      return parseGeminiEmbedding2Response(body);
    } catch (error) {
      if (error instanceof GeminiEmbedding2Error) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new GeminiEmbedding2Error(
          signal.aborted ? "GEMINI_EMBEDDING_CANCELLED" : "GEMINI_EMBEDDING_TIMEOUT",
          true,
        );
      }
      throw new GeminiEmbedding2Error("GEMINI_EMBEDDING_FAILED", true);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }
}
