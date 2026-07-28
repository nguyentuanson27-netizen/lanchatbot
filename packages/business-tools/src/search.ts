import { z } from "zod";
import type {
  ProductSearchResult,
  MediaProductSearchResult,
  BatchStableImageSearchResult,
  ImageVectorChannel,
  ProductSearchThresholds,
  ScoredStableProduct,
  StableCatalogSearchPort,
  StableProductDocument,
} from "./types.js";
import { normalizeProductCode } from "./inventory.js";

const StableProductDocumentSchema = z
  .object({
    productId: z.string().min(1).max(128),
    parentProductId: z.string().min(1).max(128),
    canonicalCode: z.string().min(1).max(128),
    aliases: z.array(z.string().max(128)).max(100),
    title: z.string().min(1).max(500),
    descriptionXml: z.string().max(10_000).optional().default(""),
    colors: z.array(z.string().max(100)).max(100),
    materials: z.array(z.string().max(100)).max(100),
    silhouettes: z.array(z.string().max(100)).max(100),
    occasions: z.array(z.string().max(100)).max(100),
    imageUrls: z.array(z.string().url()).max(20),
    images: z.array(
      z.object({
        url: z.string().url(),
        role: z.enum(["PRIMARY", "ADDITIONAL"]),
        angle: z.enum(["FRONT", "BACK", "SIDE", "CLOSEUP", "MULTI", "UNKNOWN"]),
        imageType: z.enum([
          "MODEL", "PRODUCT_ONLY", "DETAIL", "FLATLAY",
          "LIFESTYLE", "COLLAGE", "SIZE_GUIDE", "OTHER",
        ]),
        intents: z.array(z.string().max(64)).max(16),
        partsVisible: z.array(z.string().max(64)).max(16).optional().default([]),
        sortOrder: z.number().int(),
        qualityScore: z.number().nullable(),
        feedback: z.boolean(),
        observedAt: z.string().datetime().nullable().optional().default(null),
        sourceContentSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional().default(null),
        reviewStatus: z.literal("APPROVED").nullable().optional().default(null),
        metadataVerified: z.boolean().optional().default(false),
      }).strict(),
    ).max(40).default([]),
    catalogVersion: z.string().min(1).max(128),
    observedAt: z.string().datetime().nullable().optional().default(null),
  })
  .strict();

const ScoredStableProductSchema = z
  .object({ document: StableProductDocumentSchema, score: z.number().min(0).max(1) })
  .strict();

function validateDocument(value: StableProductDocument): StableProductDocument {
  return StableProductDocumentSchema.parse(value);
}

function validateAndSortCandidates(values: readonly ScoredStableProduct[], limit: number): ScoredStableProduct[] {
  return values
    .map((value) => ScoredStableProductSchema.parse(value))
    .sort((a, b) => b.score - a.score || a.document.productId.localeCompare(b.document.productId))
    .slice(0, limit);
}

export class ProductSearchService {
  public constructor(
    private readonly port: StableCatalogSearchPort,
    private readonly thresholds: ProductSearchThresholds,
  ) {
    if (thresholds.maxCandidates < 1 || thresholds.maxCandidates > 3) {
      throw new Error("maxCandidates must be between 1 and 3");
    }
  }

  public async searchText(query: string): Promise<ProductSearchResult> {
    const normalized = normalizeProductCode(query);
    const codeLike = /^[A-Z]{1,6}\d{1,8}(?:[A-Z0-9]*)$/u.test(normalized);
    if (codeLike) {
      const exact = await this.port.findByExactCode(normalized);
      if (exact !== null) {
        return { status: "MATCHED", matchKind: "EXACT_CODE", product: validateDocument(exact), score: 1, gap: null };
      }

      const aliases = (await this.port.findByAlias(normalized)).map(validateDocument);
      if (aliases.length === 1 && aliases[0] !== undefined) {
        return { status: "MATCHED", matchKind: "ALIAS", product: aliases[0], score: 1, gap: null };
      }
      if (aliases.length > 1) {
        return {
          status: "AMBIGUOUS",
          reasonCode: "ALIAS_COLLISION",
          candidates: aliases.slice(0, this.thresholds.maxCandidates).map((document) => ({ document, score: 1 })),
        };
      }
    }

    const candidates = validateAndSortCandidates(
      await this.port.searchStableText(query, this.thresholds.maxCandidates),
      this.thresholds.maxCandidates,
    );
    return this.decideSemantic(candidates, this.thresholds.textMinScore);
  }

  public async searchImage(imageUrl: string): Promise<ProductSearchResult> {
    // An image has no reliable exact/alias code; only the stable image-vector index is queried.
    new URL(imageUrl);
    const candidates = validateAndSortCandidates(
      await this.port.searchStableImage(imageUrl, this.thresholds.maxCandidates),
      this.thresholds.maxCandidates,
    );
    return this.decideSemantic(candidates, this.thresholds.imageMinScore);
  }

  public async searchImages(
    imageUrls: readonly string[],
    concurrency = 3,
  ): Promise<readonly MediaProductSearchResult[]> {
    const urls = imageUrls.slice(0, 10).map((value) => new URL(value).toString());
    if (urls.length === 0) return [];
    if (this.port.searchStableImages) {
      let batches: readonly BatchStableImageSearchResult[];
      try {
        batches = await this.port.searchStableImages(
          urls,
          this.thresholds.maxCandidates,
          Math.max(1, Math.min(3, Math.trunc(concurrency))),
        );
      } catch (error) {
        const reasonCode = error instanceof Error
          ? error.message.slice(0, 128)
          : "IMAGE_BATCH_SEARCH_FAILED";
        return urls.map(() => ({ status: "ERROR" as const, reasonCode }));
      }
      return batches.map((batch) => batch.errorCode
        ? { status: "ERROR" as const, reasonCode: batch.errorCode }
        : this.decideSemantic(
            validateAndSortCandidates(batch.candidates, this.thresholds.maxCandidates),
            this.thresholds.imageMinScore,
          ));
    }
    return Promise.all(urls.map(async (url): Promise<MediaProductSearchResult> => {
      try {
        return await this.searchImage(url);
      } catch (error) {
        return {
          status: "ERROR",
          reasonCode: error instanceof Error ? error.message.slice(0, 128) : "IMAGE_SEARCH_FAILED",
        };
      }
    }));
  }

  public async searchImageBytes(imageBytes: Uint8Array): Promise<MediaProductSearchResult> {
    if (!this.port.searchStableImageBytes) {
      return { status: "ERROR", reasonCode: "IMAGE_BYTES_UNSUPPORTED" };
    }
    try {
      const candidates = validateAndSortCandidates(
        await this.port.searchStableImageBytes(imageBytes, this.thresholds.maxCandidates),
        this.thresholds.maxCandidates,
      );
      return this.decideSemantic(candidates, this.thresholds.imageMinScore);
    } catch (error) {
      return {
        status: "ERROR",
        reasonCode: error instanceof Error ? error.message.slice(0, 128) : "IMAGE_SEARCH_FAILED",
      };
    }
  }

  public async searchImageCandidatesBytes(
    imageBytes: Uint8Array,
    channel: ImageVectorChannel,
  ): Promise<readonly ScoredStableProduct[]> {
    if (!this.port.searchStableImageBytesByChannel) {
      throw new Error("IMAGE_CHANNEL_SEARCH_UNSUPPORTED");
    }
    return validateAndSortCandidates(
      await this.port.searchStableImageBytesByChannel(
        imageBytes,
        channel,
        this.thresholds.maxCandidates,
      ),
      this.thresholds.maxCandidates,
    );
  }

  private decideSemantic(candidates: readonly ScoredStableProduct[], minimum: number): ProductSearchResult {
    const top = candidates[0];
    if (top === undefined) return { status: "NOT_FOUND", reasonCode: "NO_CANDIDATES" };
    if (top.score < minimum) return { status: "AMBIGUOUS", reasonCode: "LOW_SCORE", candidates };
    const second = candidates[1];
    const gap = second === undefined ? 1 : top.score - second.score;
    if (second !== undefined && gap < this.thresholds.minTopGap) {
      return { status: "AMBIGUOUS", reasonCode: "TOP_GAP_TOO_SMALL", candidates };
    }
    return { status: "MATCHED", matchKind: "SEMANTIC", product: top.document, score: top.score, gap };
  }
}
