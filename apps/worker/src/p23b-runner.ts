/**
 * Runner P2.3B: hàng đợi có giới hạn concurrency và checkpoint theo từng nhóm ảnh.
 *
 * Khác workflow n8n (gom hết rồi mới ghi Sheets một lần ở cuối), runner này flush kết quả
 * theo lô nhỏ. Nếu tiến trình chết giữa chừng, những ảnh đã ghi vào `image_registry` không
 * bị phân tích lại vì `SOURCE_HASH` trong sheet chính là checkpoint bền vững.
 */
import type { createClient } from "redis";
import type { ImagePipeline, RateLimiter } from "./p23c-publisher.js";
import type { XmlProfile } from "./p23c-profiles.js";
import {
  buildImageRegistryMap,
  buildImageRegistryRow,
  buildMetadataJobs,
  buildSheetBatchRequest,
  parseImageMetadata,
  selectPendingMetadataBatch,
  IMAGE_REGISTRY_HEADERS,
  type ImageClassifier,
  type MetadataRunContext,
  type MetadataSchemaConfig,
  type SelectedMetadataJob,
  type StagedRow,
} from "./p23b-metadata-staging.js";
import {
  buildXmlProfiles,
  groupXmlItems,
  normalizeStructuredExtraction,
} from "./p23c-profiles.js";
import { buildRegistryMap } from "./p23c-jobs.js";

export interface P23bSheetsClient {
  batchGetValues(
    spreadsheetId: string,
    ranges: readonly string[],
    valueRenderOption?: "FORMATTED_VALUE" | "UNFORMATTED_VALUE",
  ): Promise<{ range: string; values: unknown[][] }[]>;
  batchUpdateValues(
    spreadsheetId: string,
    data: readonly { range: string; values: readonly (readonly (string | number | boolean)[])[] }[],
  ): Promise<void>;
  appendValues(
    spreadsheetId: string,
    range: string,
    values: readonly (readonly (string | number | boolean)[])[],
  ): Promise<void>;
  ensureSheet(spreadsheetId: string, title: string, headers: readonly string[]): Promise<boolean>;
}

export interface P23bRunSummary {
  readonly status: "OK" | "RUN_LOCKED" | "NO_PENDING_WORK" | "FATAL";
  readonly run_id: string;
  readonly started_at: string;
  readonly finished_at: string;
  readonly staged: number;
  readonly failed: number;
  readonly skipped: number;
  readonly pending_before: number;
  readonly selected: number;
  readonly remaining: number;
  /** Số dòng đang có trong `image_registry` ở vòng quét cuối cùng. Dùng cho
   *  trang quản trị; 0 nghĩa là chưa đọc được sheet lần nào trong chu kỳ. */
  readonly image_registry_rows: number;
  readonly existing_updated: number;
  readonly new_appended: number;
  readonly marked_stale: number;
  readonly sheet_write: "DISABLED" | "OK" | "FAILED";
  readonly created_sheet: boolean;
  readonly rounds: number;
  readonly stopped_because: string;
  readonly lock_released: boolean;
  readonly error_sample: string;
  readonly fatal_error: string | null;
}

export interface P23bRunnerOptions {
  readonly redis: ReturnType<typeof createClient>;
  readonly sheets: P23bSheetsClient;
  readonly feed: { fetchFeed(): Promise<string> };
  readonly xmlParser: { parse(xml: string): Record<string, unknown> };
  readonly images: Pick<ImagePipeline, "prepare">;
  readonly classifier: ImageClassifier;
  readonly rateLimiter: RateLimiter;
  readonly sheetId: string;
  readonly schema: MetadataSchemaConfig;
  readonly shardCount: number;
  readonly shardIndex: number;
  readonly batchSize: number;
  readonly recheckDays: number;
  readonly onlyNewImages: boolean;
  readonly drainEnabled: boolean;
  readonly maxRounds: number;
  readonly maxRunMs: number;
  readonly concurrency: number;
  readonly flushEvery: number;
  readonly writeEnabled: boolean;
  readonly staleOnlyWhenDraftChanges: boolean;
  readonly runId: string;
  readonly now?: () => Date;
  readonly logger?: {
    info: (context: Record<string, unknown>, message: string) => void;
    error: (context: Record<string, unknown>, message: string) => void;
  };
}

const noopLogger = { info: (): void => undefined, error: (): void => undefined };

const RETRYABLE_PATTERN =
  /too many requests|timeout|timed out|econnreset|socket hang up|(?<!\d)(?:429|500|502|503|504)(?!\d)/iu;

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

export class P23bMetadataStaging {
  private readonly options: P23bRunnerOptions;
  private readonly logger: NonNullable<P23bRunnerOptions["logger"]>;

  constructor(options: P23bRunnerOptions) {
    if (!options.sheetId.trim()) throw new Error("DATA_INGESTION_V2_SHEET_ID_REQUIRED");
    this.options = options;
    this.logger = options.logger ?? noopLogger;
  }

  private now(): Date {
    return this.options.now ? this.options.now() : new Date();
  }

  private lockKey(): string {
    return `lock:metadata-staging:lana_multimodal_data_v2:shard:${this.options.shardIndex}:of:${this.options.shardCount}`;
  }

  /** Xử lý một ảnh: tải + resize -> rate slot -> Gemini -> ép schema -> dựng dòng sheet. */
  private async stageImage(job: SelectedMetadataJob): Promise<StagedRow> {
    try {
      const prepared = await this.options.images.prepare(job.image_url);
      await this.options.rateLimiter.acquire();
      const raw = await this.options.classifier.classify(
        prepared.buffer.toString("base64"),
        job.contextual_text,
      );
      const metadata = parseImageMetadata(raw, this.options.schema, this.now().toISOString());
      return buildImageRegistryRow(
        job, metadata, prepared.buffer, this.options.staleOnlyWhenDraftChanges,
      );
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 1_000);
      return {
        status: "FAILED",
        point_id: job.point_id,
        ma_sp: String(job.payload?.ma_sp || ""),
        image_url: job.image_url,
        metadata_sheet_row: Number(job.metadata_sheet_row || 0),
        existing_row: Boolean(job.existing_image_registry),
        source_changed: false,
        review_status_update: "",
        source_hash: job.source_hash,
        ai_values: [],
        full_values: [],
        error: message,
      };
    }
  }

  /** Ghi một lô kết quả xuống Sheets. Trả về số dòng cập nhật / thêm mới. */
  private async flush(rows: readonly StagedRow[]): Promise<{ updated: number; appended: number; ok: boolean }> {
    const request = buildSheetBatchRequest(rows);
    if (!request.updates.length && !request.appends.length) {
      return { updated: 0, appended: 0, ok: true };
    }
    if (!this.options.writeEnabled) {
      return { updated: request.existing_update_count, appended: request.new_append_count, ok: true };
    }
    try {
      if (request.updates.length) {
        await this.options.sheets.batchUpdateValues(this.options.sheetId, request.updates);
      }
      if (request.appends.length) {
        // values:append với INSERT_ROWS để các shard không tự chọn trùng dòng.
        await this.options.sheets.appendValues(this.options.sheetId, "image_registry!A:AP", request.appends);
      }
      return { updated: request.existing_update_count, appended: request.new_append_count, ok: true };
    } catch (error) {
      this.logger.error({ err: String(error) }, "image_registry flush failed");
      return { updated: 0, appended: 0, ok: false };
    }
  }

  /** Chạy hàng đợi với giới hạn concurrency, flush theo lô để tạo checkpoint. */
  private async processQueue(
    jobs: readonly SelectedMetadataJob[],
  ): Promise<{ results: StagedRow[]; updated: number; appended: number; writeOk: boolean }> {
    const results: StagedRow[] = [];
    const pendingFlush: StagedRow[] = [];
    let updated = 0;
    let appended = 0;
    let writeOk = true;
    let cursor = 0;

    const flushPending = async (): Promise<void> => {
      if (!pendingFlush.length) return;
      const batch = pendingFlush.splice(0, pendingFlush.length);
      const outcome = await this.flush(batch);
      updated += outcome.updated;
      appended += outcome.appended;
      if (!outcome.ok) writeOk = false;
      this.logger.info(
        { flushed: batch.length, updated, appended, done: results.length, total: jobs.length },
        "p23b checkpoint",
      );
    };

    const worker = async (): Promise<void> => {
      while (cursor < jobs.length) {
        const index = cursor;
        cursor += 1;
        const job = jobs[index];
        if (!job) continue;
        const row = await this.stageImage(job);
        results.push(row);
        if (row.status === "FAILED") {
          this.logger.error({ pointId: row.point_id, maSp: row.ma_sp, err: row.error }, "p23b image failed");
        } else {
          pendingFlush.push(row);
        }
        // Dòng mới phải ghi tuần tự theo lô để append không chen ngang nhau.
        if (pendingFlush.length >= this.options.flushEvery) await flushPending();
      }
    };

    const workers = Array.from(
      { length: Math.max(1, Math.min(this.options.concurrency, jobs.length)) },
      () => worker(),
    );
    await Promise.all(workers);
    await flushPending();
    return { results, updated, appended, writeOk };
  }

  async run(): Promise<P23bRunSummary> {
    const redis = this.options.redis;
    const runStartMs = this.now().getTime();
    const startedAt = this.now().toISOString();
    const lockKey = this.lockKey();
    const lockToken = `${this.options.runId}:${runStartMs}`;
    const base = {
      run_id: this.options.runId,
      started_at: startedAt,
      finished_at: startedAt,
      staged: 0, failed: 0, skipped: 0,
      pending_before: 0, selected: 0, remaining: 0, image_registry_rows: 0,
      existing_updated: 0, new_appended: 0, marked_stale: 0,
      sheet_write: "DISABLED" as P23bRunSummary["sheet_write"],
      created_sheet: false,
      rounds: 0,
      stopped_because: "",
      lock_released: false,
      error_sample: "",
      fatal_error: null,
    };

    const acquired = await redis.set(lockKey, lockToken, { NX: true, PX: 14_400_000 });
    if (acquired !== "OK") return { ...base, status: "RUN_LOCKED" };

    try {
      const createdSheet = this.options.writeEnabled
        ? await this.options.sheets.ensureSheet(this.options.sheetId, "image_registry", IMAGE_REGISTRY_HEADERS)
        : false;

      // XML và hồ sơ sản phẩm không đổi trong một lần chạy nên chỉ tải một lần;
      // riêng image_registry phải đọc lại mỗi vòng vì các vòng trước đã thêm dòng.
      const xml = await this.options.feed.fetchFeed();
      const parsed = this.options.xmlParser.parse(xml);
      const channel = ((parsed.rss as Record<string, unknown>)?.channel ?? parsed.channel ?? {}) as Record<string, unknown>;
      const rawItems = channel.item;
      const channelItems = rawItems === null || rawItems === undefined
        ? []
        : (Array.isArray(rawItems) ? rawItems : [rawItems]) as Record<string, unknown>[];

      const run: MetadataRunContext = {
        run_id: this.options.runId,
        started_at: startedAt,
        shard_count: this.options.shardCount,
        shard_index: this.options.shardIndex,
        shard_label: `${this.options.shardIndex + 1}/${this.options.shardCount}`,
      };
      const policy = {
        batchSize: this.options.batchSize,
        recheckDays: this.options.recheckDays,
        onlyNewImages: this.options.onlyNewImages,
      };

      const maxRounds = this.options.drainEnabled ? Math.max(1, this.options.maxRounds) : 1;
      const allResults: StagedRow[] = [];
      let totalUpdated = 0;
      let totalAppended = 0;
      let writeOk = true;
      let firstPending = 0;
      let totalSelected = 0;
      let lastRemaining = 0;
      let rounds = 0;
      let registryRowCount = 0;
      let stoppedBecause = "no_pending_work";

      for (let round = 0; round < maxRounds; round += 1) {
        if (this.now().getTime() - runStartMs >= this.options.maxRunMs) {
          stoppedBecause = "max_run_time";
          break;
        }

        const ranges = await this.options.sheets.batchGetValues(
          this.options.sheetId,
          ["product_registry!A:AZ", "image_registry!A:AP"],
          "UNFORMATTED_VALUE",
        );
        const registryResult = buildRegistryMap(sheetRowsFromValues(ranges[0]?.values));
        const profiles: XmlProfile[] = normalizeStructuredExtraction(
          buildXmlProfiles(registryResult.registry, groupXmlItems(channelItems), this.now().toISOString()),
        );
        const jobs = buildMetadataJobs(profiles, run, this.options.schema);
        const registry = buildImageRegistryMap(sheetRowsFromValues(ranges[1]?.values));
        const batch = selectPendingMetadataBatch(jobs, registry, run, policy, this.now().getTime());

        registryRowCount = registry.rows.length;
        if (round === 0) firstPending = batch.meta.pending_metadata_count;
        lastRemaining = batch.meta.remaining_metadata_count;

        this.logger.info(
          {
            round: round + 1,
            profiles: profiles.length,
            jobs: jobs.length,
            registryRows: registry.rows.length,
            pending: batch.meta.pending_metadata_count,
            selected: batch.meta.selected_metadata_count,
            concurrency: this.options.concurrency,
            onlyNewImages: this.options.onlyNewImages,
            writeEnabled: this.options.writeEnabled,
          },
          "p23b batch planned",
        );

        if (!batch.selected.length) {
          stoppedBecause = "no_pending_work";
          break;
        }

        rounds += 1;
        totalSelected += batch.meta.selected_metadata_count;
        const outcome = await this.processQueue(batch.selected);
        allResults.push(...outcome.results);
        totalUpdated += outcome.updated;
        totalAppended += outcome.appended;
        if (!outcome.writeOk) writeOk = false;

        // Không ghi được thì vòng sau vẫn thấy đúng danh sách cũ -> lặp vô hạn.
        if (!outcome.writeOk && this.options.writeEnabled) {
          stoppedBecause = "sheet_write_failed";
          break;
        }
        if (!outcome.results.some((row) => row.status === "STAGED")) {
          stoppedBecause = "no_progress";
          break;
        }
        // Không ghi Sheets thì trạng thái không đổi, vét thêm vòng nữa là vô nghĩa.
        if (!this.options.writeEnabled) {
          stoppedBecause = "dry_run_single_round";
          break;
        }
        if (round + 1 >= maxRounds) stoppedBecause = "max_rounds";
      }

      const staged = allResults.filter((row) => row.status === "STAGED");
      const failures = allResults.filter((row) => row.status === "FAILED");
      const released = await this.releaseLock(lockKey, lockToken);
      const finishedAt = this.now().toISOString();

      if (!rounds) {
        return {
          ...base,
          status: "NO_PENDING_WORK",
          finished_at: finishedAt,
          created_sheet: createdSheet,
          remaining: lastRemaining,
          image_registry_rows: registryRowCount,
          // Không có việc nên không ghi gì, nhưng vẫn phải phản ánh đúng cấu hình:
          // báo DISABLED khi đang bật ghi sẽ khiến người vận hành tưởng cờ chưa ăn.
          sheet_write: this.options.writeEnabled ? "OK" : "DISABLED",
          stopped_because: stoppedBecause,
          lock_released: released,
        };
      }

      const summary: P23bRunSummary = {
        status: "OK",
        run_id: this.options.runId,
        started_at: startedAt,
        finished_at: finishedAt,
        staged: staged.length,
        failed: failures.length,
        skipped: allResults.filter((row) => row.status === "SKIPPED").length,
        pending_before: firstPending,
        selected: totalSelected,
        remaining: lastRemaining + failures.length,
        image_registry_rows: registryRowCount,
        existing_updated: totalUpdated,
        new_appended: totalAppended,
        marked_stale: staged.filter((row) => row.review_status_update === "STALE").length,
        sheet_write: this.options.writeEnabled ? (writeOk ? "OK" : "FAILED") : "DISABLED",
        created_sheet: createdSheet,
        rounds,
        stopped_because: stoppedBecause,
        lock_released: released,
        error_sample: failures.slice(0, 10)
          .map((row) => [row.ma_sp, row.image_url, row.error].filter(Boolean).join(" | "))
          .join(" || ").slice(0, 45_000),
        fatal_error: null,
      };

      await redis.set(
        `ingest:metadata-progress:shard:${this.options.shardIndex}:of:${this.options.shardCount}`,
        JSON.stringify({
          ...summary,
          retryable_failed: failures.filter((row) => RETRYABLE_PATTERN.test(row.error)).length,
        }),
        { EX: 604_800 },
      );
      return summary;
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error).slice(0, 1_000);
      this.logger.error({ err: message }, "p23b run failed");
      const released = await this.releaseLock(lockKey, lockToken);
      return {
        ...base,
        status: "FATAL",
        finished_at: this.now().toISOString(),
        fatal_error: message,
        lock_released: released,
      };
    } finally {
      await this.releaseLock(lockKey, lockToken);
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
