/**
 * Product Image Recognition V2 — dedicated Qdrant adapter (Phase 2).
 *
 * This is intentionally separate from `QdrantStableCatalogSearchAdapter`: that
 * adapter owns the 1408D `image_raw` / `product_text` multimodal collection used
 * by text search and other non-recognition consumers, and it collapses points
 * into product-only documents with a `[0,1]` score clamp. V2 recognition needs the
 * opposite — the exact winning image point per SKU, with its unmodified cosine
 * score — so it gets its own collection contract and its own adapter.
 *
 * The adapter is worker-local rather than part of the `@lana/business-tools`
 * public API: every consumer of it in V2 (realtime recognition and the V2
 * catalog publisher) lives in `apps/worker`, and the package barrel
 * `packages/business-tools/src/index.ts` is one of the frozen
 * `GATE_E_CANDIDATE_SOURCE_PATHS_V1` blobs that must stay byte-identical for
 * accepted Gate E v22 / Gate F evidence to remain reusable. Keeping the adapter
 * here avoids expanding that frozen surface. It still reads the shared catalog
 * types and helpers from `@lana/business-tools`, which the barrel already exports.
 *
 * Retrieval is server-side grouped exact search:
 *
 *   POST /collections/<recognitionCollection>/points/query/groups
 *   using=image_cutout, group_by=product_id, group_size=1, limit=5,
 *   params.exact=true, filter active=true, with_payload=true, with_vector=false
 *
 * There is deliberately no client-side oversampling/dedupe fallback: if the
 * deployed Qdrant cannot serve this contract, V2 is not deployment-ready.
 */
import {
  normalizeProductCode,
  stableProductDocumentFromQdrantPayload,
  type ProductImageAngle,
  type ProductImageType,
  type StableProductDocument,
} from "@lana/business-tools";

/** Named vector, size and distance of the dedicated recognition collection. */
export const IMAGE_RECOGNITION_VECTOR_NAME = "image_cutout";
export const IMAGE_RECOGNITION_VECTOR_SIZE = 3_072;
export const IMAGE_RECOGNITION_DISTANCE = "Cosine";
export const IMAGE_RECOGNITION_GROUP_BY_FIELD = "product_id";
/**
 * Locked V2 shortlist bound. The reranker accepts 1-5 candidates, so the cap is
 * enforced here at the Qdrant boundary rather than left to the caller: a wrong
 * config can never make retrieval return more groups than the contract allows.
 */
export const IMAGE_RECOGNITION_MAX_UNIQUE_GROUPS = 5;

/** One winning catalog image point for one unique SKU group. */
export interface ImageRecognitionHit {
  readonly pointId: string;
  readonly productId: string;
  /** Unmodified finite Qdrant cosine score, negatives included. */
  readonly score: number;
  readonly imageUrl: string;
  readonly imageRole: string | null;
  readonly imageType: ProductImageType | null;
  readonly imageAngle: ProductImageAngle | null;
  readonly imageDetailType: string | null;
  readonly imageContentSha256: string | null;
  /**
   * Minimal catalog document built from the same winning payload. The realtime
   * caller hydrates it by exact code; it never replaces the evidence above.
   */
  readonly product: StableProductDocument;
}

export interface ImageRecognitionSearchPort {
  searchCutoutGroups(
    embedding: readonly number[],
    uniqueProductLimit: number,
    signal: AbortSignal,
  ): Promise<readonly ImageRecognitionHit[]>;
}

/** Authoritative V2 publication state of one recognition point. */
export interface ImageRecognitionPointState {
  readonly pointId: string;
  readonly sourceHash: string;
  readonly embeddingPipelineVersion: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface ImageRecognitionPoint {
  readonly id: string;
  readonly vector: readonly number[];
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Narrow target-state operations the V2 catalog publisher needs. */
export interface ImageRecognitionPublisherPort {
  getPoint(pointId: string, signal: AbortSignal): Promise<ImageRecognitionPointState | null>;
  upsertPoint(point: ImageRecognitionPoint, signal: AbortSignal): Promise<void>;
  deletePoint(pointId: string, signal: AbortSignal): Promise<void>;
  /** Fail closed when the collection is not `image_cutout` / 3072 / Cosine. */
  validateCollectionContract(signal: AbortSignal): Promise<void>;
}

export class ImageRecognitionSearchError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = "ImageRecognitionSearchError";
    this.code = code;
    this.retryable = retryable;
  }
}

const IMAGE_ANGLES: readonly ProductImageAngle[] = [
  "FRONT", "BACK", "SIDE", "CLOSEUP", "MULTI", "UNKNOWN",
];
const IMAGE_TYPES: readonly ProductImageType[] = [
  "MODEL", "PRODUCT_ONLY", "DETAIL", "FLATLAY", "LIFESTYLE", "COLLAGE",
  "SIZE_GUIDE", "OTHER",
];

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function optionalText(value: unknown): string | null {
  const token = text(value);
  return token.length > 0 ? token : null;
}

function enumeration<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  const token = text(value).toUpperCase();
  return (allowed as readonly string[]).includes(token) ? (token as T) : null;
}

function httpsUrl(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate) return null;
  try {
    return new URL(candidate).protocol === "https:" ? candidate : null;
  } catch {
    return null;
  }
}

function contentSha256(value: unknown): string | null {
  const token = text(value).toLowerCase();
  return /^[a-f0-9]{64}$/u.test(token) ? token : null;
}

export interface QdrantImageRecognitionAdapterOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly collection: string;
  /** Adapter-local bound; it may shorten a call but never extend the caller's. */
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export class QdrantImageRecognitionAdapter
  implements ImageRecognitionSearchPort, ImageRecognitionPublisherPort {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly collection: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: QdrantImageRecognitionAdapterOptions) {
    const base = new URL(options.baseUrl);
    if (base.protocol !== "https:") throw new Error("QDRANT_HTTPS_REQUIRED");
    if (!options.apiKey.trim()) throw new Error("QDRANT_API_KEY_REQUIRED");
    if (!/^[A-Za-z0-9_.-]+$/u.test(options.collection)) {
      throw new Error("QDRANT_COLLECTION_INVALID");
    }
    this.baseUrl = base.toString().replace(/\/$/u, "");
    this.apiKey = options.apiKey.trim();
    this.collection = options.collection;
    this.timeoutMs = Math.max(250, Math.min(60_000, options.timeoutMs ?? 5_000));
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private path(suffix: string): string {
    return `${this.baseUrl}/collections/${encodeURIComponent(this.collection)}${suffix}`;
  }

  /**
   * Every request is bound to the caller's signal. The adapter-local timeout can
   * only shorten the call: when the parent aborts, the in-flight fetch aborts
   * immediately and the caller sees cancellation rather than a later result.
   */
  private async request(
    url: string,
    method: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<Record<string, unknown>> {
    if (signal.aborted) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_QDRANT_CANCELLED", false);
    }
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        method,
        headers: { "api-key": this.apiKey, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const value = await response.json().catch(() => null);
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        throw new ImageRecognitionSearchError(
          retryable ? "IMAGE_RECOGNITION_QDRANT_RETRYABLE" : "IMAGE_RECOGNITION_QDRANT_FAILED",
          retryable,
        );
      }
      return record(value);
    } catch (error) {
      if (error instanceof ImageRecognitionSearchError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new ImageRecognitionSearchError(
          signal.aborted
            ? "IMAGE_RECOGNITION_QDRANT_CANCELLED"
            : "IMAGE_RECOGNITION_QDRANT_TIMEOUT",
          true,
        );
      }
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_QDRANT_NETWORK_ERROR", true);
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
    }
  }

  private validateVector(embedding: readonly number[]): number[] {
    if (
      embedding.length !== IMAGE_RECOGNITION_VECTOR_SIZE ||
      embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_VECTOR_INVALID", false);
    }
    return [...embedding];
  }

  async searchCutoutGroups(
    embedding: readonly number[],
    uniqueProductLimit: number,
    signal: AbortSignal,
  ): Promise<readonly ImageRecognitionHit[]> {
    const limit = Math.max(
      1,
      Math.min(IMAGE_RECOGNITION_MAX_UNIQUE_GROUPS, Math.trunc(uniqueProductLimit)),
    );
    const body = await this.request(
      this.path("/points/query/groups"),
      "POST",
      {
        query: this.validateVector(embedding),
        using: IMAGE_RECOGNITION_VECTOR_NAME,
        group_by: IMAGE_RECOGNITION_GROUP_BY_FIELD,
        group_size: 1,
        limit,
        params: { exact: true },
        filter: { must: [{ key: "active", match: { value: true } }] },
        with_payload: true,
        with_vector: false,
      },
      signal,
    );
    const groups = record(body.result).groups;
    if (!Array.isArray(groups)) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_GROUPS_INVALID", true);
    }
    // Server order is score order; the adapter preserves it and never re-sorts.
    return groups.slice(0, limit).map((entry) => this.hitFromGroup(entry));
  }

  private hitFromGroup(entry: unknown): ImageRecognitionHit {
    const group = record(entry);
    const hits = Array.isArray(group.hits) ? group.hits : null;
    if (!hits || hits.length === 0) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_GROUP_EMPTY", false);
    }
    const hit = record(hits[0]);
    const payload = record(hit.payload);
    const pointId = text(hit.id);
    if (!pointId) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_POINT_ID_INVALID", false);
    }
    if (typeof hit.score !== "number" || !Number.isFinite(hit.score)) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_SCORE_INVALID", false);
    }
    const payloadProductId = normalizeProductCode(
      text(payload.product_id) || text(payload.ma_sp),
    );
    if (!payloadProductId) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_PRODUCT_ID_INVALID", false);
    }
    // The group key and the winning hit must describe the same SKU. A mismatch —
    // and equally a missing, empty or unparseable group key — is an explicit
    // error, never a silently dropped or substituted candidate: without a group
    // key there is nothing to validate the payload against.
    const groupId = normalizeProductCode(text(group.id));
    if (!groupId || groupId !== payloadProductId) {
      throw new ImageRecognitionSearchError(
        "IMAGE_RECOGNITION_GROUP_IDENTITY_INVALID",
        false,
      );
    }
    const imageUrl = httpsUrl(payload.image_url);
    if (!imageUrl) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_EVIDENCE_INVALID", false);
    }
    const product = stableProductDocumentFromQdrantPayload(payload);
    if (!product) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_PAYLOAD_INVALID", false);
    }
    return {
      pointId,
      productId: payloadProductId,
      score: hit.score,
      imageUrl,
      imageRole: optionalText(payload.image_role),
      imageType: enumeration(payload.image_type, IMAGE_TYPES),
      imageAngle: enumeration(payload.image_angle, IMAGE_ANGLES),
      imageDetailType: optionalText(payload.image_detail_type),
      imageContentSha256: contentSha256(payload.image_content_sha256),
      product: { ...product, productId: payloadProductId },
    };
  }

  async getPoint(
    pointId: string,
    signal: AbortSignal,
  ): Promise<ImageRecognitionPointState | null> {
    const body = await this.request(
      this.path("/points"),
      "POST",
      { ids: [pointId], with_payload: true, with_vector: false },
      signal,
    );
    const result = body.result;
    if (!Array.isArray(result)) {
      throw new ImageRecognitionSearchError("IMAGE_RECOGNITION_POINT_RESPONSE_INVALID", true);
    }
    const point = result.map((value) => record(value)).find(
      (value) => text(value.id) === pointId,
    );
    if (!point) return null;
    const payload = record(point.payload);
    return {
      pointId,
      sourceHash: text(payload.source_hash),
      embeddingPipelineVersion: text(payload.embedding_pipeline_version),
      payload,
    };
  }

  async upsertPoint(point: ImageRecognitionPoint, signal: AbortSignal): Promise<void> {
    this.validateVector(point.vector);
    await this.request(
      this.path("/points?wait=true"),
      "PUT",
      {
        points: [{
          id: point.id,
          vector: { [IMAGE_RECOGNITION_VECTOR_NAME]: [...point.vector] },
          payload: point.payload,
        }],
      },
      signal,
    );
  }

  async deletePoint(pointId: string, signal: AbortSignal): Promise<void> {
    await this.request(
      this.path("/points/delete?wait=true"),
      "POST",
      { points: [pointId] },
      signal,
    );
  }

  async validateCollectionContract(signal: AbortSignal): Promise<void> {
    const body = await this.request(this.path(""), "GET", undefined, signal);
    const vectors = record(record(record(record(body.result).config).params).vectors);
    const cutout = vectors[IMAGE_RECOGNITION_VECTOR_NAME];
    if (cutout === undefined) {
      throw new ImageRecognitionSearchError(
        "IMAGE_RECOGNITION_COLLECTION_VECTOR_MISSING",
        false,
      );
    }
    const spec = record(cutout);
    if (Number(spec.size) !== IMAGE_RECOGNITION_VECTOR_SIZE) {
      throw new ImageRecognitionSearchError(
        "IMAGE_RECOGNITION_COLLECTION_DIMENSION_INVALID",
        false,
      );
    }
    if (text(spec.distance).toLowerCase() !== IMAGE_RECOGNITION_DISTANCE.toLowerCase()) {
      throw new ImageRecognitionSearchError(
        "IMAGE_RECOGNITION_COLLECTION_DISTANCE_INVALID",
        false,
      );
    }
  }
}
