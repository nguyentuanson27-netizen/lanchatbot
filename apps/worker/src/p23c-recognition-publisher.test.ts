import { describe, expect, it, vi } from "vitest";
import type {
  ImageRecognitionPoint,
  ImageRecognitionPointState,
  ImageRecognitionPublisherPort,
} from "./image-recognition-qdrant.js";
import {
  P23cRecognitionPublisher,
  planRecognitionPoint,
  recognitionPointPayload,
  type RecognitionRunStatePort,
} from "./p23c-recognition-publisher.js";
import {
  recognitionLockKey,
  recognitionProgressKey,
  resolveMediaRecognitionV2Config,
} from "./media-recognition-v2-config.js";
import type { QdrantJob } from "./p23c-jobs.js";

const config = resolveMediaRecognitionV2Config({
  MEDIA_RECOGNITION_V2_QDRANT_COLLECTION: "lana_recognition_v2",
});

const PIPELINE = config.embeddingPipelineVersion;

function job(overrides: Partial<QdrantJob> = {}): QdrantJob {
  const payload: Record<string, unknown> = {
    product_id: "SD375",
    ma_sp: "SD375",
    brand: "lanadesign",
    image_url: "https://lanadesign.vn/images/sd375-detail-03.jpg",
    image_role: "ADDITIONAL",
    image_type: "DETAIL",
    image_angle: "CLOSEUP",
    image_detail_type: "EMBROIDERY",
    image_parts_visible: ["AO"],
    image_quality_score: 0.9,
    image_content_sha256: "a".repeat(64),
    active: true,
    ...(overrides.payload ?? {}),
  };
  return {
    run_id: "run-1",
    started_at: "2026-09-07T00:00:00.000Z",
    point_id: "point-sd375",
    source_hash: "b".repeat(64),
    metadata_publish_hash: "b".repeat(64),
    published_hash: "legacy-sheet-hash",
    metadata_sheet_row: 12,
    contextual_text: "",
    image_url: "https://lanadesign.vn/images/sd375-detail-03.jpg",
    normalized_image_url: "https://lanadesign.vn/images/sd375-detail-03.jpg",
    job_valid: true,
    publish_action: "UPSERT",
    delete_requested: false,
    should_process: true,
    shard_count: 1,
    shard_index: 0,
    shard_label: "1/1",
    ...overrides,
    payload,
  };
}

function targetState(overrides: Partial<ImageRecognitionPointState> = {}): ImageRecognitionPointState {
  return {
    pointId: "point-sd375",
    sourceHash: "b".repeat(64),
    embeddingPipelineVersion: PIPELINE,
    payload: {},
    ...overrides,
  };
}

interface Harness {
  readonly publisher: P23cRecognitionPublisher;
  readonly upserts: ImageRecognitionPoint[];
  readonly deletes: string[];
  readonly progress: { key: string; value: string }[];
  readonly locks: string[];
  readonly target: ImageRecognitionPublisherPort;
  readonly embed: ReturnType<typeof vi.fn>;
  readonly prepare: ReturnType<typeof vi.fn>;
  readonly cutout: ReturnType<typeof vi.fn>;
}

function harness(input: {
  jobs: readonly QdrantJob[];
  existing?: Map<string, ImageRecognitionPointState>;
  embedError?: string;
  upsertError?: string;
  prepareError?: string;
  lockHeld?: boolean;
  shardCount?: number;
  shardIndex?: number;
}): Harness {
  const upserts: ImageRecognitionPoint[] = [];
  const deletes: string[] = [];
  const progress: { key: string; value: string }[] = [];
  const locks: string[] = [];
  const existing = input.existing ?? new Map<string, ImageRecognitionPointState>();
  const target: ImageRecognitionPublisherPort = {
    getPoint: vi.fn(async (pointId: string) => existing.get(pointId) ?? null),
    upsertPoint: vi.fn(async (point: ImageRecognitionPoint) => {
      if (input.upsertError) throw new Error(input.upsertError);
      upserts.push(point);
      existing.set(point.id, {
        pointId: point.id,
        sourceHash: String(point.payload.source_hash ?? ""),
        embeddingPipelineVersion: String(point.payload.embedding_pipeline_version ?? ""),
        payload: point.payload,
      });
    }),
    deletePoint: vi.fn(async (pointId: string) => {
      deletes.push(pointId);
      existing.delete(pointId);
    }),
    validateCollectionContract: vi.fn(async () => undefined),
  };
  const prepare = vi.fn(async () => {
    if (input.prepareError) throw new Error(input.prepareError);
    return Buffer.from("canonical-png");
  });
  const cutout = vi.fn(async () => Buffer.from("cutout-png"));
  const embed = vi.fn(async () => {
    if (input.embedError) throw new Error(input.embedError);
    return Array.from({ length: 3_072 }, () => 0.1);
  });
  const runState: RecognitionRunStatePort = {
    acquireLock: vi.fn(async (key: string) => {
      locks.push(key);
      return input.lockHeld !== true;
    }),
    releaseLock: vi.fn(async () => true),
    writeProgress: vi.fn(async (key: string, value: string) => {
      progress.push({ key, value });
    }),
  };
  return {
    upserts,
    deletes,
    progress,
    locks,
    target,
    embed,
    prepare,
    cutout,
    publisher: new P23cRecognitionPublisher({
      config,
      source: { loadJobs: async () => input.jobs },
      target,
      images: {
        prepareFromUrl: prepare,
        prepareFromBytes: prepare,
        createCutoutPng: cutout,
      },
      embeddings: { embedCutout: embed },
      runState,
      shardCount: input.shardCount ?? 1,
      shardIndex: input.shardIndex ?? 0,
      batchSize: 50,
      runId: "run-1",
      dryRun: false,
      now: () => new Date("2026-09-07T12:00:00.000Z"),
    }),
  };
}

describe("V2 recognition publication decisions", () => {
  it("FULL_EMBEDs when the target point is missing", () => {
    expect(planRecognitionPoint(job(), null, PIPELINE))
      .toEqual({ action: "FULL_EMBED", reason: "TARGET_MISSING" });
  });

  it("FULL_EMBEDs when the source hash changed", () => {
    expect(planRecognitionPoint(job(), targetState({ sourceHash: "c".repeat(64) }), PIPELINE))
      .toEqual({ action: "FULL_EMBED", reason: "SOURCE_HASH_CHANGED" });
  });

  it("FULL_EMBEDs when the embedding pipeline version changed", () => {
    expect(planRecognitionPoint(
      job(),
      targetState({ embeddingPipelineVersion: "ge2-3072-pre1024-rembg-u2netp-v0" }),
      PIPELINE,
    )).toEqual({ action: "FULL_EMBED", reason: "PIPELINE_VERSION_CHANGED" });
  });

  it("NOOPs when both freshness fields match", () => {
    expect(planRecognitionPoint(job(), targetState(), PIPELINE))
      .toEqual({ action: "NOOP", reason: "TARGET_CURRENT" });
  });

  it("deletes on an explicit delete / ACTIVE=false row", () => {
    expect(planRecognitionPoint(
      job({ publish_action: "DELETE", delete_requested: true }),
      targetState(),
      PIPELINE,
    )).toEqual({ action: "DELETE", reason: "DELETE_REQUESTED" });
  });

  it("deletes a point that became SIZE_GUIDE", () => {
    expect(planRecognitionPoint(
      job({ payload: { image_type: "SIZE_GUIDE" } }),
      targetState(),
      PIPELINE,
    )).toEqual({ action: "DELETE", reason: "SIZE_GUIDE_NOT_RECOGNIZABLE" });
  });

  it("HOLDs an active row whose approval is pending, rejected or stale", () => {
    expect(planRecognitionPoint(job({ publish_action: "HOLD" }), targetState(), PIPELINE))
      .toEqual({ action: "HOLD", reason: "APPROVAL_PENDING" });
  });

  it("re-embeds on a metadata-only source change, as the simple contract allows", () => {
    const metadataChanged = job({ source_hash: "d".repeat(64) });
    expect(planRecognitionPoint(metadataChanged, targetState(), PIPELINE))
      .toEqual({ action: "FULL_EMBED", reason: "SOURCE_HASH_CHANGED" });
  });

  it("never treats the legacy Sheets publish hash as V2 authority", () => {
    const withLegacyMatch = job({ published_hash: "b".repeat(64) });
    expect(planRecognitionPoint(withLegacyMatch, null, PIPELINE).action).toBe("FULL_EMBED");
  });
});

describe("V2 recognition payload", () => {
  it("carries the recognition evidence and freshness fields only", () => {
    const payload = recognitionPointPayload(job(), config, "2026-09-07T12:00:00.000Z");
    expect(payload).toMatchObject({
      product_id: "SD375",
      ma_sp: "SD375",
      brand: "lanadesign",
      image_url: "https://lanadesign.vn/images/sd375-detail-03.jpg",
      image_role: "ADDITIONAL",
      image_type: "DETAIL",
      image_angle: "CLOSEUP",
      image_detail_type: "EMBROIDERY",
      image_content_sha256: "a".repeat(64),
      active: true,
      source_hash: "b".repeat(64),
      embedding_pipeline_version: PIPELINE,
      published_at: "2026-09-07T12:00:00.000Z",
    });
    for (const removed of [
      "image_raw", "product_text", "storage_path_cutout", "cutout_url",
      "published_hash", "metadata_publish_hash", "contextual_text",
    ]) {
      expect(payload).not.toHaveProperty(removed);
    }
  });
});

describe("V2 recognition publisher run", () => {
  it("embeds a missing point and upserts only image_cutout", async () => {
    const test = harness({ jobs: [job()] });
    const summary = await test.publisher.run();
    expect(summary.status).toBe("OK");
    expect(summary.success).toBe(1);
    expect(test.upserts).toHaveLength(1);
    expect(test.upserts[0]?.vector).toHaveLength(3_072);
    expect(test.upserts[0]?.payload.embedding_pipeline_version).toBe(PIPELINE);
    expect(test.prepare).toHaveBeenCalledTimes(1);
    expect(test.cutout).toHaveBeenCalledTimes(1);
    expect(test.embed).toHaveBeenCalledTimes(1);
  });

  it("does no work and no embedding when target state is current", async () => {
    const test = harness({
      jobs: [job()],
      existing: new Map([["point-sd375", targetState()]]),
    });
    const summary = await test.publisher.run();
    expect(summary.status).toBe("NO_PENDING_WORK");
    expect(test.embed).not.toHaveBeenCalled();
    expect(test.upserts).toHaveLength(0);
  });

  it("is idempotent: a second run after success becomes a NOOP", async () => {
    const existing = new Map<string, ImageRecognitionPointState>();
    const first = harness({ jobs: [job()], existing });
    expect((await first.publisher.run()).success).toBe(1);
    const second = harness({ jobs: [job()], existing });
    const summary = await second.publisher.run();
    expect(summary.status).toBe("NO_PENDING_WORK");
    expect(second.embed).not.toHaveBeenCalled();
  });

  it("removes the point for ACTIVE=false and for SIZE_GUIDE", async () => {
    const existing = new Map<string, ImageRecognitionPointState>([
      ["point-sd375", targetState()],
      ["point-guide", targetState({ pointId: "point-guide" })],
    ]);
    const test = harness({
      jobs: [
        job({ publish_action: "DELETE", delete_requested: true }),
        job({ point_id: "point-guide", payload: { image_type: "SIZE_GUIDE" } }),
      ],
      existing,
    });
    const summary = await test.publisher.run();
    expect(summary.deleted).toBe(2);
    expect(test.deletes).toEqual(["point-sd375", "point-guide"]);
    expect(test.embed).not.toHaveBeenCalled();
  });

  it("HOLDs a pending row and preserves its previously published point", async () => {
    const existing = new Map([["point-sd375", targetState()]]);
    const test = harness({
      jobs: [job({ publish_action: "HOLD", job_valid: false, should_process: false })],
      existing,
    });
    const summary = await test.publisher.run();
    expect(summary.held).toBe(1);
    expect(test.deletes).toEqual([]);
    expect(test.upserts).toEqual([]);
    expect(existing.get("point-sd375")).toBeDefined();
  });

  it("keeps the previous point when embedding fails", async () => {
    const existing = new Map([["point-sd375", targetState({ sourceHash: "old" })]]);
    const test = harness({
      jobs: [job()],
      existing,
      embedError: "GEMINI_EMBEDDING_RETRYABLE",
    });
    const summary = await test.publisher.run();
    expect(summary.failed).toBe(1);
    expect(summary.success).toBe(0);
    expect(test.deletes).toEqual([]);
    expect(existing.get("point-sd375")?.sourceHash).toBe("old");
    expect(summary.error_sample).toContain("GEMINI_EMBEDDING_RETRYABLE");
  });

  it("keeps the previous point when preparation fails", async () => {
    const test = harness({ jobs: [job()], prepareError: "REMBG_FAILED" });
    const summary = await test.publisher.run();
    expect(summary.failed).toBe(1);
    expect(test.upserts).toEqual([]);
  });

  it("does not mark success when the upsert acknowledgement fails", async () => {
    const test = harness({ jobs: [job()], upsertError: "QDRANT_HTTP_504" });
    const summary = await test.publisher.run();
    expect(summary.success).toBe(0);
    expect(summary.failed).toBe(1);
  });

  it("re-reads authoritative target state on the retry after a lost acknowledgement", async () => {
    // The remote write may have landed; the next run must decide from the target.
    const existing = new Map([["point-sd375", targetState()]]);
    const retry = harness({ jobs: [job()], existing });
    const summary = await retry.publisher.run();
    expect(retry.target.getPoint).toHaveBeenCalledWith("point-sd375", expect.anything());
    expect(summary.status).toBe("NO_PENDING_WORK");
    expect(retry.upserts).toEqual([]);
  });

  it("honours the latest-row duplicate resolution from the job builder", async () => {
    // buildApprovedQdrantJobs resolves duplicates upstream; the publisher must not
    // reintroduce an older approved row for the same point id.
    const test = harness({ jobs: [job({ metadata_sheet_row: 40, source_hash: "e".repeat(64) })] });
    await test.publisher.run();
    expect(test.upserts[0]?.payload.source_hash).toBe("e".repeat(64));
  });

  it("uses a lock and progress namespace isolated from the legacy publisher", async () => {
    const test = harness({ jobs: [job()] });
    await test.publisher.run();
    expect(test.locks[0]).toBe(recognitionLockKey(config, 0, 1));
    expect(test.locks[0]).not.toContain("lana_multimodal_data_v2");
    expect(test.progress[0]?.key).toBe(recognitionProgressKey(config, 0, 1));
    expect(test.progress[0]?.key).toContain(PIPELINE);
  });

  it("returns RUN_LOCKED without touching the target when the lock is held", async () => {
    const test = harness({ jobs: [job()], lockHeld: true });
    const summary = await test.publisher.run();
    expect(summary.status).toBe("RUN_LOCKED");
    expect(test.target.getPoint).not.toHaveBeenCalled();
  });

  it("fails closed when the collection contract is invalid", async () => {
    const test = harness({ jobs: [job()] });
    (test.target.validateCollectionContract as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("IMAGE_RECOGNITION_COLLECTION_DIMENSION_INVALID"));
    const summary = await test.publisher.run();
    expect(summary.status).toBe("FATAL");
    expect(summary.fatal_error).toContain("IMAGE_RECOGNITION_COLLECTION_DIMENSION_INVALID");
    expect(test.upserts).toEqual([]);
  });
});
