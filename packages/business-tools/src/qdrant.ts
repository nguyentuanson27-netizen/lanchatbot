import { normalizeProductCode } from "./inventory.js";
import type {
  MultimodalEmbeddingPort,
  BatchStableImageSearchResult,
  ProductImage,
  ProductImageAngle,
  ProductImageType,
  ScoredStableProduct,
  StableCatalogSearchPort,
  StableProductDocument,
} from "./types.js";

interface QdrantPoint {
  readonly id?: unknown;
  readonly score?: unknown;
  readonly payload?: unknown;
}

export interface QdrantStableCatalogSearchOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly collection: string;
  readonly embedding: MultimodalEmbeddingPort;
  readonly expectedDimension?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export class QdrantSearchError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, retryable: boolean) {
    super(code);
    this.name = "QdrantSearchError";
    this.code = code;
    this.retryable = retryable;
  }
}

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

function strings(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map(text).filter(Boolean))];
  }
  const single = text(value);
  if (!single) return [];
  return [...new Set(single.split(/[;,|]/u).map((item) => item.trim()).filter(Boolean))];
}

function validImageUrls(value: unknown): string[] {
  return strings(value).filter((item) => {
    try {
      return new URL(item).protocol === "https:";
    } catch {
      return false;
    }
  }).slice(0, 20);
}

const IMAGE_ANGLES: readonly ProductImageAngle[] = [
  "FRONT", "BACK", "SIDE", "CLOSEUP", "MULTI", "UNKNOWN",
];
const IMAGE_TYPES: readonly ProductImageType[] = [
  "MODEL", "PRODUCT_ONLY", "DETAIL", "FLATLAY", "LIFESTYLE", "COLLAGE", "SIZE_GUIDE", "OTHER",
];

function enumeration<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const token = text(value).toUpperCase();
  return (allowed as readonly string[]).includes(token) ? (token as T) : fallback;
}

/** Mỗi point Qdrant là một ảnh, nên metadata phân loại nằm ngay trên payload của
 *  point đó. `images_array` chỉ là danh sách ngữ cảnh không kèm phân loại nên
 *  không dùng để dựng `images`. */
function productImageFromPayload(payload: Record<string, unknown>): ProductImage | null {
  const url = validImageUrls(payload.image_url)[0];
  if (!url) return null;
  const quality = Number(payload.image_quality_score);
  return {
    url,
    role: text(payload.image_role).toUpperCase() === "PRIMARY" ? "PRIMARY" : "ADDITIONAL",
    angle: enumeration(payload.image_angle, IMAGE_ANGLES, "UNKNOWN"),
    imageType: enumeration(payload.image_type, IMAGE_TYPES, "OTHER"),
    intents: strings(payload.image_intents).map((item) => item.toUpperCase()),
    partsVisible: strings(payload.image_parts_visible).map((item) => item.toUpperCase()),
    sortOrder: Number.isFinite(Number(payload.image_sort_order))
      ? Math.trunc(Number(payload.image_sort_order))
      : 0,
    qualityScore: Number.isFinite(quality) ? quality : null,
    feedback: payload.feedback_verified === true,
    observedAt: text(payload.published_at) || text(payload.ai_updated_at) || null,
  };
}

export function stableProductDocumentFromQdrantPayload(value: unknown): StableProductDocument | null {
  const payload = record(value);
  const productId = text(payload.product_id) || text(payload.ma_sp);
  if (!productId) return null;
  const canonicalCode = text(payload.ma_sp) || productId;
  const images = validImageUrls(payload.images_array);
  const primaryImage = validImageUrls(payload.image_url);
  const classified = productImageFromPayload(payload);
  return {
    images: classified ? [classified] : [],
    productId,
    parentProductId: text(payload.parent_product_id) || productId,
    canonicalCode,
    aliases: strings(payload.aliases),
    title: text(payload.title) || canonicalCode,
    descriptionXml:
      text(payload.description_xml) ||
      text(payload.description),
    colors: strings(payload.search_colors ?? payload.colors),
    materials: strings(payload.search_materials ?? payload.material ?? payload.materials),
    silhouettes: strings(payload.search_silhouettes ?? payload.silhouettes),
    occasions: strings(payload.search_occasions ?? payload.occasions),
    imageUrls: [...new Set([...primaryImage, ...images])].slice(0, 20),
    catalogVersion: text(payload.catalog_version) || text(payload.ingestion_version) || "catalog-v2",
    observedAt: text(payload.published_at) || text(payload.ai_updated_at) || null,
  };
}

function documentFromPoint(point: QdrantPoint): StableProductDocument | null {
  return stableProductDocumentFromQdrantPayload(point.payload);
}

function deduplicateDocuments(points: readonly QdrantPoint[]): StableProductDocument[] {
  const values = new Map<string, StableProductDocument>();
  for (const point of points) {
    const document = documentFromPoint(point);
    if (!document) continue;
    const key = normalizeProductCode(document.productId);
    const previous = values.get(key);
    if (!previous) {
      values.set(key, document);
      continue;
    }
    const mergedImages = [...previous.images];
    for (const image of document.images) {
      if (!mergedImages.some((existing) => existing.url === image.url)) mergedImages.push(image);
    }
    values.set(key, {
      ...previous,
      aliases: [...new Set([...previous.aliases, ...document.aliases])],
      imageUrls: [...new Set([...previous.imageUrls, ...document.imageUrls])].slice(0, 20),
      images: mergedImages.slice(0, 40),
    });
  }
  return [...values.values()];
}

function scoredDocuments(points: readonly QdrantPoint[], limit: number): ScoredStableProduct[] {
  const values = new Map<string, ScoredStableProduct>();
  for (const point of points) {
    const document = documentFromPoint(point);
    if (!document) continue;
    const rawScore = typeof point.score === "number" && Number.isFinite(point.score) ? point.score : 0;
    const score = Math.max(0, Math.min(1, rawScore));
    const key = normalizeProductCode(document.productId);
    const previous = values.get(key);
    if (!previous || score > previous.score) values.set(key, { document, score });
  }
  return [...values.values()]
    .sort((left, right) => right.score - left.score || left.document.productId.localeCompare(right.document.productId))
    .slice(0, limit);
}

export class QdrantStableCatalogSearchAdapter implements StableCatalogSearchPort {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly collection: string;
  private readonly embedding: MultimodalEmbeddingPort;
  private readonly expectedDimension: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: QdrantStableCatalogSearchOptions) {
    const base = new URL(options.baseUrl);
    if (base.protocol !== "https:") throw new Error("QDRANT_HTTPS_REQUIRED");
    if (!options.apiKey.trim()) throw new Error("QDRANT_API_KEY_REQUIRED");
    if (!/^[A-Za-z0-9_.-]+$/u.test(options.collection)) throw new Error("QDRANT_COLLECTION_INVALID");
    this.baseUrl = base.toString().replace(/\/$/u, "");
    this.apiKey = options.apiKey.trim();
    this.collection = options.collection;
    this.embedding = options.embedding;
    this.expectedDimension = options.expectedDimension ?? 1_408;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async request(path: string, body: unknown): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "api-key": this.apiKey, "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const value = await response.json().catch(() => null);
      if (!response.ok) {
        throw new QdrantSearchError(
          response.status === 429 || response.status >= 500 ? "QDRANT_RETRYABLE" : "QDRANT_REQUEST_FAILED",
          response.status === 429 || response.status >= 500,
        );
      }
      return record(value);
    } catch (error) {
      if (error instanceof QdrantSearchError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new QdrantSearchError("QDRANT_TIMEOUT", true);
      }
      throw new QdrantSearchError("QDRANT_NETWORK_ERROR", true);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async filteredScroll(filter: unknown): Promise<QdrantPoint[]> {
    const body = await this.request(
      `/collections/${encodeURIComponent(this.collection)}/points/scroll`,
      { filter, limit: 256, with_payload: true, with_vector: false },
    );
    const result = record(body.result);
    if (!Array.isArray(result.points)) {
      throw new QdrantSearchError("QDRANT_RESPONSE_INVALID", true);
    }
    return result.points.map((point) => record(point) as QdrantPoint);
  }

  async findByExactCode(normalizedCode: string): Promise<StableProductDocument | null> {
    const code = normalizeProductCode(normalizedCode);
    if (!code) return null;
    for (const key of ["product_id", "ma_sp"] as const) {
      const points = await this.filteredScroll({ must: [
        { key: "active", match: { value: true } },
        { key, match: { value: code } },
      ] });
      const match = deduplicateDocuments(points).find((document) =>
        normalizeProductCode(document.productId) === code || normalizeProductCode(document.canonicalCode) === code
      );
      if (match) return match;
    }
    return null;
  }

  async findByAlias(normalizedAlias: string): Promise<readonly StableProductDocument[]> {
    const alias = normalizeProductCode(normalizedAlias);
    if (!alias) return [];
    const points = await this.filteredScroll({ must: [
      { key: "active", match: { value: true } },
      { key: "aliases", match: { value: alias } },
    ] });
    let matches = deduplicateDocuments(points).filter((document) =>
      document.aliases.some((value) => normalizeProductCode(value) === alias)
    );
    // The current ingestion stores some aliases before normalization. Keep a bounded
    // compatibility scan for the test collection until aliases_normalized is indexed.
    if (matches.length === 0) {
      const activePoints = await this.filteredScroll({ must: [{ key: "active", match: { value: true } }] });
      matches = deduplicateDocuments(activePoints).filter((document) =>
        document.aliases.some((value) => normalizeProductCode(value) === alias)
      );
    }
    return matches;
  }

  private validateVector(vector: readonly number[]): number[] {
    if (vector.length !== this.expectedDimension || vector.some((value) => !Number.isFinite(value))) {
      throw new QdrantSearchError("EMBEDDING_VECTOR_INVALID", false);
    }
    return [...vector];
  }

  private async queryVector(vector: readonly number[], using: "product_text" | "image_raw", limit: number): Promise<ScoredStableProduct[]> {
    const body = await this.request(
      `/collections/${encodeURIComponent(this.collection)}/points/query`,
      {
        query: this.validateVector(vector),
        using,
        limit: Math.max(limit * 8, 24),
        with_payload: true,
        with_vector: false,
        filter: { must: [{ key: "active", match: { value: true } }] },
      },
    );
    const result = record(body.result);
    if (!Array.isArray(result.points)) {
      throw new QdrantSearchError("QDRANT_RESPONSE_INVALID", true);
    }
    return scoredDocuments(result.points.map((point) => record(point) as QdrantPoint), limit);
  }

  private async queryImageVectors(
    vectors: readonly (readonly number[])[],
    limit: number,
  ): Promise<readonly ScoredStableProduct[][]> {
    if (vectors.length === 0) return [];
    const body = await this.request(
      `/collections/${encodeURIComponent(this.collection)}/points/query/batch`,
      {
        searches: vectors.map((vector) => ({
          query: this.validateVector(vector),
          using: "image_raw",
          limit: Math.max(limit * 8, 24),
          with_payload: true,
          with_vector: false,
          filter: { must: [{ key: "active", match: { value: true } }] },
        })),
      },
    );
    if (!Array.isArray(body.result)) {
      throw new QdrantSearchError("QDRANT_BATCH_RESPONSE_INVALID", true);
    }
    return body.result.map((entry) => {
      const result = record(entry);
      if (!Array.isArray(result.points)) {
        throw new QdrantSearchError("QDRANT_BATCH_RESPONSE_INVALID", true);
      }
      return scoredDocuments(
        result.points.map((point) => record(point) as QdrantPoint),
        limit,
      );
    });
  }

  async searchStableText(query: string, limit: number): Promise<readonly ScoredStableProduct[]> {
    const value = query.trim().slice(0, 1_000);
    if (!value) return [];
    return this.queryVector(await this.embedding.embedText(value), "product_text", limit);
  }

  async searchStableImage(imageUrl: string, limit: number): Promise<readonly ScoredStableProduct[]> {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") throw new QdrantSearchError("IMAGE_HTTPS_REQUIRED", false);
    return this.queryVector(await this.embedding.embedImageUrl(url.toString()), "image_raw", limit);
  }


  async searchStableImages(
    imageUrls: readonly string[],
    limit: number,
    concurrency = 3,
  ): Promise<readonly BatchStableImageSearchResult[]> {
    const output: BatchStableImageSearchResult[] = imageUrls.map(() => ({
      candidates: [],
      errorCode: "IMAGE_SEARCH_NOT_RUN",
    }));
    const vectors: { index: number; vector: readonly number[] }[] = [];
    let cursor = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const index = cursor++;
        const value = imageUrls[index];
        if (value === undefined) return;
        try {
          const url = new URL(value);
          if (url.protocol !== "https:") throw new QdrantSearchError("IMAGE_HTTPS_REQUIRED", false);
          vectors.push({ index, vector: await this.embedding.embedImageUrl(url.toString()) });
        } catch (error) {
          output[index] = {
            candidates: [],
            errorCode: error instanceof Error ? error.message.slice(0, 128) : "IMAGE_EMBED_FAILED",
          };
        }
      }
    };
    await Promise.all(Array.from(
      { length: Math.min(Math.max(1, Math.trunc(concurrency)), imageUrls.length) },
      () => worker(),
    ));
    vectors.sort((left, right) => left.index - right.index);
    const matches = await this.queryImageVectors(vectors.map((item) => item.vector), limit);
    vectors.forEach((item, position) => {
      output[item.index] = { candidates: matches[position] ?? [], errorCode: null };
    });
    return output;
  }

  async searchStableImageBytes(
    imageBytes: Uint8Array,
    limit: number,
  ): Promise<readonly ScoredStableProduct[]> {
    if (!this.embedding.embedImageBytes) {
      throw new QdrantSearchError("IMAGE_BYTES_UNSUPPORTED", false);
    }
    return this.queryVector(
      await this.embedding.embedImageBytes(imageBytes),
      "image_raw",
      limit,
    );
  }
}
