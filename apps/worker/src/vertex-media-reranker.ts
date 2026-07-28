import {
  createServiceAccountAssertion,
  vertexGenerateEndpoint,
  type VertexServiceAccount,
} from "./vertex.js";
import type {
  MediaRerankResult,
  RealtimeMediaRerankerPort,
} from "./realtime-media-recognition.js";

export interface VertexMediaRerankerOptions {
  readonly projectId: string;
  readonly location: string;
  readonly serviceAccount: VertexServiceAccount;
  readonly fetchImpl?: typeof fetch;
  readonly now?: () => number;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseResponse(body: unknown): {
  readonly selected: unknown;
  readonly modelVersion: string;
  readonly tokenUsage: Readonly<Record<string, number>>;
} {
  const root = record(body);
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  const first = record(candidates[0]);
  const content = record(first.content);
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const text = parts
    .map((part) => record(part).text)
    .find((value): value is string => typeof value === "string");
  if (!text) throw new Error("VERTEX_MEDIA_EMPTY_CANDIDATE");
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      text.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, ""),
    ) as unknown;
  } catch {
    throw new Error("VERTEX_MEDIA_JSON_INVALID");
  }
  const usage = record(root.usageMetadata);
  const tokenUsage: Record<string, number> = {};
  for (const [source, target] of [
    ["promptTokenCount", "prompt"],
    ["candidatesTokenCount", "completion"],
    ["totalTokenCount", "total"],
  ] as const) {
    const value = usage[source];
    if (typeof value === "number" && Number.isFinite(value)) {
      tokenUsage[target] = value;
    }
  }
  return {
    selected: record(parsed).selected,
    modelVersion: typeof root.modelVersion === "string"
      ? root.modelVersion
      : "unknown",
    tokenUsage,
  };
}

export class VertexMediaReranker implements RealtimeMediaRerankerPort {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private accessToken: { readonly value: string; readonly expiresAt: number } | null =
    null;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor(private readonly options: VertexMediaRerankerOptions) {
    if (!options.projectId.trim()) throw new Error("VERTEX_PROJECT_ID_REQUIRED");
    if (!/^(?:global|[a-z0-9-]+)$/u.test(options.location)) {
      throw new Error("VERTEX_MEDIA_LOCATION_INVALID");
    }
    if (!options.serviceAccount.email.includes("@")) {
      throw new Error("VERTEX_EMAIL_INVALID");
    }
    if (!options.serviceAccount.privateKey.includes("PRIVATE KEY")) {
      throw new Error("VERTEX_PRIVATE_KEY_INVALID");
    }
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  private async token(timeoutMs: number): Promise<string> {
    if (
      this.accessToken &&
      this.accessToken.expiresAt - 60_000 > this.now()
    ) {
      return this.accessToken.value;
    }
    if (this.tokenRefreshPromise) return this.tokenRefreshPromise;
    const refresh = this.refreshToken(timeoutMs);
    this.tokenRefreshPromise = refresh;
    try {
      return await refresh;
    } finally {
      if (this.tokenRefreshPromise === refresh) this.tokenRefreshPromise = null;
    }
  }

  private async refreshToken(timeoutMs: number): Promise<string> {
    const assertion = createServiceAccountAssertion(
      this.options.serviceAccount,
      this.now(),
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(250, timeoutMs));
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
        throw new Error(response.status >= 500
          ? "VERTEX_MEDIA_AUTH_RETRYABLE"
          : "VERTEX_MEDIA_AUTH_FAILED");
      }
      const expiresIn = typeof body.expires_in === "number"
        ? body.expires_in
        : 3_600;
      this.accessToken = {
        value: body.access_token,
        expiresAt: this.now() + expiresIn * 1_000,
      };
      return body.access_token;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("VERTEX_MEDIA_AUTH_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async rerankMediaCandidates(input: {
    readonly modelName: string;
    readonly promptVersion: string;
    readonly customerImageBytes: Uint8Array;
    readonly customerImageMimeType: "image/png" | "image/jpeg";
    readonly candidates: readonly {
      readonly productId: string;
      readonly title: string;
      readonly imageBytes: Uint8Array;
      readonly mimeType: "image/png" | "image/jpeg";
    }[];
    readonly timeoutMs: number;
    readonly maxOutputTokens: number;
  }): Promise<MediaRerankResult> {
    if (!/^[A-Za-z0-9._-]+$/u.test(input.modelName)) {
      throw new Error("VERTEX_MEDIA_MODEL_INVALID");
    }
    const candidates = input.candidates.slice(0, 3);
    if (candidates.length < 2) {
      throw new Error("VERTEX_MEDIA_CANDIDATES_REQUIRED");
    }
    const ids = [...new Set(candidates.map(({ productId }) =>
      productId.trim().slice(0, 128)
    ))];
    if (ids.length !== candidates.length) {
      throw new Error("VERTEX_MEDIA_CANDIDATES_INVALID");
    }
    const started = this.now();
    const deadlineAt = started + Math.max(250, input.timeoutMs);
    const accessToken = await this.token(Math.max(250, deadlineAt - this.now()));
    const remaining = deadlineAt - this.now();
    if (remaining < 250) throw new Error("VERTEX_MEDIA_TIMEOUT");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    try {
      const parts: Record<string, unknown>[] = [
        {
          text: [
            `PROMPT_VERSION=${input.promptVersion.slice(0, 64)}`,
            "Ảnh đầu tiên là ảnh khách gửi; các ảnh tiếp theo là ứng viên Qdrant.",
            "Chỉ so sánh trang phục: form, cổ, tay, chất liệu, họa tiết, màu và chi tiết cắt may.",
            "Bỏ qua khuôn mặt, người mẫu, tư thế và bối cảnh.",
            "Không tạo mã mới hoặc chọn mã ngoài danh sách.",
            "Không có mẫu đúng thì chọn none; chưa đủ chắc chắn thì chọn ambiguous.",
          ].join("\n"),
        },
        {
          inlineData: {
            mimeType: input.customerImageMimeType,
            data: Buffer.from(input.customerImageBytes).toString("base64"),
          },
        },
      ];
      candidates.forEach((candidate, index) => {
        parts.push({
          text: JSON.stringify({
            candidate: index + 1,
            productId: candidate.productId,
            title: candidate.title.slice(0, 240),
          }),
        });
        parts.push({
          inlineData: {
            mimeType: candidate.mimeType,
            data: Buffer.from(candidate.imageBytes).toString("base64"),
          },
        });
      });
      const response = await this.fetchImpl(
        vertexGenerateEndpoint(
          this.options.projectId,
          this.options.location,
          input.modelName,
        ),
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: "Bạn là bộ đối chiếu ảnh sản phẩm thời trang. Chỉ output JSON đúng schema.",
              }],
            },
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0,
              maxOutputTokens: Math.max(
                32,
                Math.min(250, Math.trunc(input.maxOutputTokens)),
              ),
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                required: ["selected"],
                properties: {
                  selected: {
                    type: "STRING",
                    enum: [...ids, "none", "ambiguous"],
                  },
                },
              },
            },
          }),
          signal: controller.signal,
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) this.accessToken = null;
        throw new Error(
          response.status === 429
            ? "VERTEX_MEDIA_RATE_LIMITED"
            : response.status >= 500
              ? "VERTEX_MEDIA_RETRYABLE"
              : "VERTEX_MEDIA_FAILED",
        );
      }
      const parsed = parseResponse(body);
      if (
        typeof parsed.selected !== "string" ||
        ![...ids, "none", "ambiguous"].includes(parsed.selected)
      ) {
        throw new Error("VERTEX_MEDIA_SCHEMA_INVALID");
      }
      return {
        selected: parsed.selected,
        modelVersion: parsed.modelVersion,
        latencyMs: Math.max(0, this.now() - started),
        tokenUsage: parsed.tokenUsage,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("VERTEX_MEDIA_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
