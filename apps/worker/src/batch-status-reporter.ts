import { readFileSync } from "node:fs";
import {
  PostgresBatchStatusStore,
  type BatchWorkerStatus,
  type BatchWorkerType,
  type CatalogSnapshotInput,
} from "@lana/database";

export interface BatchStatusLogger {
  readonly info: (context: Record<string, unknown>, message: string) => void;
  readonly error: (context: Record<string, unknown>, message: string) => void;
}

export interface BatchStatusReporter {
  readonly enabled: boolean;
  heartbeat(
    status: BatchWorkerStatus,
    extra?: {
      readonly errorCode?: string | undefined;
      readonly runMs?: number | undefined;
      readonly stats?: Record<string, unknown> | undefined;
    },
  ): Promise<void>;
  snapshot(input: CatalogSnapshotInput): Promise<void>;
  close(): Promise<void>;
}

/** Báo cáo trạng thái là phụ trợ cho trang quản trị: hỏng thì ghi log rồi bỏ
 *  qua. Một lỗi Postgres không được phép làm gãy chu kỳ đồng bộ dữ liệu. */
class SafeReporter implements BatchStatusReporter {
  readonly enabled = true;

  constructor(
    private readonly store: PostgresBatchStatusStore,
    private readonly workerType: BatchWorkerType,
    private readonly workerId: string,
    private readonly mode: string,
    private readonly logger: BatchStatusLogger,
  ) {}

  async heartbeat(
    status: BatchWorkerStatus,
    extra: {
      readonly errorCode?: string | undefined;
      readonly runMs?: number | undefined;
      readonly stats?: Record<string, unknown> | undefined;
    } = {},
  ): Promise<void> {
    try {
      await this.store.heartbeat({
        workerType: this.workerType,
        workerId: this.workerId,
        status,
        mode: this.mode,
        ...extra,
      });
    } catch (error) {
      this.logger.error({ err: String(error), status }, "batch heartbeat failed");
    }
  }

  async snapshot(input: CatalogSnapshotInput): Promise<void> {
    try {
      await this.store.recordCatalogSnapshot(input);
    } catch (error) {
      this.logger.error(
        { err: String(error), snapshotKey: input.snapshotKey },
        "catalog snapshot status write failed",
      );
    }
  }

  async close(): Promise<void> {
    await this.store.close().catch(() => undefined);
  }
}

const disabledReporter: BatchStatusReporter = {
  enabled: false,
  heartbeat: async (): Promise<void> => undefined,
  snapshot: async (): Promise<void> => undefined,
  close: async (): Promise<void> => undefined,
};

function connectionString(): string {
  const direct = process.env.BATCH_STATUS_DATABASE_URL?.trim();
  if (direct) return direct;
  const file = process.env.BATCH_STATUS_DATABASE_URL_FILE?.trim();
  if (!file) return "";
  try {
    return readFileSync(file, "utf8").trim();
  } catch {
    return "";
  }
}

/** Trả về reporter rỗng khi chưa cấu hình DSN, để worker chạy được ở môi trường
 *  không có Postgres (kiểm thử cục bộ, chạy một lần bằng tay). */
export function createBatchStatusReporter(
  workerType: BatchWorkerType,
  workerId: string,
  mode: string,
  logger: BatchStatusLogger,
): BatchStatusReporter {
  const dsn = connectionString();
  if (!dsn) {
    logger.info({ workerType }, "batch status reporting disabled (no DSN configured)");
    return disabledReporter;
  }
  try {
    return new SafeReporter(
      new PostgresBatchStatusStore(dsn),
      workerType,
      workerId,
      mode,
      logger,
    );
  } catch (error) {
    logger.error({ err: String(error), workerType }, "batch status reporter unavailable");
    return disabledReporter;
  }
}
