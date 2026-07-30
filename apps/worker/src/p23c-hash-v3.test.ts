import { describe, expect, it } from "vitest";
import type { QdrantJob, RunContext } from "./p23c-jobs.js";
import {
  HASH_SCHEMA_VERSION,
  classifyHashV3Job,
  computePointHashes,
  hashV3Payload,
  planHashV3Batch,
  type ExistingPointState,
  type HashV3Config,
} from "./p23c-hash-v3.js";

const CONFIG: HashV3Config = {
  embeddingModel: "multimodalembedding@001",
  embeddingDimension: 1_408,
  imagePreprocessVersion: "ffmpeg-max-width-800-v1",
  cutoutPipelineVersion: "rembg-u2netp-v1",
};

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

const payload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  ma_sp: "SD395",
  brand: "lanadesign",
  title: "Áo dài SD395",
  category: "AO_DAI",
  description: "Chất liệu tơ mềm.",
  material: "TƠ MỀM",
  style_primary: "NỮ TÍNH",
  style_secondary: "",
  image_url: "https://cdn.example/sd395.jpg",
  normalized_image_url: "https://cdn.example/sd395.jpg",
  image_type: "FULL_LOOK",
  image_intents: ["PRODUCT_OVERVIEW"],
  image_angle: "FRONT",
  image_detail_type: "NONE",
  image_parts_visible: ["AO_DAI", "QUAN"],
  image_visual_colors: ["HỒNG"],
  image_visual_materials: ["TƠ"],
  aliases: ["SD395", "ÁO DÀI SD395"],
  size_options: ["S", "M", "L"],
  image_content_sha256: SHA_A,
  metadata_verified: true,
  image_metadata_review_status: "APPROVED",
  image_metadata_version: "image-meta-v1",
  source: "WEBSTORE_XML",
  source_context: "WEBSTORE_XML",
  ...overrides,
});

const job = (body = payload(), overrides: Partial<QdrantJob> = {}): QdrantJob => ({
  run_id: "run",
  started_at: "2026-07-30T00:00:00.000Z",
  point_id: "point-1",
  source_hash: "legacy-current",
  metadata_publish_hash: "legacy-current",
  published_hash: "",
  metadata_sheet_row: 2,
  payload: body,
  contextual_text: "",
  image_url: String(body.image_url ?? ""),
  normalized_image_url: String(body.normalized_image_url ?? ""),
  job_valid: true,
  publish_action: "UPSERT",
  delete_requested: false,
  should_process: true,
  shard_count: 1,
  shard_index: 0,
  shard_label: "1/1",
  ...overrides,
});

const existingV3 = (
  body: Record<string, unknown>,
  overrides: Partial<ExistingPointState> = {},
): ExistingPointState => {
  const hashes = computePointHashes("point-1", body, CONFIG);
  return {
    point_id: "point-1",
    payload: {
      ...body,
      embedding_model: CONFIG.embeddingModel,
      embedding_dimension: CONFIG.embeddingDimension,
      image_preprocess_version: CONFIG.imagePreprocessVersion,
      cutout_pipeline_version: CONFIG.cutoutPipelineVersion,
    },
    content_hash: "legacy-current",
    hash_schema_version: HASH_SCHEMA_VERSION,
    ...hashes,
    ...overrides,
  };
};

describe("P2.3C Hash v3", () => {
  it("sort mảng không có ý nghĩa thứ tự trước khi tính payload_hash", () => {
    const first = payload({ aliases: ["SD395", "ÁO DÀI"], size_options: ["S", "M", "L"] });
    const second = payload({ aliases: ["ÁO DÀI", "SD395"], size_options: ["L", "S", "M"] });
    const firstHashes = computePointHashes("point-1", first, CONFIG);
    const secondHashes = computePointHashes("point-1", second, CONFIG);
    expect(firstHashes.payload_hash).toBe(secondHashes.payload_hash);
    expect(firstHashes.embedding_hash).toBe(secondHashes.embedding_hash);
  });

  it("SHA rỗng sang có SHA cùng URL chỉ cập nhật payload", () => {
    const previous = payload({ image_content_sha256: "" });
    const plan = classifyHashV3Job(job(), {
      point_id: "point-1",
      payload: previous,
      content_hash: "old",
      embedding_hash: "",
      payload_hash: "",
      provenance_hash: "",
      hash_schema_version: "",
    }, CONFIG, true);
    expect(plan.action).toBe("PAYLOAD_ONLY");
    expect(plan.reason).toBe("SHA_BASELINE");
  });

  it("SHA cũ và mới khác nhau thì embedding lại", () => {
    const previous = payload({ image_content_sha256: SHA_B });
    const plan = classifyHashV3Job(job(), existingV3(previous), CONFIG, true);
    expect(plan.action).toBe("FULL_EMBED");
    expect(plan.reason).toBe("IMAGE_CONTENT_CHANGED");
  });

  it("URL đổi nhưng SHA giống nhau thì chỉ cập nhật payload", () => {
    const previous = payload({ image_url: "https://old.example/a.jpg", normalized_image_url: "https://old.example/a.jpg" });
    const current = payload({ image_url: "https://new.example/a.jpg", normalized_image_url: "https://new.example/a.jpg" });
    const plan = classifyHashV3Job(job(current), existingV3(previous), CONFIG, true);
    expect(plan.action).toBe("PAYLOAD_ONLY");
    expect(plan.reason).toBe("URL_CHANGED_SAME_CONTENT");
  });

  it("URL đổi khi không có SHA đáng tin cậy thì embedding lại", () => {
    const previous = payload({
      image_url: "https://old.example/a.jpg",
      normalized_image_url: "https://old.example/a.jpg",
      image_content_sha256: "",
      metadata_verified: false,
    });
    const current = payload({
      image_url: "https://new.example/a.jpg",
      normalized_image_url: "https://new.example/a.jpg",
      image_content_sha256: "",
      metadata_verified: false,
    });
    const plan = classifyHashV3Job(job(current), existingV3(previous), CONFIG, true);
    expect(plan.action).toBe("FULL_EMBED");
    expect(plan.reason).toBe("URL_CHANGED_UNVERIFIED");
  });

  it("size_options đổi chỉ cập nhật payload", () => {
    const previous = payload({ size_options: ["S", "M"] });
    const current = payload({ size_options: ["S", "M", "L"] });
    const plan = classifyHashV3Job(job(current), existingV3(previous), CONFIG, true);
    expect(plan.action).toBe("PAYLOAD_ONLY");
    expect(plan.reason).toBe("PAYLOAD_CHANGED");
  });

  it("title đổi làm contextual text đổi và phải embedding lại", () => {
    const previous = payload({ title: "Áo dài cũ" });
    const current = payload({ title: "Áo dài mới" });
    const plan = classifyHashV3Job(job(current), existingV3(previous), CONFIG, true);
    expect(plan.action).toBe("FULL_EMBED");
    expect(plan.reason).toBe("EMBEDDING_TEXT_CHANGED");
  });

  it("payload legacy giống nhau nhưng content_hash stale chỉ migration payload", () => {
    const current = payload();
    const plan = classifyHashV3Job(job(current), {
      point_id: "point-1",
      payload: current,
      content_hash: "stale",
      embedding_hash: "",
      payload_hash: "",
      provenance_hash: "",
      hash_schema_version: "",
    }, CONFIG, true);
    expect(plan.action).toBe("PAYLOAD_ONLY");
    expect(plan.reason).toBe("LEGACY_CONTENT_HASH_STALE");
  });

  it("payload v3 giữ content_hash v2 để rollback worker cũ", () => {
    const plan = classifyHashV3Job(job(), undefined, CONFIG, true);
    const stored = hashV3Payload(plan, CONFIG, "catalog-v2");
    expect(stored.content_hash).toBe("legacy-current");
    expect(stored.hash_schema_version).toBe(HASH_SCHEMA_VERSION);
    expect(String(stored.embedding_hash)).toHaveLength(64);
    expect(String(stored.payload_hash)).toHaveLength(64);
    expect(String(stored.provenance_hash)).toHaveLength(64);
  });

  it("lập batch riêng cho full embedding và payload-only", () => {
    const run: RunContext = {
      run_id: "run",
      started_at: "",
      shard_count: 1,
      shard_index: 0,
      shard_label: "1/1",
    };
    const legacy = payload({ image_content_sha256: "" });
    const secondJob = job(payload({ ma_sp: "SD443" }), {
      point_id: "point-2",
      metadata_sheet_row: 3,
    });
    const existing = new Map<string, ExistingPointState>([[
      "point-1",
      {
        point_id: "point-1",
        payload: legacy,
        content_hash: "old",
        embedding_hash: "",
        payload_hash: "",
        provenance_hash: "",
        hash_schema_version: "",
      },
    ]]);
    const batch = planHashV3Batch([job(), secondJob], existing, run, CONFIG, 1, 10, true);
    expect(batch.meta.action_counts.PAYLOAD_ONLY).toBe(1);
    expect(batch.meta.action_counts.FULL_EMBED).toBe(1);
    expect(batch.selected).toHaveLength(2);
  });
  it("tái sử dụng point ID khi URL đổi nhưng mã sản phẩm và SHA trùng duy nhất", () => {
    const run: RunContext = {
      run_id: "run",
      started_at: "",
      shard_count: 1,
      shard_index: 0,
      shard_label: "1/1",
    };
    const previous = payload({
      image_url: "https://old.example/sd395.jpg",
      normalized_image_url: "https://old.example/sd395.jpg",
    });
    const current = payload({
      image_url: "https://new.example/sd395.jpg",
      normalized_image_url: "https://new.example/sd395.jpg",
    });
    const state = existingV3(previous, { point_id: "stable-point" });
    const batch = planHashV3Batch([
      job(current, {
        point_id: "url-derived-new-point",
        source_hash: "new-url-legacy-hash",
        metadata_publish_hash: "new-url-legacy-hash",
      }),
    ], new Map([[
      "stable-point",
      {
        ...state,
        point_id: "stable-point",
      },
    ]]), run, CONFIG, 1, 10, true);

    expect(batch.selected).toHaveLength(1);
    expect(batch.selected[0]?.job.point_id).toBe("stable-point");
    expect(batch.selected[0]?.action).toBe("PAYLOAD_ONLY");
    expect(batch.selected[0]?.reason).toBe("URL_CHANGED_SAME_CONTENT");
  });
});
