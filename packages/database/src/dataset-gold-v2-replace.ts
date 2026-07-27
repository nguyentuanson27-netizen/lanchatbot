import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { Pool, type PoolClient } from "pg";
import { WAVE1_LABEL_SCHEMA } from "@lana/dataset-review";

const RETAIN_FILENAME = "transcripts.json";
const DELETE_FILENAME = "history_export_2000_curated.json";
const NEW_FILENAME = "gold_v2_history_0001_2000_audited_derived_merged.json";
const ACTOR = "dataset-gold-v2-import";

interface GoldMessageAnnotation {
  readonly t: number;
  readonly l: string;
  readonly ev: string;
}

interface GoldConversationAnnotation {
  readonly l: string;
  readonly derived?: unknown;
}

interface GoldConversation {
  readonly n: number;
  readonly key: string;
  readonly startTruncated: boolean;
  readonly ann: readonly GoldMessageAnnotation[];
  readonly conv: readonly GoldConversationAnnotation[];
}

export interface GoldV2 {
  readonly schemaVersion: "gold-v2";
  readonly unit: "MESSAGE";
  readonly range: { readonly from: number; readonly to: number };
  readonly conversations: readonly GoldConversation[];
}

interface DatabaseConversation {
  readonly conversation_id: string;
  readonly source_key_hash: string;
  readonly messages: Map<number, { role: string; text: string }>;
}

interface PlannedAnnotation {
  readonly labelCode: string;
  readonly scope: string;
  readonly turnIndex: number | null;
  readonly evidenceText: string | null;
  readonly evidenceStart: number | null;
  readonly evidenceEnd: number | null;
}

interface PlannedConversation {
  readonly conversationId: string;
  readonly annotations: readonly PlannedAnnotation[];
}

export interface ReplacementPlan {
  readonly goldConversations: number;
  readonly importedConversations: number;
  readonly failedConversations: number;
  readonly annotations: number;
  readonly conversations: readonly PlannedConversation[];
}

function record(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function string(value: unknown, code: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(code);
  return value;
}

function integer(value: unknown, code: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(code);
  return value as number;
}

export function parseGoldV2(value: unknown): GoldV2 {
  const root = record(value, "GOLD_V2_ROOT_INVALID");
  if (root.schemaVersion !== "gold-v2" || root.unit !== "MESSAGE") {
    throw new Error("GOLD_V2_HEADER_INVALID");
  }
  const range = record(root.range, "GOLD_V2_RANGE_INVALID");
  const from = integer(range.from, "GOLD_V2_RANGE_FROM_INVALID");
  const to = integer(range.to, "GOLD_V2_RANGE_TO_INVALID");
  if (!Array.isArray(root.conversations)) throw new Error("GOLD_V2_CONVERSATIONS_INVALID");
  const seenN = new Set<number>();
  const seenKey = new Set<string>();
  const conversations = root.conversations.map((entry, index): GoldConversation => {
    const item = record(entry, `GOLD_V2_CONVERSATION_INVALID:${index}`);
    const n = integer(item.n, `GOLD_V2_N_INVALID:${index}`);
    const key = string(item.key, `GOLD_V2_KEY_INVALID:${index}`);
    if (seenN.has(n) || seenKey.has(key)) throw new Error(`GOLD_V2_DUPLICATE:${index}`);
    seenN.add(n);
    seenKey.add(key);
    if (typeof item.startTruncated !== "boolean") throw new Error(`GOLD_V2_TRUNCATED_INVALID:${index}`);
    if (!Array.isArray(item.ann) || !Array.isArray(item.conv)) {
      throw new Error(`GOLD_V2_ANNOTATIONS_INVALID:${index}`);
    }
    const ann = item.ann.map((annotation, annotationIndex): GoldMessageAnnotation => {
      const row = record(annotation, `GOLD_V2_MESSAGE_ANNOTATION_INVALID:${index}:${annotationIndex}`);
      return {
        t: integer(row.t, `GOLD_V2_TURN_INVALID:${index}:${annotationIndex}`),
        l: string(row.l, `GOLD_V2_LABEL_INVALID:${index}:${annotationIndex}`),
        ev: string(row.ev, `GOLD_V2_EVIDENCE_INVALID:${index}:${annotationIndex}`),
      };
    });
    const conv = item.conv.map((annotation, annotationIndex): GoldConversationAnnotation => {
      const row = record(annotation, `GOLD_V2_CONVERSATION_ANNOTATION_INVALID:${index}:${annotationIndex}`);
      return {
        l: string(row.l, `GOLD_V2_CONVERSATION_LABEL_INVALID:${index}:${annotationIndex}`),
        ...(row.derived !== undefined ? { derived: row.derived } : {}),
      };
    });
    return { n, key, startTruncated: item.startTruncated, ann, conv };
  });
  if (conversations.length !== to - from + 1) throw new Error("GOLD_V2_RANGE_COUNT_MISMATCH");
  return { schemaVersion: "gold-v2", unit: "MESSAGE", range: { from, to }, conversations };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function scopeRole(scope: string): string | null {
  if (scope === "CUSTOMER_MESSAGE") return "CUSTOMER";
  if (scope === "SHOP_MESSAGE") return "SHOP";
  return null;
}

export function buildReplacementPlan(
  gold: GoldV2,
  databaseConversations: readonly DatabaseConversation[],
): ReplacementPlan {
  const labelScopes = new Map(WAVE1_LABEL_SCHEMA.labels.map((label) => [label.code, label.scope]));
  const byHash = new Map(gold.conversations.map((conversation) => [sha256(conversation.key), conversation]));
  const conversations: PlannedConversation[] = [];
  let annotationCount = 0;
  for (const databaseConversation of databaseConversations) {
    const source = byHash.get(databaseConversation.source_key_hash);
    if (!source) throw new Error("DATABASE_CONVERSATION_NOT_IN_GOLD_V2");
    const annotations: PlannedAnnotation[] = [];
    for (const annotation of source.ann) {
      const scope = labelScopes.get(annotation.l);
      if (!scope || scope === "CONVERSATION" || scope === "SEQUENCE") {
        throw new Error(`GOLD_V2_MESSAGE_LABEL_SCOPE_INVALID:${annotation.l}`);
      }
      const resolvedTurn = annotation.t + (source.startTruncated ? 1 : 0);
      const message = databaseConversation.messages.get(resolvedTurn);
      if (!message) throw new Error(`GOLD_V2_TURN_NOT_FOUND:${source.n}:${resolvedTurn}`);
      const requiredRole = scopeRole(scope);
      if (requiredRole !== message.role) throw new Error(`GOLD_V2_ROLE_MISMATCH:${source.n}:${resolvedTurn}`);
      const exactStart = message.text.indexOf(annotation.ev);
      const hasRedactionPlaceholder = /\[[A-Z]+_\d+\]/.test(message.text);
      if (exactStart < 0 && !hasRedactionPlaceholder) {
        throw new Error(`GOLD_V2_EVIDENCE_NOT_FOUND:${source.n}:${resolvedTurn}`);
      }
      const evidenceText = exactStart >= 0 ? annotation.ev : message.text;
      const evidenceStart = exactStart >= 0 ? exactStart : 0;
      annotations.push({
        labelCode: annotation.l,
        scope,
        turnIndex: resolvedTurn,
        evidenceText,
        evidenceStart,
        evidenceEnd: evidenceStart + evidenceText.length,
      });
    }
    for (const annotation of source.conv) {
      const scope = labelScopes.get(annotation.l);
      if (scope !== "CONVERSATION") throw new Error(`GOLD_V2_CONVERSATION_LABEL_SCOPE_INVALID:${annotation.l}`);
      annotations.push({
        labelCode: annotation.l,
        scope,
        turnIndex: null,
        evidenceText: null,
        evidenceStart: null,
        evidenceEnd: null,
      });
    }
    annotationCount += annotations.length;
    conversations.push({ conversationId: databaseConversation.conversation_id, annotations });
  }
  return {
    goldConversations: gold.conversations.length,
    importedConversations: conversations.length,
    failedConversations: gold.conversations.length - conversations.length,
    annotations: annotationCount,
    conversations,
  };
}

async function loadDatabaseConversations(
  client: PoolClient,
  datasetId: string,
): Promise<DatabaseConversation[]> {
  const rows = await client.query<{
    conversation_id: string;
    source_key_hash: string;
    turn_index: number;
    role: string;
    redacted_text: string;
  }>(
    `SELECT c.conversation_id, c.conversation_key_hash AS source_key_hash,
            m.turn_index, m.role, m.redacted_text
       FROM dataset_conversations c
       JOIN dataset_messages m ON m.conversation_id = c.conversation_id
      WHERE c.dataset_id = $1
      ORDER BY c.conversation_id, m.turn_index`,
    [datasetId],
  );
  const mapped = new Map<string, DatabaseConversation>();
  for (const row of rows.rows) {
    const conversation = mapped.get(row.conversation_id) ?? {
      conversation_id: row.conversation_id,
      source_key_hash: row.source_key_hash,
      messages: new Map(),
    };
    conversation.messages.set(row.turn_index, { role: row.role, text: row.redacted_text });
    mapped.set(row.conversation_id, conversation);
  }
  return [...mapped.values()];
}

async function replace(client: PoolClient, fileChecksum: string, plan: ReplacementPlan): Promise<string> {
  const datasets = await client.query<{
    dataset_id: string;
    original_filename: string;
  }>(
    `SELECT dataset_id, original_filename
       FROM dataset_review_datasets
      WHERE original_filename = ANY($1::text[])
      FOR UPDATE`,
    [[RETAIN_FILENAME, DELETE_FILENAME]],
  );
  if (datasets.rowCount !== 2) throw new Error("EXPECTED_TWO_LEGACY_DATASETS");
  const retained = datasets.rows.find((row) => row.original_filename === RETAIN_FILENAME);
  const removed = datasets.rows.find((row) => row.original_filename === DELETE_FILENAME);
  if (!retained || !removed) throw new Error("LEGACY_DATASET_FILENAMES_MISMATCH");
  const projects = await client.query<{ project_id: string }>(
    "SELECT project_id FROM dataset_annotation_projects WHERE dataset_id = ANY($1::uuid[]) FOR UPDATE",
    [[retained.dataset_id, removed.dataset_id]],
  );
  await client.query("DELETE FROM dataset_exports WHERE project_id = ANY($1::uuid[])", [
    projects.rows.map((row) => row.project_id),
  ]);
  await client.query("DELETE FROM dataset_annotation_projects WHERE dataset_id = ANY($1::uuid[])", [
    [retained.dataset_id, removed.dataset_id],
  ]);
  await client.query("DELETE FROM dataset_review_datasets WHERE dataset_id = $1", [removed.dataset_id]);
  await client.query(
    `UPDATE dataset_review_datasets
        SET name = $2, description = $3, original_filename = $4, source_checksum = $5,
            status = 'READY', total_items = $6, imported_items = $7, failed_items = $8,
            import_report = $9::jsonb, updated_at = now()
      WHERE dataset_id = $1`,
    [
      retained.dataset_id,
      "Gold v2 - Lịch sử hội thoại 0001-2000",
      "Gold-v2 audited and derived labels; retained encrypted transcripts from the verified legacy import.",
      NEW_FILENAME,
      fileChecksum,
      plan.goldConversations,
      plan.importedConversations,
      plan.failedConversations,
      JSON.stringify({
        schemaVersion: "gold-v2",
        audited: true,
        annotationCount: plan.annotations,
        replaced: [RETAIN_FILENAME, DELETE_FILENAME],
      }),
    ],
  );
  const schema = await client.query<{ label_schema_id: string }>(
    `SELECT label_schema_id FROM dataset_label_schemas
      WHERE name = $1 AND version = $2 AND status = 'ACTIVE'`,
    [WAVE1_LABEL_SCHEMA.name, WAVE1_LABEL_SCHEMA.version],
  );
  const labelSchemaId = schema.rows[0]?.label_schema_id;
  if (!labelSchemaId || schema.rowCount !== 1) throw new Error("WAVE1_LABEL_SCHEMA_NOT_ACTIVE");
  const projectId = randomUUID();
  await client.query(
    `INSERT INTO dataset_annotation_projects (
       project_id, dataset_id, label_schema_id, name, description, annotation_mode,
       status, review_mode, split_seed, created_by_subject
     ) VALUES ($1,$2,$3,$4,$5,'MESSAGE','ACTIVE','AI_ASSISTED',$6,$7)`,
    [
      projectId,
      retained.dataset_id,
      labelSchemaId,
      "Gold v2 - Đã audit 0001-2000",
      "Human-audited message and conversation labels imported from gold-v2.",
      "gold-v2-0001-2000",
      ACTOR,
    ],
  );
  for (const conversation of plan.conversations) {
    const projectItemId = randomUUID();
    await client.query(
      `INSERT INTO dataset_project_items (
         project_item_id, project_id, conversation_id, split, assignment_status,
         assigned_reviewer_id, revision
       ) VALUES ($1,$2,$3,'DEVELOPMENT','REVIEWED',$4,1)`,
      [projectItemId, projectId, conversation.conversationId, ACTOR],
    );
    for (const annotation of conversation.annotations) {
      const annotationId = randomUUID();
      await client.query(
        `INSERT INTO dataset_annotations (
           annotation_id, project_item_id, label_code, scope, turn_index,
           evidence_text, evidence_start, evidence_end, confidence, source,
           source_version, status, reviewer_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'HIGH','ADJUDICATOR','gold-v2','ADJUDICATED',$9)`,
        [
          annotationId,
          projectItemId,
          annotation.labelCode,
          annotation.scope,
          annotation.turnIndex,
          annotation.evidenceText,
          annotation.evidenceStart,
          annotation.evidenceEnd,
          ACTOR,
        ],
      );
    }
  }
  return projectId;
}

async function main(): Promise<void> {
  const filePath = process.argv.find((argument) => !argument.startsWith("--") && argument !== process.argv[0] && argument !== process.argv[1]);
  if (!filePath) throw new Error("USAGE: dataset-gold-v2-replace <file> [--apply]");
  const apply = process.argv.includes("--apply");
  if (apply && process.env.ALLOW_DATASET_GOLD_REPLACE !== "true") {
    throw new Error("ALLOW_DATASET_GOLD_REPLACE_REQUIRED");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL_REQUIRED");
  const bytes = await readFile(filePath);
  const gold = parseGoldV2(JSON.parse(bytes.toString("utf8")));
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const retained = await client.query<{ dataset_id: string }>(
      "SELECT dataset_id FROM dataset_review_datasets WHERE original_filename = $1",
      [RETAIN_FILENAME],
    );
    const datasetId = retained.rows[0]?.dataset_id;
    if (!datasetId || retained.rowCount !== 1) throw new Error("RETAIN_DATASET_NOT_FOUND");
    const database = await loadDatabaseConversations(client, datasetId);
    const plan = buildReplacementPlan(gold, database);
    const summary: Record<string, unknown> = {
      mode: apply ? "apply" : "dry-run",
      fileChecksum: createHash("sha256").update(bytes).digest("hex"),
      goldConversations: plan.goldConversations,
      importedConversations: plan.importedConversations,
      failedConversations: plan.failedConversations,
      annotations: plan.annotations,
    };
    if (apply) summary.projectId = await replace(client, summary.fileChecksum as string, plan);
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "DATASET_GOLD_V2_REPLACE_FAILED"}\n`);
    process.exitCode = 1;
  });
}
