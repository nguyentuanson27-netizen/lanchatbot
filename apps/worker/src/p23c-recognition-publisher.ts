/**
 * Product Image Recognition V2 — dedicated catalog publisher (Phase 3).
 *
 * The existing `P23cPublisher.publishPoint()` is not reused: it writes
 * `image_raw` + `image_cutout` + `product_text` into the legacy 1408D multimodal
 * collection and owns the legacy Sheets publication state. This publisher writes
 * exactly one thing:
 *
 *   shared preprocess -> RemBG -> Gemini Embedding 2 / 3072D -> `image_cutout`
 *
 * What IS reused is everything that already works upstream: `buildApprovedQdrantJobs`
 * (APPROVED + ACTIVE eligibility, the Human Gate, deterministic one-image/one-point
 * identity, latest-row duplicate resolution) and the shard/lock/progress pattern.
 *
 * The V2 collection is authoritative for V2 publication state. Freshness compares
 * only `source_hash` and `embedding_pipeline_version`; the legacy Sheets
 * `PUBLISHED_HASH` / `PUBLISHED_AT` columns are neither read as authority nor
 * written, and no database dirty flag is introduced.
 */
import type {
  ImageRecognitionPointState,
  ImageRecognitionPublisherPort,
} from "@lana/business-tools";
import type { QdrantJob } from "./p23c-jobs.js";
import { pointBelongsToShard } from "./p23c-jobs.js";
import type { RecognitionImageEmbeddingPort } from "./gemini-embedding-2-client.js";
import type { RecognitionImagePreparationPort } from "./media-recognition-v2-image-pipeline.js";
import {
  recognitionLockKey,
  recognitionProgressKey,
  type MediaRecognitionV2Config,
} from "./media-recognition-v2-config.js";

export type RecognitionPublishAction = "FULL_EMBED" | "NOOP" | "DELETE" | "HOLD";

export type RecognitionPublishReason =
  | "TARGET_MISSING"
  | "SOURCE_HASH_CHANGED"
  | "PIPELINE_VERSION_CHANGED"
  | "TARGET_CURRENT"
  | "DELETE_REQUESTED"
  | "SIZE_GUIDE_NOT_RECOGNIZABLE"
  | "APPROVAL_PENDING";

export type RecognitionPointStatus =
  | "SUCCESS"
  | "DELETED"
  | "SKIPPED"
  | "HELD"
  | "FAILED";

export interface RecognitionPointResult {
  readonly status: RecognitionPointStatus;
  readonly pointId: string;
  readonly productId: string;
  readonly imageUrl: string;
  readonly action: RecognitionPublishAction;
  readonly reason: RecognitionPublishReason;
  readonly sourceHash: string;
  readonly error: string;
}

export interface RecognitionRunSummary {
  readonly status: "OK" | "RUN_LOCKED" | "NO_PENDING_WORK" | "FATAL";
  readonly run_id: string;
  readonly collection: string;
  readonly embedding_pipeline_version: string;
  readonly started_at: string;
  readonly finished_at: string;
  readonly total: number;
  readonly success: number;
  readonly deleted: number;
  readonly skipped: number;
  readonly held: number;
  readonly failed: number;
  readonly pending_before: number;
  readonly selected: number;
  readonly remaining: number;
  readonly lock_released: boolean;
  readonly error_sample: string;
  readonly fatal_error: string | null;
}

/** Catalog rows already resolved through the existing P2.3B/Human Gate path. */
export interface RecognitionCatalogSourcePort {
  loadJobs(signal: AbortSignal): Promise<readonly QdrantJob[]>;
}

/** Narrow Redis surface: run lock plus a progress record. */
export interface RecognitionRunStatePort {
  acquireLock(key: string, token: string, ttlMs: number): Promise<boolean>;
  releaseLock(key: string, token: string): Promise<boolean>;
  writeProgress(key: string, value: string, ttlSeconds: number): Promise<void>;
}

export interface P23cRecognitionPublisherOptions {
  readonly config: MediaRecognitionV2Config;
  readonly source: RecognitionCatalogSourcePort;
  readonly target: ImageRecognitionPublisherPort;
  readonly images: RecognitionImagePreparationPort;
  readonly embeddings: RecognitionImageEmbeddingPort;
  readonly runState: RecognitionRunStatePort;
  readonly shardCount: number;
  readonly shardIndex: number;
  readonly batchSize: number;
  readonly runId: string;
  readonly dryRun?: boolean;
  /** Per-point budget covering download, preparation, RemBG, embedding, Qdrant. */
  readonly pointTimeoutMs?: number;
  readonly validateCollection?: boolean;
  readonly now?: () => Date;
  readonly logger?: {
    info: (context: Record<string, unknown>, message: string) => void;
    error: (context: Record<string, unknown>, message: string) => void;
  };
}

const noopLogger = {
  info: (): void => undefined,
  error: (): void => undefined,
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Decision contract from spec §9 / plan Task 3.2. */
export function planRecognitionPoint(
  job: QdrantJob,
  target: ImageRecognitionPointState | null,
  embeddingPipelineVersion: string,
): { readonly action: RecognitionPublishAction; readonly reason: RecognitionPublishReason } {
  if (job.publish_action === "DELETE") {
    return { action: "DELETE", reason: "DELETE_REQUESTED" };
  }
  // A SIZE_GUIDE image is never a recognition candidate, so an existing point for
  // one is removed rather than refreshed.
  if (text(job.payload?.image_type).toUpperCase() === "SIZE_GUIDE") {
    return { action: "DELETE", reason: "SIZE_GUIDE_NOT_RECOGNIZABLE" };
  }
  if (job.publish_action === "HOLD") {
    // Pending/rejected/stale approval preserves the last successful point.
    return { action: "HOLD", reason: "APPROVAL_PENDING" };
  }
  if (!target) return { action: "FULL_EMBED", reason: "TARGET_MISSING" };
  if (target.sourceHash !== job.source_hash) {
    return { action: "FULL_EMBED", reason: "SOURCE_HASH_CHANGED" };
  }
  if (target.embeddingPipelineVersion !== embeddingPipelineVersion) {
    return { action: "FULL_EMBED", reason: "PIPELINE_VERSION_CHANGED" };
  }
  return { action: "NOOP", reason: "TARGET_CURRENT" };
}

/** Recognition payload from spec §8; no `image_raw`, text or cutout URL. */
export function recognitionPointPayload(
  job: QdrantJob,
  config: MediaRecognitionV2Config,
  publishedAt: string,
): Record<string, unknown> {
  const payload = job.payload ?? {};
  return {
    product_id: text(payload.product_id) || text(payload.ma_sp),
    ma_sp: text(payload.ma_sp),
    brand: text(payload.brand),
    image_url: job.image_url,
    image_role: text(payload.image_role),
    image_type: text(payload.image_type),
    image_angle: text(payload.image_angle),
    image_detail_type: text(payload.image_detail_type),
    image_parts_visible: Array.isArray(payload.image_parts_visible)
      ? payload.image_parts_visible
      : [],
    image_quality_score: Number(payload.image_quality_score) || 0,
    image_content_sha256: text(payload.image_content_sha256),
    active: true,
    source_hash: job.source_hash,
    embedding_pipeline_version: config.embeddingPipelineVersion,
    published_at: publishedAt,
  };
}

export class P23cRecognitionPublisher {
  private readonly logger: NonNullable<P23cRecognitionPublisherOptions["logger"]>;

  constructor(private readonly options: P23cRecognitionPublisherOptions) {
    if (options.shardCount < 1) throw new Error("INGEST_SHARD_COUNT_INVALID");
    if (options.shardIndex < 0 || options.shardIndex >= options.shardCount) {
      throw new Error("INGEST_SHARD_INDEX_INVALID");
    }
    this.logger = options.logger ?? noopLogger;
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private pointBudget(): AbortController {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.max(1_000, this.options.pointTimeoutMs ?? 120_000),
    );
    controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
    return controller;
  }

  private async publishPoint(
    job: QdrantJob,
    action: RecognitionPublishAction,
    reason: RecognitionPublishReason,
  ): Promise<RecognitionPointResult> {
    const base = {
      pointId: job.point_id,
      productId: text(job.payload?.ma_sp) || text(job.payload?.product_id),
      imageUrl: job.image_url,
      action,
      reason,
      sourceHash: job.source_hash,
    };
    const controller = this.pointBudget();
    try {
      if (action === "HOLD") {
        return { ...base, status: "HELD", error: "" };
      }
      if (action === "NOOP") {
        return { ...base, status: "SKIPPED", error: "" };
      }
      if (this.options.dryRun === true) {
        return { ...base, status: "SKIPPED", error: "" };
      }
      if (action === "DELETE") {
        await this.options.target.deletePoint(job.point_id, controller.signal);
        return { ...base, status: "DELETED", error: "" };
      }
      // Build and validate the complete point before touching the target.
      const canonical = await this.options.images.prepareFromUrl(
        job.image_url,
        controller.signal,
      );
      const cutout = await this.options.images.createCutoutPng(canonical, controller.signal);
      const vector = await this.options.embeddings.embedCutout(cutout, controller.signal);
      const payload = recognitionPointPayload(
        job,
        this.options.config,
        this.now().toISOString(),
      );
      await this.options.target.upsertPoint(
        { id: job.point_id, vector, payload },
        controller.signal,
      );
      return { ...base, status: "SUCCESS", error: "" };
    } catch (error) {
      // A failed preparation/embedding/upsert never deletes or downgrades the
      // previous successful point, and an unacknowledged upsert is never counted
      // as success: the next run re-reads authoritative target state.
      const message = String(error instanceof Error ? error.message : error).slice(0, 500);
      return { ...base, status: "FAILED", error: message };
    } finally {
      controller.abort();
    }
  }

  async run(): Promise<RecognitionRunSummary> {
    const startedAt = this.now().toISOString();
    const config = this.options.config;
    const lockKey = recognitionLockKey(config, this.options.shardIndex, this.options.shardCount);
    const lockToken = `${this.options.runId}:${this.now().getTime()}`;
    const empty = {
      run_id: this.options.runId,
      collection: config.recognitionCollection,
      embedding_pipeline_version: config.embeddingPipelineVersion,
      started_at: startedAt,
      finished_at: startedAt,
      total: 0,
      success: 0,
      deleted: 0,
      skipped: 0,
      held: 0,
      failed: 0,
      pending_before: 0,
      selected: 0,
      remaining: 0,
      lock_released: false,
      error_sample: "",
      fatal_error: null,
    };

    if (!(await this.options.runState.acquireLock(lockKey, lockToken, 14_400_000))) {
      return { ...empty, status: "RUN_LOCKED" };
    }

    let lockReleased = false;
    try {
      const controller = this.pointBudget();
      let jobs: readonly QdrantJob[];
      try {
        if (this.options.validateCollection !== false) {
          await this.options.target.validateCollectionContract(controller.signal);
        }
        jobs = await this.options.source.loadJobs(controller.signal);
      } finally {
        controller.abort();
      }

      // `buildApprovedQdrantJobs` already resolved duplicate rows to the latest
      // sheet row, HOLD rows included, so an older APPROVED row cannot win here.
      const shardJobs = jobs.filter(
        (job) => job.point_id &&
          pointBelongsToShard(job.point_id, this.options.shardCount, this.options.shardIndex),
      );

      const planned: {
        job: QdrantJob;
        action: RecognitionPublishAction;
        reason: RecognitionPublishReason;
      }[] = [];
      for (const job of shardJobs) {
        const needsTarget = job.publish_action === "UPSERT" &&
          text(job.payload?.image_type).toUpperCase() !== "SIZE_GUIDE";
        let target: ImageRecognitionPointState | null = null;
        if (needsTarget) {
          const budget = this.pointBudget();
          try {
            target = await this.options.target.getPoint(job.point_id, budget.signal);
          } finally {
            budget.abort();
          }
        }
        planned.push({
          job,
          ...planRecognitionPoint(job, target, config.embeddingPipelineVersion),
        });
      }

      const actionable = planned.filter(
        (plan) => plan.action === "FULL_EMBED" || plan.action === "DELETE",
      );
      const held = planned.filter((plan) => plan.action === "HOLD");
      const noop = planned.filter((plan) => plan.action === "NOOP");
      const batchSize = Math.max(1, Math.min(500, Math.trunc(this.options.batchSize)));
      const selected = actionable.slice(0, batchSize);

      this.logger.info(
        {
          collection: config.recognitionCollection,
          pipelineVersion: config.embeddingPipelineVersion,
          jobs: shardJobs.length,
          pending: actionable.length,
          selected: selected.length,
          held: held.length,
          noop: noop.length,
          dryRun: this.options.dryRun === true,
        },
        "p23c recognition batch planned",
      );

      if (selected.length === 0) {
        const released = await this.options.runState.releaseLock(lockKey, lockToken);
        lockReleased = released;
        return {
          ...empty,
          status: "NO_PENDING_WORK",
          finished_at: this.now().toISOString(),
          held: held.length,
          skipped: noop.length,
          lock_released: released,
        };
      }

      const results: RecognitionPointResult[] = [];
      for (const plan of selected) {
        const result = await this.publishPoint(plan.job, plan.action, plan.reason);
        results.push(result);
        if (result.status === "FAILED") {
          this.logger.error(
            {
              pointId: result.pointId,
              productId: result.productId,
              action: result.action,
              reason: result.reason,
              err: result.error,
            },
            "p23c recognition point failed",
          );
        }
      }

      const count = (status: RecognitionPointStatus): number =>
        results.filter((row) => row.status === status).length;
      const failures = results.filter((row) => row.status === "FAILED");
      const finishedAt = this.now().toISOString();
      const remaining = Math.max(0, actionable.length - selected.length) + failures.length;

      await this.options.runState.writeProgress(
        recognitionProgressKey(config, this.options.shardIndex, this.options.shardCount),
        JSON.stringify({
          run_id: this.options.runId,
          collection: config.recognitionCollection,
          embedding_pipeline_version: config.embeddingPipelineVersion,
          shard_index: this.options.shardIndex,
          shard_count: this.options.shardCount,
          pending_before: actionable.length,
          selected: selected.length,
          remaining,
          success: count("SUCCESS"),
          deleted: count("DELETED"),
          skipped: count("SKIPPED") + noop.length,
          held: held.length,
          failed: failures.length,
          finished_at: finishedAt,
        }),
        604_800,
      );

      const released = await this.options.runState.releaseLock(lockKey, lockToken);
      lockReleased = released;

      return {
        status: "OK",
        run_id: this.options.runId,
        collection: config.recognitionCollection,
        embedding_pipeline_version: config.embeddingPipelineVersion,
        started_at: startedAt,
        finished_at: finishedAt,
        total: results.length,
        success: count("SUCCESS"),
        deleted: count("DELETED"),
        skipped: count("SKIPPED") + noop.length,
        held: held.length,
        failed: failures.length,
        pending_before: actionable.length,
        selected: selected.length,
        remaining,
        lock_released: released,
        error_sample: failures
          .slice(0, 10)
          .map((row) => [row.productId, row.error].filter(Boolean).join(" | "))
          .join(" || ")
          .slice(0, 45_000),
        fatal_error: null,
      };
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 500);
      this.logger.error({ err: message }, "p23c recognition run failed");
      return {
        ...empty,
        status: "FATAL",
        finished_at: this.now().toISOString(),
        fatal_error: message,
        lock_released: lockReleased,
      };
    } finally {
      if (!lockReleased) await this.options.runState.releaseLock(lockKey, lockToken);
    }
  }
}
