import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  LabelSchemaV1Schema,
  type AnnotationConfidenceV1,
  type AnnotationModeV1,
  type AnnotationScopeV1,
  type AnnotationSourceV1,
  type AnnotationStatusV1,
  type LabelSchemaV1,
  type ReviewModeV1,
  type SplitV1,
} from "@lana/contracts";
import { assignSplits, type SplitItem, type SplitTargets } from "@lana/dataset-review";
import { withTransaction } from "./repositories.js";

// Annotation-core persistence: dynamic label schemas, annotation projects,
// deterministic group-aware split assignment, annotations, and the append-only
// review audit trail. No raw PII is stored here — evidence_text is the redacted
// projection, and review-event before/after snapshots hold only annotation
// columns.

export interface CreateLabelSchemaInput {
  readonly schema: unknown;
  readonly createdBySubject: string;
  readonly status?: "DRAFT" | "ACTIVE";
}

export interface CreateLabelSchemaResult {
  readonly labelSchemaId: string;
  readonly created: boolean;
  readonly name: string;
  readonly version: string;
}

export interface CreateProjectInput {
  readonly datasetId: string;
  readonly labelSchemaId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly annotationMode: AnnotationModeV1;
  readonly reviewMode: ReviewModeV1;
  readonly splitSeed?: string | null;
  readonly createdBySubject: string;
}

export interface CreateSplitInput {
  readonly targets: SplitTargets;
  readonly seed: string;
}

export interface CreateSplitResult {
  readonly assigned: number;
  readonly alreadyAssigned: number;
  readonly perSplit: Record<SplitV1, number>;
}

export interface AddAnnotationInput {
  readonly projectItemId: string;
  readonly labelCode: string;
  readonly scope: AnnotationScopeV1;
  readonly turnIndex?: number | null;
  readonly secondTurnIndex?: number | null;
  readonly evidenceText?: string | null;
  readonly evidenceStart?: number | null;
  readonly evidenceEnd?: number | null;
  readonly confidence: AnnotationConfidenceV1;
  readonly source: AnnotationSourceV1;
  readonly sourceVersion?: string | null;
  readonly status: AnnotationStatusV1;
  readonly reviewerId?: string | null;
  readonly prelabelRunId?: string | null;
}

export type ReviewAction = "ACCEPT" | "REJECT" | "EDIT" | "REMOVE";

export interface ReviewAnnotationInput {
  readonly action: ReviewAction;
  readonly actorSubject: string;
  readonly patch?: {
    readonly labelCode?: string;
    readonly confidence?: AnnotationConfidenceV1;
    readonly evidenceText?: string | null;
    readonly evidenceStart?: number | null;
    readonly evidenceEnd?: number | null;
    readonly turnIndex?: number | null;
    readonly secondTurnIndex?: number | null;
  };
}

interface AnnotationRow {
  annotation_id: string;
  project_item_id: string;
  label_code: string;
  scope: string;
  turn_index: number | null;
  second_turn_index: number | null;
  evidence_text: string | null;
  evidence_start: number | null;
  evidence_end: number | null;
  confidence: string;
  source: string;
  source_version: string | null;
  status: string;
  reviewer_id: string | null;
}

const ANNOTATION_COLUMNS =
  `annotation_id, project_item_id, label_code, scope, turn_index, second_turn_index,
   evidence_text, evidence_start, evidence_end, confidence, source, source_version,
   status, reviewer_id`;

export class PostgresDatasetAnnotationStore {
  private readonly pool: Pool;

  constructor(connectionString: string, options: { poolMax?: number } = {}) {
    if (!connectionString.trim()) throw new Error("DATABASE_URL_REQUIRED");
    this.pool = new Pool({
      connectionString,
      max: options.poolMax ?? 5,
      idleTimeoutMillis: 30_000,
    });
  }

  async ready(): Promise<boolean> {
    try {
      const result = await this.pool.query<{ ok: number }>("SELECT 1 AS ok");
      return result.rows[0]?.ok === 1;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // --- Label schemas (dynamic; validated against the contract on write) -------

  async createLabelSchema(input: CreateLabelSchemaInput): Promise<CreateLabelSchemaResult> {
    const parsed: LabelSchemaV1 = LabelSchemaV1Schema.parse(input.schema);
    const labelSchemaId = randomUUID();
    const inserted = await this.pool.query<{ label_schema_id: string }>(
      `INSERT INTO dataset_label_schemas (
         label_schema_id, name, version, status, schema_json, created_by_subject
       ) VALUES ($1,$2,$3,$4,$5::jsonb,$6)
       ON CONFLICT (name, version) DO NOTHING
       RETURNING label_schema_id`,
      [
        labelSchemaId,
        parsed.name,
        parsed.version,
        input.status ?? "DRAFT",
        JSON.stringify(parsed),
        input.createdBySubject,
      ],
    );
    const row = inserted.rows[0];
    if (row) {
      return { labelSchemaId: row.label_schema_id, created: true, name: parsed.name, version: parsed.version };
    }
    const existing = await this.pool.query<{ label_schema_id: string }>(
      "SELECT label_schema_id FROM dataset_label_schemas WHERE name = $1 AND version = $2",
      [parsed.name, parsed.version],
    );
    const found = existing.rows[0];
    if (!found) throw new Error("LABEL_SCHEMA_CONFLICT_ROW_MISSING");
    return { labelSchemaId: found.label_schema_id, created: false, name: parsed.name, version: parsed.version };
  }

  async getLabelSchema(labelSchemaId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT label_schema_id, name, version, status, schema_json, created_at
       FROM dataset_label_schemas WHERE label_schema_id = $1`,
      [labelSchemaId],
    );
    return result.rows[0] ?? null;
  }

  async listLabelSchemas(limit = 50): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT label_schema_id, name, version, status, created_at
       FROM dataset_label_schemas
       ORDER BY created_at DESC, label_schema_id DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 200)],
    );
    return result.rows;
  }

  async setLabelSchemaStatus(
    labelSchemaId: string,
    status: "DRAFT" | "ACTIVE" | "LOCKED" | "ARCHIVED",
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE dataset_label_schemas SET status = $2, updated_at = now()
       WHERE label_schema_id = $1`,
      [labelSchemaId, status],
    );
    return (result.rowCount ?? 0) === 1;
  }

  // --- Projects ---------------------------------------------------------------

  async createProject(input: CreateProjectInput): Promise<Record<string, unknown>> {
    const projectId = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO dataset_annotation_projects (
         project_id, dataset_id, label_schema_id, name, description,
         annotation_mode, status, review_mode, split_seed, created_by_subject
       ) VALUES ($1,$2,$3,$4,$5,$6,'DRAFT',$7,$8,$9)
       RETURNING project_id, dataset_id, label_schema_id, name, annotation_mode,
                 status, review_mode, split_seed, created_at`,
      [
        projectId,
        input.datasetId,
        input.labelSchemaId,
        input.name,
        input.description ?? null,
        input.annotationMode,
        input.reviewMode,
        input.splitSeed ?? null,
        input.createdBySubject,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("PROJECT_INSERT_FAILED");
    return row;
  }

  async getProject(projectId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(
      `SELECT project_id, dataset_id, label_schema_id, name, description,
              annotation_mode, status, review_mode, split_seed, created_at
       FROM dataset_annotation_projects WHERE project_id = $1`,
      [projectId],
    );
    return result.rows[0] ?? null;
  }

  async listProjects(datasetId: string, limit = 50): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT project_id, name, status, review_mode, annotation_mode, created_at
       FROM dataset_annotation_projects
       WHERE dataset_id = $1
       ORDER BY created_at DESC, project_id DESC
       LIMIT $2`,
      [datasetId, Math.min(Math.max(limit, 1), 200)],
    );
    return result.rows;
  }

  async setProjectStatus(
    projectId: string,
    status: "DRAFT" | "ACTIVE" | "LOCKED" | "ARCHIVED",
  ): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE dataset_annotation_projects SET status = $2, updated_at = now()
       WHERE project_id = $1`,
      [projectId, status],
    );
    return (result.rowCount ?? 0) === 1;
  }

  // --- Split assignment (deterministic, group-aware, idempotent) --------------

  async createSplit(projectId: string, input: CreateSplitInput): Promise<CreateSplitResult> {
    const project = await this.pool.query<{ dataset_id: string }>(
      "SELECT dataset_id FROM dataset_annotation_projects WHERE project_id = $1",
      [projectId],
    );
    const datasetId = project.rows[0]?.dataset_id;
    if (!datasetId) throw new Error("PROJECT_NOT_FOUND");

    const conversations = await this.pool.query<{
      conversation_id: string;
      duplicate_group_id: string | null;
    }>(
      `SELECT conversation_id, duplicate_group_id
       FROM dataset_conversations WHERE dataset_id = $1`,
      [datasetId],
    );

    const items: SplitItem[] = conversations.rows.map((row) => ({
      conversationId: row.conversation_id,
      duplicateGroupId: row.duplicate_group_id,
    }));
    // Group-aware assignment guarantees a duplicate group never straddles splits.
    const assignment = assignSplits(items, input.targets, input.seed);

    const perSplit: Record<SplitV1, number> = {
      DEVELOPMENT: 0, VALIDATION: 0, HOLDOUT: 0, RARE_SAFETY: 0,
    };
    let assigned = 0;
    let alreadyAssigned = 0;

    await withTransaction(this.pool, async (client) => {
      for (const item of items) {
        const split = assignment.get(item.conversationId) ?? "DEVELOPMENT";
        const inserted = await client.query(
          `INSERT INTO dataset_project_items (
             project_item_id, project_id, conversation_id, split, assignment_status
           ) VALUES ($1,$2,$3,$4,'UNASSIGNED')
           ON CONFLICT (project_id, conversation_id) DO NOTHING`,
          [randomUUID(), projectId, item.conversationId, split],
        );
        if ((inserted.rowCount ?? 0) === 1) {
          assigned += 1;
          perSplit[split] += 1;
        } else {
          alreadyAssigned += 1;
        }
      }
    });

    return { assigned, alreadyAssigned, perSplit };
  }

  async splitSummary(projectId: string): Promise<Record<string, number>> {
    const result = await this.pool.query<{ split: string; count: string }>(
      `SELECT split, count(*)::text AS count
       FROM dataset_project_items WHERE project_id = $1
       GROUP BY split`,
      [projectId],
    );
    const summary: Record<string, number> = {};
    for (const row of result.rows) summary[row.split] = Number(row.count);
    return summary;
  }

  // --- Annotations + audit ----------------------------------------------------

  async addAnnotation(input: AddAnnotationInput): Promise<Record<string, unknown>> {
    return withTransaction(this.pool, async (client) => {
      const annotationId = randomUUID();
      const result = await client.query<AnnotationRow>(
        `INSERT INTO dataset_annotations (
           annotation_id, project_item_id, label_code, scope, turn_index,
           second_turn_index, evidence_text, evidence_start, evidence_end,
           confidence, source, source_version, status, reviewer_id, prelabel_run_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING ${ANNOTATION_COLUMNS}`,
        [
          annotationId,
          input.projectItemId,
          input.labelCode,
          input.scope,
          input.turnIndex ?? null,
          input.secondTurnIndex ?? null,
          input.evidenceText ?? null,
          input.evidenceStart ?? null,
          input.evidenceEnd ?? null,
          input.confidence,
          input.source,
          input.sourceVersion ?? null,
          input.status,
          input.reviewerId ?? null,
          input.prelabelRunId ?? null,
        ],
      );
      const row = result.rows[0] as AnnotationRow | undefined;
      if (!row) throw new Error("ANNOTATION_INSERT_FAILED");
      // A human ADD is an audited action; an AI/heuristic PROPOSED insert is not
      // a reviewer action and is not audited here.
      if (input.source === "HUMAN" || input.source === "ADJUDICATOR") {
        await this.writeEvent(client, {
          projectItemId: input.projectItemId,
          annotationId,
          actorSubject: input.reviewerId ?? "unknown",
          action: "ADD",
          before: null,
          after: row,
        });
      }
      return row as unknown as Record<string, unknown>;
    });
  }

  async reviewAnnotation(
    annotationId: string,
    input: ReviewAnnotationInput,
  ): Promise<Record<string, unknown> | null> {
    return withTransaction(this.pool, async (client) => {
      const current = await client.query<AnnotationRow>(
        `SELECT ${ANNOTATION_COLUMNS} FROM dataset_annotations
         WHERE annotation_id = $1 FOR UPDATE`,
        [annotationId],
      );
      const before = current.rows[0];
      if (!before) return null;

      const patch = input.patch ?? {};
      const next: AnnotationRow = {
        ...before,
        status: reviewStatus(input.action, before.status),
        reviewer_id: input.actorSubject,
        label_code: patch.labelCode ?? before.label_code,
        confidence: patch.confidence ?? before.confidence,
        evidence_text: patch.evidenceText !== undefined ? patch.evidenceText : before.evidence_text,
        evidence_start: patch.evidenceStart !== undefined ? patch.evidenceStart : before.evidence_start,
        evidence_end: patch.evidenceEnd !== undefined ? patch.evidenceEnd : before.evidence_end,
        turn_index: patch.turnIndex !== undefined ? patch.turnIndex : before.turn_index,
        second_turn_index: patch.secondTurnIndex !== undefined ? patch.secondTurnIndex : before.second_turn_index,
      };

      const updated = await client.query<AnnotationRow>(
        `UPDATE dataset_annotations SET
           label_code = $2, confidence = $3, evidence_text = $4, evidence_start = $5,
           evidence_end = $6, turn_index = $7, second_turn_index = $8, status = $9,
           reviewer_id = $10, updated_at = now()
         WHERE annotation_id = $1
         RETURNING ${ANNOTATION_COLUMNS}`,
        [
          annotationId,
          next.label_code,
          next.confidence,
          next.evidence_text,
          next.evidence_start,
          next.evidence_end,
          next.turn_index,
          next.second_turn_index,
          next.status,
          next.reviewer_id,
        ],
      );
      const after = updated.rows[0] ?? next;
      await this.writeEvent(client, {
        projectItemId: before.project_item_id,
        annotationId,
        actorSubject: input.actorSubject,
        action: input.action === "ACCEPT" ? "ACCEPT"
          : input.action === "REJECT" ? "REJECT"
          : input.action === "REMOVE" ? "REMOVE" : "EDIT",
        before,
        after,
      });
      return after as unknown as Record<string, unknown>;
    });
  }

  async listAnnotations(projectItemId: string): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT ${ANNOTATION_COLUMNS}, created_at, updated_at
       FROM dataset_annotations
       WHERE project_item_id = $1
       ORDER BY created_at ASC, annotation_id ASC`,
      [projectItemId],
    );
    return result.rows;
  }

  async listReviewEvents(projectItemId: string): Promise<readonly Record<string, unknown>[]> {
    const result = await this.pool.query(
      `SELECT review_event_id, annotation_id, actor_subject, action, before_json,
              after_json, created_at
       FROM dataset_review_events
       WHERE project_item_id = $1
       ORDER BY created_at DESC, review_event_id DESC`,
      [projectItemId],
    );
    return result.rows;
  }

  private async writeEvent(
    client: PoolClient,
    input: {
      projectItemId: string;
      annotationId: string | null;
      actorSubject: string;
      action: "ACCEPT" | "REJECT" | "EDIT" | "ADD" | "REMOVE" | "LOCK" | "REOPEN" | "ADJUDICATE";
      before: unknown;
      after: unknown;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO dataset_review_events (
         review_event_id, project_item_id, annotation_id, actor_subject, action,
         before_json, after_json
       ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`,
      [
        randomUUID(),
        input.projectItemId,
        input.annotationId,
        input.actorSubject,
        input.action,
        input.before === null ? null : JSON.stringify(input.before),
        input.after === null ? null : JSON.stringify(input.after),
      ],
    );
  }
}

function reviewStatus(action: ReviewAction, current: string): AnnotationStatusV1 {
  switch (action) {
    case "ACCEPT":
      return "ACCEPTED";
    case "REJECT":
      return "REJECTED";
    case "REMOVE":
      return "REJECTED";
    case "EDIT":
      return "EDITED";
    default:
      return current as AnnotationStatusV1;
  }
}
