import {
  type AnnotationConfidenceV1,
  type AnnotationModeV1,
  type AnnotationScopeV1,
  type ReviewModeV1,
  type SplitV1,
} from "@lana/contracts";
import {
  LocalEnvelopeCipher,
  PostgresDatasetAnnotationStore,
  PostgresDatasetReviewStore,
  type CreateLabelSchemaResult,
  type CreateSplitResult,
  type ReviewAction,
} from "@lana/database";

// Thin composition layer over the two dataset-review persistence stores. It
// serves redacted projections only — raw ciphertext columns are never selected
// by the queries these stores expose. RBAC and feature-flag gating live in the
// route layer; this service is the injectable port the routes call (and that
// tests fake), mirroring how ProductMediaService is wired.

export type JsonRecord = Record<string, unknown>;

export interface CreateProjectServiceInput {
  readonly datasetId: string;
  readonly labelSchemaId: string;
  readonly name: string;
  readonly description?: string | null;
  readonly annotationMode: AnnotationModeV1;
  readonly reviewMode: ReviewModeV1;
  readonly splitSeed?: string | null;
  readonly createdBySubject: string;
}

export interface CreateSplitServiceInput {
  readonly targets: Partial<Record<SplitV1, number>>;
  readonly seed: string;
}

export interface AddAnnotationServiceInput {
  readonly projectItemId: string;
  readonly labelCode: string;
  readonly scope: AnnotationScopeV1;
  readonly turnIndex?: number | null;
  readonly secondTurnIndex?: number | null;
  readonly evidenceText?: string | null;
  readonly evidenceStart?: number | null;
  readonly evidenceEnd?: number | null;
  readonly confidence: AnnotationConfidenceV1;
  readonly reviewerSubject: string;
}

export interface ReviewAnnotationServiceInput {
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

export interface ReviewQueueRequest {
  readonly split?: SplitV1;
  readonly reviewerSubject: string;
  readonly acquireLease?: boolean;
}

export interface ExportResult {
  readonly filename: string;
  readonly jsonl: string;
  readonly rowCount: number;
  readonly itemCount: number;
}

export interface DatasetReviewService {
  ready(): Promise<boolean>;
  close(): Promise<void>;
  listDatasets(): Promise<readonly JsonRecord[]>;
  getDataset(datasetId: string): Promise<JsonRecord | null>;
  listProjects(datasetId: string): Promise<readonly JsonRecord[]>;
  getProject(projectId: string): Promise<JsonRecord | null>;
  createProject(input: CreateProjectServiceInput): Promise<JsonRecord>;
  listLabelSchemas(): Promise<readonly JsonRecord[]>;
  createLabelSchema(schema: unknown, subject: string): Promise<CreateLabelSchemaResult>;
  createSplit(projectId: string, input: CreateSplitServiceInput): Promise<CreateSplitResult>;
  reviewQueue(projectId: string, request: ReviewQueueRequest): Promise<JsonRecord | null>;
  addAnnotation(input: AddAnnotationServiceInput): Promise<JsonRecord>;
  reviewAnnotation(annotationId: string, input: ReviewAnnotationServiceInput): Promise<JsonRecord | null>;
  lockHoldout(projectId: string, actorSubject: string): Promise<{ locked: number }>;
  exportProject(projectId: string, splits: readonly SplitV1[]): Promise<ExportResult>;
}

export interface DatasetReviewServiceOptions {
  readonly databaseUrl: string;
  // Only redacted columns are read here, but the review store's constructor
  // requires a cipher; it is never used to decrypt on this read path.
  readonly cipher: LocalEnvelopeCipher;
  readonly blindReviewEnabled: boolean;
  readonly leaseSeconds?: number;
}

export function createDatasetReviewService(
  options: DatasetReviewServiceOptions,
): DatasetReviewService {
  return new PostgresDatasetReviewService(options);
}

class PostgresDatasetReviewService implements DatasetReviewService {
  private readonly review: PostgresDatasetReviewStore;
  private readonly annotation: PostgresDatasetAnnotationStore;
  private readonly blindReviewEnabled: boolean;
  private readonly leaseSeconds: number;

  constructor(options: DatasetReviewServiceOptions) {
    this.review = new PostgresDatasetReviewStore(options.databaseUrl, options.cipher);
    this.annotation = new PostgresDatasetAnnotationStore(options.databaseUrl);
    this.blindReviewEnabled = options.blindReviewEnabled;
    this.leaseSeconds = options.leaseSeconds ?? 900;
  }

  async ready(): Promise<boolean> {
    const [a, b] = await Promise.all([this.review.ready(), this.annotation.ready()]);
    return a && b;
  }

  async close(): Promise<void> {
    await Promise.all([this.review.close(), this.annotation.close()]);
  }

  listDatasets(): Promise<readonly JsonRecord[]> {
    return this.review.listDatasets();
  }

  getDataset(datasetId: string): Promise<JsonRecord | null> {
    return this.review.getDataset(datasetId);
  }

  listProjects(datasetId: string): Promise<readonly JsonRecord[]> {
    return this.annotation.listProjects(datasetId);
  }

  async getProject(projectId: string): Promise<JsonRecord | null> {
    const project = await this.annotation.getProject(projectId);
    if (!project) return null;
    return { ...project, split_summary: await this.annotation.splitSummary(projectId) };
  }

  createProject(input: CreateProjectServiceInput): Promise<JsonRecord> {
    return this.annotation.createProject(input);
  }

  listLabelSchemas(): Promise<readonly JsonRecord[]> {
    return this.annotation.listLabelSchemas();
  }

  createLabelSchema(schema: unknown, subject: string): Promise<CreateLabelSchemaResult> {
    return this.annotation.createLabelSchema({ schema, createdBySubject: subject });
  }

  createSplit(projectId: string, input: CreateSplitServiceInput): Promise<CreateSplitResult> {
    const targets = {
      DEVELOPMENT: input.targets.DEVELOPMENT ?? 0,
      VALIDATION: input.targets.VALIDATION ?? 0,
      HOLDOUT: input.targets.HOLDOUT ?? 0,
      ...(input.targets.RARE_SAFETY !== undefined ? { RARE_SAFETY: input.targets.RARE_SAFETY } : {}),
    };
    return this.annotation.createSplit(projectId, { targets, seed: input.seed });
  }

  async reviewQueue(
    projectId: string,
    request: ReviewQueueRequest,
  ): Promise<JsonRecord | null> {
    const project = await this.annotation.getProject(projectId);
    if (!project) return null;

    const declaredMode = String(project.review_mode ?? "AI_ASSISTED") as ReviewModeV1;
    // When blind review is flagged off, degrade to AI-assisted so proposals are
    // never hidden by a mode the operator cannot currently support.
    const effectiveMode: ReviewModeV1 =
      this.blindReviewEnabled ? declaredMode : "AI_ASSISTED";
    const revealed = effectiveMode === "AI_ASSISTED";

    const split = request.split ?? "DEVELOPMENT";
    const labels = await this.labelOptions(project.label_schema_id);
    const progress = await this.annotation.reviewProgress(projectId, split);

    let itemRow = await this.annotation.nextReviewItem(projectId, {
      reviewerSubject: request.reviewerSubject,
      split,
    });

    if (itemRow && request.acquireLease) {
      const leased = await this.annotation.acquireReviewLease(
        String(itemRow.project_item_id),
        request.reviewerSubject,
        this.leaseSeconds,
      );
      // A null lease means another reviewer grabbed it first; surface the item
      // read-only with its current lease so the UI can lock the actions.
      if (leased) itemRow = { ...itemRow, ...leased };
    }

    const item = itemRow ? await this.buildItem(itemRow, request.reviewerSubject) : null;

    return {
      project_id: projectId,
      project_name: project.name ?? null,
      review_mode: effectiveMode,
      split,
      revealed,
      progress: { reviewed: progress.reviewed, total: progress.total },
      labels,
      item,
    };
  }

  async addAnnotation(input: AddAnnotationServiceInput): Promise<JsonRecord> {
    // Human-authored labels enter as ACCEPTED (the reviewer is asserting them);
    // the store audits every HUMAN add.
    return this.annotation.addAnnotation({
      projectItemId: input.projectItemId,
      labelCode: input.labelCode,
      scope: input.scope,
      turnIndex: input.turnIndex ?? null,
      secondTurnIndex: input.secondTurnIndex ?? null,
      evidenceText: input.evidenceText ?? null,
      evidenceStart: input.evidenceStart ?? null,
      evidenceEnd: input.evidenceEnd ?? null,
      confidence: input.confidence,
      source: "HUMAN",
      status: "ACCEPTED",
      reviewerId: input.reviewerSubject,
    });
  }

  reviewAnnotation(
    annotationId: string,
    input: ReviewAnnotationServiceInput,
  ): Promise<JsonRecord | null> {
    return this.annotation.reviewAnnotation(annotationId, {
      action: input.action,
      actorSubject: input.actorSubject,
      ...(input.patch ? { patch: input.patch } : {}),
    });
  }

  async lockHoldout(projectId: string, actorSubject: string): Promise<{ locked: number }> {
    return { locked: await this.annotation.lockHoldoutSplit(projectId, actorSubject) };
  }

  async exportProject(
    projectId: string,
    splits: readonly SplitV1[],
  ): Promise<ExportResult> {
    const rows = await this.annotation.exportAnnotations(projectId, splits);
    // Group accepted labels by conversation item; one JSONL line per item.
    const byItem = new Map<string, { conversationId: string; split: string; labels: JsonRecord[] }>();
    for (const row of rows) {
      const itemId = String(row.project_item_id);
      const bucket = byItem.get(itemId) ?? {
        conversationId: String(row.conversation_id),
        split: String(row.split),
        labels: [],
      };
      bucket.labels.push({
        label_code: row.label_code,
        scope: row.scope,
        turn_index: row.turn_index,
        second_turn_index: row.second_turn_index,
        evidence_text: row.evidence_text,
        evidence_start: row.evidence_start,
        evidence_end: row.evidence_end,
        confidence: row.confidence,
        source: row.source,
        status: row.status,
      });
      byItem.set(itemId, bucket);
    }
    const lines: string[] = [];
    for (const [itemId, bucket] of byItem) {
      lines.push(JSON.stringify({
        project_item_id: itemId,
        conversation_id: bucket.conversationId,
        split: bucket.split,
        labels: bucket.labels,
      }));
    }
    const jsonl = lines.length > 0 ? `${lines.join("\n")}\n` : "";
    return {
      filename: `benchmark-${projectId}.jsonl`,
      jsonl,
      rowCount: rows.length,
      itemCount: byItem.size,
    };
  }

  private async buildItem(itemRow: JsonRecord, reviewerSubject: string): Promise<JsonRecord> {
    const projectItemId = String(itemRow.project_item_id);
    const conversationId = String(itemRow.conversation_id);
    const [messages, annotations] = await Promise.all([
      this.review.getConversationMessages(conversationId),
      this.annotation.listAnnotations(projectItemId),
    ]);
    return {
      project_item_id: projectItemId,
      conversation_id: conversationId,
      split: itemRow.split ?? null,
      assignment_status: itemRow.assignment_status ?? null,
      quality_flags: Array.isArray(itemRow.quality_flags) ? itemRow.quality_flags : [],
      revision: typeof itemRow.revision === "number" ? itemRow.revision : 0,
      lease: {
        owner_subject: itemRow.lease_owner ?? null,
        owned_by_current: itemRow.lease_owner === reviewerSubject,
        until: itemRow.lease_until ?? null,
      },
      messages: messages.map((message) => ({
        turn_index: message.turn_index,
        role: message.role,
        redacted_text: message.redacted_text,
      })),
      annotations: annotations.map((annotation) => ({
        annotation_id: annotation.annotation_id,
        label_code: annotation.label_code,
        scope: annotation.scope,
        turn_index: annotation.turn_index,
        second_turn_index: annotation.second_turn_index,
        evidence_text: annotation.evidence_text,
        evidence_start: annotation.evidence_start,
        evidence_end: annotation.evidence_end,
        confidence: annotation.confidence,
        source: annotation.source,
        status: annotation.status,
      })),
    };
  }

  private async labelOptions(labelSchemaId: unknown): Promise<JsonRecord[]> {
    if (typeof labelSchemaId !== "string") return [];
    const schema = await this.annotation.getLabelSchema(labelSchemaId);
    const schemaJson = schema?.schema_json;
    const labels = isRecord(schemaJson) && Array.isArray(schemaJson.labels)
      ? schemaJson.labels
      : [];
    return labels.filter(isRecord).map((label) => ({
      code: label.code ?? "",
      name: label.name ?? label.code ?? "",
      scope: label.scope ?? "CONVERSATION",
      evidence_required: label.evidenceRequired === true,
      confidence_required: label.confidenceRequired === true,
      mutually_exclusive_group: label.mutuallyExclusiveGroup ?? null,
      is_safety_critical: label.isSafetyCritical === true,
    }));
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
