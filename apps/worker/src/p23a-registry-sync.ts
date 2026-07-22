/**
 * P2.3A XML Registry Sync trong app — thay workflow n8n P23REGSYNCLANA01.
 *
 * PHIÊN BẢN EXTRACTION: dùng chung `2.1.0-canonical-parent` với P2.3C, **cố ý khác**
 * workflow n8n P2.3A (vẫn ở `2.0.0-structured-vi`, lấy `group.items[0]`).
 *
 * Lý do: P2.3C đọc lại `RULE_TYPE`, `CATEGORY`, `ALIASES`, `SEARCH_SILHOUETTES`,
 * `SEARCH_OCCASIONS` từ `product_registry` và đưa vào payload Qdrant, tức là vào
 * `content_hash`. Mô phỏng trên dữ liệu production cho thấy nếu P2.3A ghi bằng 2.0.0 thì
 * 45/917 point đổi hash và bị nhúng lại với hồ sơ kém hơn (lấy theo biến thể đầu tiên);
 * ghi bằng 2.1.0 thì 0/917 point đổi hash.
 */
import type { createClient } from "redis";
import {
  buildXmlProfiles,
  groupXmlItems,
  normalizeStructuredExtraction,
  EXTRACTION_VERSION,
  NORMALIZER_VERSION,
  type XmlProfile,
} from "./p23c-profiles.js";
import { buildRegistryMap } from "./p23c-jobs.js";

export const P23A_EXTRACTION_VERSION = EXTRACTION_VERSION;
export const P23A_NORMALIZER_VERSION = NORMALIZER_VERSION;
export const REGISTRY_SYNC_LOCK_KEY = "lock:registry-sync:lana_multimodal_data_v2";

export interface SheetUpdateRange {
  range: string;
  majorDimension: "ROWS";
  values: (string | number | boolean)[][];
}

const REGISTRY_HEADER_RANGE = "product_registry!Q1:AH1";
const REGISTRY_HEADERS = [
  "XML_TITLE", "DESCRIPTION_XML", "MATERIAL_XML", "XML_LINK", "XML_IMAGE_URLS", "AUTO_CONFIDENCE",
  "REVIEW_STATUS", "SOURCE_HASH", "XML_UPDATED_AT", "COLOR_OVERRIDE", "STYLE_OVERRIDE",
  "MATERIAL_COMPONENTS_OVERRIDE", "COLOR_PRIMARY", "COLOR_DETAIL", "MATERIAL_COMPONENTS_JSON",
  "STYLE_PRIMARY", "STYLE_SECONDARY", "EXTRACTION_WARNINGS",
];

/** Dựng batch ghi product_registry; ba cột override thủ công không bị đụng tới. */
export function buildRegistrySheetBatch(
  profiles: readonly XmlProfile[],
  now: string,
): SheetUpdateRange[] {
  const data: SheetUpdateRange[] = [
    { range: REGISTRY_HEADER_RANGE, majorDimension: "ROWS", values: [[...REGISTRY_HEADERS]] },
  ];
  for (const profile of profiles) {
    const row = Number(profile.reg.sheet_row);
    if (!Number.isInteger(row) || row < 2) continue;
    data.push({ range: `product_registry!B${row}`, majorDimension: "ROWS", values: [[profile.group_id]] });
    data.push({
      range: `product_registry!E${row}:F${row}`,
      majorDimension: "ROWS",
      values: [[profile.rule_type, profile.category]],
    });
    data.push({
      range: `product_registry!J${row}:Y${row}`,
      majorDimension: "ROWS",
      values: [[
        profile.aliases.join(" | "), profile.search_colors.join(" | "), profile.search_styles.join(" | "),
        profile.search_materials.join(" | "), profile.search_silhouettes.join(" | "),
        profile.search_occasions.join(" | "), now, profile.title, profile.description_xml,
        profile.material_xml, profile.product_link, profile.images.slice(0, 8).join(" | "),
        profile.auto_confidence, profile.review_status, profile.source_hash, profile.xml_updated_at,
      ]],
    });
    data.push({
      range: `product_registry!AC${row}:AH${row}`,
      majorDimension: "ROWS",
      values: [[
        profile.color_primary.join(" | "), profile.color_detail.join(" | "),
        JSON.stringify(profile.material_components), profile.style_primary,
        profile.style_secondary, profile.extraction_warnings.join(" | "),
      ]],
    });
  }
  return data;
}

/**
 * Vá lại các ô chất liệu/hash trong batch bằng giá trị sau normalize.
 * Batch được dựng từ hồ sơ thô, còn normalize mới là giá trị cuối cùng — giữ đúng
 * trình tự của node "Normalize Structured Extraction" trong workflow n8n.
 */
export function patchRegistrySheetBatch(
  normalized: readonly XmlProfile[],
  data: SheetUpdateRange[],
): void {
  for (const profile of normalized) {
    const row = Number(profile.reg?.sheet_row);
    if (!Number.isInteger(row) || row < 2) continue;
    const mainRow = data.find((item) => item.range === `product_registry!J${row}:Y${row}`)?.values?.[0];
    if (mainRow) {
      mainRow[3] = profile.search_materials.join(" | ");
      mainRow[9] = profile.material_xml;
      mainRow[13] = profile.review_status;
      mainRow[14] = profile.source_hash;
    }
    const derivedRow = data.find((item) => item.range === `product_registry!AC${row}:AH${row}`)?.values?.[0];
    if (derivedRow) {
      derivedRow[2] = JSON.stringify(profile.material_components);
      derivedRow[5] = profile.extraction_warnings.join(" | ");
    }
  }
}

// --- Runner ---

export interface P23aSheetsClient {
  batchGetValues(
    spreadsheetId: string,
    ranges: readonly string[],
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE",
  ): Promise<{ range: string; values: unknown[][] }[]>;
  batchUpdateValues(
    spreadsheetId: string,
    data: readonly { range: string; values: readonly (readonly (string | number | boolean)[])[] }[],
  ): Promise<void>;
}

export interface P23aRunSummary {
  readonly status: "OK" | "RUN_LOCKED" | "FATAL";
  readonly run_id: string;
  readonly started_at: string;
  readonly finished_at: string;
  readonly registry_count: number;
  readonly registry_errors: readonly string[];
  readonly matched_profile_count: number;
  readonly unmatched_product_count: number;
  readonly review_count: number;
  readonly sheet_request_ranges: number;
  readonly sheet_write: "DISABLED" | "OK" | "FAILED";
  readonly lock_released: boolean;
  readonly fatal_error: string | null;
}

export interface P23aRegistrySyncOptions {
  readonly redis: ReturnType<typeof createClient>;
  readonly sheets: P23aSheetsClient;
  readonly feed: { fetchFeed(): Promise<string> };
  readonly xmlParser: { parse(xml: string): Record<string, unknown> };
  readonly sheetId: string;
  readonly writeEnabled: boolean;
  readonly runId: string;
  readonly now?: () => Date;
  readonly logger?: {
    info: (context: Record<string, unknown>, message: string) => void;
    error: (context: Record<string, unknown>, message: string) => void;
  };
}

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

export class P23aRegistrySync {
  private readonly options: P23aRegistrySyncOptions;
  private readonly logger: NonNullable<P23aRegistrySyncOptions["logger"]>;

  constructor(options: P23aRegistrySyncOptions) {
    if (!options.sheetId.trim()) throw new Error("DATA_INGESTION_V2_SHEET_ID_REQUIRED");
    this.options = options;
    this.logger = options.logger ?? noopLogger;
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  async run(): Promise<P23aRunSummary> {
    const redis = this.options.redis;
    const startedAt = this.now().toISOString();
    const lockToken = `${this.options.runId}:${this.now().getTime()}`;
    const base = {
      run_id: this.options.runId,
      started_at: startedAt,
      finished_at: startedAt,
      registry_count: 0,
      registry_errors: [] as string[],
      matched_profile_count: 0,
      unmatched_product_count: 0,
      review_count: 0,
      sheet_request_ranges: 0,
      sheet_write: "DISABLED" as P23aRunSummary["sheet_write"],
      lock_released: false,
      fatal_error: null,
    };

    const acquired = await redis.set(REGISTRY_SYNC_LOCK_KEY, lockToken, { NX: true, PX: 900_000 });
    if (acquired !== "OK") return { ...base, status: "RUN_LOCKED" };

    try {
      const [xml, ranges] = await Promise.all([
        this.options.feed.fetchFeed(),
        this.options.sheets.batchGetValues(
          this.options.sheetId, ["product_registry!A:AZ"], "UNFORMATTED_VALUE",
        ),
      ]);
      const registryResult = buildRegistryMap(sheetRowsFromValues(ranges[0]?.values));
      const parsed = this.options.xmlParser.parse(xml);
      const channel = ((parsed.rss as Record<string, unknown>)?.channel ?? parsed.channel ?? {}) as Record<string, unknown>;
      const rawItems = channel.item;
      const channelItems = rawItems === null || rawItems === undefined
        ? []
        : (Array.isArray(rawItems) ? rawItems : [rawItems]) as Record<string, unknown>[];

      const now = this.now().toISOString();
      const rawProfiles = buildXmlProfiles(
        registryResult.registry, groupXmlItems(channelItems), now,
      );
      const data = buildRegistrySheetBatch(rawProfiles, now);
      const profiles = normalizeStructuredExtraction(rawProfiles);
      patchRegistrySheetBatch(profiles, data);

      let sheetWrite: P23aRunSummary["sheet_write"] = "DISABLED";
      if (this.options.writeEnabled) {
        try {
          await this.options.sheets.batchUpdateValues(this.options.sheetId, data);
          sheetWrite = "OK";
        } catch (error) {
          this.logger.error({ err: String(error) }, "product_registry write failed");
          sheetWrite = "FAILED";
        }
      }

      const released = await this.releaseLock(lockToken);
      const summary: P23aRunSummary = {
        status: "OK",
        run_id: this.options.runId,
        started_at: startedAt,
        finished_at: this.now().toISOString(),
        registry_count: registryResult.registry_count,
        registry_errors: registryResult.registry_errors,
        matched_profile_count: profiles.length,
        unmatched_product_count: Math.max(0, registryResult.registry_count - profiles.length),
        review_count: profiles.filter((profile) => profile.review_status === "NEED_REVIEW").length,
        sheet_request_ranges: data.length,
        sheet_write: sheetWrite,
        lock_released: released,
        fatal_error: null,
      };
      this.logger.info({ summary }, "p23a registry sync completed");
      return summary;
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 1_000);
      this.logger.error({ err: message }, "p23a registry sync failed");
      const released = await this.releaseLock(lockToken);
      return { ...base, status: "FATAL", finished_at: this.now().toISOString(), fatal_error: message, lock_released: released };
    }
  }

  private async releaseLock(lockToken: string): Promise<boolean> {
    try {
      const result = await this.options.redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        { keys: [REGISTRY_SYNC_LOCK_KEY], arguments: [lockToken] },
      );
      return Number(result) === 1;
    } catch {
      return false;
    }
  }
}

