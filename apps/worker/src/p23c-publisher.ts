/**
 * P2.3C Qdrant Publisher trong app — thay workflow n8n P23QDRANTLANA001.
 *
 * Chỉ dòng `REVIEW_STATUS=APPROVED` + `ACTIVE=TRUE` được upsert; `ACTIVE=FALSE` xóa point;
 * `PENDING`/`STALE`/`REJECTED` bị giữ lại và không đụng tới bản đã publish.
 * Google Sheets vẫn là cổng duyệt của con người và là nơi ghi nhật ký audit.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import type { createClient } from "redis";
import {
  buildApprovedQdrantJobs,
  buildRegistryMap,
  clampContextualText,
  collectImageRegistryRows,
  selectPendingPointBatch,
  type QdrantJob,
  type RunContext,
} from "./p23c-jobs.js";
import {
  buildXmlProfiles,
  groupXmlItems,
  normalizeStructuredExtraction,
} from "./p23c-profiles.js";

export const INGEST_COLLECTION_LOCK_PREFIX = "lock:ingest:lana_multimodal_data_v2:shard:";
export const INGEST_PROGRESS_PREFIX = "ingest:progress:lana_multimodal_data_v2:shard:";

export interface XmlFeedReader {
  fetchFeed(): Promise<string>;
}

export interface XmlDocumentParser {
  parse(xml: string): Record<string, unknown>;
}

export interface SheetsReader {
  batchGetValues(
    spreadsheetId: string,
    ranges: readonly string[],
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE",
  ): Promise<{ range: string; values: unknown[][] }[]>;
  batchUpdateValues(
    spreadsheetId: string,
    data: readonly { range: string; values: readonly (readonly (string | number | boolean)[])[] }[],
  ): Promise<void>;
  appendValues?(
    spreadsheetId: string,
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void>;
}

export interface QdrantClient {
  scrollPayloadHashes(): Promise<Map<string, string>>;
  upsertPoint(point: unknown): Promise<void>;
  deletePoint(pointId: string): Promise<void>;
}

export interface ImagePipeline {
  /** Tải ảnh, kiểm tra kích thước/MIME và resize về tối đa 800px chiều rộng. */
  prepare(imageUrl: string): Promise<{ buffer: Buffer; mime: string }>;
  /** Tách nền qua dịch vụ RemBG. */
  removeBackground(image: Buffer, mime: string): Promise<Buffer>;
}

export interface EmbeddingClient {
  /** Nhúng ảnh gốc kèm văn bản ngữ cảnh (1408 chiều). */
  embedImageAndText(imageBase64: string, text: string): Promise<{ image: number[]; text: number[] }>;
  /** Nhúng ảnh đã tách nền. */
  embedImage(imageBase64: string): Promise<number[]>;
}

export interface RateLimiter {
  acquire(): Promise<void>;
}

export type PointStatus = "SUCCESS" | "DELETED" | "SKIPPED" | "FAILED";

export interface PointResult {
  readonly status: PointStatus;
  readonly point_id: string;
  readonly ma_sp: string;
  readonly image_url: string;
  readonly metadata_sheet_row: number;
  readonly metadata_publish_hash: string;
  readonly error: string;
}

export interface P23cRunSummary {
  readonly status: "OK" | "RUN_LOCKED" | "NO_PENDING_WORK" | "FATAL";
  readonly run_id: string;
  readonly started_at: string;
  readonly finished_at: string;
  readonly total: number;
  readonly success: number;
  readonly skipped: number;
  readonly deleted: number;
  readonly failed: number;
  readonly retryable_failed: number;
  readonly fatal_failed: number;
  readonly pending_before: number;
  readonly selected: number;
  readonly remaining: number;
  readonly held_row_count: number;
  readonly qdrant_existing_point_count: number;
  readonly registry_errors: readonly string[];
  readonly lock_released: boolean;
  readonly error_sample: string;
  readonly fatal_error: string | null;
}

export interface P23cPublisherOptions {
  readonly redis: ReturnType<typeof createClient>;
  readonly sheets: SheetsReader;
  readonly feed: XmlFeedReader;
  readonly xmlParser: XmlDocumentParser;
  readonly qdrant: QdrantClient;
  readonly images: ImagePipeline;
  readonly embeddings: EmbeddingClient;
  readonly vertexRateLimiter: RateLimiter;
  readonly sheetId: string;
  readonly shardCount: number;
  readonly shardIndex: number;
  readonly batchSize: number;
  readonly catalogBuildVersion: string;
  readonly dryRun: boolean;
  readonly sheetsAckEnabled: boolean;
  readonly runId: string;
  readonly now?: () => Date;
  readonly logger?: {
    info: (context: Record<string, unknown>, message: string) => void;
    error: (context: Record<string, unknown>, message: string) => void;
  };
}

// Dùng ranh giới chữ số thay cho \b: mã lỗi của app có dạng `REMBG_HTTP_503`,
// mà `\b` không khớp giữa `_` và chữ số nên 503 sẽ bị xếp nhầm thành lỗi vĩnh viễn.
const RETRYABLE_PATTERN =
  /too many requests|timeout|timed out|econnreset|socket hang up|(?<!\d)(?:429|500|502|503|504)(?!\d)/iu;

const noopLogger = { info: (): void => undefined, error: (): void => undefined };

function sheetRowsFromValues(values: unknown): Record<string, unknown>[] {
  const matrix = Array.isArray(values) ? (values as unknown[][]) : [];
  if (!matrix.length) return [];
  const headers = ((matrix[0] ?? []) as unknown[]).map((cell) => String(cell ?? "").trim());
  return matrix
    .slice(1)
    .map((row, index) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, position) => {
        if (header) record[header] = (row ?? [])[position] ?? "";
      });
      record.row_number = index + 2;
      return record;
    })
    .filter((record) =>
      Object.entries(record).some(([key, value]) => key !== "row_number" && String(value ?? "").trim() !== ""));
}

export class P23cPublisher {
  private readonly options: P23cPublisherOptions;
  private readonly logger: NonNullable<P23cPublisherOptions["logger"]>;

  constructor(options: P23cPublisherOptions) {
    if (!options.sheetId.trim()) throw new Error("DATA_INGESTION_V2_SHEET_ID_REQUIRED");
    this.options = options;
    this.logger = options.logger ?? noopLogger;
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private lockKey(): string {
    return `${INGEST_COLLECTION_LOCK_PREFIX}${this.options.shardIndex}:of:${this.options.shardCount}`;
  }

  private async publishPoint(job: QdrantJob): Promise<PointResult> {
    const base = {
      point_id: job.point_id,
      ma_sp: String(job.payload?.ma_sp ?? ""),
      image_url: job.image_url,
      metadata_sheet_row: Number(job.metadata_sheet_row || 0),
    };

    try {
      if (job.delete_requested) {
        if (!this.options.dryRun) await this.options.qdrant.deletePoint(job.point_id);
        return { ...base, status: "DELETED", metadata_publish_hash: "", error: "" };
      }

      if (this.options.dryRun) {
        return { ...base, status: "SKIPPED", metadata_publish_hash: job.metadata_publish_hash, error: "" };
      }

      const prepared = await this.options.images.prepare(job.image_url);
      const rawBase64 = prepared.buffer.toString("base64");
      const cutout = await this.options.images.removeBackground(prepared.buffer, prepared.mime);
      const cutoutBase64 = cutout.toString("base64");
      const clamped = clampContextualText(job.contextual_text);

      await this.options.vertexRateLimiter.acquire();
      const rawVectors = await this.options.embeddings.embedImageAndText(rawBase64, clamped.text);
      await this.options.vertexRateLimiter.acquire();
      const cutoutVector = await this.options.embeddings.embedImage(cutoutBase64);

      const point = {
        id: job.point_id,
        vector: {
          image_raw: rawVectors.image,
          image_cutout: cutoutVector,
          product_text: rawVectors.text,
        },
        payload: {
          ...job.payload,
          catalog_version: this.options.catalogBuildVersion,
          content_hash: job.source_hash,
          embedding_model: "multimodalembedding@001",
          embedding_dimension: 1_408,
        },
      };
      await this.options.qdrant.upsertPoint(point);
      return { ...base, status: "SUCCESS", metadata_publish_hash: job.metadata_publish_hash, error: "" };
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 1_000);
      return { ...base, status: "FAILED", metadata_publish_hash: "", error: message };
    }
  }

  private async acknowledgeSheets(results: readonly PointResult[]): Promise<void> {
    if (!this.options.sheetsAckEnabled || this.options.dryRun) return;
    const applied = results.filter(
      (row) => ["SUCCESS", "DELETED"].includes(row.status) && Number(row.metadata_sheet_row) >= 2,
    );
    if (!applied.length) return;
    const now = this.now().toISOString();
    const data: { range: string; values: (string | number | boolean)[][] }[] = [];
    for (const row of applied) {
      const number = Number(row.metadata_sheet_row);
      if (row.point_id) {
        data.push({ range: `image_registry!A${number}`, values: [[row.point_id]] });
      }
      data.push({
        range: `image_registry!AN${number}:AO${number}`,
        values: [[row.status === "SUCCESS" ? row.metadata_publish_hash : "", now]],
      });
    }
    await this.options.sheets.batchUpdateValues(this.options.sheetId, data);
  }

  async run(): Promise<P23cRunSummary> {
    const redis = this.options.redis;
    const startedAt = this.now().toISOString();
    const lockKey = this.lockKey();
    const lockToken = `${this.options.runId}:${this.now().getTime()}`;
    const empty = {
      run_id: this.options.runId,
      started_at: startedAt,
      finished_at: startedAt,
      total: 0, success: 0, skipped: 0, deleted: 0, failed: 0,
      retryable_failed: 0, fatal_failed: 0,
      pending_before: 0, selected: 0, remaining: 0, held_row_count: 0,
      qdrant_existing_point_count: 0,
      registry_errors: [] as string[],
      lock_released: false,
      error_sample: "",
      fatal_error: null,
    };

    const acquired = await redis.set(lockKey, lockToken, { NX: true, PX: 14_400_000 });
    if (acquired !== "OK") return { ...empty, status: "RUN_LOCKED" };

    let lockReleased = false;
    try {
      const [xml, ranges] = await Promise.all([
        this.options.feed.fetchFeed(),
        this.options.sheets.batchGetValues(
          this.options.sheetId,
          ["product_registry!A:AZ", "image_registry!A:AP"],
          "UNFORMATTED_VALUE",
        ),
      ]);

      const registryResult = buildRegistryMap(sheetRowsFromValues(ranges[0]?.values));
      const parsed = this.options.xmlParser.parse(xml);
      const channel = ((parsed.rss as Record<string, unknown>)?.channel ?? parsed.channel ?? {}) as Record<string, unknown>;
      const rawItems = channel.item;
      const channelItems = rawItems === null || rawItems === undefined
        ? []
        : (Array.isArray(rawItems) ? rawItems : [rawItems]) as Record<string, unknown>[];

      const profiles = normalizeStructuredExtraction(
        buildXmlProfiles(registryResult.registry, groupXmlItems(channelItems), this.now().toISOString()),
      );
      const imageRows = collectImageRegistryRows(sheetRowsFromValues(ranges[1]?.values));

      const run: RunContext = {
        run_id: this.options.runId,
        started_at: startedAt,
        shard_count: this.options.shardCount,
        shard_index: this.options.shardIndex,
        shard_label: `${this.options.shardIndex + 1}/${this.options.shardCount}`,
      };
      const jobs = buildApprovedQdrantJobs(profiles, imageRows, run);
      const existing = await this.options.qdrant.scrollPayloadHashes();
      const batch = selectPendingPointBatch(jobs, existing, run, this.options.batchSize);

      this.logger.info(
        {
          profiles: profiles.length,
          jobs: jobs.length,
          pending: batch.meta.pending_point_count,
          selected: batch.meta.batch_selected_point_count,
          held: batch.meta.held_row_count,
          existing: batch.meta.qdrant_existing_point_count,
          dryRun: this.options.dryRun,
        },
        "p23c batch planned",
      );

      if (!batch.selected.length) {
        const released = await this.releaseLock(lockKey, lockToken);
        lockReleased = released;
        return {
          ...empty,
          status: "NO_PENDING_WORK",
          finished_at: this.now().toISOString(),
          held_row_count: batch.meta.held_row_count,
          qdrant_existing_point_count: batch.meta.qdrant_existing_point_count,
          registry_errors: registryResult.registry_errors,
          lock_released: released,
        };
      }

      const results: PointResult[] = [];
      for (const job of batch.selected) {
        const result = await this.publishPoint(job);
        results.push(result);
        if (result.status === "FAILED") {
          this.logger.error(
            { pointId: result.point_id, maSp: result.ma_sp, err: result.error },
            "p23c point failed",
          );
        }
      }

      await this.acknowledgeSheets(results);

      const count = (status: PointStatus): number => results.filter((row) => row.status === status).length;
      const failures = results.filter((row) => row.status === "FAILED");
      const retryable = failures.filter((row) => RETRYABLE_PATTERN.test(String(row.error || ""))).length;
      const finishedAt = this.now().toISOString();

      const progress = {
        run_id: this.options.runId,
        shard_index: this.options.shardIndex,
        shard_count: this.options.shardCount,
        pending_before: batch.meta.pending_point_count,
        selected: batch.meta.batch_selected_point_count,
        remaining: batch.meta.remaining_point_count + failures.length,
        success: count("SUCCESS"),
        deleted: count("DELETED"),
        skipped: count("SKIPPED"),
        failed: failures.length,
        retryable_failed: retryable,
        fatal_failed: failures.length - retryable,
        held_row_count: batch.meta.held_row_count,
        finished_at: finishedAt,
      };
      await redis.set(
        `${INGEST_PROGRESS_PREFIX}${this.options.shardIndex}:of:${this.options.shardCount}`,
        JSON.stringify(progress),
        { EX: 604_800 },
      );

      const released = await this.releaseLock(lockKey, lockToken);
      lockReleased = released;

      const registrySummary = registryResult.registry_errors.length
        ? [`REGISTRY_ERRORS=${registryResult.registry_errors.length}`, ...registryResult.registry_errors.slice(0, 10)]
        : [];
      const errorSample = [
        "APPROVED_QDRANT",
        `PENDING=${progress.pending_before}`,
        `SELECTED=${progress.selected}`,
        `REMAINING=${progress.remaining}`,
        `HELD=${progress.held_row_count}`,
        `RETRYABLE=${progress.retryable_failed}`,
        `FATAL=${progress.fatal_failed}`,
        ...registrySummary,
        ...failures.slice(0, 10).map((row) => [row.ma_sp, row.image_url, row.error].filter(Boolean).join(" | ")),
      ].join(" | ").slice(0, 45_000);

      return {
        status: "OK",
        run_id: this.options.runId,
        started_at: startedAt,
        finished_at: finishedAt,
        total: results.length,
        success: progress.success,
        skipped: progress.skipped,
        deleted: progress.deleted,
        failed: progress.failed,
        retryable_failed: progress.retryable_failed,
        fatal_failed: progress.fatal_failed,
        pending_before: progress.pending_before,
        selected: progress.selected,
        remaining: progress.remaining,
        held_row_count: progress.held_row_count,
        qdrant_existing_point_count: batch.meta.qdrant_existing_point_count,
        registry_errors: registryResult.registry_errors,
        lock_released: released,
        error_sample: errorSample,
        fatal_error: null,
      };
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 1_000);
      this.logger.error({ err: message }, "p23c run failed");
      return {
        ...empty,
        status: "FATAL",
        finished_at: this.now().toISOString(),
        fatal_error: message,
        lock_released: lockReleased,
      };
    } finally {
      if (!lockReleased) await this.releaseLock(lockKey, lockToken);
    }
  }

  private async releaseLock(lockKey: string, lockToken: string): Promise<boolean> {
    try {
      const result = await this.options.redis.eval(
        "if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end",
        { keys: [lockKey], arguments: [lockToken] },
      );
      return Number(result) === 1;
    } catch {
      return false;
    }
  }
}

// --- Redis rate limiter dùng chung khe gọi Vertex (port "Acquire Vertex Rate Slot") ---

export class RedisVertexRateLimiter implements RateLimiter {
  private readonly redis: ReturnType<typeof createClient>;
  private readonly key: string;
  private readonly intervalMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    redis: ReturnType<typeof createClient>,
    key: string,
    intervalMs: number,
    sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    this.redis = redis;
    this.key = key;
    this.intervalMs = Math.min(30_000, Math.max(1_000, intervalMs));
    this.sleep = sleep;
  }

  async acquire(): Promise<void> {
    const waitMs = Number(
      await this.redis.eval(
        "local current=tonumber(redis.call('get',KEYS[1]) or '0'); local now=tonumber(ARGV[1]);"
        + " local gap=tonumber(ARGV[2]); local slot=math.max(current,now);"
        + " redis.call('set',KEYS[1],slot+gap,'PX',math.max(gap*10,60000)); return slot-now",
        { keys: [this.key], arguments: [String(Date.now()), String(this.intervalMs)] },
      ),
    );
    if (waitMs > 0) await this.sleep(waitMs);
  }
}

// --- Qdrant HTTP client ---

export class HttpQdrantClient implements QdrantClient {
  private readonly baseUrl: string;
  private readonly collection: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: {
    baseUrl: string;
    collection: string;
    apiKey: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }) {
    if (!options.apiKey.trim()) throw new Error("QDRANT_API_KEY_REQUIRED");
    this.baseUrl = options.baseUrl.replace(/\/+$/u, "");
    this.collection = options.collection;
    this.apiKey = options.apiKey;
    this.timeoutMs = Math.max(5_000, Math.min(120_000, options.timeoutMs ?? 60_000));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(path: string, method: string, body: unknown): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: { "api-key": this.apiKey, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`QDRANT_HTTP_${response.status}`);
    return response.json();
  }

  async scrollPayloadHashes(): Promise<Map<string, string>> {
    const existing = new Map<string, string>();
    let offset: unknown;
    do {
      const body: Record<string, unknown> = { limit: 1_000, with_payload: true, with_vector: false };
      if (offset !== undefined && offset !== null) body.offset = offset;
      const response = (await this.request(
        `/collections/${encodeURIComponent(this.collection)}/points/scroll`,
        "POST",
        body,
      )) as { result?: { points?: { id: unknown; payload?: Record<string, unknown> }[]; next_page_offset?: unknown } };
      const result = response?.result ?? {};
      if (!Array.isArray(result.points)) throw new Error("QDRANT_APPROVED_SCROLL_RESPONSE_INVALID");
      for (const point of result.points) {
        existing.set(
          String(point.id),
          String(point.payload?.content_hash ?? point.payload?.source_hash ?? ""),
        );
      }
      offset = result.next_page_offset;
    } while (offset !== undefined && offset !== null);
    return existing;
  }

  async upsertPoint(point: unknown): Promise<void> {
    await this.request(
      `/collections/${encodeURIComponent(this.collection)}/points?wait=true`,
      "PUT",
      { points: [point] },
    );
  }

  async deletePoint(pointId: string): Promise<void> {
    await this.request(
      `/collections/${encodeURIComponent(this.collection)}/points/delete?wait=true`,
      "POST",
      { points: [pointId] },
    );
  }
}

// --- Ảnh: tải, kiểm tra, resize bằng ffmpeg, tách nền qua RemBG ---

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

export class FfmpegImagePipeline implements ImagePipeline {
  private readonly maxBytes: number;
  private readonly maxWidth: number;
  private readonly rembgUrl: string;
  private readonly rembgModel: string;
  private readonly rembgAuthHeader: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: {
    maxBytes?: number;
    maxWidth?: number;
    rembgUrl: string;
    rembgModel?: string;
    rembgAuthHeader: string;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }) {
    this.maxBytes = Math.max(1_048_576, options.maxBytes ?? 12_582_912);
    this.maxWidth = Math.max(64, Math.min(4_096, options.maxWidth ?? 800));
    this.rembgUrl = options.rembgUrl;
    this.rembgModel = options.rembgModel ?? "u2netp";
    this.rembgAuthHeader = options.rembgAuthHeader;
    this.timeoutMs = Math.max(10_000, Math.min(300_000, options.timeoutMs ?? 120_000));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async prepare(imageUrl: string): Promise<{ buffer: Buffer; mime: string }> {
    const response = await this.fetchImpl(imageUrl, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`IMAGE_DOWNLOAD_HTTP_${response.status}`);
    const original = Buffer.from(await response.arrayBuffer());
    if (!original.length) throw new Error("download_returned_no_binary_image");
    if (original.length > this.maxBytes) throw new Error("image_exceeds_max_bytes");
    const mime = String(response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    if (mime && !ALLOWED_IMAGE_MIME.includes(mime)) throw new Error(`unsupported_image_mime:${mime}`);
    const outputMime = mime === "image/png" || mime === "image/webp" ? "image/png" : "image/jpeg";
    const resized = await this.resize(original, outputMime);
    return { buffer: resized, mime: outputMime };
  }

  /** Resize chiều rộng tối đa `maxWidth`, chỉ thu nhỏ khi ảnh lớn hơn (onlyIfLarger như n8n). */
  private resize(input: Buffer, outputMime: string): Promise<Buffer> {
    const format = outputMime === "image/png" ? "png" : "mjpeg";
    const args = [
      "-hide_banner", "-loglevel", "error",
      "-i", "pipe:0",
      "-vf", `scale='min(${this.maxWidth},iw)':-2:flags=lanczos`,
      "-frames:v", "1",
      ...(format === "mjpeg" ? ["-q:v", "3"] : []),
      "-f", "image2", "-vcodec", format,
      "pipe:1",
    ];
    return new Promise((resolve, reject) => {
      const child = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
      const chunks: Buffer[] = [];
      const errors: Buffer[] = [];
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("image_resize_timeout"));
      }, 45_000);
      child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const output = Buffer.concat(chunks);
        if (code !== 0 || !output.length) {
          reject(new Error(`image_resize_failed:${Buffer.concat(errors).toString().slice(0, 200)}`));
          return;
        }
        resolve(output);
      });
      child.stdin.on("error", () => undefined);
      child.stdin.end(input);
    });
  }

  async removeBackground(image: Buffer, mime: string): Promise<Buffer> {
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(image)], { type: mime }), "image");
    const url = `${this.rembgUrl}${this.rembgUrl.includes("?") ? "&" : "?"}model=${encodeURIComponent(this.rembgModel)}`;
    const headers: Record<string, string> = {};
    if (this.rembgAuthHeader) headers.authorization = this.rembgAuthHeader;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`REMBG_HTTP_${response.status}`);
    const output = Buffer.from(await response.arrayBuffer());
    if (!output.length) throw new Error("REMBG_EMPTY_RESPONSE");
    return output;
  }
}

// --- Vertex multimodal embedding ---

export class VertexEmbeddingClient implements EmbeddingClient {
  private readonly endpoint: string;
  private readonly token: () => Promise<string>;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: {
    projectId: string;
    location: string;
    model: string;
    token: () => Promise<string>;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
  }) {
    this.endpoint = `https://${options.location}-aiplatform.googleapis.com/v1/projects/`
      + `${options.projectId}/locations/${options.location}/publishers/google/models/`
      + `${options.model}:predict`;
    this.token = options.token;
    this.timeoutMs = Math.max(10_000, Math.min(180_000, options.timeoutMs ?? 60_000));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async predict(instance: Record<string, unknown>): Promise<Record<string, unknown>> {
    const token = await this.token();
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ instances: [instance], parameters: { dimension: 1_408 } }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`VERTEX_HTTP_${response.status}`);
    const body = (await response.json()) as { predictions?: Record<string, unknown>[] };
    return body?.predictions?.[0] ?? {};
  }

  async embedImageAndText(imageBase64: string, text: string): Promise<{ image: number[]; text: number[] }> {
    const prediction = await this.predict({
      image: { bytesBase64Encoded: imageBase64 },
      text,
    });
    const image = prediction.imageEmbedding;
    const textEmbedding = prediction.textEmbedding;
    if (!Array.isArray(image) || image.length !== 1_408) throw new Error("invalid_raw_image_embedding");
    if (!Array.isArray(textEmbedding) || textEmbedding.length !== 1_408) {
      throw new Error("invalid_product_text_embedding");
    }
    return { image: image as number[], text: textEmbedding as number[] };
  }

  async embedImage(imageBase64: string): Promise<number[]> {
    const prediction = await this.predict({ image: { bytesBase64Encoded: imageBase64 } });
    const image = prediction.imageEmbedding;
    if (!Array.isArray(image) || image.length !== 1_408) throw new Error("invalid_cutout_embedding");
    return image as number[];
  }
}

/** Hash ổn định cho khóa progress/log — dùng khi cần rút gọn định danh trong log. */
export function shortDigest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
