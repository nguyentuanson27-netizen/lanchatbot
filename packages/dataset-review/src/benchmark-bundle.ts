import { createHash } from "node:crypto";
import type { AnnotationScopeV1, MessageRoleV1 } from "@lana/contracts";
import { computeConversationImport } from "./import-pipeline.js";
import {
  parseGoldV2,
  resolveGoldV2Annotations,
  type GoldV2Conversation,
  type ResolvedGoldV2Annotation,
} from "./gold-v2.js";

export const OFFICIAL_WAVE1_MANIFEST_SHA256 =
  "83c8d187c6e71e93d9d06b14ca0328d6d63423dc905b7daa34b3a6102bebd91d";
export const OFFICIAL_WAVE1_INCLUDED_COUNT = 1_955;
export const OFFICIAL_WAVE1_EXCLUDED_COUNT = 45;
export const OFFICIAL_WAVE1_ANNOTATION_COUNT = 13_887;

export type BenchmarkAnnotationConfidence =
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "NOT_RECORDED";

export interface Wave1BenchmarkMessage {
  readonly turnIndex: number;
  readonly role: MessageRoleV1;
  readonly redactedText: string;
}

export interface Wave1BenchmarkAnnotation extends ResolvedGoldV2Annotation {
  readonly confidence: BenchmarkAnnotationConfidence;
  readonly source: "ADJUDICATOR";
  readonly sourceVersion: "gold-v2";
  readonly derivationVersion: "gold-v2-derived-v1" | null;
}

export interface Wave1BenchmarkConversation {
  readonly conversationId: string;
  readonly sourceOrdinal: number;
  readonly duplicateGroupId: string;
  readonly qualityFlags: readonly string[];
  readonly startTruncated: boolean;
  readonly messages: readonly Wave1BenchmarkMessage[];
  readonly annotations: readonly Wave1BenchmarkAnnotation[];
  readonly labelCodes: ReadonlySet<string>;
}

export interface Wave1BundleSummary {
  readonly schemaVersion: 1;
  readonly manifestSha256: string;
  readonly goldSha256: string;
  readonly historySha256: string;
  readonly boundCount: number;
  readonly includedCount: number;
  readonly excludedCount: number;
  readonly annotationCount: number;
  readonly bindingMismatchCount: 0;
}

export interface Wave1BenchmarkBundle {
  readonly summary: Wave1BundleSummary;
  readonly conversations: readonly Wave1BenchmarkConversation[];
}

interface HistoryRecord {
  readonly key: string;
  readonly value: string;
  readonly ttl: unknown;
}

interface ManifestSource {
  readonly sizeBytes: number;
  readonly sha256: string;
}

interface ManifestEntry {
  readonly n: number;
  readonly key: string;
  readonly goldIndex: number;
  readonly historyIndex: number;
  readonly ttl: unknown;
  readonly transcriptBytesUtf8: number;
  readonly transcriptSha256: string;
  readonly goldRecordSha256: string;
  readonly historyRecordSha256: string;
  readonly bindingSha256: string;
}

interface TranscriptManifest {
  readonly schemaVersion: "gold-v2-transcript-manifest-v1";
  readonly sources: {
    readonly gold: ManifestSource;
    readonly historyExport: ManifestSource;
  };
  readonly entries: readonly ManifestEntry[];
}

function sha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function nonNegativeInteger(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error(code);
  return value as number;
}

function hash(value: unknown, code: string): string {
  const parsed = requiredString(value, code);
  if (!/^[a-f0-9]{64}$/u.test(parsed)) throw new Error(code);
  return parsed;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((key) => [
          key,
          canonicalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function json(bytes: Uint8Array, code: string): unknown {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown;
  } catch {
    throw new Error(code);
  }
}

function parseHistory(value: unknown): readonly HistoryRecord[] {
  if (!Array.isArray(value)) throw new Error("WAVE1_HISTORY_ROOT_INVALID");
  const keys = new Set<string>();
  return value.map((entry, index): HistoryRecord => {
    const row = record(entry, `WAVE1_HISTORY_RECORD_INVALID:${index}`);
    const key = requiredString(row.key, `WAVE1_HISTORY_KEY_INVALID:${index}`);
    const transcript = requiredString(
      row.value,
      `WAVE1_HISTORY_TRANSCRIPT_INVALID:${index}`,
    );
    if (keys.has(key)) throw new Error(`WAVE1_HISTORY_KEY_DUPLICATED:${index}`);
    keys.add(key);
    return { key, value: transcript, ttl: row.ttl };
  });
}

function parseSource(value: unknown, code: string): ManifestSource {
  const row = record(value, code);
  return {
    sizeBytes: nonNegativeInteger(row.sizeBytes, `${code}_SIZE_INVALID`),
    sha256: hash(row.sha256, `${code}_HASH_INVALID`),
  };
}

function parseManifest(value: unknown): TranscriptManifest {
  const root = record(value, "WAVE1_MANIFEST_ROOT_INVALID");
  if (root.schemaVersion !== "gold-v2-transcript-manifest-v1") {
    throw new Error("WAVE1_MANIFEST_SCHEMA_INVALID");
  }
  const sources = record(root.sources, "WAVE1_MANIFEST_SOURCES_INVALID");
  if (!Array.isArray(root.entries)) throw new Error("WAVE1_MANIFEST_ENTRIES_INVALID");
  const entries = root.entries.map((entry, index): ManifestEntry => {
    const row = record(entry, `WAVE1_MANIFEST_ENTRY_INVALID:${index}`);
    return {
      n: nonNegativeInteger(row.n, `WAVE1_MANIFEST_N_INVALID:${index}`),
      key: requiredString(row.key, `WAVE1_MANIFEST_KEY_INVALID:${index}`),
      goldIndex: nonNegativeInteger(
        row.goldIndex,
        `WAVE1_MANIFEST_GOLD_INDEX_INVALID:${index}`,
      ),
      historyIndex: nonNegativeInteger(
        row.historyIndex,
        `WAVE1_MANIFEST_HISTORY_INDEX_INVALID:${index}`,
      ),
      ttl: row.ttl,
      transcriptBytesUtf8: nonNegativeInteger(
        row.transcriptBytesUtf8,
        `WAVE1_MANIFEST_TRANSCRIPT_BYTES_INVALID:${index}`,
      ),
      transcriptSha256: hash(
        row.transcriptSha256,
        `WAVE1_MANIFEST_TRANSCRIPT_HASH_INVALID:${index}`,
      ),
      goldRecordSha256: hash(
        row.goldRecordSha256,
        `WAVE1_MANIFEST_GOLD_HASH_INVALID:${index}`,
      ),
      historyRecordSha256: hash(
        row.historyRecordSha256,
        `WAVE1_MANIFEST_HISTORY_HASH_INVALID:${index}`,
      ),
      bindingSha256: hash(
        row.bindingSha256,
        `WAVE1_MANIFEST_BINDING_HASH_INVALID:${index}`,
      ),
    };
  });
  return {
    schemaVersion: "gold-v2-transcript-manifest-v1",
    sources: {
      gold: parseSource(sources.gold, "WAVE1_MANIFEST_GOLD_SOURCE_INVALID"),
      historyExport: parseSource(
        sources.historyExport,
        "WAVE1_MANIFEST_HISTORY_SOURCE_INVALID",
      ),
    },
    entries,
  };
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

function validateEntry(
  entry: ManifestEntry,
  index: number,
  goldRecord: GoldV2Conversation,
  historyRecord: HistoryRecord,
  rawGoldRecord: unknown,
  rawHistoryRecord: unknown,
): void {
  const transcriptBytes = Buffer.from(historyRecord.value, "utf8");
  const transcriptSha256 = sha256(transcriptBytes);
  const goldRecordSha256 = sha256(
    Buffer.from(canonicalJson(rawGoldRecord), "utf8"),
  );
  const historyRecordSha256 = sha256(
    Buffer.from(canonicalJson(rawHistoryRecord), "utf8"),
  );
  const bindingSha256 = sha256(
    Buffer.concat([
      Buffer.from(entry.key, "utf8"),
      Buffer.from([0]),
      Buffer.from(goldRecordSha256, "ascii"),
      Buffer.from([0]),
      Buffer.from(transcriptSha256, "ascii"),
    ]),
  );
  if (
    entry.n !== index + 1 ||
    entry.goldIndex !== index ||
    entry.historyIndex !== index ||
    entry.key !== goldRecord.key ||
    entry.key !== historyRecord.key ||
    !sameJson(entry.ttl, historyRecord.ttl) ||
    entry.transcriptBytesUtf8 !== transcriptBytes.length ||
    entry.transcriptSha256 !== transcriptSha256 ||
    entry.goldRecordSha256 !== goldRecordSha256 ||
    entry.historyRecordSha256 !== historyRecordSha256 ||
    entry.bindingSha256 !== bindingSha256
  ) {
    throw new Error(`WAVE1_MANIFEST_BINDING_MISMATCH:${index}`);
  }
}

function benchmarkAnnotations(
  source: GoldV2Conversation,
  messages: ReadonlyMap<number, { role: MessageRoleV1; text: string }>,
): readonly Wave1BenchmarkAnnotation[] {
  return resolveGoldV2Annotations(source, messages).map((annotation) => ({
    ...annotation,
    confidence: "NOT_RECORDED",
    source: "ADJUDICATOR",
    sourceVersion: "gold-v2",
    derivationVersion: annotation.derived ? "gold-v2-derived-v1" : null,
  }));
}

export interface ValidateWave1BenchmarkBundleInput {
  readonly goldBytes: Uint8Array;
  readonly historyBytes: Uint8Array;
  readonly manifestBytes: Uint8Array;
  readonly expectedManifestSha256?: string;
  readonly enforceOfficialCounts?: boolean;
}

export function validateWave1BenchmarkBundle(
  input: ValidateWave1BenchmarkBundleInput,
): Wave1BenchmarkBundle {
  const manifestSha256 = sha256(input.manifestBytes);
  const expectedManifestSha256 =
    input.expectedManifestSha256 ?? OFFICIAL_WAVE1_MANIFEST_SHA256;
  if (manifestSha256 !== expectedManifestSha256) {
    throw new Error("WAVE1_MANIFEST_CHECKSUM_MISMATCH");
  }

  const goldRoot = json(input.goldBytes, "WAVE1_GOLD_JSON_INVALID");
  const historyRoot = json(input.historyBytes, "WAVE1_HISTORY_JSON_INVALID");
  const manifestRoot = json(input.manifestBytes, "WAVE1_MANIFEST_JSON_INVALID");
  const gold = parseGoldV2(goldRoot);
  const history = parseHistory(historyRoot);
  const rawGoldConversations = record(
    goldRoot,
    "WAVE1_GOLD_ROOT_INVALID",
  ).conversations;
  if (!Array.isArray(rawGoldConversations) || !Array.isArray(historyRoot)) {
    throw new Error("WAVE1_BUNDLE_RAW_RECORDS_INVALID");
  }
  const manifest = parseManifest(manifestRoot);
  const goldSha256 = sha256(input.goldBytes);
  const historySha256 = sha256(input.historyBytes);

  if (
    manifest.sources.gold.sizeBytes !== input.goldBytes.byteLength ||
    manifest.sources.gold.sha256 !== goldSha256
  ) {
    throw new Error("WAVE1_GOLD_SOURCE_MISMATCH");
  }
  if (
    manifest.sources.historyExport.sizeBytes !== input.historyBytes.byteLength ||
    manifest.sources.historyExport.sha256 !== historySha256
  ) {
    throw new Error("WAVE1_HISTORY_SOURCE_MISMATCH");
  }
  if (
    manifest.entries.length !== gold.conversations.length ||
    history.length !== gold.conversations.length
  ) {
    throw new Error("WAVE1_BUNDLE_COUNT_MISMATCH");
  }

  const conversations: Wave1BenchmarkConversation[] = [];
  let excludedCount = 0;
  let annotationCount = 0;
  for (let index = 0; index < manifest.entries.length; index += 1) {
    const source = gold.conversations[index];
    const historyRecord = history[index];
    const entry = manifest.entries[index];
    if (!source || !historyRecord || !entry) {
      throw new Error(`WAVE1_BUNDLE_INDEX_MISSING:${index}`);
    }
    validateEntry(
      entry,
      index,
      source,
      historyRecord,
      rawGoldConversations[index],
      historyRoot[index],
    );

    let imported: ReturnType<typeof computeConversationImport>;
    try {
      imported = computeConversationImport(historyRecord.value, historyRecord.key);
    } catch {
      excludedCount += 1;
      continue;
    }
    const messageMap = new Map(
      imported.messages.map((message) => [
        message.turnIndex,
        { role: message.role, text: message.redactedText },
      ]),
    );
    const annotations = benchmarkAnnotations(source, messageMap);
    annotationCount += annotations.length;
    conversations.push({
      conversationId: imported.conversationKeyHash,
      sourceOrdinal: source.n,
      duplicateGroupId: imported.duplicateGroupId,
      qualityFlags: imported.qualityFlags,
      startTruncated: imported.startTruncated,
      messages: imported.messages.map((message) => ({
        turnIndex: message.turnIndex,
        role: message.role,
        redactedText: message.redactedText,
      })),
      annotations,
      labelCodes: new Set(annotations.map(({ labelCode }) => labelCode)),
    });
  }

  const enforceOfficial = input.enforceOfficialCounts ?? true;
  if (
    enforceOfficial &&
    (conversations.length !== OFFICIAL_WAVE1_INCLUDED_COUNT ||
      excludedCount !== OFFICIAL_WAVE1_EXCLUDED_COUNT ||
      annotationCount !== OFFICIAL_WAVE1_ANNOTATION_COUNT)
  ) {
    throw new Error("WAVE1_OFFICIAL_COUNTS_MISMATCH");
  }

  return {
    summary: {
      schemaVersion: 1,
      manifestSha256,
      goldSha256,
      historySha256,
      boundCount: manifest.entries.length,
      includedCount: conversations.length,
      excludedCount,
      annotationCount,
      bindingMismatchCount: 0,
    },
    conversations,
  };
}

export function annotationScopeKey(
  conversationId: string,
  labelCode: string,
  scope: AnnotationScopeV1,
  turnIndex: number | null,
): string {
  return `${conversationId}\0${labelCode}\0${scope}\0${turnIndex ?? "CONVERSATION"}`;
}
