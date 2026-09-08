/**
 * Product Image Recognition V2 — locked configuration contract (Phase 0).
 *
 * Spec: `docs/current/MEDIA_RECOGNITION_V2_CUTOUT_ONLY_SPEC_20260907.md` §7, §8, §9.
 *
 * The embedding model, dimension, Vertex location/host, vector name and canonical
 * preprocessing bound are part of the V2 vector-space contract and are therefore
 * constants, not tunables. Only the recognition collection name, the pipeline
 * version label and the reranker identity are configurable, and every one of them
 * fails closed so an invalid deployment can never mix incompatible vector spaces.
 *
 * This module deliberately does not read the shared legacy `VERTEX_EMBEDDING_*`
 * settings: those belong to the 1408D text/multimodal consumers that stay on the
 * old collection.
 */

/** Vertex publisher model used for every V2 recognition vector. */
export const RECOGNITION_V2_EMBEDDING_MODEL = "gemini-embedding-2";
/** Default and maximum output dimensionality of `gemini-embedding-2`. */
export const RECOGNITION_V2_EMBEDDING_DIMENSION = 3_072;
/** Vertex multi-region location for the V2 embedding contract. */
export const RECOGNITION_V2_VERTEX_LOCATION = "us";
/** Service endpoint host that serves `location = us`. */
export const RECOGNITION_V2_VERTEX_HOST = "aiplatform.us.rep.googleapis.com";
/** Vertex method: the Gemini embedding contract, never the legacy `:predict`. */
export const RECOGNITION_V2_VERTEX_METHOD = "embedContent";
/** Named vector of the dedicated recognition collection. */
export const RECOGNITION_V2_VECTOR_NAME = "image_cutout";
/** Distance metric of the dedicated recognition collection. */
export const RECOGNITION_V2_DISTANCE = "Cosine";
/** Canonical preprocessing bound applied to both catalog and customer images. */
export const RECOGNITION_V2_MAX_IMAGE_DIMENSION = 1_024;
/** Background-removal model for the cutout stage. */
export const RECOGNITION_V2_REMBG_MODEL = "u2netp";
/** Unique SKU groups requested from Qdrant for realtime recognition. */
export const RECOGNITION_V2_UNIQUE_PRODUCT_LIMIT = 5;
/** Legacy multimodal collection; the V2 recognition collection must differ. */
export const LEGACY_MULTIMODAL_COLLECTION = "lana_multimodal_data_v2";

const COLLECTION_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/u;
const VERSION_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/u;
const MODEL_PATTERN = /^[A-Za-z0-9._-]{1,128}$/u;

export interface MediaRecognitionV2Config {
  /** Dedicated recognition collection, always separate from the legacy one. */
  readonly recognitionCollection: string;
  /**
   * One value covering model + dimension + preprocessing + cutout contract.
   * Freshness comparison uses this and `source_hash` only.
   */
  readonly embeddingPipelineVersion: string;
  readonly embeddingModel: typeof RECOGNITION_V2_EMBEDDING_MODEL;
  readonly embeddingDimension: typeof RECOGNITION_V2_EMBEDDING_DIMENSION;
  readonly vertexLocation: typeof RECOGNITION_V2_VERTEX_LOCATION;
  readonly vertexHost: typeof RECOGNITION_V2_VERTEX_HOST;
  readonly vectorName: typeof RECOGNITION_V2_VECTOR_NAME;
  readonly distance: typeof RECOGNITION_V2_DISTANCE;
  readonly maxImageDimension: typeof RECOGNITION_V2_MAX_IMAGE_DIMENSION;
  readonly rembgModel: string;
  readonly uniqueProductLimit: number;
  /** Reranker identity kept for telemetry; not part of the vector space. */
  readonly rerankerModel: string;
  readonly rerankerPromptVersion: string;
}

export type MediaRecognitionV2Environment = Readonly<Record<string, string | undefined>>;

function trimmed(
  environment: MediaRecognitionV2Environment,
  name: string,
): string {
  return environment[name]?.trim() ?? "";
}

/**
 * Derive the single pipeline-version value from the locked contract so a
 * deployment cannot silently describe one pipeline while running another.
 */
export function defaultEmbeddingPipelineVersion(rembgModel: string): string {
  return [
    "ge2",
    String(RECOGNITION_V2_EMBEDDING_DIMENSION),
    `pre${RECOGNITION_V2_MAX_IMAGE_DIMENSION}`,
    "rembg",
    rembgModel,
    "v1",
  ].join("-");
}

/**
 * Resolve the V2 recognition configuration, failing closed on anything that
 * could produce a mixed or unknown vector space.
 */
export function resolveMediaRecognitionV2Config(
  environment: MediaRecognitionV2Environment,
): MediaRecognitionV2Config {
  const recognitionCollection = trimmed(
    environment,
    "MEDIA_RECOGNITION_V2_QDRANT_COLLECTION",
  );
  if (!recognitionCollection) {
    throw new Error("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_REQUIRED");
  }
  if (!COLLECTION_PATTERN.test(recognitionCollection)) {
    throw new Error("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_INVALID");
  }
  if (recognitionCollection === LEGACY_MULTIMODAL_COLLECTION) {
    throw new Error("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_CONFLICT");
  }
  const legacyCollection = trimmed(environment, "QDRANT_COLLECTION");
  const legacyIngestCollection = trimmed(environment, "QDRANT_COLLECTION_INGEST_V2");
  if (
    recognitionCollection === legacyCollection ||
    recognitionCollection === legacyIngestCollection
  ) {
    throw new Error("MEDIA_RECOGNITION_V2_QDRANT_COLLECTION_CONFLICT");
  }

  const rembgModel =
    trimmed(environment, "MEDIA_RECOGNITION_V2_REMBG_MODEL") ||
    RECOGNITION_V2_REMBG_MODEL;
  if (!MODEL_PATTERN.test(rembgModel)) {
    throw new Error("MEDIA_RECOGNITION_V2_REMBG_MODEL_INVALID");
  }

  const embeddingPipelineVersion =
    trimmed(environment, "MEDIA_RECOGNITION_V2_EMBEDDING_PIPELINE_VERSION") ||
    defaultEmbeddingPipelineVersion(rembgModel);
  if (!VERSION_PATTERN.test(embeddingPipelineVersion)) {
    throw new Error("MEDIA_RECOGNITION_V2_EMBEDDING_PIPELINE_VERSION_INVALID");
  }

  // An operator may restate the locked values for documentation, but may never
  // change them: a different model/dimension/location is a different vector space.
  const declaredModel = trimmed(environment, "MEDIA_RECOGNITION_V2_EMBEDDING_MODEL");
  if (declaredModel && declaredModel !== RECOGNITION_V2_EMBEDDING_MODEL) {
    throw new Error("MEDIA_RECOGNITION_V2_EMBEDDING_MODEL_UNSUPPORTED");
  }
  const declaredDimension = trimmed(
    environment,
    "MEDIA_RECOGNITION_V2_EMBEDDING_DIMENSION",
  );
  if (
    declaredDimension &&
    Number(declaredDimension) !== RECOGNITION_V2_EMBEDDING_DIMENSION
  ) {
    throw new Error("MEDIA_RECOGNITION_V2_EMBEDDING_DIMENSION_UNSUPPORTED");
  }
  const declaredLocation = trimmed(environment, "MEDIA_RECOGNITION_V2_VERTEX_LOCATION");
  if (declaredLocation && declaredLocation !== RECOGNITION_V2_VERTEX_LOCATION) {
    throw new Error("MEDIA_RECOGNITION_V2_VERTEX_LOCATION_UNSUPPORTED");
  }

  const rerankerModel =
    trimmed(environment, "MEDIA_RECOGNITION_V2_RERANK_MODEL") ||
    "gemini-3.5-flash-lite";
  if (!MODEL_PATTERN.test(rerankerModel)) {
    throw new Error("MEDIA_RECOGNITION_V2_RERANK_MODEL_INVALID");
  }
  const rerankerPromptVersion =
    trimmed(environment, "MEDIA_RECOGNITION_V2_RERANK_PROMPT_VERSION") ||
    "media-rerank-v2-cutout-only";
  if (!VERSION_PATTERN.test(rerankerPromptVersion)) {
    throw new Error("MEDIA_RECOGNITION_V2_RERANK_PROMPT_VERSION_INVALID");
  }

  return {
    recognitionCollection,
    embeddingPipelineVersion,
    embeddingModel: RECOGNITION_V2_EMBEDDING_MODEL,
    embeddingDimension: RECOGNITION_V2_EMBEDDING_DIMENSION,
    vertexLocation: RECOGNITION_V2_VERTEX_LOCATION,
    vertexHost: RECOGNITION_V2_VERTEX_HOST,
    vectorName: RECOGNITION_V2_VECTOR_NAME,
    distance: RECOGNITION_V2_DISTANCE,
    maxImageDimension: RECOGNITION_V2_MAX_IMAGE_DIMENSION,
    rembgModel,
    uniqueProductLimit: RECOGNITION_V2_UNIQUE_PRODUCT_LIMIT,
    rerankerModel,
    rerankerPromptVersion,
  };
}

/** Redis lock namespace scoped to the recognition collection + pipeline version. */
export function recognitionLockKey(
  config: MediaRecognitionV2Config,
  shardIndex: number,
  shardCount: number,
): string {
  return `lock:ingest:${config.recognitionCollection}:${config.embeddingPipelineVersion}`
    + `:shard:${shardIndex}:of:${shardCount}`;
}

/** Redis progress namespace scoped to the recognition collection + pipeline version. */
export function recognitionProgressKey(
  config: MediaRecognitionV2Config,
  shardIndex: number,
  shardCount: number,
): string {
  return `ingest:progress:${config.recognitionCollection}:${config.embeddingPipelineVersion}`
    + `:shard:${shardIndex}:of:${shardCount}`;
}
