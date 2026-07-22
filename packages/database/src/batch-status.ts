import { Pool } from "pg";

export type BatchWorkerType =
  | "POS_SNAPSHOT"
  | "P23A_REGISTRY_SYNC"
  | "P23B_METADATA_STAGING"
  | "P23C_QDRANT_PUBLISHER";

export type BatchWorkerStatus = "STARTING" | "IDLE" | "RUNNING" | "ERROR" | "STOPPING";

export type CatalogSnapshotKey =
  | "POS_CATALOG"
  | "PRODUCT_REGISTRY"
  | "IMAGE_REGISTRY"
  | "QDRANT_COLLECTION";

export interface BatchHeartbeatInput {
  readonly workerType: BatchWorkerType;
  readonly workerId: string;
  readonly status: BatchWorkerStatus;
  readonly mode?: string | undefined;
  readonly errorCode?: string | undefined;
  readonly runMs?: number | undefined;
  readonly stats?: Record<string, unknown> | undefined;
}

export interface CatalogSnapshotInput {
  readonly snapshotKey: CatalogSnapshotKey;
  readonly source: string;
  readonly status: "OK" | "WARNING" | "ERROR" | "STALE";
  /** Bỏ trống để giữ nguyên số bản ghi đã biết. Dùng khi chu kỳ thất bại: đánh
   *  dấu nguồn đang lỗi nhưng không xoá con số của lần chạy tốt gần nhất. */
  readonly recordCount?: number | undefined;
  readonly detail?: string | undefined;
  readonly metrics?: Record<string, unknown> | undefined;
  readonly observedAt?: Date | undefined;
  readonly issues?: readonly CatalogIssueInput[] | undefined;
}

export interface CatalogIssueInput {
  readonly productId: string;
  readonly issueCode: string;
  readonly severity: "critical" | "warning";
  readonly source?: string | undefined;
}

/** Số dòng `catalog_data_issues` giữ lại cho mỗi nguồn: trang quản trị chỉ hiển
 *  thị danh sách ngắn, và một nguồn hỏng toàn bộ không nên ngập bảng. */
const MAX_ISSUES_PER_SNAPSHOT = 200;

function text(value: string, limit: number): string {
  return value.trim().slice(0, limit);
}

function integer(value: number | undefined, max: number): number | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

export class PostgresBatchStatusStore {
  private readonly pool: Pool;

  constructor(connectionString: string) {
    if (!connectionString.trim()) throw new Error("BATCH_STATUS_DATABASE_URL_REQUIRED");
    this.pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 30_000 });
  }

  async heartbeat(input: BatchHeartbeatInput): Promise<void> {
    await this.pool.query(
      `INSERT INTO batch_worker_status (
         worker_type, worker_id, status, mode, last_seen_at, last_success_at,
         last_error_code, last_run_ms, stats
       ) VALUES (
         $1, $2, $3, $4, now(),
         CASE WHEN $3 = 'IDLE' THEN now() ELSE NULL END,
         $5, $6, $7::jsonb
       )
       ON CONFLICT (worker_type, worker_id) DO UPDATE SET
         status = EXCLUDED.status,
         mode = COALESCE(EXCLUDED.mode, batch_worker_status.mode),
         last_seen_at = now(),
         last_success_at = CASE
           WHEN EXCLUDED.status = 'IDLE' THEN now()
           ELSE batch_worker_status.last_success_at
         END,
         last_error_code = EXCLUDED.last_error_code,
         last_run_ms = COALESCE(EXCLUDED.last_run_ms, batch_worker_status.last_run_ms),
         stats = CASE
           WHEN EXCLUDED.stats = '{}'::jsonb THEN batch_worker_status.stats
           ELSE EXCLUDED.stats
         END,
         updated_at = now()`,
      [
        input.workerType,
        text(input.workerId, 128),
        input.status,
        input.mode ? text(input.mode, 64) : null,
        input.errorCode ? text(input.errorCode, 128) : null,
        integer(input.runMs, 2_147_483_647),
        JSON.stringify(input.stats ?? {}),
      ],
    );
  }

  /** Ghi trạng thái nguồn dữ liệu và thay toàn bộ danh sách mã cần bổ sung của
   *  nguồn đó trong cùng một giao dịch, để trang quản trị không bao giờ đọc
   *  được trạng thái mới ghép với danh sách cũ. */
  async recordCatalogSnapshot(input: CatalogSnapshotInput): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO catalog_snapshot_status (
           snapshot_key, source, status, record_count, detail, metrics, observed_at
         ) VALUES ($1, $2, $3, COALESCE($4, 0), $5, $6::jsonb, COALESCE($7, now()))
         ON CONFLICT (snapshot_key) DO UPDATE SET
           source = EXCLUDED.source,
           status = EXCLUDED.status,
           record_count = COALESCE($4, catalog_snapshot_status.record_count),
           detail = EXCLUDED.detail,
           metrics = EXCLUDED.metrics,
           observed_at = EXCLUDED.observed_at,
           updated_at = now()`,
        [
          input.snapshotKey,
          text(input.source, 128),
          input.status,
          integer(input.recordCount, 2_147_483_647),
          input.detail ? text(input.detail, 512) : null,
          JSON.stringify(input.metrics ?? {}),
          input.observedAt ?? null,
        ],
      );

      if (input.issues) {
        await client.query("DELETE FROM catalog_data_issues WHERE snapshot_key = $1", [
          input.snapshotKey,
        ]);
        const issues = input.issues.slice(0, MAX_ISSUES_PER_SNAPSHOT);
        for (const issue of issues) {
          await client.query(
            `INSERT INTO catalog_data_issues (
               snapshot_key, product_id, issue_code, severity, source
             ) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (snapshot_key, product_id, issue_code) DO NOTHING`,
            [
              input.snapshotKey,
              text(issue.productId, 128),
              text(issue.issueCode, 128),
              issue.severity,
              text(issue.source ?? input.source, 128),
            ],
          );
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
