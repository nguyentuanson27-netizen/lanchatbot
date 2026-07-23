import { describe, expect, it } from "vitest";
import type { createClient } from "redis";
import {
  IMAGE_REGISTRY_HEADERS,
  buildImageRegistryMap,
  buildImageRegistryRow,
  buildMetadataJobs,
  buildManualMetadataJobs,
  buildSheetBatchRequest,
  parseImageMetadata,
  selectPendingMetadataBatch,
  type ImageMetadata,
  type MetadataRunContext,
  type MetadataSchemaConfig,
  type SelectedMetadataJob,
} from "./p23b-metadata-staging.js";
import { P23bMetadataStaging, type P23bSheetsClient } from "./p23b-runner.js";
import { buildXmlProfiles, groupXmlItems, normalizeStructuredExtraction } from "./p23c-profiles.js";
import { buildRegistryMap } from "./p23c-jobs.js";

const schema: MetadataSchemaConfig = {
  version: "image-meta-v1.0.0", model: "gemini-3.1-flash-lite", location: "global",
};
const run: MetadataRunContext = {
  run_id: "test", started_at: "2026-07-21T10:00:00.000Z",
  shard_count: 1, shard_index: 0, shard_label: "1/1",
};

const xmlDocument = {
  rss: { channel: { item: [{
    "g:id": "1", "g:item_group_id": "SV695",
    "g:title": "Set áo chân váy Thanh Vân - S",
    "g:description": "Chất liệu: áo thô lụa, chân váy lụa. Thiết kế thanh lịch. Màu trắng kem.",
    "g:link": "https://www.lanadesign.vn/sv695",
    "g:brand": "lanadesign",
    "g:image_link": "https://www.lanadesign.vn/a.jpg",
    additional_image_link: "https://www.lanadesign.vn/b.jpg",
    additional_variant_attribute: { label: "Size", value: "S" },
  }] } },
};

const profilesFor = () => {
  const registry = buildRegistryMap([
    { MA_SP: "SV695", XML_GROUP_ID: "SV695", ACTIVE: "TRUE", BRAND: "lanadesign", row_number: 2 },
  ]);
  const groups = groupXmlItems(xmlDocument.rss.channel.item as unknown as Record<string, unknown>[]);
  return normalizeStructuredExtraction(
    buildXmlProfiles(registry.registry, groups, "2026-07-21T10:00:00.000Z"),
  );
};

const geminiResponse = (overrides: Record<string, unknown> = {}): string => JSON.stringify({
  image_type: "MODEL",
  image_intents: ["LOOKBOOK", "PRODUCT_OVERVIEW"],
  angle: "FRONT",
  detail_type: "FULL_LOOK",
  garment_parts_visible: ["AO", "CHAN_VAY"],
  visual_colors: ["CREAM"],
  visual_materials: ["SILK"],
  background_type: "STUDIO",
  has_model: true,
  has_text_overlay: false,
  quality_score: 0.95,
  confidence: 0.9,
  ...overrides,
});

describe("P2.3B dựng job phân tích", () => {
  it("một job cho mỗi ảnh, point_id trùng với point_id của P2.3C", () => {
    const jobs = buildMetadataJobs(profilesFor(), run, schema);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]?.point_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    expect(new Set(jobs.map((job) => job.point_id)).size).toBe(2);
  });

  it("source_hash chỉ đổi khi ngữ cảnh hoặc phiên bản schema đổi, không đổi theo thời gian", () => {
    const first = buildMetadataJobs(profilesFor(), run, schema);
    const later = buildMetadataJobs(profilesFor(), { ...run, started_at: "2027-01-01T00:00:00.000Z" }, schema);
    expect(later[0]?.source_hash).toBe(first[0]?.source_hash);
    const otherVersion = buildMetadataJobs(profilesFor(), run, { ...schema, version: "image-meta-v2.0.0" });
    expect(otherVersion[0]?.source_hash).not.toBe(first[0]?.source_hash);
  });

  it("ảnh trùng URL sau chuẩn hóa chỉ tạo một job", () => {
    const profiles = profilesFor().map((profile) => ({
      ...profile,
      images: [
        "https://www.lanadesign.vn/a.jpg",
        "https://www.lanadesign.vn/a.jpg?utm_source=x",
      ],
    }));
    expect(buildMetadataJobs(profiles, run, schema)).toHaveLength(1);
  });

  it("ảnh Admin upload dùng hồ sơ cha nhưng giữ nguồn MANUAL_UPLOAD", () => {
    const jobs = buildManualMetadataJobs(profilesFor(), [{
      INTAKE_ID: "intake-1",
      MA_SP: "SV695",
      IMAGE_URL: "https://admin.lanadesign.vn/lana-public/products/sv695-detail.jpg",
      MEDIA_PURPOSE: "DETAIL_FABRIC",
      IMAGE_INTENTS: "MATERIAL_CLOSEUP | DETAIL",
      ACTIVE: true,
      STATUS: "PENDING",
      IMAGE_HASH: "abc",
    }], run, schema);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.payload.source).toBe("MANUAL_UPLOAD");
    expect(jobs[0]?.payload.manual_media_purpose).toBe("DETAIL_FABRIC");
    expect(jobs[0]?.contextual_text).toContain("Manual media purpose: DETAIL_FABRIC");
  });
});

const policy = (overrides: Partial<{ batchSize: number; recheckDays: number; onlyNewImages: boolean }> = {}) => ({
  batchSize: 50, recheckDays: 0, onlyNewImages: false, ...overrides,
});

describe("P2.3B chọn lô cần xử lý", () => {
  const jobs = buildMetadataJobs(profilesFor(), run, schema);

  it("dòng mới luôn được chọn", () => {
    const batch = selectPendingMetadataBatch(jobs, buildImageRegistryMap([]), run, policy());
    expect(batch.meta.pending_metadata_count).toBe(2);
    expect(batch.selected[0]?.metadata_sheet_row).toBe(2);
    expect(batch.selected[1]?.metadata_sheet_row).toBe(3);
  });

  it("dòng có SOURCE_HASH khớp và còn hạn recheck thì bỏ qua", () => {
    const registry = buildImageRegistryMap(jobs.map((job, index) => ({
      IMAGE_ID: job.point_id,
      SOURCE_HASH: job.source_hash,
      AI_UPDATED_AT: "2026-07-20T00:00:00.000Z",
      row_number: index + 2,
    })));
    const batch = selectPendingMetadataBatch(
      jobs, registry, run, policy({ recheckDays: 30 }), Date.parse("2026-07-21T10:00:00.000Z"),
    );
    expect(batch.meta.pending_metadata_count).toBe(0);
  });

  it("quá hạn recheck thì chọn lại dù hash không đổi", () => {
    const registry = buildImageRegistryMap(jobs.map((job, index) => ({
      IMAGE_ID: job.point_id,
      SOURCE_HASH: job.source_hash,
      AI_UPDATED_AT: "2026-01-01T00:00:00.000Z",
      row_number: index + 2,
    })));
    const batch = selectPendingMetadataBatch(
      jobs, registry, run, policy({ recheckDays: 30 }), Date.parse("2026-07-21T10:00:00.000Z"),
    );
    expect(batch.meta.pending_metadata_count).toBe(2);
  });

  it("recheckDays=0 thì không bao giờ quét lại theo thời gian", () => {
    const registry = buildImageRegistryMap(jobs.map((job, index) => ({
      IMAGE_ID: job.point_id,
      SOURCE_HASH: job.source_hash,
      AI_UPDATED_AT: "2020-01-01T00:00:00.000Z",
      row_number: index + 2,
    })));
    const batch = selectPendingMetadataBatch(
      jobs, registry, run, policy({ recheckDays: 0 }), Date.parse("2026-07-21T10:00:00.000Z"),
    );
    expect(batch.meta.pending_metadata_count).toBe(0);
  });

  it("onlyNewImages bỏ qua mọi dòng đã có, kể cả khi SOURCE_HASH đổi", () => {
    const registry = buildImageRegistryMap([
      { IMAGE_ID: jobs[0]?.point_id, SOURCE_HASH: "hash-khac-han", row_number: 2 },
    ]);
    const withFlag = selectPendingMetadataBatch(jobs, registry, run, policy({ onlyNewImages: true }));
    expect(withFlag.meta.pending_metadata_count).toBe(1);
    expect(withFlag.selected[0]?.point_id).toBe(jobs[1]?.point_id);

    const withoutFlag = selectPendingMetadataBatch(jobs, registry, run, policy({ onlyNewImages: false }));
    expect(withoutFlag.meta.pending_metadata_count).toBe(2);
  });

  it("tôn trọng batchSize và giữ dòng cũ đúng vị trí", () => {
    const registry = buildImageRegistryMap([
      { IMAGE_ID: jobs[0]?.point_id, SOURCE_HASH: "cu", row_number: 7 },
    ]);
    const batch = selectPendingMetadataBatch(jobs, registry, run, policy({ batchSize: 1 }));
    expect(batch.selected).toHaveLength(1);
    expect(batch.meta.remaining_metadata_count).toBe(1);
    expect(batch.selected[0]?.metadata_sheet_row).toBe(7);
  });
});

describe("P2.3B ép kết quả Gemini về tập giá trị kiểm soát", () => {
  const at = "2026-07-21T10:00:00.000Z";

  it("giá trị hợp lệ được giữ, confidence cao cho AUTO_OK", () => {
    const meta = parseImageMetadata(geminiResponse(), schema, at);
    expect(meta.image_type).toBe("MODEL");
    expect(meta.image_metadata_review_status).toBe("AUTO_OK");
    expect(meta.source_context).toBe("WEBSTORE_XML");
    expect(meta.feedback_verified).toBe(false);
  });

  it("giá trị ngoài tập cho phép bị thay bằng mặc định an toàn", () => {
    const meta = parseImageMetadata(
      geminiResponse({ image_type: "BIA_DAT", angle: "XYZ", image_intents: ["KHONG_CO"], garment_parts_visible: [] }),
      schema, at,
    );
    expect(meta.image_type).toBe("OTHER");
    expect(meta.image_angle).toBe("UNKNOWN");
    expect(meta.image_intents).toEqual(["PRODUCT_OVERVIEW"]);
    expect(meta.image_parts_visible).toEqual(["UNKNOWN"]);
  });

  it("confidence thấp bị đánh NEED_REVIEW và điểm số bị kẹp trong [0,1]", () => {
    const meta = parseImageMetadata(geminiResponse({ confidence: 0.4, quality_score: 5 }), schema, at);
    expect(meta.image_metadata_review_status).toBe("NEED_REVIEW");
    expect(meta.image_quality_score).toBe(1);
  });

  it("AI không được tự nhận ảnh là feedback khách", () => {
    const meta = parseImageMetadata(
      geminiResponse({ image_type: "LIFESTYLE" }), schema, at,
    );
    expect(meta.feedback_verified).toBe(false);
    expect(meta.source_context).toBe("WEBSTORE_XML");
  });

  it("phản hồi rỗng hoặc không phải JSON thì báo lỗi rõ ràng", () => {
    expect(() => parseImageMetadata("", schema, at)).toThrow("image_metadata_empty_response");
    expect(() => parseImageMetadata("khong phai json", schema, at)).toThrow("image_metadata_invalid_json");
  });

  it("bóc được rào ```json quanh phản hồi", () => {
    const meta = parseImageMetadata("```json\n" + geminiResponse() + "\n```", schema, at);
    expect(meta.image_type).toBe("MODEL");
  });
});

describe("P2.3B dựng dòng image_registry", () => {
  const jobs = buildMetadataJobs(profilesFor(), run, schema);
  const meta = parseImageMetadata(geminiResponse(), schema, "2026-07-21T10:00:00.000Z");
  const jobWith = (existing: Record<string, unknown> | null): SelectedMetadataJob => ({
    ...(jobs[0] as SelectedMetadataJob),
    existing_image_registry: existing,
    metadata_sheet_row: existing ? Number(existing.ROW_NUMBER) : 2,
  });

  it("chỉ ghi 22 cột A:V, phần người duyệt giữ mặc định PENDING", () => {
    const row = buildImageRegistryRow(jobWith(null), meta, Buffer.from("img"));
    expect(row.ai_values).toHaveLength(22);
    expect(row.full_values).toHaveLength(IMAGE_REGISTRY_HEADERS.length);
    const reviewIndex = IMAGE_REGISTRY_HEADERS.indexOf("REVIEW_STATUS");
    expect(row.full_values[reviewIndex]).toBe("PENDING");
    expect(row.full_values[IMAGE_REGISTRY_HEADERS.indexOf("ACTIVE")]).toBe(true);
    expect(row.full_values[IMAGE_REGISTRY_HEADERS.indexOf("VERIFIED")]).toBe(false);
  });

  it("app không bao giờ tự ghi APPROVED", () => {
    const row = buildImageRegistryRow(jobWith(null), meta, Buffer.from("img"));
    expect(row.full_values).not.toContain("APPROVED");
    expect(row.review_status_update).not.toBe("APPROVED");
  });

  it("nguồn đổi nhưng bản nháp AI giống hệt thì GIỮ phê duyệt cũ", () => {
    const existing: Record<string, unknown> = {
      ROW_NUMBER: 5, SOURCE_HASH: "hash-cu",
      AI_IMAGE_TYPE: "MODEL", AI_IMAGE_INTENTS: "LOOKBOOK | PRODUCT_OVERVIEW", AI_ANGLE: "FRONT",
      AI_DETAIL_TYPE: "FULL_LOOK", AI_PARTS_VISIBLE: "AO | CHAN_VAY", AI_VISUAL_COLORS: "CREAM",
      AI_VISUAL_MATERIALS: "SILK", AI_BACKGROUND_TYPE: "STUDIO",
      AI_HAS_MODEL: "TRUE", AI_HAS_TEXT_OVERLAY: "FALSE",
    };
    const row = buildImageRegistryRow(jobWith(existing), meta, Buffer.from("img"));
    expect(row.source_changed).toBe(true);
    expect(row.review_status_update).toBe("");
  });

  it("bản nháp AI đổi thật thì đánh STALE để duyệt lại", () => {
    const existing: Record<string, unknown> = {
      ROW_NUMBER: 5, SOURCE_HASH: "hash-cu",
      AI_IMAGE_TYPE: "FLATLAY", AI_IMAGE_INTENTS: "LOOKBOOK | PRODUCT_OVERVIEW", AI_ANGLE: "FRONT",
      AI_DETAIL_TYPE: "FULL_LOOK", AI_PARTS_VISIBLE: "AO | CHAN_VAY", AI_VISUAL_COLORS: "CREAM",
      AI_VISUAL_MATERIALS: "SILK", AI_BACKGROUND_TYPE: "STUDIO",
      AI_HAS_MODEL: "TRUE", AI_HAS_TEXT_OVERLAY: "FALSE",
    };
    const row = buildImageRegistryRow(jobWith(existing), meta, Buffer.from("img"));
    expect(row.review_status_update).toBe("STALE");
  });

  it("tắt cờ thì quay về hành vi n8n: hash đổi là STALE", () => {
    const existing: Record<string, unknown> = {
      ROW_NUMBER: 5, SOURCE_HASH: "hash-cu",
      AI_IMAGE_TYPE: "MODEL", AI_IMAGE_INTENTS: "LOOKBOOK | PRODUCT_OVERVIEW", AI_ANGLE: "FRONT",
      AI_DETAIL_TYPE: "FULL_LOOK", AI_PARTS_VISIBLE: "AO | CHAN_VAY", AI_VISUAL_COLORS: "CREAM",
      AI_VISUAL_MATERIALS: "SILK", AI_BACKGROUND_TYPE: "STUDIO",
      AI_HAS_MODEL: "TRUE", AI_HAS_TEXT_OVERLAY: "FALSE",
    };
    const row = buildImageRegistryRow(jobWith(existing), meta, Buffer.from("img"), false);
    expect(row.review_status_update).toBe("STALE");
  });
});

describe("P2.3B batch ghi Sheets", () => {
  it("dòng cũ dùng update A:V, dòng mới dùng append", () => {
    const meta = parseImageMetadata(geminiResponse(), schema, "2026-07-21T10:00:00.000Z");
    const jobs = buildMetadataJobs(profilesFor(), run, schema);
    const oldRow = buildImageRegistryRow(
      { ...(jobs[0] as SelectedMetadataJob), existing_image_registry: { ROW_NUMBER: 5, SOURCE_HASH: "x" }, metadata_sheet_row: 5 },
      meta, Buffer.from("a"),
    );
    const newRow = buildImageRegistryRow(
      { ...(jobs[1] as SelectedMetadataJob), existing_image_registry: null, metadata_sheet_row: 9 },
      meta, Buffer.from("b"),
    );
    const request = buildSheetBatchRequest([oldRow, newRow]);
    expect(request.existing_update_count).toBe(1);
    expect(request.new_append_count).toBe(1);
    expect(request.updates.some((entry) => entry.range === "image_registry!A5:V5")).toBe(true);
    expect(request.updates.some((entry) => entry.range === "image_registry!AI5")).toBe(true);
    // Không có range nào chạm vùng duyệt W:AH ngoài ô REVIEW_STATUS (AI).
    expect(request.updates.every((entry) => /!(A\d+:V\d+|AI\d+)$/u.test(entry.range))).toBe(true);
  });
});

// --- Runner ---

class FakeRedis {
  readonly store = new Map<string, string>();
  async set(key: string, value: string, options?: { NX?: boolean }): Promise<string | null> {
    if (options?.NX && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }
  async get(key: string): Promise<string | null> { return this.store.get(key) ?? null; }
  async eval(_s: string, ctx: { keys: string[]; arguments: string[] }): Promise<number> {
    const [key] = ctx.keys; const [token] = ctx.arguments;
    if (key && this.store.get(key) === token) { this.store.delete(key); return 1; }
    return 0;
  }
}

const fakeSheets = (imageRows: unknown[][] = []): P23bSheetsClient & {
  updates: unknown[]; appends: unknown[][]; ensured: string[];
} => {
  const updates: unknown[] = [];
  const appends: unknown[][] = [];
  const ensured: string[] = [];
  return {
    updates, appends, ensured,
    async batchGetValues() {
      return [
        { range: "product_registry", values: [["MA_SP", "XML_GROUP_ID", "ACTIVE", "BRAND"], ["SV695", "SV695", "TRUE", "lanadesign"]] },
        { range: "image_registry", values: imageRows.length ? [[...IMAGE_REGISTRY_HEADERS], ...imageRows] : [] },
      ];
    },
    async batchUpdateValues(_id, data) { updates.push(data); },
    async appendValues(_id, _range, values) { appends.push(values as unknown[]); },
    async ensureSheet(_id, title) { ensured.push(title); return false; },
  };
};

const runnerWith = (overrides: {
  sheets?: ReturnType<typeof fakeSheets>;
  classify?: (image: string, text: string) => Promise<string>;
  write?: boolean;
  concurrency?: number;
  flushEvery?: number;
  redis?: FakeRedis;
  onlyNewImages?: boolean;
  drain?: boolean;
}): { runner: P23bMetadataStaging; redis: FakeRedis; calls: { count: number; peak: number } } => {
  const redis = overrides.redis ?? new FakeRedis();
  const calls = { count: 0, peak: 0 };
  let inFlight = 0;
  const runner = new P23bMetadataStaging({
    redis: redis as unknown as ReturnType<typeof createClient>,
    sheets: overrides.sheets ?? fakeSheets(),
    feed: { fetchFeed: async () => "<rss/>" },
    xmlParser: { parse: () => xmlDocument },
    images: { prepare: async () => ({ buffer: Buffer.from("image-bytes"), mime: "image/jpeg" }) },
    classifier: {
      classify: async (image, text) => {
        inFlight += 1;
        calls.count += 1;
        calls.peak = Math.max(calls.peak, inFlight);
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return overrides.classify ? await overrides.classify(image, text) : geminiResponse();
        } finally {
          inFlight -= 1;
        }
      },
    },
    rateLimiter: { acquire: async () => undefined },
    sheetId: "sheet-1",
    schema,
    shardCount: 1,
    shardIndex: 0,
    batchSize: 50,
    recheckDays: 0,
    onlyNewImages: overrides.onlyNewImages ?? false,
    drainEnabled: overrides.drain ?? false,
    maxRounds: 40,
    maxRunMs: 7_200_000,
    concurrency: overrides.concurrency ?? 2,
    flushEvery: overrides.flushEvery ?? 10,
    writeEnabled: overrides.write ?? false,
    staleOnlyWhenDraftChanges: true,
    runId: "test-run",
    now: () => new Date("2026-07-21T10:00:00.000Z"),
  });
  return { runner, redis, calls };
};

describe("P2.3B runner", () => {
  it("phân tích hết ảnh chờ và báo cáo đúng số lượng", async () => {
    const { runner, calls } = runnerWith({});
    const summary = await runner.run();
    expect(summary.status).toBe("OK");
    expect(summary.staged).toBe(2);
    expect(summary.failed).toBe(0);
    expect(calls.count).toBe(2);
    expect(summary.lock_released).toBe(true);
  });

  it("không vượt quá giới hạn concurrency", async () => {
    const profiles = 12;
    const many = Array.from({ length: profiles }, (_, i) => `https://www.lanadesign.vn/${i}.jpg`);
    const sheets = fakeSheets();
    sheets.batchGetValues = async () => [
      { range: "product_registry", values: [["MA_SP", "XML_GROUP_ID", "ACTIVE"], ["SV695", "SV695", "TRUE"]] },
      { range: "image_registry", values: [] },
    ];
    const doc = { rss: { channel: { item: {
      ...xmlDocument.rss.channel.item[0],
      additional_image_link: many,
    } } } };
    const { runner, calls } = runnerWith({ sheets, concurrency: 3 });
    (runner as unknown as { options: { xmlParser: { parse: () => unknown } } }).options.xmlParser = { parse: () => doc };
    const summary = await runner.run();
    expect(summary.staged).toBeGreaterThan(3);
    expect(calls.peak).toBeLessThanOrEqual(3);
  });

  it("mặc định không ghi Sheets; bật cờ thì update và append", async () => {
    const off = fakeSheets();
    await runnerWith({ sheets: off }).runner.run();
    expect(off.updates).toHaveLength(0);
    expect(off.appends).toHaveLength(0);

    const on = fakeSheets();
    const summary = await runnerWith({ sheets: on, write: true }).runner.run();
    expect(summary.sheet_write).toBe("OK");
    expect(on.appends).toHaveLength(1);
    expect(on.ensured).toContain("image_registry");
  });

  it("flush theo lô tạo checkpoint giữa chừng", async () => {
    const sheets = fakeSheets();
    const { runner } = runnerWith({ sheets, write: true, flushEvery: 1, concurrency: 1 });
    await runner.run();
    // mỗi ảnh một lần append -> hai checkpoint riêng biệt
    expect(sheets.appends).toHaveLength(2);
  });

  it("một ảnh lỗi không làm hỏng cả lô", async () => {
    let first = true;
    const { runner } = runnerWith({
      classify: async () => {
        if (first) { first = false; throw new Error("VERTEX_METADATA_HTTP_503"); }
        return geminiResponse();
      },
    });
    const summary = await runner.run();
    expect(summary.failed).toBe(1);
    expect(summary.staged).toBe(1);
    expect(summary.error_sample).toContain("503");
    expect(summary.lock_released).toBe(true);
  });

  it("lock chặn hai lần chạy chồng nhau", async () => {
    const redis = new FakeRedis();
    await redis.set("lock:metadata-staging:lana_multimodal_data_v2:shard:0:of:1", "khac");
    expect((await runnerWith({ redis }).runner.run()).status).toBe("RUN_LOCKED");
  });

  it("không còn việc thì trả NO_PENDING_WORK và không gọi Gemini", async () => {
    const jobs = buildMetadataJobs(profilesFor(), { ...run, run_id: "test-run" }, schema);
    const rows = jobs.map((job, index) => {
      const row: (string | number | boolean)[] = new Array(IMAGE_REGISTRY_HEADERS.length).fill("");
      row[IMAGE_REGISTRY_HEADERS.indexOf("IMAGE_ID")] = job.point_id;
      row[IMAGE_REGISTRY_HEADERS.indexOf("SOURCE_HASH")] = job.source_hash;
      row[IMAGE_REGISTRY_HEADERS.indexOf("AI_UPDATED_AT")] = "2026-07-20T00:00:00.000Z";
      void index;
      return row;
    });
    const { runner, calls } = runnerWith({ sheets: fakeSheets(rows) });
    const summary = await runner.run();
    expect(summary.status).toBe("NO_PENDING_WORK");
    expect(calls.count).toBe(0);
  });

  it("lỗi hạ tầng trả FATAL và vẫn nhả lock", async () => {
    const broken = fakeSheets();
    broken.batchGetValues = async () => { throw new Error("SHEETS_HTTP_500"); };
    const { runner, redis } = runnerWith({ sheets: broken });
    const summary = await runner.run();
    expect(summary.status).toBe("FATAL");
    expect(redis.store.has("lock:metadata-staging:lana_multimodal_data_v2:shard:0:of:1")).toBe(false);
  });
});

describe("P2.3B chế độ vét", () => {
  it("lặp nhiều vòng cho tới khi hết việc", async () => {
    // Sheet giả có trạng thái: dòng append được ghi nhận nên vòng sau thấy ít việc hơn.
    const stored: (string | number | boolean)[][] = [];
    const sheets: P23bSheetsClient = {
      async batchGetValues() {
        return [
          { range: "product_registry", values: [["MA_SP", "XML_GROUP_ID", "ACTIVE"], ["SV695", "SV695", "TRUE"]] },
          { range: "image_registry", values: stored.length ? [[...IMAGE_REGISTRY_HEADERS], ...stored] : [] },
        ];
      },
      async batchUpdateValues() { /* không dùng trong test này */ },
      async appendValues(_id, _range, values) { stored.push(...values.map((row) => [...row])); },
      async ensureSheet() { return false; },
    };
    const redis = new FakeRedis();
    const runner = new P23bMetadataStaging({
      redis: redis as unknown as ReturnType<typeof createClient>,
      sheets,
      feed: { fetchFeed: async () => "<rss/>" },
      xmlParser: { parse: () => xmlDocument },
      images: { prepare: async () => ({ buffer: Buffer.from("img"), mime: "image/jpeg" }) },
      classifier: { classify: async () => geminiResponse() },
      rateLimiter: { acquire: async () => undefined },
      sheetId: "sheet-1",
      schema,
      shardCount: 1, shardIndex: 0,
      batchSize: 1,
      recheckDays: 0,
      onlyNewImages: false,
      drainEnabled: true,
      maxRounds: 40,
      maxRunMs: 7_200_000,
      concurrency: 1,
      flushEvery: 1,
      writeEnabled: true,
      staleOnlyWhenDraftChanges: true,
      runId: "drain-test",
      now: () => new Date("2026-07-21T10:00:00.000Z"),
    });
    const summary = await runner.run();
    // batchSize 1 nhưng có 2 ảnh -> phải vét đúng 2 vòng rồi dừng vì hết việc
    expect(summary.rounds).toBe(2);
    expect(summary.staged).toBe(2);
    expect(summary.stopped_because).toBe("no_pending_work");
    expect(stored).toHaveLength(2);
  });

  it("dừng khi chạm trần số vòng", async () => {
    const sheets: P23bSheetsClient = {
      async batchGetValues() {
        return [
          { range: "product_registry", values: [["MA_SP", "XML_GROUP_ID", "ACTIVE"], ["SV695", "SV695", "TRUE"]] },
          { range: "image_registry", values: [] },
        ];
      },
      async batchUpdateValues() { /* không lưu -> việc không bao giờ hết */ },
      async appendValues() { /* không lưu */ },
      async ensureSheet() { return false; },
    };
    const redis = new FakeRedis();
    const runner = new P23bMetadataStaging({
      redis: redis as unknown as ReturnType<typeof createClient>,
      sheets,
      feed: { fetchFeed: async () => "<rss/>" },
      xmlParser: { parse: () => xmlDocument },
      images: { prepare: async () => ({ buffer: Buffer.from("img"), mime: "image/jpeg" }) },
      classifier: { classify: async () => geminiResponse() },
      rateLimiter: { acquire: async () => undefined },
      sheetId: "sheet-1",
      schema,
      shardCount: 1, shardIndex: 0,
      batchSize: 1, recheckDays: 0, onlyNewImages: false,
      drainEnabled: true, maxRounds: 3, maxRunMs: 7_200_000,
      concurrency: 1, flushEvery: 1,
      writeEnabled: true, staleOnlyWhenDraftChanges: true,
      runId: "cap-test",
      now: () => new Date("2026-07-21T10:00:00.000Z"),
    });
    const summary = await runner.run();
    expect(summary.rounds).toBe(3);
    expect(summary.stopped_because).toBe("max_rounds");
    expect(summary.lock_released).toBe(true);
  });
});
