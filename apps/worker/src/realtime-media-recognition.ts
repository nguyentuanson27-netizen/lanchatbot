import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  type ProductSearchService,
  type ScoredStableProduct,
  type StableProductDocument,
} from "@lana/business-tools";
import { createClient } from "redis";

export type MediaAiMode = "OFF" | "LIVE";

export interface RealtimeMediaCandidate {
  readonly product: StableProductDocument;
  readonly cutoutScore: number | null;
  readonly rawScore: number | null;
}

export interface MediaScoreTelemetry {
  readonly productId: string;
  readonly score: number;
}

export interface RealtimeMediaTelemetry {
  readonly pipelineVersion: string;
  readonly normalizedImageHash: string;
  readonly raw: readonly MediaScoreTelemetry[];
  readonly cutout: readonly MediaScoreTelemetry[];
  readonly rawGap: number | null;
  readonly cutoutGap: number | null;
  readonly channelsAgree: boolean | null;
  readonly cutoutStatus: "OK" | "ERROR";
  readonly cutoutErrorCode: string | null;
  readonly aiReason: string | null;
  readonly aiDecision: string | null;
  readonly aiModel: string | null;
  readonly aiPromptVersion: string | null;
  readonly aiLatencyMs: number | null;
  readonly finalDecision?: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
  readonly finalReasonCode?: string;
  readonly cacheHit: boolean;
  readonly latencyMs: Readonly<{
    normalize: number;
    rawSearch: number;
    cutout: number;
    cutoutSearch: number;
    ai: number;
    total: number;
  }>;
}

export type RealtimeMediaRecognition =
  | {
      readonly status: "MATCHED";
      readonly product: StableProductDocument;
      readonly score: number;
      readonly gap: number | null;
      readonly candidates: readonly RealtimeMediaCandidate[];
      readonly reasonCode: string;
      readonly telemetry: RealtimeMediaTelemetry;
    }
  | {
      readonly status: "AMBIGUOUS" | "NOT_FOUND" | "ERROR";
      readonly candidates: readonly RealtimeMediaCandidate[];
      readonly reasonCode: string;
      readonly telemetry: RealtimeMediaTelemetry;
    };

export interface MediaRerankCandidate {
  readonly productId: string;
  readonly title: string;
  readonly imageBytes: Uint8Array;
  readonly mimeType: "image/png" | "image/jpeg";
}

export interface MediaRerankResult {
  readonly selected: string | "none" | "ambiguous";
  readonly modelVersion: string;
  readonly latencyMs: number;
  readonly tokenUsage: Readonly<Record<string, number>>;
}

export interface RealtimeMediaRerankerPort {
  rerankMediaCandidates(input: {
    readonly modelName: string;
    readonly promptVersion: string;
    readonly customerImageBytes: Uint8Array;
    readonly customerImageMimeType: "image/png" | "image/jpeg";
    readonly candidates: readonly MediaRerankCandidate[];
    readonly timeoutMs: number;
    readonly maxOutputTokens: number;
  }): Promise<MediaRerankResult>;
}

export interface RealtimeMediaCachePort {
  get(normalizedImageHash: string): Promise<RealtimeMediaRecognition | null>;
  set(normalizedImageHash: string, value: RealtimeMediaRecognition): Promise<void>;
  ready(): Promise<boolean>;
}

export interface RealtimeImageProcessorOptions {
  readonly allowedHostSuffixes: readonly string[];
  readonly rembgUrl: string;
  readonly rembgModel?: string;
  readonly rembgAuthHeader?: string;
  readonly maxBytes?: number;
  readonly maxDimension?: number;
  readonly fetchImpl?: typeof fetch;
}

export interface RealtimeImageProcessorPort {
  prepare(imageUrl: string, timeoutMs: number): Promise<Uint8Array>;
  removeBackground(imageBytes: Uint8Array, timeoutMs: number): Promise<Uint8Array>;
}


function safeImageUrl(value: string, allowedHostSuffixes: readonly string[]): URL {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/gu, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("MEDIA_IMAGE_URL_FORBIDDEN");
  }
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "::1" ||
    hostname.includes(":") ||
    /^127\./u.test(hostname) ||
    /^10\./u.test(hostname) ||
    /^192\.168\./u.test(hostname) ||
    /^169\.254\./u.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./u.test(hostname) ||
    hostname === "0.0.0.0"
  ) {
    throw new Error("MEDIA_IMAGE_URL_FORBIDDEN");
  }
  const trusted = allowedHostSuffixes.some((suffix) => {
    const normalized = suffix.trim().toLowerCase().replace(/^\./u, "");
    return normalized.length > 0 &&
      (hostname === normalized || hostname.endsWith(`.${normalized}`));
  });
  if (!trusted) throw new Error("MEDIA_IMAGE_HOST_NOT_ALLOWED");
  return url;
}

function errorCode(error: unknown, fallback: string): string {
  return error instanceof Error && error.message
    ? error.message.slice(0, 128)
    : fallback;
}

async function ffmpegNormalize(
  input: Uint8Array,
  maxDimension: number,
  timeoutMs: number,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-frames:v",
        "1",
        "-vf",
        `scale=min(${maxDimension}\\,iw):-2:force_original_aspect_ratio=decrease`,
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "pipe:1",
      ],
      { shell: false, stdio: ["pipe", "pipe", "pipe"] },
    );
    const output: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("MEDIA_NORMALIZE_TIMEOUT")));
    }, Math.max(250, timeoutMs));
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => {
      finish(() => reject(new Error(
        error.message.includes("ENOENT")
          ? "FFMPEG_NOT_INSTALLED"
          : "MEDIA_NORMALIZE_FAILED",
      )));
    });
    child.once("close", (code) => {
      finish(() => {
        if (code !== 0) {
          const detail = Buffer.concat(stderr).toString("utf8").slice(-160);
          reject(new Error(detail ? `MEDIA_NORMALIZE_FAILED:${detail}` : "MEDIA_NORMALIZE_FAILED"));
          return;
        }
        const bytes = Buffer.concat(output);
        if (bytes.byteLength === 0) {
          reject(new Error("MEDIA_NORMALIZE_EMPTY"));
          return;
        }
        resolve(bytes);
      });
    });
    child.stdin.once("error", () => undefined);
    child.stdin.end(Buffer.from(input));
  });
}

export class RealtimeImageProcessor
  implements RealtimeImageProcessorPort {
  private readonly fetchImpl: typeof fetch;
  private readonly maxBytes: number;
  private readonly maxDimension: number;
  private readonly rembgUrl: URL;
  private readonly rembgModel: string;
  private readonly rembgAuthHeader: string;

  constructor(private readonly options: RealtimeImageProcessorOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxBytes = options.maxBytes ?? 10 * 1024 * 1024;
    this.maxDimension = options.maxDimension ?? 768;
    this.rembgUrl = new URL(options.rembgUrl);
    this.rembgModel = options.rembgModel?.trim() || "u2netp";
    this.rembgAuthHeader = options.rembgAuthHeader?.trim() || "";
    if (!["http:", "https:"].includes(this.rembgUrl.protocol)) {
      throw new Error("REMBG_URL_INVALID");
    }
    if (this.rembgUrl.username || this.rembgUrl.password) {
      throw new Error("REMBG_URL_INVALID");
    }
  }

  async prepare(imageUrl: string, timeoutMs: number): Promise<Uint8Array> {
    const started = Date.now();
    let url = safeImageUrl(imageUrl, this.options.allowedHostSuffixes);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(250, timeoutMs));
    try {
      let response: Response | null = null;
      for (let redirects = 0; redirects <= 3; redirects += 1) {
        response = await this.fetchImpl(url, {
          signal: controller.signal,
          redirect: "manual",
        });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get("location");
        if (!location || redirects === 3) {
          throw new Error("MEDIA_IMAGE_REDIRECT_INVALID");
        }
        url = safeImageUrl(
          new URL(location, url).toString(),
          this.options.allowedHostSuffixes,
        );
      }
      if (!response?.ok) throw new Error("MEDIA_IMAGE_DOWNLOAD_FAILED");
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!/^(image\/jpeg|image\/png|image\/webp)(?:;|$)/u.test(contentType)) {
        throw new Error("MEDIA_IMAGE_CONTENT_TYPE_INVALID");
      }
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (declaredLength > this.maxBytes) throw new Error("MEDIA_IMAGE_TOO_LARGE");
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > this.maxBytes) {
        throw new Error("MEDIA_IMAGE_SIZE_INVALID");
      }
      const remaining = timeoutMs - (Date.now() - started);
      if (remaining < 250) throw new Error("MEDIA_NORMALIZE_TIMEOUT");
      return await ffmpegNormalize(bytes, this.maxDimension, remaining);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("MEDIA_IMAGE_DOWNLOAD_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async removeBackground(imageBytes: Uint8Array, timeoutMs: number): Promise<Uint8Array> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(250, timeoutMs));
    try {
      const form = new FormData();
      form.append("file", new Blob([imageBytes], { type: "image/png" }), "image.png");
      const url = new URL(this.rembgUrl);
      url.searchParams.set("model", this.rembgModel);
      const headers: Record<string, string> = {};
      if (this.rembgAuthHeader) {
        headers.authorization = this.rembgAuthHeader;
      }
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers,
        body: form,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(response.status === 429 ? "REMBG_RATE_LIMITED" : "REMBG_FAILED");
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (contentType && !contentType.startsWith("image/")) {
        throw new Error("REMBG_RESPONSE_INVALID");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0 || bytes.byteLength > this.maxBytes) {
        throw new Error("REMBG_RESPONSE_INVALID");
      }
      return bytes;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("REMBG_TIMEOUT");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

export interface RealtimeMediaRecognitionOptions {
  readonly pipelineVersion: string;
  readonly totalDeadlineMs?: number;
  readonly prepareTimeoutMs?: number;
  readonly rembgTimeoutMs?: number;
  readonly cutoutStrongScore?: number;
  readonly cutoutMinimumScore?: number;
  readonly cutoutMinimumGap?: number;
  readonly rawFallbackScore?: number;
  readonly rawFallbackGap?: number;
  readonly aiMode?: MediaAiMode;
  readonly aiModel?: string;
  readonly aiPromptVersion?: string;
  readonly aiTimeoutMs?: number;
  readonly aiMaxOutputTokens?: number;
  readonly maxCandidates?: number;
  readonly now?: () => number;
  readonly logTelemetry?: (telemetry: RealtimeMediaTelemetry) => void;
}

function topGap(values: readonly ScoredStableProduct[]): number | null {
  const top = values[0];
  if (!top) return null;
  return top.score - (values[1]?.score ?? 0);
}

function scores(values: readonly ScoredStableProduct[]): MediaScoreTelemetry[] {
  return values.slice(0, 3).map((value) => ({
    productId: value.document.productId,
    score: value.score,
  }));
}

function mergeCandidates(
  cutout: readonly ScoredStableProduct[],
  raw: readonly ScoredStableProduct[],
  limit: number,
): RealtimeMediaCandidate[] {
  const merged = new Map<string, RealtimeMediaCandidate>();
  for (const value of cutout) {
    merged.set(value.document.productId, {
      product: value.document,
      cutoutScore: value.score,
      rawScore: null,
    });
  }
  for (const value of raw) {
    const current = merged.get(value.document.productId);
    merged.set(value.document.productId, {
      product: current?.product ?? value.document,
      cutoutScore: current?.cutoutScore ?? null,
      rawScore: value.score,
    });
  }
  const ordered = [...merged.values()].sort((left, right) =>
    (right.cutoutScore ?? -1) - (left.cutoutScore ?? -1) ||
    (right.rawScore ?? -1) - (left.rawScore ?? -1) ||
    left.product.productId.localeCompare(right.product.productId)
  );
  const selected = ordered.slice(0, limit);
  const rawLeaderId = raw[0]?.document.productId;
  if (
    rawLeaderId &&
    !selected.some(({ product }) => product.productId === rawLeaderId)
  ) {
    const rawLeader = merged.get(rawLeaderId);
    if (rawLeader) {
      if (selected.length < limit) selected.push(rawLeader);
      else if (limit > 0) selected[limit - 1] = rawLeader;
    }
  }
  return selected;
}

function representativeImageUrl(product: StableProductDocument): string | null {
  const verified = [...product.images]
    .filter((image) =>
      image.reviewStatus === "APPROVED" &&
      image.metadataVerified === true &&
      image.imageType !== "SIZE_GUIDE"
    )
    .sort((left, right) =>
      Number(right.role === "PRIMARY") - Number(left.role === "PRIMARY") ||
      (right.qualityScore ?? -1) - (left.qualityScore ?? -1) ||
      left.sortOrder - right.sortOrder
    )[0];
  return verified?.url ?? null;
}

function cloneWithCacheHit(
  value: RealtimeMediaRecognition,
): RealtimeMediaRecognition {
  return {
    ...value,
    telemetry: { ...value.telemetry, cacheHit: true },
  };
}

export class RealtimeMediaRecognitionService {
  private readonly now: () => number;

  constructor(
    private readonly search: Pick<ProductSearchService, "searchImageCandidatesBytes">,
    private readonly processor: RealtimeImageProcessorPort,
    private readonly options: RealtimeMediaRecognitionOptions,
    private readonly reranker?: RealtimeMediaRerankerPort,
    private readonly cache?: RealtimeMediaCachePort,
  ) {
    this.now = options.now ?? Date.now;
  }

  private remaining(deadlineAt: number, cap: number): number {
    return Math.max(0, Math.min(cap, deadlineAt - this.now()));
  }

  private emit(value: RealtimeMediaRecognition): RealtimeMediaRecognition {
    try {
      this.options.logTelemetry?.({
        ...value.telemetry,
        finalDecision: value.status,
        finalReasonCode: value.reasonCode,
      });
    } catch {
      // Telemetry is deliberately non-authoritative.
    }
    return value;
  }

  async recognize(imageUrl: string): Promise<RealtimeMediaRecognition> {
    const started = this.now();
    const totalDeadlineMs = this.options.totalDeadlineMs ?? 12_000;
    const deadlineAt = started + totalDeadlineMs;
    const latency = {
      normalize: 0,
      rawSearch: 0,
      cutout: 0,
      cutoutSearch: 0,
      ai: 0,
      total: 0,
    };
    let normalized: Uint8Array;
    try {
      const stage = this.now();
      normalized = await this.processor.prepare(
        imageUrl,
        this.remaining(deadlineAt, this.options.prepareTimeoutMs ?? 4_000),
      );
      latency.normalize = this.now() - stage;
    } catch (error) {
      const code = errorCode(error, "MEDIA_PREPARE_FAILED");
      const telemetry = this.telemetry("", [], [], null, null, null, "ERROR", code, null, null, null, null, null, false, latency, started);
      return this.emit({ status: "ERROR", candidates: [], reasonCode: code, telemetry });
    }

    const normalizedImageHash = createHash("sha256").update(normalized).digest("hex");
    const cached = await this.cache?.get(normalizedImageHash).catch(() => null);
    if (cached) return this.emit(cloneWithCacheHit(cached));

    let raw: readonly ScoredStableProduct[] = [];
    let cutout: readonly ScoredStableProduct[] = [];
    let cutoutStatus: "OK" | "ERROR" = "OK";
    let cutoutErrorCode: string | null = null;
    const rawStarted = this.now();
    const rawPromise = this.search
      .searchImageCandidatesBytes(normalized, "image_raw")
      .then((value) => {
        latency.rawSearch = this.now() - rawStarted;
        return value;
      })
      .catch(() => {
        latency.rawSearch = this.now() - rawStarted;
        return [] as readonly ScoredStableProduct[];
      });
    try {
      const cutoutStarted = this.now();
      const cutoutBytes = await this.processor.removeBackground(
        normalized,
        this.remaining(deadlineAt, this.options.rembgTimeoutMs ?? 3_500),
      );
      latency.cutout = this.now() - cutoutStarted;
      const searchStarted = this.now();
      cutout = await this.search.searchImageCandidatesBytes(
        cutoutBytes,
        "image_cutout",
      );
      latency.cutoutSearch = this.now() - searchStarted;
    } catch (error) {
      cutoutStatus = "ERROR";
      cutoutErrorCode = errorCode(error, "CUTOUT_PIPELINE_FAILED");
    }
    raw = await rawPromise;

    const maxCandidates = Math.max(1, Math.min(3, this.options.maxCandidates ?? 3));
    const candidates = mergeCandidates(cutout, raw, maxCandidates);
    const cutoutGap = topGap(cutout);
    const rawGap = topGap(raw);
    const cutoutTop = cutout[0];
    const rawTop = raw[0];
    const channelsAgree = cutoutTop && rawTop
      ? cutoutTop.document.productId === rawTop.document.productId
      : null;
    const cutoutStrong =
      cutoutTop !== undefined &&
      cutoutTop.score >= (this.options.cutoutStrongScore ?? 0.82) &&
      (cutoutGap ?? 0) >= (this.options.cutoutMinimumGap ?? 0.025);
    const rawStrong =
      rawTop !== undefined &&
      rawTop.score >= (this.options.rawFallbackScore ?? 0.78) &&
      (rawGap ?? 0) >= (this.options.rawFallbackGap ?? 0.04);
    const rawDisagrees =
      cutoutTop !== undefined &&
      rawTop !== undefined &&
      cutoutTop.document.productId !== rawTop.document.productId &&
      rawTop.score >= (this.options.rawFallbackScore ?? 0.78);

    if (cutoutStrong && !rawDisagrees) {
      const result = this.matched(
        cutoutTop,
        candidates,
        "CUTOUT_STRONG",
        normalizedImageHash,
        raw,
        cutout,
        rawGap,
        cutoutGap,
        channelsAgree,
        cutoutStatus,
        cutoutErrorCode,
        null,
        null,
        null,
        null,
        null,
        latency,
        started,
      );
      await this.cache?.set(normalizedImageHash, result).catch(() => undefined);
      return this.emit(result);
    }
    if (cutoutStatus === "ERROR" && rawStrong && rawTop) {
      const result = this.matched(
        rawTop,
        candidates,
        "RAW_FALLBACK_STRONG",
        normalizedImageHash,
        raw,
        cutout,
        rawGap,
        cutoutGap,
        channelsAgree,
        cutoutStatus,
        cutoutErrorCode,
        null,
        null,
        null,
        null,
        null,
        latency,
        started,
      );
      await this.cache?.set(normalizedImageHash, result).catch(() => undefined);
      return this.emit(result);
    }

    const aiReason = rawDisagrees
      ? "RAW_CUTOUT_DISAGREE"
      : cutoutTop && (cutoutGap ?? 0) < (this.options.cutoutMinimumGap ?? 0.025)
        ? "CUTOUT_TOP_GAP_SMALL"
        : cutoutTop &&
            cutoutTop.score >= (this.options.cutoutMinimumScore ?? 0.74)
          ? "CUTOUT_NEAR_THRESHOLD"
          : candidates.length > 0
            ? "CANDIDATES_AMBIGUOUS"
            : null;
    let aiDecision: string | null = null;
    let aiModel: string | null = null;
    let aiPromptVersion: string | null = null;
    let aiLatencyMs: number | null = null;
    if (
      this.options.aiMode === "LIVE" &&
      this.reranker &&
      aiReason &&
      candidates.length >= 2 &&
      cutoutTop &&
      cutoutTop.score >= (this.options.cutoutMinimumScore ?? 0.74)
    ) {
      try {
        const preparedCandidates = (
          await Promise.all(candidates.map(async (candidate) => {
            const url = representativeImageUrl(candidate.product);
            if (!url) return null;
            const bytes = await this.processor.prepare(
              url,
              this.remaining(deadlineAt, 2_500),
            );
            return {
              productId: candidate.product.productId,
              title: candidate.product.title,
              imageBytes: bytes,
              mimeType: "image/png" as const,
            };
          }))
        );
        const rerankCandidates: MediaRerankCandidate[] =
          preparedCandidates.filter(
            (value): value is NonNullable<(typeof preparedCandidates)[number]> => value !== null,
          );
        if (rerankCandidates.length >= 2) {
          const aiStarted = this.now();
          const response = await this.reranker.rerankMediaCandidates({
            modelName: this.options.aiModel ?? "gemini-3.5-flash-lite",
            promptVersion: this.options.aiPromptVersion ?? "media-rerank-v1",
            customerImageBytes: normalized,
            customerImageMimeType: "image/png",
            candidates: rerankCandidates,
            timeoutMs: this.remaining(deadlineAt, this.options.aiTimeoutMs ?? 8_000),
            maxOutputTokens: this.options.aiMaxOutputTokens ?? 250,
          });
          latency.ai = this.now() - aiStarted;
          aiDecision = response.selected;
          aiModel = response.modelVersion;
          aiPromptVersion = this.options.aiPromptVersion ?? "media-rerank-v1";
          aiLatencyMs = response.latencyMs;
          if (
            response.selected === cutoutTop.document.productId &&
            rerankCandidates.some((value) => value.productId === response.selected)
          ) {
            const result = this.matched(
              cutoutTop,
              candidates,
              "GEMINI_CUTOUT_CONSENSUS",
              normalizedImageHash,
              raw,
              cutout,
              rawGap,
              cutoutGap,
              channelsAgree,
              cutoutStatus,
              cutoutErrorCode,
              aiReason,
              aiDecision,
              aiModel,
              aiPromptVersion,
              aiLatencyMs,
              latency,
              started,
            );
            await this.cache?.set(normalizedImageHash, result).catch(() => undefined);
            return this.emit(result);
          }
          if (response.selected === "none") {
            const telemetry = this.telemetry(normalizedImageHash, raw, cutout, rawGap, cutoutGap, channelsAgree, cutoutStatus, cutoutErrorCode, aiReason, aiDecision, aiModel, aiPromptVersion, aiLatencyMs, false, latency, started);
            const result: RealtimeMediaRecognition = {
              status: "NOT_FOUND",
              candidates: [],
              reasonCode: "GEMINI_NONE",
              telemetry,
            };
            await this.cache?.set(normalizedImageHash, result).catch(() => undefined);
            return this.emit(result);
          }
        }
      } catch (error) {
        latency.ai = Math.max(latency.ai, 1);
        aiDecision = errorCode(error, "GEMINI_RERANK_FAILED");
        aiModel = this.options.aiModel ?? "gemini-3.5-flash-lite";
        aiPromptVersion = this.options.aiPromptVersion ?? "media-rerank-v1";
      }
    }

    const hasViableCandidates = (
      (cutoutTop?.score ?? -1) >=
        (this.options.cutoutMinimumScore ?? 0.74) ||
      (rawTop?.score ?? -1) >=
        (this.options.rawFallbackScore ?? 0.78)
    );
    const telemetry = this.telemetry(normalizedImageHash, raw, cutout, rawGap, cutoutGap, channelsAgree, cutoutStatus, cutoutErrorCode, aiReason, aiDecision, aiModel, aiPromptVersion, aiLatencyMs, false, latency, started);
    const result: RealtimeMediaRecognition =
      candidates.length === 0 || !hasViableCandidates
      ? {
          status: "NOT_FOUND",
          candidates: [],
          reasonCode: cutoutStatus === "ERROR"
            ? "NO_CANDIDATES_AFTER_RAW_FALLBACK"
            : "NO_VIABLE_CANDIDATES",
          telemetry,
        }
      : {
          status: "AMBIGUOUS",
          candidates,
          reasonCode: aiDecision?.startsWith("GEMINI_")
            ? aiDecision
            : aiReason ?? "MEDIA_AMBIGUOUS",
          telemetry,
        };
    await this.cache?.set(normalizedImageHash, result).catch(() => undefined);
    return this.emit(result);
  }

  private matched(
    top: ScoredStableProduct,
    candidates: readonly RealtimeMediaCandidate[],
    reasonCode: string,
    normalizedImageHash: string,
    raw: readonly ScoredStableProduct[],
    cutout: readonly ScoredStableProduct[],
    rawGap: number | null,
    cutoutGap: number | null,
    channelsAgree: boolean | null,
    cutoutStatus: "OK" | "ERROR",
    cutoutErrorCode: string | null,
    aiReason: string | null,
    aiDecision: string | null,
    aiModel: string | null,
    aiPromptVersion: string | null,
    aiLatencyMs: number | null,
    latency: {
      normalize: number;
      rawSearch: number;
      cutout: number;
      cutoutSearch: number;
      ai: number;
      total: number;
    },
    started: number,
  ): Extract<RealtimeMediaRecognition, { status: "MATCHED" }> {
    return {
      status: "MATCHED",
      product: top.document,
      score: top.score,
      gap: top.document.productId === cutout[0]?.document.productId
        ? cutoutGap
        : rawGap,
      candidates,
      reasonCode,
      telemetry: this.telemetry(normalizedImageHash, raw, cutout, rawGap, cutoutGap, channelsAgree, cutoutStatus, cutoutErrorCode, aiReason, aiDecision, aiModel, aiPromptVersion, aiLatencyMs, false, latency, started),
    };
  }

  private telemetry(
    normalizedImageHash: string,
    raw: readonly ScoredStableProduct[],
    cutout: readonly ScoredStableProduct[],
    rawGap: number | null,
    cutoutGap: number | null,
    channelsAgree: boolean | null,
    cutoutStatus: "OK" | "ERROR",
    cutoutErrorCode: string | null,
    aiReason: string | null,
    aiDecision: string | null,
    aiModel: string | null,
    aiPromptVersion: string | null,
    aiLatencyMs: number | null,
    cacheHit: boolean,
    latency: {
      normalize: number;
      rawSearch: number;
      cutout: number;
      cutoutSearch: number;
      ai: number;
      total: number;
    },
    started: number,
  ): RealtimeMediaTelemetry {
    latency.total = this.now() - started;
    return {
      pipelineVersion: this.options.pipelineVersion,
      normalizedImageHash,
      raw: scores(raw),
      cutout: scores(cutout),
      rawGap,
      cutoutGap,
      channelsAgree,
      cutoutStatus,
      cutoutErrorCode,
      aiReason,
      aiDecision,
      aiModel,
      aiPromptVersion,
      aiLatencyMs,
      cacheHit,
      latencyMs: { ...latency },
    };
  }
}

export class RedisRealtimeMediaRecognitionCache
  implements RealtimeMediaCachePort
{
  private readonly client: ReturnType<typeof createClient>;
  private readonly namespaceHash: string;

  constructor(
    redisUrl: string,
    private readonly pipelineVersion: string,
    catalogVersion: string,
    private readonly ttlSeconds = 7 * 24 * 60 * 60,
  ) {
    if (!redisUrl.trim()) throw new Error("REDIS_URL_REQUIRED");
    if (!pipelineVersion.trim()) throw new Error("MEDIA_PIPELINE_VERSION_REQUIRED");
    if (ttlSeconds < 60 || ttlSeconds > 30 * 24 * 60 * 60) {
      throw new Error("MEDIA_RECOGNITION_CACHE_TTL_INVALID");
    }
    this.namespaceHash = createHash("sha256")
      .update(catalogVersion)
      .digest("hex")
      .slice(0, 16);
    this.client = createClient({ url: redisUrl });
    this.client.on("error", () => undefined);
  }

  private async connected(): Promise<void> {
    if (!this.client.isOpen) await this.client.connect();
  }

  private key(normalizedImageHash: string): string {
    if (!/^[a-f0-9]{64}$/u.test(normalizedImageHash)) {
      throw new Error("MEDIA_NORMALIZED_HASH_INVALID");
    }
    return `media-resolution:v2:${this.pipelineVersion}:${this.namespaceHash}:${normalizedImageHash}`;
  }

  async ready(): Promise<boolean> {
    try {
      await this.connected();
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async get(normalizedImageHash: string): Promise<RealtimeMediaRecognition | null> {
    await this.connected();
    const value = await this.client.get(this.key(normalizedImageHash));
    if (!value) return null;
    try {
      const parsed = JSON.parse(value) as RealtimeMediaRecognition;
      return ["MATCHED", "AMBIGUOUS", "NOT_FOUND"].includes(parsed.status)
        ? parsed
        : null;
    } catch {
      return null;
    }
  }

  async set(
    normalizedImageHash: string,
    value: RealtimeMediaRecognition,
  ): Promise<void> {
    if (value.status === "ERROR") return;
    await this.connected();
    await this.client.set(this.key(normalizedImageHash), JSON.stringify(value), {
      EX: this.ttlSeconds,
    });
  }
}
