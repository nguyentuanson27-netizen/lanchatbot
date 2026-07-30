import { describe, expect, it } from "vitest";
import type { createClient } from "redis";
import {
  P23cPublisher,
  RedisVertexRateLimiter,
  type EmbeddingClient,
  type ImagePipeline,
  type QdrantClient,
  type SheetsReader,
} from "./p23c-publisher.js";
import {
  buildApprovedQdrantJobs,
  clampContextualText,
  deterministicPointId,
  pointBelongsToShard,
  selectPendingPointBatch,
  type QdrantJob,
  type RunContext,
} from "./p23c-jobs.js";

class FakeRedis {
  readonly store = new Map<string, string>();
  evalCalls = 0;

  async set(key: string, value: string, options?: { NX?: boolean }): Promise<string | null> {
    if (options?.NX && this.store.has(key)) return null;
    this.store.set(key, value);
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async eval(script: string, context: { keys: string[]; arguments: string[] }): Promise<number> {
    this.evalCalls += 1;
    if (script.includes("slot-now")) return 0;
    const [key] = context.keys;
    const [token] = context.arguments;
    if (key && this.store.get(key) === token) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }
}

const XML = `<?xml version="1.0"?><rss><channel>
<item><g:id>1</g:id><g:item_group_id>SV695</g:item_group_id><g:title>Set áo chân váy thanh lịch - S</g:title>
<g:description>Chất liệu: áo thô, chân váy lụa. Thiết kế thanh lịch, tinh tế, màu trắng kem.</g:description>
<g:link>https://www.lanadesign.vn/sv695</g:link><g:brand>lanadesign</g:brand>
<g:image_link>https://www.lanadesign.vn/a.jpg</g:image_link>
<additional_image_link>https://www.lanadesign.vn/b.jpg</additional_image_link>
<additional_variant_attribute><label>Size</label><value>S</value></additional_variant_attribute>
</item></channel></rss>`;

const parser = {
  parse: (xml: string): Record<string, unknown> => {
    // parser tối giản đủ cho test: dựng lại cấu trúc mà groupXmlItems cần
    void xml;
    return {
      rss: {
        channel: {
          item: {
            "g:id": "1",
            "g:item_group_id": "SV695",
            "g:title": "Set áo chân váy thanh lịch - S",
            "g:description": "Chất liệu: áo thô, chân váy lụa. Thiết kế thanh lịch, tinh tế, màu trắng kem.",
            "g:link": "https://www.lanadesign.vn/sv695",
            "g:brand": "lanadesign",
            "g:image_link": "https://www.lanadesign.vn/a.jpg",
            additional_image_link: "https://www.lanadesign.vn/b.jpg",
            additional_variant_attribute: { label: "Size", value: "S" },
          },
        },
      },
    };
  },
};

const sheetsWith = (imageRows: (string | number)[][]): SheetsReader & { updates: unknown[] } => {
  const updates: unknown[] = [];
  return {
    updates,
    async batchGetValues() {
      return [
        {
          range: "product_registry",
          values: [["MA_SP", "XML_GROUP_ID", "ACTIVE", "BRAND"], ["SV695", "SV695", "TRUE", "lanadesign"]],
        },
        {
          range: "image_registry",
          values: [
            ["IMAGE_ID", "MA_SP", "IMAGE_URL", "REVIEW_STATUS", "ACTIVE", "PUBLISHED_HASH", "IMAGE_HASH", "VERIFIED"],
            ...imageRows,
          ],
        },
      ];
    },
    async batchUpdateValues(_id, data) {
      updates.push(data);
    },
  };
};

const okQdrant = (existing = new Map<string, string>()): QdrantClient & {
  upserts: unknown[];
  payloadUpdates: { id: string; payload: Record<string, unknown> }[];
  deletes: string[];
  existing: Map<string, string>;
} => {
  const upserts: unknown[] = [];
  const payloadUpdates: { id: string; payload: Record<string, unknown> }[] = [];
  const deletes: string[] = [];
  return {
    upserts, payloadUpdates, deletes, existing,
    async scrollPointStates() {
      return new Map([...existing.entries()].map(([id, contentHash]) => [id, {
        point_id: id,
        payload: {
          content_hash: contentHash,
          embedding_model: "multimodalembedding@001",
          embedding_dimension: 1_408,
        },
        content_hash: contentHash,
        embedding_hash: "",
        payload_hash: "",
        provenance_hash: "",
        hash_schema_version: "",
      }]));
    },
    async upsertPoint(point) { upserts.push(point); },
    async setPayload(id, payload) { payloadUpdates.push({ id, payload }); },
    async deletePoint(id) { deletes.push(id); },
  };
};

const okImages: ImagePipeline = {
  async prepare() { return { buffer: Buffer.from("raw-image"), mime: "image/jpeg" }; },
  async removeBackground() { return Buffer.from("cutout-image"); },
};

const okEmbeddings: EmbeddingClient = {
  async embedImageAndText() {
    return { image: new Array(1_408).fill(0.1), text: new Array(1_408).fill(0.2) };
  },
  async embedImage() { return new Array(1_408).fill(0.3); },
};

const publisherWith = (overrides: {
  redis?: FakeRedis;
  sheets?: SheetsReader;
  qdrant?: QdrantClient;
  images?: ImagePipeline;
  embeddings?: EmbeddingClient;
  dryRun?: boolean;
  sheetsAck?: boolean;
  imageRows?: (string | number)[][];
  hashV3Mode?: "OFF" | "DRY_RUN" | "LIVE";
  payloadOnlyEnabled?: boolean;
  legacyHashMigrationEnabled?: boolean;
}): { publisher: P23cPublisher; redis: FakeRedis } => {
  const redis = overrides.redis ?? new FakeRedis();
  const publisher = new P23cPublisher({
    redis: redis as unknown as ReturnType<typeof createClient>,
    sheets: overrides.sheets ?? sheetsWith(overrides.imageRows ?? [
      ["", "SV695", "https://www.lanadesign.vn/a.jpg", "APPROVED", "TRUE", ""],
    ]),
    feed: { fetchFeed: async () => XML },
    xmlParser: parser,
    qdrant: overrides.qdrant ?? okQdrant(),
    images: overrides.images ?? okImages,
    embeddings: overrides.embeddings ?? okEmbeddings,
    vertexRateLimiter: { acquire: async () => undefined },
    sheetId: "sheet-1",
    shardCount: 1,
    shardIndex: 0,
    batchSize: 50,
    catalogBuildVersion: "catalog-v2",
    dryRun: overrides.dryRun ?? false,
    sheetsAckEnabled: overrides.sheetsAck ?? false,
    ...(overrides.hashV3Mode ? { hashV3Mode: overrides.hashV3Mode } : {}),
    ...(overrides.payloadOnlyEnabled === undefined ? {} : { payloadOnlyEnabled: overrides.payloadOnlyEnabled }),
    ...(overrides.legacyHashMigrationEnabled === undefined
      ? {}
      : { legacyHashMigrationEnabled: overrides.legacyHashMigrationEnabled }),
    runId: "test-run",
    now: () => new Date("2026-07-21T08:00:00.000Z"),
  });
  return { publisher, redis };
};

describe("P2.3C kiểm soát duyệt", () => {
  it("chỉ APPROVED + ACTIVE được upsert; PENDING/STALE/REJECTED bị giữ lại", async () => {
    const qdrant = okQdrant();
    const { publisher } = publisherWith({
      qdrant,
      imageRows: [
        ["", "SV695", "https://www.lanadesign.vn/a.jpg", "APPROVED", "TRUE", ""],
        ["", "SV695", "https://www.lanadesign.vn/b.jpg", "PENDING", "TRUE", ""],
        ["", "SV695", "https://www.lanadesign.vn/c.jpg", "STALE", "TRUE", ""],
        ["", "SV695", "https://www.lanadesign.vn/d.jpg", "REJECTED", "TRUE", ""],
      ],
    });
    const summary = await publisher.run();
    expect(summary.status).toBe("OK");
    expect(summary.success).toBe(1);
    expect(summary.held_row_count).toBe(3);
    expect(qdrant.upserts).toHaveLength(1);
    expect(qdrant.deletes).toHaveLength(0);
  });

  it("ACTIVE=FALSE xóa point đã tồn tại và không xóa point chưa publish", async () => {
    const approvedId = deterministicPointId(["lanadesign", "SV695", "https://www.lanadesign.vn/a.jpg"].join("|"));
    const qdrant = okQdrant(new Map([[approvedId, "hash-cu"]]));
    const { publisher } = publisherWith({
      qdrant,
      imageRows: [
        ["", "SV695", "https://www.lanadesign.vn/a.jpg", "APPROVED", "FALSE", ""],
        ["", "SV695", "https://www.lanadesign.vn/z.jpg", "APPROVED", "FALSE", ""],
      ],
    });
    const summary = await publisher.run();
    expect(summary.deleted).toBe(1);
    expect(qdrant.deletes).toEqual([approvedId]);
  });

  it("point có content_hash trùng Qdrant thì không xử lý lại", async () => {
    const first = publisherWith({});
    const firstSummary = await first.publisher.run();
    expect(firstSummary.success).toBe(1);

    const qdrant = okQdrant();
    const probe = publisherWith({ qdrant });
    await probe.publisher.run();
    const upserted = qdrant.upserts[0] as { id: string; payload: { content_hash: string } };

    const second = publisherWith({
      qdrant: okQdrant(new Map([[upserted.id, upserted.payload.content_hash]])),
    });
    const secondSummary = await second.publisher.run();
    expect(secondSummary.status).toBe("NO_PENDING_WORK");
    expect(secondSummary.selected).toBe(0);
  });

  it("payload upsert mang content_hash, catalog_version và thông tin embedding", async () => {
    const qdrant = okQdrant();
    const { publisher } = publisherWith({ qdrant });
    await publisher.run();
    const point = qdrant.upserts[0] as {
      id: string;
      vector: Record<string, number[]>;
      payload: Record<string, unknown>;
    };
    expect(point.vector.image_raw).toHaveLength(1_408);
    expect(point.vector.image_cutout).toHaveLength(1_408);
    expect(point.vector.product_text).toHaveLength(1_408);
    expect(point.payload.catalog_version).toBe("catalog-v2");
    expect(point.payload.embedding_model).toBe("multimodalembedding@001");
    expect(point.payload.embedding_dimension).toBe(1_408);
    expect(String(point.payload.content_hash)).toHaveLength(64);
    expect(point.payload.image_metadata_review_status).toBe("APPROVED");
  });
});

describe("P2.3C vận hành", () => {
  it("dry-run không ghi Qdrant và không ack Sheets", async () => {
    const qdrant = okQdrant();
    const sheets = sheetsWith([["", "SV695", "https://www.lanadesign.vn/a.jpg", "APPROVED", "TRUE", ""]]);
    const { publisher } = publisherWith({ qdrant, sheets, dryRun: true, sheetsAck: true });
    const summary = await publisher.run();
    expect(summary.skipped).toBe(1);
    expect(qdrant.upserts).toHaveLength(0);
    expect(sheets.updates).toHaveLength(0);
  });


  it("Hash v3 baseline SHA chỉ set payload, không tải ảnh, RemBG hoặc gọi embedding", async () => {
    const hash = "a".repeat(64);
    const seedQdrant = okQdrant();
    await publisherWith({
      qdrant: seedQdrant,
      imageRows: [[
        "",
        "SV695",
        "https://www.lanadesign.vn/a.jpg",
        "APPROVED",
        "TRUE",
        "",
        hash,
        "TRUE",
      ]],
    }).publisher.run();
    const seeded = seedQdrant.upserts[0] as {
      id: string;
      payload: Record<string, unknown>;
    };
    const previousPayload = { ...seeded.payload, image_content_sha256: "" };
    const payloadUpdates: Record<string, unknown>[] = [];
    const qdrant: QdrantClient = {
      async scrollPointStates() {
        return new Map([[
          seeded.id,
          {
            point_id: seeded.id,
            payload: previousPayload,
            content_hash: "legacy-stale",
            embedding_hash: "",
            payload_hash: "",
            provenance_hash: "",
            hash_schema_version: "",
          },
        ]]);
      },
      async upsertPoint() { throw new Error("unexpected_vector_upsert"); },
      async setPayload(_id, nextPayload) { payloadUpdates.push(nextPayload); },
      async deletePoint() { throw new Error("unexpected_delete"); },
    };
    let prepareCalls = 0;
    let embeddingCalls = 0;
    const summary = await publisherWith({
      qdrant,
      hashV3Mode: "LIVE",
      payloadOnlyEnabled: true,
      legacyHashMigrationEnabled: true,
      images: {
        async prepare() {
          prepareCalls += 1;
          throw new Error("unexpected_image_prepare");
        },
        async removeBackground() { throw new Error("unexpected_rembg"); },
      },
      embeddings: {
        async embedImageAndText() {
          embeddingCalls += 1;
          throw new Error("unexpected_embedding");
        },
        async embedImage() {
          embeddingCalls += 1;
          throw new Error("unexpected_embedding");
        },
      },
      imageRows: [[
        seeded.id,
        "SV695",
        "https://www.lanadesign.vn/a.jpg",
        "APPROVED",
        "TRUE",
        "",
        hash,
        "TRUE",
      ]],
    }).publisher.run();

    expect(summary.payload_only_count).toBe(1);
    expect(summary.full_embed_count).toBe(0);
    expect(payloadUpdates).toHaveLength(1);
    expect(payloadUpdates[0]?.image_content_sha256).toBe(hash);
    expect(prepareCalls).toBe(0);
    expect(embeddingCalls).toBe(0);
  });

  it("ack Sheets chỉ chạy khi bật cờ", async () => {
    const sheetsOff = sheetsWith([["", "SV695", "https://www.lanadesign.vn/a.jpg", "APPROVED", "TRUE", ""]]);
    await publisherWith({ sheets: sheetsOff, sheetsAck: false }).publisher.run();
    expect(sheetsOff.updates).toHaveLength(0);

    const sheetsOn = sheetsWith([["", "SV695", "https://www.lanadesign.vn/a.jpg", "APPROVED", "TRUE", ""]]);
    await publisherWith({ sheets: sheetsOn, sheetsAck: true }).publisher.run();
    expect(sheetsOn.updates).toHaveLength(1);
    const ranges = (sheetsOn.updates[0] as { range: string }[]).map((entry) => entry.range);
    expect(ranges.some((range) => range.startsWith("image_registry!A"))).toBe(true);
    expect(ranges.some((range) => range.includes("AN"))).toBe(true);
  });

  it("lock ngăn hai lần chạy chồng nhau và được giải phóng sau khi xong", async () => {
    const redis = new FakeRedis();
    await redis.set("lock:ingest:lana_multimodal_data_v2:shard:0:of:1", "khac-run");
    const { publisher } = publisherWith({ redis });
    expect((await publisher.run()).status).toBe("RUN_LOCKED");

    const clean = publisherWith({});
    const summary = await clean.publisher.run();
    expect(summary.lock_released).toBe(true);
    expect(clean.redis.store.has("lock:ingest:lana_multimodal_data_v2:shard:0:of:1")).toBe(false);
  });

  it("lỗi một point không làm hỏng cả batch và được phân loại retryable", async () => {
    const failing: ImagePipeline = {
      async prepare() { throw new Error("REMBG_HTTP_503"); },
      async removeBackground() { return Buffer.alloc(0); },
    };
    const { publisher } = publisherWith({ images: failing });
    const summary = await publisher.run();
    expect(summary.failed).toBe(1);
    expect(summary.retryable_failed).toBe(1);
    expect(summary.fatal_failed).toBe(0);
    expect(summary.lock_released).toBe(true);
    expect(summary.error_sample).toContain("SV695");
    expect(summary.error_sample).toContain("REMBG_HTTP_503");
    expect(summary.error_sample).not.toContain("https://");
    expect(summary.error_sample).not.toContain("lanadesign.vn/a.jpg");
  });

  it("lỗi hạ tầng trả FATAL và vẫn giải phóng lock", async () => {
    const brokenSheets: SheetsReader = {
      async batchGetValues() { throw new Error("SHEETS_HTTP_500"); },
      async batchUpdateValues() { throw new Error("SHEETS_HTTP_500"); },
    };
    const { publisher, redis } = publisherWith({ sheets: brokenSheets });
    const summary = await publisher.run();
    expect(summary.status).toBe("FATAL");
    expect(summary.fatal_error).toContain("SHEETS_HTTP_500");
    expect(redis.store.has("lock:ingest:lana_multimodal_data_v2:shard:0:of:1")).toBe(false);
  });

  it("ghi tiến độ vào Redis theo shard", async () => {
    const { publisher, redis } = publisherWith({});
    await publisher.run();
    const progress = JSON.parse(redis.store.get("ingest:progress:lana_multimodal_data_v2:shard:0:of:1") ?? "{}");
    expect(progress.success).toBe(1);
    expect(progress.shard_count).toBe(1);
  });
});

describe("P2.3C phân shard và hash", () => {
  const run: RunContext = {
    run_id: "r", started_at: "2026-07-21T00:00:00.000Z", shard_count: 3, shard_index: 0, shard_label: "1/3",
  };

  it("mỗi point thuộc đúng một shard", () => {
    const ids = Array.from({ length: 200 }, (_, i) => deterministicPointId(`seed-${i}`));
    for (const id of ids) {
      const owners = [0, 1, 2].filter((index) => pointBelongsToShard(id, 3, index));
      expect(owners).toHaveLength(1);
    }
  });

  it("point ID deterministic và có dạng UUID v5", () => {
    const seed = ["lanadesign", "SV695", "https://www.lanadesign.vn/a.jpg"].join("|");
    const id = deterministicPointId(seed);
    expect(id).toBe(deterministicPointId(seed));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  });

  it("batch chỉ lấy point thuộc shard của mình và tôn trọng batchSize", () => {
    const jobs: QdrantJob[] = Array.from({ length: 60 }, (_, i) => ({
      run_id: "r", started_at: "", point_id: deterministicPointId(`p-${i}`),
      source_hash: `h${i}`, metadata_publish_hash: `h${i}`, published_hash: "",
      metadata_sheet_row: i + 2, payload: { ma_sp: `M${i}` }, contextual_text: "",
      image_url: `https://x/${i}.jpg`, normalized_image_url: `https://x/${i}.jpg`,
      job_valid: true, publish_action: "UPSERT", delete_requested: false, should_process: true,
      shard_count: 3, shard_index: 0, shard_label: "1/3",
    }));
    const batch = selectPendingPointBatch(jobs, new Map(), run, 10);
    expect(batch.selected.length).toBeLessThanOrEqual(10);
    for (const job of batch.selected) expect(pointBelongsToShard(job.point_id, 3, 0)).toBe(true);
    expect(batch.meta.pending_point_count).toBeGreaterThan(0);
  });

  it("published_hash khớp cho phép bỏ qua khi Qdrant chưa có content_hash", () => {
    const id = deterministicPointId("p-x");
    const job: QdrantJob = {
      run_id: "r", started_at: "", point_id: id, source_hash: "abc", metadata_publish_hash: "abc",
      published_hash: "abc", metadata_sheet_row: 2, payload: { ma_sp: "M" }, contextual_text: "",
      image_url: "", normalized_image_url: "", job_valid: true, publish_action: "UPSERT",
      delete_requested: false, should_process: true, shard_count: 1, shard_index: 0, shard_label: "1/1",
    };
    const single: RunContext = { ...run, shard_count: 1, shard_index: 0, shard_label: "1/1" };
    expect(selectPendingPointBatch([job], new Map([[id, ""]]), single, 50).selected).toHaveLength(0);
    expect(selectPendingPointBatch([job], new Map([[id, "khac"]]), single, 50).selected).toHaveLength(1);
  });

  it("dòng sheet mới nhất thắng khi point_id trùng, kể cả khi dòng mới là HOLD", () => {
    const rows = [
      { MA_SP: "SV695", IMAGE_URL: "https://x/a.jpg", REVIEW_STATUS: "APPROVED", ACTIVE: "TRUE", ROW_NUMBER: 2 },
      { MA_SP: "SV695", IMAGE_URL: "https://x/a.jpg", REVIEW_STATUS: "PENDING", ACTIVE: "TRUE", ROW_NUMBER: 9 },
    ];
    const jobs = buildApprovedQdrantJobs([], rows, {
      run_id: "r", started_at: "", shard_count: 1, shard_index: 0, shard_label: "1/1",
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.publish_action).toBe("HOLD");
    expect(jobs[0]?.metadata_sheet_row).toBe(9);
  });

  it("contextual_text bị cắt theo 900 byte UTF-8", () => {
    const long = "Váy dạ hội thanh lịch ".repeat(200);
    const clamped = clampContextualText(long);
    expect(clamped.bytes).toBeLessThanOrEqual(900);
    expect(Buffer.byteLength(clamped.text, "utf8")).toBe(clamped.bytes);
  });
});

describe("RedisVertexRateLimiter", () => {
  it("gọi Redis để lấy khe và chờ khi cần", async () => {
    const waits: number[] = [];
    const redis = {
      async eval() { return 1_500; },
    } as unknown as ReturnType<typeof createClient>;
    const limiter = new RedisVertexRateLimiter(redis, "k", 4_000, async (ms) => { waits.push(ms); });
    await limiter.acquire();
    expect(waits).toEqual([1_500]);
  });
});
