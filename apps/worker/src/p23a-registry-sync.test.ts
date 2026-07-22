import { describe, expect, it } from "vitest";
import type { createClient } from "redis";
import {
  P23A_EXTRACTION_VERSION,
  P23aRegistrySync,
  REGISTRY_SYNC_LOCK_KEY,
  buildRegistrySheetBatch,
  patchRegistrySheetBatch,
  type P23aSheetsClient,
} from "./p23a-registry-sync.js";
import {
  EXTRACTION_VERSION,
  buildXmlProfiles,
  extractMaterialComponents,
  groupXmlItems,
  normalizeStructuredExtraction,
  unique,
  uniqueSorted,
} from "./p23c-profiles.js";
import { buildRegistryMap } from "./p23c-jobs.js";

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

const xmlDocument = {
  rss: {
    channel: {
      item: [
        {
          "g:id": "1", "g:item_group_id": "SV695",
          "g:title": "Set áo chân váy Thanh Vân - S",
          "g:description": "Chất liệu: áo thô lụa, chân váy lụa. Thiết kế thanh lịch, tinh tế. Màu trắng kem.",
          "g:link": "https://www.lanadesign.vn/sv695?utm_source=x",
          "g:brand": "lanadesign",
          "g:image_link": "https://www.lanadesign.vn/a.jpg",
          additional_image_link: "https://www.lanadesign.vn/b.jpg",
          additional_variant_attribute: [
            { label: "Size", value: "S" },
            { label: "Phân loại", value: "Trắng" },
          ],
        },
        {
          "g:id": "2", "g:item_group_id": "SV695",
          "g:title": "Set áo chân váy Thanh Vân - M",
          "g:description": "Mô tả biến thể M khác hẳn.",
          "g:link": "https://www.lanadesign.vn/sv695",
          "g:brand": "lanadesign",
          "g:image_link": "https://www.lanadesign.vn/c.jpg",
          additional_variant_attribute: { label: "Size", value: "M" },
        },
      ],
    },
  },
};

const parser = { parse: (): Record<string, unknown> => xmlDocument };

const registryValues = [
  ["MA_SP", "XML_GROUP_ID", "ACTIVE", "BRAND", "ROW_NUMBER"],
  ["SV695", "SV695", "TRUE", "lanadesign", "2"],
  ["KHONGCO", "KHONGCO", "TRUE", "lanadesign", "3"],
];

const sheetsWith = (): P23aSheetsClient & { updates: unknown[][] } => {
  const updates: unknown[][] = [];
  return {
    updates,
    async batchGetValues() {
      return [{ range: "product_registry", values: registryValues }];
    },
    async batchUpdateValues(_id, data) { updates.push(data as unknown[]); },
  };
};

const syncWith = (overrides: {
  redis?: FakeRedis; sheets?: P23aSheetsClient; write?: boolean;
}): { sync: P23aRegistrySync; redis: FakeRedis } => {
  const redis = overrides.redis ?? new FakeRedis();
  const sync = new P23aRegistrySync({
    redis: redis as unknown as ReturnType<typeof createClient>,
    sheets: overrides.sheets ?? sheetsWith(),
    feed: { fetchFeed: async () => "<rss/>" },
    xmlParser: parser,
    sheetId: "sheet-1",
    writeEnabled: overrides.write ?? false,
    runId: "test",
    now: () => new Date("2026-07-21T09:00:00.000Z"),
  });
  return { sync, redis };
};

const profilesFor = (now = "2026-07-21T09:00:00.000Z") => {
  const registry = buildRegistryMap([
    { MA_SP: "SV695", XML_GROUP_ID: "SV695", ACTIVE: "TRUE", BRAND: "lanadesign", row_number: 2 },
  ]);
  const groups = groupXmlItems(xmlDocument.rss.channel.item as unknown as Record<string, unknown>[]);
  const raw = buildXmlProfiles(registry.registry, groups, now);
  const data = buildRegistrySheetBatch(raw, now);
  const normalized = normalizeStructuredExtraction(raw);
  patchRegistrySheetBatch(normalized, data);
  return { raw, data, normalized };
};

describe("P2.3A dùng chung extraction canonical-parent với P2.3C", () => {
  it("chạy ở phiên bản 2.1.0 và dựng tiêu đề cha bỏ hậu tố size", () => {
    const { raw } = profilesFor();
    expect(raw).toHaveLength(1);
    expect(P23A_EXTRACTION_VERSION).toBe(EXTRACTION_VERSION);
    expect(raw[0]?.extraction_version).toBe("2.1.0-canonical-parent");
    expect(raw[0]?.title).toBe("Set áo chân váy Thanh Vân");
  });

  it("hồ sơ P2.3A trùng khớp hoàn toàn hồ sơ P2.3C trên cùng dữ liệu", () => {
    const now = "2026-07-21T09:00:00.000Z";
    const registry = buildRegistryMap([
      { MA_SP: "SV695", XML_GROUP_ID: "SV695", ACTIVE: "TRUE", BRAND: "lanadesign", row_number: 2 },
    ]);
    const groups = groupXmlItems(xmlDocument.rss.channel.item as unknown as Record<string, unknown>[]);
    const p23c = normalizeStructuredExtraction(buildXmlProfiles(registry.registry, groups, now));
    expect(profilesFor(now).normalized).toEqual(p23c);
  });

  it("chuẩn hóa cả link lẫn ảnh, bỏ tham số tracking", () => {
    const { raw } = profilesFor();
    expect(raw[0]?.product_link).toBe("https://www.lanadesign.vn/sv695");
    expect(raw[0]?.images).toEqual([
      "https://www.lanadesign.vn/a.jpg",
      "https://www.lanadesign.vn/b.jpg",
      "https://www.lanadesign.vn/c.jpg",
    ]);
  });

  it("suy ra category/rule_type từ mã sản phẩm và nội dung", () => {
    const { raw } = profilesFor();
    expect(raw[0]?.category).toBe("SET_VAY");
    expect(raw[0]?.rule_type).toBe("SV");
  });

  it("source_hash ổn định giữa các lần chạy cùng dữ liệu", () => {
    expect(profilesFor().normalized[0]?.source_hash).toBe(profilesFor().normalized[0]?.source_hash);
  });

  it("tham số mergeValues vẫn phân biệt được hai biến thể merge", () => {
    // Thứ tự "phát hiện" là thứ tự bảng luật materialDefinitions, không phải thứ tự trong câu.
    const description = "Chất liệu: áo thô khắc laser phối voan và ren.";
    const unsorted = extractMaterialComponents(description, "AO", "", "", (...s) => unique(s.flat()));
    const sorted = extractMaterialComponents(description, "AO", "", "", (...s) => uniqueSorted(s.flat()));
    expect(unsorted.flat).toEqual(["THÔ KHẮC LASER", "REN", "VOAN"]);
    expect(sorted.flat).toEqual(["REN", "THÔ KHẮC LASER", "VOAN"]);
  });
});

describe("P2.3A batch ghi product_registry", () => {
  it("có dòng header và các ô đúng vị trí, không đụng cột override thủ công", () => {
    const { data } = profilesFor();
    const ranges = data.map((entry) => entry.range);
    expect(ranges[0]).toBe("product_registry!Q1:AH1");
    expect(ranges).toContain("product_registry!B2");
    expect(ranges).toContain("product_registry!E2:F2");
    expect(ranges).toContain("product_registry!J2:Y2");
    expect(ranges).toContain("product_registry!AC2:AH2");
    // COLOR_OVERRIDE/STYLE_OVERRIDE/MATERIAL_COMPONENTS_OVERRIDE nằm ở Z:AB — không được ghi
    expect(ranges.some((range) => /![Z]\d|!AA\d|!AB\d/u.test(range))).toBe(false);
  });

  it("normalize vá lại đúng ô chất liệu và hash trong batch", () => {
    const { data, normalized } = profilesFor();
    const main = data.find((entry) => entry.range === "product_registry!J2:Y2");
    expect(main?.values[0]?.[14]).toBe(normalized[0]?.source_hash);
    expect(main?.values[0]?.[9]).toBe(normalized[0]?.material_xml);
    const derived = data.find((entry) => entry.range === "product_registry!AC2:AH2");
    expect(derived?.values[0]?.[2]).toBe(JSON.stringify(normalized[0]?.material_components));
  });
});

describe("P2.3A runner", () => {
  it("chạy xong, đếm đúng sản phẩm khớp và không khớp XML", async () => {
    const { sync } = syncWith({});
    const summary = await sync.run();
    expect(summary.status).toBe("OK");
    expect(summary.registry_count).toBe(2);
    expect(summary.matched_profile_count).toBe(1);
    expect(summary.unmatched_product_count).toBe(1);
    expect(summary.lock_released).toBe(true);
  });

  it("mặc định không ghi Sheets; bật cờ thì ghi", async () => {
    const off = sheetsWith();
    expect((await syncWith({ sheets: off }).sync.run()).sheet_write).toBe("DISABLED");
    expect(off.updates).toHaveLength(0);

    const on = sheetsWith();
    expect((await syncWith({ sheets: on, write: true }).sync.run()).sheet_write).toBe("OK");
    expect(on.updates).toHaveLength(1);
  });

  it("lock chặn chạy chồng", async () => {
    const redis = new FakeRedis();
    await redis.set(REGISTRY_SYNC_LOCK_KEY, "run-khac");
    expect((await syncWith({ redis }).sync.run()).status).toBe("RUN_LOCKED");
    expect(redis.store.get(REGISTRY_SYNC_LOCK_KEY)).toBe("run-khac");
  });

  it("lỗi Sheets đọc trả FATAL và vẫn nhả lock", async () => {
    const broken: P23aSheetsClient = {
      async batchGetValues() { throw new Error("SHEETS_HTTP_500"); },
      async batchUpdateValues() { throw new Error("SHEETS_HTTP_500"); },
    };
    const { sync, redis } = syncWith({ sheets: broken });
    const summary = await sync.run();
    expect(summary.status).toBe("FATAL");
    expect(redis.store.has(REGISTRY_SYNC_LOCK_KEY)).toBe(false);
  });

  it("mã trùng bị loại và báo trong registry_errors", async () => {
    const dup: P23aSheetsClient = {
      async batchGetValues() {
        return [{
          range: "product_registry",
          values: [
            ["MA_SP", "XML_GROUP_ID", "ACTIVE"],
            ["SV695", "SV695", "TRUE"],
            ["SV695", "SV695", "TRUE"],
          ],
        }];
      },
      async batchUpdateValues() { /* không dùng */ },
    };
    const summary = await syncWith({ sheets: dup }).sync.run();
    expect(summary.registry_errors).toEqual(["DUPLICATE_MA_SP:SV695"]);
    expect(summary.registry_count).toBe(0);
  });
});
