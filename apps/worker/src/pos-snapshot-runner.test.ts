import { describe, expect, it } from "vitest";
import type { createClient } from "redis";
import {
  PosSnapshotRunner,
  collectCatalogIssues,
  type PosVariationsFetcher,
  type SheetsBatchReader,
} from "./pos-snapshot-runner.js";
import type { PosStatusRow } from "./pos-snapshot-core.js";

class FakeRedis {
  readonly store = new Map<string, { value: string; ttlSeconds: number | null }>();

  async set(
    key: string,
    value: string,
    options?: { EX?: number; NX?: boolean; PX?: number },
  ): Promise<string | null> {
    if (options?.NX && this.store.has(key)) return null;
    const ttlSeconds = options?.EX ?? (options?.PX ? options.PX / 1_000 : null);
    this.store.set(key, { value, ttlSeconds });
    return "OK";
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key)?.value ?? null;
  }

  async eval(_script: string, context: { keys: string[]; arguments: string[] }): Promise<number> {
    const [key] = context.keys;
    const [token] = context.arguments;
    if (key && this.store.get(key)?.value === token) {
      this.store.delete(key);
      return 1;
    }
    return 0;
  }
}

const sheetValues = {
  config: [
    ["SHOP_ALIAS", "ENABLED", "WAREHOUSE_IDS"],
    ["LANA", "TRUE", ""],
  ],
  registry: [
    ["MA_SP", "ACTIVE"],
    ["SD438", "TRUE"],
  ],
  mapping: [["MA_SP"]],
  policy: [
    ["MA_SP", "ENABLED", "TINH_TRANG", "CAN_ORDER_WHEN_ZERO", "PREP_MIN_DAYS", "PREP_MAX_DAYS"],
    ["SD438", "TRUE", "READY-STOCK", "TRUE", "1", "2"],
  ],
  shipping: [
    ["REGION", "ENABLED", "TRANSIT_MIN_DAYS", "TRANSIT_MAX_DAYS"],
    ["MIEN-BAC", "TRUE", "2", "4"],
  ],
  inventory: [["SNAPSHOT_KEY"], ["old-row"]],
};

const workingSheets = (): SheetsBatchReader & { updates: unknown[] } => {
  const updates: unknown[] = [];
  return {
    updates,
    async batchGetValues() {
      return [
        { range: "config_shop_id", values: sheetValues.config },
        { range: "product_registry", values: sheetValues.registry },
        { range: "component_mapping", values: sheetValues.mapping },
        { range: "fulfillment_policy", values: sheetValues.policy },
        { range: "shipping_eta", values: sheetValues.shipping },
        { range: "inventory_current", values: sheetValues.inventory },
      ];
    },
    async batchUpdateValues(_sheetId, data) {
      updates.push(data);
    },
  };
};

const workingPos = (): PosVariationsFetcher => ({
  async fetchAllVariations() {
    return [{
      id: "var-1",
      display_id: "SD438-S",
      retail_price: 1_395_000,
      remain_quantity: 7,
      updated_at: "2026-04-07T11:25:14",
      product: { display_id: "SD438" },
      fields: [{ name: "Size", value: "S" }],
    }];
  },
});

const runnerWith = (overrides: {
  redis?: FakeRedis;
  sheets?: SheetsBatchReader;
  pos?: PosVariationsFetcher;
  notifier?: { notify: (text: string) => Promise<void> };
  writeback?: boolean;
}): { runner: PosSnapshotRunner; redis: FakeRedis } => {
  const redis = overrides.redis ?? new FakeRedis();
  const runner = new PosSnapshotRunner({
    redis: redis as unknown as ReturnType<typeof createClient>,
    sheets: overrides.sheets ?? workingSheets(),
    pos: overrides.pos ?? workingPos(),
    sheetId: "sheet-1",
    shopsSecret: { LANA: { shop_id: "4741464", api_key: "secret" } },
    snapshotTtlSeconds: 172_800,
    sheetsWritebackEnabled: overrides.writeback ?? false,
    notifier: overrides.notifier ?? null,
    now: () => new Date("2026-07-21T06:00:00.000Z"),
  });
  return { runner, redis };
};

describe("PosSnapshotRunner", () => {
  it("ghi snapshot hợp lệ vào Redis với key chuẩn app và TTL", async () => {
    const { runner, redis } = runnerWith({});
    const summary = await runner.run();
    expect(summary.status).toBe("OK");
    expect(summary.snapshotWrites).toBe(1);
    expect(summary.configSource).toBe("GOOGLE_SHEETS_BATCH");
    const stored = redis.store.get("catalog:offer:LANA:SD438");
    expect(stored).toBeDefined();
    expect(stored?.ttlSeconds).toBe(172_800);
    const snapshot = JSON.parse(stored?.value ?? "{}");
    expect(snapshot.schema_version).toBe(3);
    expect(snapshot.data_status).toBe("OK");
    expect(snapshot.offers.DIRECT.sale_price).toBe(1_395_000);
    expect(redis.store.has("catalog:shipping_eta")).toBe(true);
    expect(redis.store.has("lock:pos_snapshot:v2")).toBe(false);
    expect(redis.store.has("config:pos_sheet_batch")).toBe(true);
  });

  it("trả RUN_LOCKED khi lock đang được giữ", async () => {
    const redis = new FakeRedis();
    await redis.set("lock:pos_snapshot:v2", "other-run", { PX: 1_200_000 });
    const { runner } = runnerWith({ redis });
    const summary = await runner.run();
    expect(summary.status).toBe("RUN_LOCKED");
    expect(redis.store.get("lock:pos_snapshot:v2")?.value).toBe("other-run");
  });

  it("dùng cache Redis khi Sheets lỗi", async () => {
    const { runner: warmup, redis } = runnerWith({});
    await warmup.run();
    const failingSheets: SheetsBatchReader = {
      async batchGetValues() {
        throw new Error("SHEETS_HTTP_500");
      },
      async batchUpdateValues() {
        throw new Error("SHEETS_HTTP_500");
      },
    };
    const { runner } = runnerWith({ redis, sheets: failingSheets });
    const summary = await runner.run();
    expect(summary.status).toBe("OK");
    expect(summary.configSource).toBe("REDIS_CACHE");
    expect(summary.snapshotWrites).toBe(1);
  });

  it("FATAL khi Sheets lỗi và không có cache, có gửi fatal alert", async () => {
    const alerts: string[] = [];
    const failingSheets: SheetsBatchReader = {
      async batchGetValues() {
        throw new Error("SHEETS_HTTP_500");
      },
      async batchUpdateValues() {
        throw new Error("SHEETS_HTTP_500");
      },
    };
    const { runner, redis } = runnerWith({
      sheets: failingSheets,
      notifier: { notify: async (text) => { alerts.push(text); } },
    });
    const summary = await runner.run();
    expect(summary.status).toBe("FATAL");
    expect(summary.fatalError).toContain("GOOGLE_SHEETS_BATCH_FAILED_AND_CACHE_EMPTY");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain("FATAL");
    expect(redis.store.has("lock:pos_snapshot:v2")).toBe(false);
  });

  it("SHOP_ERROR khi POS lỗi: không ghi snapshot, có alert", async () => {
    const alerts: string[] = [];
    const failingPos: PosVariationsFetcher = {
      async fetchAllVariations() {
        throw new Error("POS_HTTP_500");
      },
    };
    const { runner, redis } = runnerWith({
      pos: failingPos,
      notifier: { notify: async (text) => { alerts.push(text); } },
    });
    const summary = await runner.run();
    expect(summary.status).toBe("OK");
    expect(summary.snapshotWrites).toBe(0);
    expect(summary.statusCounts.SHOP_ERROR).toBe(1);
    expect(redis.store.has("catalog:offer:LANA:SD438")).toBe(false);
    expect(alerts[0]).toContain("SHOP_ERROR");
  });

  it("mặc định không ghi ngược Sheets; bật flag thì có", async () => {
    const sheets = workingSheets();
    const { runner } = runnerWith({ sheets });
    const summary = await runner.run();
    expect(summary.sheetsWriteback).toBe("DISABLED");
    expect(sheets.updates).toHaveLength(0);

    const sheetsOn = workingSheets();
    const { runner: writebackRunner } = runnerWith({ sheets: sheetsOn, writeback: true });
    const summaryOn = await writebackRunner.run();
    expect(summaryOn.sheetsWriteback).toBe("OK");
    expect(sheetsOn.updates).toHaveLength(1);
  });

  it("sản phẩm không có trong POS tạo PRODUCT_NOT_FOUND nhưng vẫn ghi snapshot", async () => {
    const emptyPos: PosVariationsFetcher = {
      async fetchAllVariations() {
        return [];
      },
    };
    const { runner, redis } = runnerWith({ pos: emptyPos });
    const summary = await runner.run();
    expect(summary.statusCounts.PRODUCT_NOT_FOUND).toBe(1);
    const snapshot = JSON.parse(redis.store.get("catalog:offer:LANA:SD438")?.value ?? "{}");
    expect(snapshot.data_status).toBe("PRODUCT_NOT_FOUND");
  });
});

function statusRow(overrides: Partial<PosStatusRow>): PosStatusRow {
  return {
    SNAPSHOT_KEY: "", SHOP_ALIAS: "LANA", PRODUCT_ID: "SV101", OFFER_TYPE: "",
    PRICE_SKU: "", COMPONENT_1_SKU: "", COMPONENT_2_SKU: "", COLOR: "__NO_COLOR__",
    SIZE: "*", STOCK_QUANTITY: 0, LIST_PRICE: null, SALE_PRICE: null,
    STOCK_STATUS: "", INVENTORY_SOURCE: "PANCAKE_POS", BOM_STATUS: "",
    PARENT_VARIATION_ID: "", PARENT_VARIATION_SKU: "", BOM_COMPONENTS: "",
    COMPONENT_COUNT: 0, TINH_TRANG: "",
    ...overrides,
  } as PosStatusRow;
}

describe("collectCatalogIssues", () => {
  it("marks unsellable products critical and BOM gaps as warnings", () => {
    const issues = collectCatalogIssues([
      statusRow({ PRODUCT_ID: "SV101", SYNC_STATUS: "PRODUCT_NOT_FOUND" } as Partial<PosStatusRow>),
      statusRow({ PRODUCT_ID: "SQ636", BOM_STATUS: "BOM_REQUIRED_MISSING" }),
    ]);
    expect(issues).toEqual([
      { productId: "SQ636", issueCode: "BOM_REQUIRED_MISSING", severity: "warning" },
      { productId: "SV101", issueCode: "PRODUCT_NOT_FOUND", severity: "critical" },
    ]);
  });

  it("reports one row per product and issue even when POS returns many variants", () => {
    const issues = collectCatalogIssues([
      statusRow({ PRODUCT_ID: "SV101", SYNC_STATUS: "SHOP_ERROR" } as Partial<PosStatusRow>),
      statusRow({ PRODUCT_ID: "SV101", SYNC_STATUS: "SHOP_ERROR" } as Partial<PosStatusRow>),
      statusRow({ PRODUCT_ID: "SV101", SYNC_STATUS: "SHOP_ERROR" } as Partial<PosStatusRow>),
    ]);
    expect(issues).toHaveLength(1);
  });

  it("ignores healthy rows and rows without a product id", () => {
    expect(collectCatalogIssues([
      statusRow({ PRODUCT_ID: "SV101", SYNC_STATUS: "OK", BOM_STATUS: "OK" } as Partial<PosStatusRow>),
      statusRow({ PRODUCT_ID: "SQ636", SYNC_STATUS: "OK", BOM_STATUS: "NOT_APPLICABLE" } as Partial<PosStatusRow>),
      statusRow({ PRODUCT_ID: "", SYNC_STATUS: "SHOP_ERROR" } as Partial<PosStatusRow>),
    ])).toEqual([]);
  });
});
