import { createHash } from "node:crypto";
import {
  canonicalForHash,
  clampContextualText,
  normalizePayloadUrl,
  pointBelongsToShard,
  type QdrantJob,
  type RunContext,
} from "./p23c-jobs.js";

export const HASH_SCHEMA_VERSION = "p23c-hash-v3";
export const EMBEDDING_HASH_SCHEMA = "lana-qdrant-embedding-v1";
export const PAYLOAD_HASH_SCHEMA = "lana-qdrant-payload-v1";
export const PROVENANCE_HASH_SCHEMA = "lana-qdrant-provenance-v1";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const HASH_FIELDS = new Set([
  "content_hash",
  "source_hash",
  "published_hash",
  "metadata_publish_hash",
  "embedding_hash",
  "payload_hash",
  "provenance_hash",
  "hash_schema_version",
  "embedding_hash_schema",
  "payload_hash_schema",
  "provenance_hash_schema",
]);
const UNORDERED_ARRAY_KEYS = new Set([
  "aliases",
  "color_primary",
  "color_detail",
  "size_options",
  "classifications",
  "search_colors",
  "search_styles",
  "search_materials",
  "search_silhouettes",
  "search_occasions",
  "image_intents",
  "image_parts_visible",
  "image_visual_colors",
  "image_visual_materials",
]);

const digest = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const normalizeString = (value: unknown): string =>
  String(value ?? "").normalize("NFC").replace(/\s+/gu, " ").trim();

const canonicalPayloadValue = (value: unknown, key = ""): unknown => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return ["image_url", "normalized_image_url", "product_link"].includes(key)
      ? normalizePayloadUrl(value)
      : normalizeString(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
  }
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalPayloadValue(item, key));
    if (!UNORDERED_ARRAY_KEYS.has(key)) return items;
    const sorted = items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return sorted.filter(
      (item, index) => index === 0 || JSON.stringify(item) !== JSON.stringify(sorted[index - 1]),
    );
  }
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const childKey of Object.keys(value as Record<string, unknown>).sort()) {
      if (HASH_FIELDS.has(childKey)) continue;
      output[childKey] = canonicalPayloadValue(
        (value as Record<string, unknown>)[childKey],
        childKey,
      );
    }
    return output;
  }
  return normalizeString(value);
};

const unorderedTextList = (value: unknown): string[] => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => normalizeString(item))
      .filter(Boolean),
  ),
].sort((a, b) => a.localeCompare(b));

/**
 * Dựng lại đúng input text mà P2.3C gửi sang Vertex.
 * Hàm này nhận payload để có thể đối chiếu cả point cũ trong Qdrant.
 */
export function contextualTextFromPayload(payload: Readonly<Record<string, unknown>>): string {
  return [
    payload.title,
    payload.category,
    ...unorderedTextList(payload.image_visual_colors),
    ...unorderedTextList(payload.image_visual_materials),
    payload.image_type,
    ...unorderedTextList(payload.image_intents),
    payload.image_angle,
    payload.image_detail_type,
    ...unorderedTextList(payload.image_parts_visible),
    payload.style_primary,
    payload.style_secondary,
    payload.material,
    payload.description,
  ].filter(Boolean).join(". ").slice(0, 1_200);
}

export interface HashV3Config {
  readonly embeddingModel: string;
  readonly embeddingDimension: number;
  readonly imagePreprocessVersion: string;
  readonly cutoutPipelineVersion: string;
}

export interface PointHashes {
  readonly embedding_hash: string;
  readonly payload_hash: string;
  readonly provenance_hash: string;
}

export interface ExistingPointState {
  readonly point_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly content_hash: string;
  readonly embedding_hash: string;
  readonly payload_hash: string;
  readonly provenance_hash: string;
  readonly hash_schema_version: string;
}

export type HashV3Action = "NOOP" | "PAYLOAD_ONLY" | "FULL_EMBED" | "DELETE";

export type HashV3Reason =
  | "UNCHANGED"
  | "POINT_MISSING"
  | "DELETE_REQUESTED"
  | "SHA_BASELINE"
  | "IMAGE_CONTENT_CHANGED"
  | "URL_CHANGED_SAME_CONTENT"
  | "URL_CHANGED_UNVERIFIED"
  | "EMBEDDING_TEXT_CHANGED"
  | "EMBEDDING_PIPELINE_CHANGED"
  | "PAYLOAD_CHANGED"
  | "PROVENANCE_CHANGED"
  | "LEGACY_HASH_MIGRATION"
  | "LEGACY_CONTENT_HASH_STALE";

export interface PlannedQdrantJob {
  readonly job: QdrantJob;
  readonly action: HashV3Action;
  readonly reason: HashV3Reason;
  readonly hashes: PointHashes;
}

export interface HashV3BatchSelection {
  readonly selected: PlannedQdrantJob[];
  readonly all: PlannedQdrantJob[];
  readonly meta: {
    readonly pending_point_count: number;
    readonly batch_selected_point_count: number;
    readonly remaining_point_count: number;
    readonly approved_actionable_count: number;
    readonly held_row_count: number;
    readonly qdrant_existing_point_count: number;
    readonly action_counts: Readonly<Record<HashV3Action, number>>;
    readonly reason_counts: Readonly<Partial<Record<HashV3Reason, number>>>;
  };
}

const validSha = (value: unknown): string => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return SHA256_PATTERN.test(normalized) ? normalized : "";
};

const trustedImageSha = (payload: Readonly<Record<string, unknown>>): string =>
  payload.metadata_verified === true ? validSha(payload.image_content_sha256) : "";

const normalizedImageUrl = (payload: Readonly<Record<string, unknown>>): string =>
  normalizePayloadUrl(payload.normalized_image_url || payload.image_url);

const embeddingText = (payload: Readonly<Record<string, unknown>>): string =>
  clampContextualText(contextualTextFromPayload(payload)).text;

const embeddingConfigFromPayload = (
  payload: Readonly<Record<string, unknown>>,
  fallback: HashV3Config,
): HashV3Config => ({
  embeddingModel: normalizeString(payload.embedding_model) || fallback.embeddingModel,
  embeddingDimension: Number(payload.embedding_dimension || fallback.embeddingDimension),
  imagePreprocessVersion:
    normalizeString(payload.image_preprocess_version) || fallback.imagePreprocessVersion,
  cutoutPipelineVersion:
    normalizeString(payload.cutout_pipeline_version) || fallback.cutoutPipelineVersion,
});

const embeddingInput = (
  payload: Readonly<Record<string, unknown>>,
  config: HashV3Config,
): Record<string, unknown> => {
  const sha = trustedImageSha(payload);
  return {
    schema: EMBEDDING_HASH_SCHEMA,
    image_identity: sha
      ? { kind: "sha256", value: sha }
      : { kind: "url", value: normalizedImageUrl(payload) },
    contextual_text: embeddingText(payload),
    model: config.embeddingModel,
    dimension: config.embeddingDimension,
    image_preprocess_version: config.imagePreprocessVersion,
    cutout_pipeline_version: config.cutoutPipelineVersion,
  };
};

export function computePointHashes(
  pointId: string,
  payload: Readonly<Record<string, unknown>>,
  config: HashV3Config,
): PointHashes {
  const provenance = {
    schema: PROVENANCE_HASH_SCHEMA,
    point_id: pointId,
    image_content_sha256: validSha(payload.image_content_sha256),
    image_url: normalizePayloadUrl(payload.image_url),
    normalized_image_url: normalizedImageUrl(payload),
    image_metadata_review_status: normalizeString(payload.image_metadata_review_status).toUpperCase(),
    metadata_verified: payload.metadata_verified === true,
    source: normalizeString(payload.source),
    source_context: normalizeString(payload.source_context),
    image_metadata_version: normalizeString(payload.image_metadata_version),
    image_metadata_model: normalizeString(payload.image_metadata_model),
    image_metadata_source: normalizeString(payload.image_metadata_source),
  };
  return {
    embedding_hash: digest(embeddingInput(payload, config)),
    payload_hash: digest({
      schema: PAYLOAD_HASH_SCHEMA,
      point_id: pointId,
      payload: canonicalPayloadValue(payload),
    }),
    provenance_hash: digest(provenance),
  };
}

const sameEmbeddingText = (
  current: Readonly<Record<string, unknown>>,
  previous: Readonly<Record<string, unknown>>,
): boolean => embeddingText(current) === embeddingText(previous);

const samePipeline = (
  previous: Readonly<Record<string, unknown>>,
  config: HashV3Config,
  allowLegacyPipeline: boolean,
): boolean => {
  const previousModel = normalizeString(previous.embedding_model);
  const previousDimension = Number(previous.embedding_dimension || 0);
  if (previousModel && previousModel !== config.embeddingModel) return false;
  if (previousDimension && previousDimension !== config.embeddingDimension) return false;
  if (!allowLegacyPipeline) {
    const previousConfig = embeddingConfigFromPayload(previous, config);
    return previousConfig.imagePreprocessVersion === config.imagePreprocessVersion
      && previousConfig.cutoutPipelineVersion === config.cutoutPipelineVersion;
  }
  return true;
};

interface ImageComparison {
  readonly equal: boolean;
  readonly baseline: boolean;
  readonly urlChangedSameContent: boolean;
  readonly reason: HashV3Reason;
}

const compareImage = (
  current: Readonly<Record<string, unknown>>,
  previous: Readonly<Record<string, unknown>>,
): ImageComparison => {
  const currentSha = trustedImageSha(current);
  const previousSha = trustedImageSha(previous);
  const currentUrl = normalizedImageUrl(current);
  const previousUrl = normalizedImageUrl(previous);
  if (currentSha && previousSha) {
    if (currentSha !== previousSha) {
      return { equal: false, baseline: false, urlChangedSameContent: false, reason: "IMAGE_CONTENT_CHANGED" };
    }
    return {
      equal: true,
      baseline: false,
      urlChangedSameContent: currentUrl !== previousUrl,
      reason: currentUrl !== previousUrl ? "URL_CHANGED_SAME_CONTENT" : "UNCHANGED",
    };
  }
  if (!previousSha && currentSha && currentUrl === previousUrl) {
    return { equal: true, baseline: true, urlChangedSameContent: false, reason: "SHA_BASELINE" };
  }
  if (currentUrl === previousUrl) {
    return { equal: true, baseline: false, urlChangedSameContent: false, reason: "UNCHANGED" };
  }
  return { equal: false, baseline: false, urlChangedSameContent: false, reason: "URL_CHANGED_UNVERIFIED" };
};

export function classifyHashV3Job(
  job: QdrantJob,
  existing: ExistingPointState | undefined,
  config: HashV3Config,
  legacyMigrationEnabled: boolean,
): PlannedQdrantJob {
  const hashes = computePointHashes(job.point_id, job.payload, config);
  if (job.delete_requested) {
    return {
      job,
      action: existing ? "DELETE" : "NOOP",
      reason: existing ? "DELETE_REQUESTED" : "UNCHANGED",
      hashes,
    };
  }
  if (!existing) return { job, action: "FULL_EMBED", reason: "POINT_MISSING", hashes };

  const existingPayload = existing.payload;
  const image = compareImage(job.payload, existingPayload);
  if (!image.equal) return { job, action: "FULL_EMBED", reason: image.reason, hashes };
  if (!sameEmbeddingText(job.payload, existingPayload)) {
    return { job, action: "FULL_EMBED", reason: "EMBEDDING_TEXT_CHANGED", hashes };
  }

  const isV3 = existing.hash_schema_version === HASH_SCHEMA_VERSION;
  if (!samePipeline(existingPayload, config, !isV3 && legacyMigrationEnabled)) {
    return { job, action: "FULL_EMBED", reason: "EMBEDDING_PIPELINE_CHANGED", hashes };
  }

  if (isV3 && existing.embedding_hash && existing.embedding_hash !== hashes.embedding_hash) {
    if (image.baseline) {
      return { job, action: "PAYLOAD_ONLY", reason: "SHA_BASELINE", hashes };
    }
    return { job, action: "FULL_EMBED", reason: "EMBEDDING_PIPELINE_CHANGED", hashes };
  }
  if (!isV3) {
    if (!legacyMigrationEnabled) {
      return { job, action: "FULL_EMBED", reason: "EMBEDDING_PIPELINE_CHANGED", hashes };
    }
    return {
      job,
      action: "PAYLOAD_ONLY",
      reason: image.baseline
        ? "SHA_BASELINE"
        : existing.content_hash !== job.source_hash
          ? "LEGACY_CONTENT_HASH_STALE"
          : image.urlChangedSameContent
            ? "URL_CHANGED_SAME_CONTENT"
            : "LEGACY_HASH_MIGRATION",
      hashes,
    };
  }
  if (image.baseline) return { job, action: "PAYLOAD_ONLY", reason: "SHA_BASELINE", hashes };
  if (image.urlChangedSameContent) {
    return { job, action: "PAYLOAD_ONLY", reason: "URL_CHANGED_SAME_CONTENT", hashes };
  }
  if (existing.payload_hash !== hashes.payload_hash) {
    return { job, action: "PAYLOAD_ONLY", reason: "PAYLOAD_CHANGED", hashes };
  }
  if (existing.provenance_hash !== hashes.provenance_hash) {
    return { job, action: "PAYLOAD_ONLY", reason: "PROVENANCE_CHANGED", hashes };
  }
  if (existing.content_hash !== job.source_hash) {
    return { job, action: "PAYLOAD_ONLY", reason: "LEGACY_CONTENT_HASH_STALE", hashes };
  }
  return { job, action: "NOOP", reason: "UNCHANGED", hashes };
}

export function hashV3Payload(
  plan: PlannedQdrantJob,
  config: HashV3Config,
  catalogBuildVersion: string,
): Record<string, unknown> {
  return {
    ...plan.job.payload,
    catalog_version: catalogBuildVersion,
    content_hash: plan.job.source_hash,
    embedding_model: config.embeddingModel,
    embedding_dimension: config.embeddingDimension,
    image_preprocess_version: config.imagePreprocessVersion,
    cutout_pipeline_version: config.cutoutPipelineVersion,
    hash_schema_version: HASH_SCHEMA_VERSION,
    embedding_hash_schema: EMBEDDING_HASH_SCHEMA,
    payload_hash_schema: PAYLOAD_HASH_SCHEMA,
    provenance_hash_schema: PROVENANCE_HASH_SCHEMA,
    ...plan.hashes,
  };
}

export function planHashV3Batch(
  jobs: readonly QdrantJob[],
  existing: ReadonlyMap<string, ExistingPointState>,
  run: RunContext,
  config: HashV3Config,
  embeddingBatchSize: number,
  payloadBatchSize: number,
  legacyMigrationEnabled: boolean,
): HashV3BatchSelection {
  const shardCount = Math.max(1, Number(run.shard_count || 1));
  const shardIndex = Math.max(0, Math.min(shardCount - 1, Number(run.shard_index || 0)));
  const existingByIdentity = new Map<string, ExistingPointState[]>();
  for (const state of existing.values()) {
    const sha = trustedImageSha(state.payload);
    if (!sha) continue;
    const key = [
      normalizeString(state.payload.brand).toLowerCase(),
      normalizeString(state.payload.ma_sp).toUpperCase(),
      sha,
    ].join("|");
    existingByIdentity.set(key, [...(existingByIdentity.get(key) ?? []), state]);
  }
  const resolvedByPoint = new Map<string, QdrantJob>();
  for (const original of jobs) {
    let resolved = original;
    if (!existing.has(original.point_id)) {
      const sha = trustedImageSha(original.payload);
      const key = [
        normalizeString(original.payload.brand).toLowerCase(),
        normalizeString(original.payload.ma_sp).toUpperCase(),
        sha,
      ].join("|");
      const matches = sha ? existingByIdentity.get(key) ?? [] : [];
      if (matches.length === 1) {
        const pointId = matches[0]!.point_id;
        const legacyHash = legacyContentHashForPayload(pointId, original.payload);
        resolved = {
          ...original,
          point_id: pointId,
          source_hash: legacyHash,
          metadata_publish_hash: legacyHash,
        };
      }
    }
    const previous = resolvedByPoint.get(resolved.point_id);
    if (!previous || resolved.metadata_sheet_row >= previous.metadata_sheet_row) {
      resolvedByPoint.set(resolved.point_id, resolved);
    }
  }
  const actionable = [...resolvedByPoint.values()].filter(
    (job) => job.job_valid && job.point_id && pointBelongsToShard(job.point_id, shardCount, shardIndex),
  );
  const all = actionable
    .map((job) => classifyHashV3Job(job, existing.get(job.point_id), config, legacyMigrationEnabled))
    .sort((a, b) =>
      String(a.job.payload?.ma_sp || "").localeCompare(String(b.job.payload?.ma_sp || ""))
      || String(a.job.point_id).localeCompare(String(b.job.point_id)));

  const deletes = all.filter((plan) => plan.action === "DELETE");
  const embeddings = all.filter((plan) => plan.action === "FULL_EMBED")
    .slice(0, Math.max(1, embeddingBatchSize));
  const payloadOnly = all.filter((plan) => plan.action === "PAYLOAD_ONLY")
    .slice(0, Math.max(1, payloadBatchSize));
  const selected = [...deletes, ...embeddings, ...payloadOnly];
  const pending = all.filter((plan) => plan.action !== "NOOP");
  const actionCounts = Object.fromEntries(
    (["NOOP", "PAYLOAD_ONLY", "FULL_EMBED", "DELETE"] as const)
      .map((action) => [action, all.filter((plan) => plan.action === action).length]),
  ) as Record<HashV3Action, number>;
  const reasonCounts: Partial<Record<HashV3Reason, number>> = {};
  for (const plan of all) reasonCounts[plan.reason] = (reasonCounts[plan.reason] ?? 0) + 1;

  return {
    selected,
    all,
    meta: {
      pending_point_count: pending.length,
      batch_selected_point_count: selected.length,
      remaining_point_count: Math.max(0, pending.length - selected.length),
      approved_actionable_count: actionable.length,
      held_row_count: jobs.filter((job) => job.publish_action === "HOLD").length,
      qdrant_existing_point_count: existing.size,
      action_counts: actionCounts,
      reason_counts: reasonCounts,
    },
  };
}

/** Giữ công thức v2 để worker cũ có thể rollback mà không tạo backlog giả. */
export function legacyContentHashForPayload(pointId: string, payload: Record<string, unknown>): string {
  const hashInput = canonicalForHash({
    hash_schema: "lana-qdrant-semantic-v2",
    point_id: pointId,
    payload,
  });
  return digest(hashInput);
}
