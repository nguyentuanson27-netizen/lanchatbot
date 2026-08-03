import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PiiType } from "@lana/dataset-review";
import { LocalEnvelopeCipher } from "@lana/database";
import {
  PostgresDatasetReviewStore,
  type ImportRecord,
  type ImportRecordOutcome,
} from "./dataset-review-store.js";

// CLI import for Redis transcript exports: an array of { key, ttl, value }.
// Idempotent by file checksum (dataset) and per-record source key. Processes in
// chunks so a large file is not held as thousands of live DB rows at once. Raw
// PII is never printed; only aggregate counts are logged.

const CHUNK_SIZE = 200;

interface TranscriptRecord {
  readonly key: string;
  readonly ttl?: number;
  readonly value: string;
}

interface AggregateReport {
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
  lengthBins: Record<string, number>;
  piiTotals: Record<PiiType, number>;
}

function isTranscriptRecord(value: unknown): value is TranscriptRecord {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.key === "string" && typeof record.value === "string";
}

export async function importTranscriptFile(
  store: PostgresDatasetReviewStore,
  filePath: string,
  createdBySubject: string,
): Promise<AggregateReport & { datasetId: string; created: boolean }> {
  const buffer = await readFile(filePath);
  const sourceChecksum = createHash("sha256").update(buffer).digest("hex");
  const parsed = JSON.parse(buffer.toString("utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error("TRANSCRIPT_FILE_NOT_ARRAY");

  const { datasetId, created } = await store.createDataset({
    name: basename(filePath),
    sourceType: "REDIS_TRANSCRIPT_JSON",
    sourceChecksum,
    originalFilename: basename(filePath),
    createdBySubject,
  });

  const aggregate: AggregateReport = {
    total: parsed.length,
    imported: 0,
    duplicates: 0,
    failed: 0,
    lengthBins: {},
    piiTotals: { PHONE: 0, EMAIL: 0, URL: 0, ORDER_ID: 0, ADDRESS: 0, PERSON: 0 },
  };

  for (let offset = 0; offset < parsed.length; offset += CHUNK_SIZE) {
    const slice = parsed.slice(offset, offset + CHUNK_SIZE);
    const records: ImportRecord[] = [];
    for (const entry of slice) {
      if (!isTranscriptRecord(entry)) {
        aggregate.failed += 1;
        continue;
      }
      records.push({
        sourceKey: entry.key,
        sourceTtl: typeof entry.ttl === "number" ? entry.ttl : null,
        value: entry.value,
        rawPayload: entry,
      });
    }
    const result = await store.importRecords(datasetId, records);
    tally(aggregate, result.outcomes);
    for (const [bin, count] of Object.entries(result.report.lengthBins)) {
      aggregate.lengthBins[bin] = (aggregate.lengthBins[bin] ?? 0) + count;
    }
    for (const type of Object.keys(aggregate.piiTotals) as PiiType[]) {
      aggregate.piiTotals[type] += result.report.piiTotals[type];
    }
  }

  await store.finalizeDataset(datasetId, {
    total: aggregate.total,
    imported: aggregate.imported,
    failed: aggregate.failed,
    report: aggregate,
  });

  return { datasetId, created, ...aggregate };
}

function tally(aggregate: AggregateReport, outcomes: readonly ImportRecordOutcome[]): void {
  for (const outcome of outcomes) {
    if (outcome.status === "IMPORTED") aggregate.imported += 1;
    else if (outcome.status === "DUPLICATE") aggregate.duplicates += 1;
    else aggregate.failed += 1;
  }
}

async function main(): Promise<void> {
  const filePath = process.argv[2];
  const createdBySubject = process.env.DATASET_IMPORT_ACTOR ?? "cli-import";
  const databaseUrl = process.env.DATABASE_URL;
  const dataKey = process.env.REALTIME_DATA_KEY;
  const dataKeyRef = process.env.REALTIME_DATA_KEY_REF;
  if (!filePath) throw new Error("Usage: node dist/dataset-import.js <file.json>");
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!dataKey || !dataKeyRef) throw new Error("REALTIME_DATA_KEY and REALTIME_DATA_KEY_REF are required");

  const store = new PostgresDatasetReviewStore(databaseUrl, new LocalEnvelopeCipher(dataKey, dataKeyRef));
  try {
    const report = await importTranscriptFile(store, resolve(filePath), createdBySubject);
    // Counts only. Never print transcript content or PII.
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await store.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Import failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
