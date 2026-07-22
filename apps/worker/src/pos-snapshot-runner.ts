import { CatalogSnapshotV3Schema, catalogSnapshotKey } from "@lana/business-tools";
import type { createClient } from "redis";
import {
  buildIndex,
  buildInventoryMatrix,
  buildProductSnapshot,
  buildSheetConfig,
  collectAlertRows,
  defaultMappings,
  parseSheetValues,
  txt,
  type PosSheetConfig,
  type PosShopsSecretMap,
  type PosStatusRow,
  type ReleaseInfo,
} from "./pos-snapshot-core.js";

const SHEET_RANGES = [
  "config_shop_id!A:AZ",
  "product_registry!A:AZ",
  "component_mapping!A:AZ",
  "fulfillment_policy!A:AZ",
  "shipping_eta!A:AZ",
  "inventory_current!A:AA",
] as const;

const LOCK_KEY = "lock:pos_snapshot:v2";
const LOCK_TTL_MS = 1_200_000;
const SHEET_CACHE_KEY = "config:pos_sheet_batch";
const SHEET_CACHE_TTL_SECONDS = 86_400;
const RELEASE_KEY = "lana:release:active";
const SHIPPING_KEY = "catalog:shipping_eta";

const RELEASE_LOCK_SCRIPT =
  "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end";

export interface SheetsBatchReader {
  batchGetValues(
    spreadsheetId: string,
    ranges: readonly string[],
  ): Promise<{ range: string; values: unknown[][] }[]>;
  batchUpdateValues(
    spreadsheetId: string,
    data: readonly { range: string; values: readonly (readonly (string | number | boolean)[])[] }[],
  ): Promise<void>;
}

export interface PosVariationsFetcher {
  fetchAllVariations(shopId: string, apiKey: string): Promise<Record<string, unknown>[]>;
}

export interface PosAlertNotifier {
  notify(text: string): Promise<void>;
}

export interface PosSnapshotRunnerOptions {
  readonly redis: ReturnType<typeof createClient>;
  readonly sheets: SheetsBatchReader;
  readonly pos: PosVariationsFetcher;
  readonly sheetId: string;
  readonly shopsSecret: PosShopsSecretMap;
  readonly snapshotTtlSeconds: number;
  readonly sheetsWritebackEnabled: boolean;
  readonly notifier?: PosAlertNotifier | null;
  readonly runId?: string;
  readonly now?: () => Date;
  readonly logger?: {
    info: (context: Record<string, unknown>, message: string) => void;
    error: (context: Record<string, unknown>, message: string) => void;
  };
}

export interface PosCatalogIssue {
  readonly productId: string;
  readonly issueCode: string;
  readonly severity: "critical" | "warning";
}

export interface PosSnapshotRunSummary {
  readonly status: "OK" | "RUN_LOCKED" | "FATAL";
  readonly configSource: "GOOGLE_SHEETS_BATCH" | "REDIS_CACHE" | "NONE";
  readonly productCount: number;
  readonly snapshotWrites: number;
  readonly statusCounts: Readonly<Record<string, number>>;
  readonly alertRowCount: number;
  readonly sheetsWriteback: "DISABLED" | "OK" | "FAILED";
  readonly fatalError: string | null;
  readonly syncedAt: string;
  /** Mã cần bổ sung dữ liệu, gộp theo sản phẩm để trang quản trị đọc lại.
   *  Rỗng khi chạy bị khoá hoặc lỗi nặng, vì lúc đó chưa quét được gì. */
  readonly issues: readonly PosCatalogIssue[];
}

/** Trạng thái đồng bộ khiến sản phẩm không dùng được để tư vấn: giá hoặc tồn
 *  không lấy được. `BOM_*` chỉ là cảnh báo cấu hình định mức. */
const CRITICAL_ISSUE_CODES = new Set([
  "SHOP_ERROR",
  "CONFIG_NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "SNAPSHOT_VALIDATION_FAILED",
]);

/** Liệt kê rõ thay vì lọc theo tiền tố `BOM_`: `BOM_STATUS` cũng nhận giá trị
 *  lành mạnh, và một giá trị mới thêm sau này không nên tự động thành cảnh báo. */
const BOM_WARNING_CODES = new Set(["BOM_REQUIRED_MISSING", "BOM_MISSING_FALLBACK"]);

export function collectCatalogIssues(rows: readonly PosStatusRow[]): PosCatalogIssue[] {
  const seen = new Map<string, PosCatalogIssue>();
  for (const row of rows) {
    const productId = String(row.PRODUCT_ID || "").trim();
    if (!productId) continue;
    const syncStatus = String(row.SYNC_STATUS ?? "").trim();
    const bomStatus = String(row.BOM_STATUS ?? "").trim();
    const codes: PosCatalogIssue[] = [];
    if (CRITICAL_ISSUE_CODES.has(syncStatus)) {
      codes.push({ productId, issueCode: syncStatus, severity: "critical" });
    }
    if (BOM_WARNING_CODES.has(bomStatus)) {
      codes.push({ productId, issueCode: bomStatus, severity: "warning" });
    }
    for (const issue of codes) {
      const key = `${issue.productId}|${issue.issueCode}`;
      if (!seen.has(key)) seen.set(key, issue);
    }
  }
  return [...seen.values()].sort(
    (left, right) => left.productId.localeCompare(right.productId)
      || left.issueCode.localeCompare(right.issueCode),
  );
}

interface CachedSheetBatch {
  readonly tabs: Record<string, unknown[][]>;
  readonly previous_inventory_rows: number;
  readonly cached_at: string;
}

const noopLogger = {
  info: (): void => undefined,
  error: (): void => undefined,
};

export class PosSnapshotRunner {
  private readonly options: PosSnapshotRunnerOptions;
  private readonly logger: NonNullable<PosSnapshotRunnerOptions["logger"]>;

  constructor(options: PosSnapshotRunnerOptions) {
    if (!options.sheetId.trim()) throw new Error("DATA_INGESTION_V2_SHEET_ID_REQUIRED");
    this.options = options;
    this.logger = options.logger ?? noopLogger;
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private async loadSheetBatch(): Promise<{
    tabs: Record<string, unknown[][]>;
    previousInventoryRows: number;
    source: "GOOGLE_SHEETS_BATCH" | "REDIS_CACHE";
  }> {
    const redis = this.options.redis;
    try {
      const ranges = await this.options.sheets.batchGetValues(this.options.sheetId, SHEET_RANGES);
      const tabs: Record<string, unknown[][]> = {
        config_shop_id: ranges[0]?.values ?? [],
        product_registry: ranges[1]?.values ?? [],
        component_mapping: ranges[2]?.values ?? [],
        fulfillment_policy: ranges[3]?.values ?? [],
        shipping_eta: ranges[4]?.values ?? [],
      };
      const previousInventoryRows = Math.max(1, (ranges[5]?.values ?? []).length);
      const payload: CachedSheetBatch = {
        tabs,
        previous_inventory_rows: previousInventoryRows,
        cached_at: this.now().toISOString(),
      };
      await redis.set(SHEET_CACHE_KEY, JSON.stringify(payload), { EX: SHEET_CACHE_TTL_SECONDS });
      return { tabs, previousInventoryRows, source: "GOOGLE_SHEETS_BATCH" };
    } catch (error) {
      this.logger.error({ err: String(error) }, "sheets batch read failed, trying redis cache");
      const raw = await redis.get(SHEET_CACHE_KEY);
      if (!raw) throw new Error("GOOGLE_SHEETS_BATCH_FAILED_AND_CACHE_EMPTY");
      const cached = JSON.parse(raw) as CachedSheetBatch;
      return {
        tabs: cached.tabs ?? {},
        previousInventoryRows: Math.max(1, Number(cached.previous_inventory_rows ?? 1)),
        source: "REDIS_CACHE",
      };
    }
  }

  private parseConfig(tabs: Record<string, unknown[][]>): PosSheetConfig {
    return buildSheetConfig(
      {
        configShopId: parseSheetValues(tabs.config_shop_id),
        productRegistry: parseSheetValues(tabs.product_registry),
        componentMapping: parseSheetValues(tabs.component_mapping),
        fulfillmentPolicy: parseSheetValues(tabs.fulfillment_policy),
        shippingEta: parseSheetValues(tabs.shipping_eta),
      },
      this.options.shopsSecret,
    );
  }

  private async releaseInfo(): Promise<ReleaseInfo> {
    try {
      const raw = await this.options.redis.get(RELEASE_KEY);
      return raw ? (JSON.parse(raw) as ReleaseInfo) : {};
    } catch {
      return {};
    }
  }

  private async alert(rows: readonly PosStatusRow[]): Promise<void> {
    if (!this.options.notifier || !rows.length) return;
    const groups: Record<string, number> = {};
    for (const row of rows) {
      const key = String(row.SYNC_STATUS || "UNKNOWN");
      groups[key] = (groups[key] ?? 0) + 1;
    }
    const text = [
      "🚨 LANA / POS SNAPSHOT ERROR",
      "Workflow: app pos-snapshot-worker",
      `Errors: ${JSON.stringify(groups)}`,
      `Examples: ${rows.slice(0, 5)
        .map((row) => [row.SHOP_ALIAS, row.PRODUCT_ID, row.SYNC_STATUS].filter(Boolean).join("/"))
        .join(", ")}`,
      `Time: ${this.now().toISOString()}`,
    ].join("\n");
    try {
      await this.options.notifier.notify(text);
    } catch (error) {
      this.logger.error({ err: String(error) }, "telegram alert failed");
    }
  }

  private async fatalAlert(message: string): Promise<void> {
    if (!this.options.notifier) return;
    const text = [
      "🚨 LANA / POS SNAPSHOT FATAL ERROR",
      `Error: ${message.slice(0, 500)}`,
      `Run: ${this.options.runId ?? "pos-snapshot-worker"}`,
      `Time: ${this.now().toISOString()}`,
    ].join("\n");
    try {
      await this.options.notifier.notify(text);
    } catch (error) {
      this.logger.error({ err: String(error) }, "telegram fatal alert failed");
    }
  }

  async run(): Promise<PosSnapshotRunSummary> {
    const redis = this.options.redis;
    const syncedAt = this.now().toISOString();
    const lockToken = `${this.options.runId ?? "pos-snapshot-worker"}:${this.now().getTime()}`;
    const acquired = await redis.set(LOCK_KEY, lockToken, { NX: true, PX: LOCK_TTL_MS });
    if (acquired !== "OK") {
      return {
        status: "RUN_LOCKED",
        configSource: "NONE",
        productCount: 0,
        snapshotWrites: 0,
        statusCounts: { RUN_LOCKED: 1 },
        alertRowCount: 0,
        sheetsWriteback: "DISABLED",
        fatalError: null,
        syncedAt,
        issues: [],
      };
    }

    try {
      let batch;
      try {
        batch = await this.loadSheetBatch();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.fatalAlert(message);
        return {
          status: "FATAL",
          configSource: "NONE",
          productCount: 0,
          snapshotWrites: 0,
          statusCounts: {},
          alertRowCount: 0,
          sheetsWriteback: "DISABLED",
          fatalError: message,
          syncedAt,
          issues: [],
        };
      }

      const config = this.parseConfig(batch.tabs);
      const release = await this.releaseInfo();
      const statusRows: PosStatusRow[] = [];
      let snapshotWrites = 0;

      await redis.set(
        SHIPPING_KEY,
        JSON.stringify({ schema_version: 1, synced_at: syncedAt, regions: config.shipping }),
        { EX: this.options.snapshotTtlSeconds },
      );

      const shopAliases = [...new Set(config.products.map((product) => product.shop_alias))];
      for (const shopAlias of shopAliases) {
        const shopProducts = config.products.filter((product) => product.shop_alias === shopAlias);
        const shop = config.shopConfigs.get(shopAlias);
        if (!shop?.shopId || !shop?.apiKey) {
          for (const product of shopProducts) {
            statusRows.push(errorStatusRow(shopAlias, product.ma_sp, "CONFIG_NOT_FOUND", "", syncedAt));
          }
          continue;
        }
        let variations: Record<string, unknown>[];
        try {
          variations = await this.options.pos.fetchAllVariations(shop.shopId, shop.apiKey);
        } catch (error) {
          const message = txt(error instanceof Error ? error.message : String(error)).slice(0, 300);
          for (const product of shopProducts) {
            statusRows.push(errorStatusRow(shopAlias, product.ma_sp, "SHOP_ERROR", message, syncedAt));
          }
          continue;
        }
        const { idx, bomIdx } = buildIndex(variations, shop);
        for (const product of shopProducts) {
          const explicit = config.mapsByProduct.get(product.ma_sp);
          const mappings = explicit?.length ? explicit : defaultMappings(product, bomIdx, idx);
          const policy = config.policies.get(product.ma_sp) ?? null;
          const result = buildProductSnapshot(
            product, mappings, policy, idx, bomIdx, config.shipping, release, syncedAt,
          );
          statusRows.push(...result.statusRows);
          const validated = CatalogSnapshotV3Schema.safeParse(result.catalog);
          if (!validated.success) {
            this.logger.error(
              { productId: product.ma_sp, issues: validated.error.issues.slice(0, 3) },
              "catalog snapshot failed schema validation, not written",
            );
            statusRows.push(errorStatusRow(
              shopAlias, product.ma_sp, "SNAPSHOT_VALIDATION_FAILED",
              validated.error.issues.map((issue) => issue.message).join(";").slice(0, 300),
              syncedAt,
            ));
            continue;
          }
          await redis.set(
            catalogSnapshotKey(shopAlias, product.ma_sp),
            JSON.stringify(result.catalog),
            { EX: this.options.snapshotTtlSeconds },
          );
          snapshotWrites += 1;
        }
      }

      const alertRows = collectAlertRows(statusRows);
      await this.alert(alertRows);

      let sheetsWriteback: PosSnapshotRunSummary["sheetsWriteback"] = "DISABLED";
      if (this.options.sheetsWritebackEnabled) {
        try {
          const matrix = buildInventoryMatrix(statusRows, batch.previousInventoryRows);
          await this.options.sheets.batchUpdateValues(this.options.sheetId, [
            { range: `inventory_current!A1:AD${matrix.length}`, values: matrix },
          ]);
          sheetsWriteback = "OK";
        } catch (error) {
          this.logger.error({ err: String(error) }, "inventory_current writeback failed");
          sheetsWriteback = "FAILED";
        }
      }

      const statusCounts: Record<string, number> = {};
      for (const row of statusRows) {
        const key = String(row.SYNC_STATUS || "UNKNOWN");
        statusCounts[key] = (statusCounts[key] ?? 0) + 1;
      }

      this.logger.info(
        {
          configSource: batch.source,
          products: config.products.length,
          snapshotWrites,
          statusCounts,
          alerts: alertRows.length,
        },
        "pos snapshot run completed",
      );

      return {
        status: "OK",
        configSource: batch.source,
        productCount: config.products.length,
        snapshotWrites,
        statusCounts,
        alertRowCount: alertRows.length,
        sheetsWriteback,
        fatalError: null,
        syncedAt,
        issues: collectCatalogIssues(statusRows),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.fatalAlert(message);
      return {
        status: "FATAL",
        configSource: "NONE",
        productCount: 0,
        snapshotWrites: 0,
        statusCounts: {},
        alertRowCount: 0,
        sheetsWriteback: "DISABLED",
        fatalError: message,
        syncedAt,
        issues: [],
      };
    } finally {
      await redis.eval(RELEASE_LOCK_SCRIPT, { keys: [LOCK_KEY], arguments: [lockToken] }).catch(() => undefined);
    }
  }
}

function errorStatusRow(
  shopAlias: string,
  productId: string,
  status: string,
  error: string,
  syncedAt: string,
): PosStatusRow {
  return {
    SNAPSHOT_KEY: [shopAlias, productId, status].join("|"),
    SHOP_ALIAS: shopAlias,
    PRODUCT_ID: productId,
    OFFER_TYPE: "",
    PRICE_SKU: "",
    COMPONENT_1_SKU: "",
    COMPONENT_2_SKU: "",
    COLOR: "__NO_COLOR__",
    SIZE: "*",
    STOCK_QUANTITY: 0,
    LIST_PRICE: null,
    SALE_PRICE: null,
    STOCK_STATUS: status,
    INVENTORY_SOURCE: "PANCAKE_POS",
    BOM_STATUS: status,
    PARENT_VARIATION_ID: "",
    PARENT_VARIATION_SKU: "",
    BOM_COMPONENTS: "",
    COMPONENT_COUNT: 0,
    TINH_TRANG: "",
    CAN_ORDER_WHEN_ZERO: false,
    PREP_MIN_DAYS: null,
    PREP_MAX_DAYS: null,
    ZERO_STOCK_POLICY: "",
    ZERO_STOCK_PREP_MIN_DAYS: null,
    ZERO_STOCK_PREP_MAX_DAYS: null,
    POS_UPDATED_AT: "",
    SYNCED_AT: syncedAt,
    SYNC_STATUS: status,
    SYNC_ERROR: error,
  };
}
