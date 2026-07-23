import type {
  BusinessFactEnvelopeV1,
  BusinessFactSource,
  GuardedReplyPlanV1,
  ProductFactsV1,
} from "@lana/contracts";

export const SUPPORTED_SIZES = ["S", "M", "L", "XL"] as const;
export type SupportedSize = (typeof SUPPORTED_SIZES)[number];

export type InventoryErrorCode =
  | "NOT_FOUND"
  | "CONFIG_NOT_FOUND"
  | "SHOP_ERROR"
  | "STALE";

export interface PosVariation {
  /** Canonical POS product code, before colour/size variation identifiers. */
  productCode: string;
  sku: string;
  color: string;
  size: string;
  /** Sellable quantity (`remain_quantity`) for one warehouse row. */
  remainQuantity: number;
}

export interface InventorySnapshot {
  status: "OK" | "SHOP_ERROR";
  shopConfigured: boolean;
  observedAt: string;
  variations: readonly PosVariation[];
  reasonCode?: string;
}

export type InventoryOfferType = "DIRECT" | "SET" | "SET_CV" | "SET_QUAN";

export interface AggregatedInventoryOffer {
  offerType: InventoryOfferType;
  color: string;
  size: SupportedSize;
  quantity: number;
  componentCodes: readonly string[];
}

export type InventoryAggregationResult =
  | {
      status: "OK";
      parentProductId: string;
      source: "POS_LIVE" | "POS_SNAPSHOT";
      observedAt: string;
      offers: readonly AggregatedInventoryOffer[];
    }
  | {
      status: InventoryErrorCode;
      parentProductId: string;
      reasonCode: string;
    };

export interface InventorySnapshotPort {
  read(parentProductId: string): Promise<InventorySnapshot>;
}

export type ProductImageAngle = "FRONT" | "BACK" | "SIDE" | "CLOSEUP" | "MULTI" | "UNKNOWN";

export type ProductImageType =
  | "MODEL"
  | "PRODUCT_ONLY"
  | "DETAIL"
  | "FLATLAY"
  | "LIFESTYLE"
  | "COLLAGE"
  | "SIZE_GUIDE"
  | "OTHER";

/** Một ảnh đã duyệt của sản phẩm, kèm phân loại do P2.3B gắn. Trước đây runtime
 *  chỉ giữ danh sách URL phẳng nên không chọn được ảnh theo ý khách hỏi. */
export interface ProductImage {
  url: string;
  role: "PRIMARY" | "ADDITIONAL";
  angle: ProductImageAngle;
  imageType: ProductImageType;
  intents: readonly string[];
  sortOrder: number;
  qualityScore: number | null;
  /** true khi ảnh là feedback thật của khách đã được người duyệt xác nhận. */
  feedback: boolean;
}

export interface StableProductDocument {
  productId: string;
  parentProductId: string;
  canonicalCode: string;
  aliases: readonly string[];
  title: string;
  /** Mô tả webstore đã làm sạch ở bước ingestion; chỉ dùng làm ngữ cảnh diễn đạt,
   * không phải nguồn giá, tồn, size hoặc chính sách. */
  descriptionXml?: string;
  colors: readonly string[];
  materials: readonly string[];
  silhouettes: readonly string[];
  occasions: readonly string[];
  imageUrls: readonly string[];
  /** Ảnh kèm phân loại. Rỗng với dữ liệu cũ chưa có metadata; lúc đó phần chọn
   *  ảnh tự lùi về thứ tự của `imageUrls`. */
  images: readonly ProductImage[];
  catalogVersion: string;
}

export interface ScoredStableProduct {
  document: StableProductDocument;
  score: number;
}

export interface StableCatalogSearchPort {
  findByExactCode(normalizedCode: string): Promise<StableProductDocument | null>;
  findByAlias(normalizedAlias: string): Promise<readonly StableProductDocument[]>;
  searchStableText(query: string, limit: number): Promise<readonly ScoredStableProduct[]>;
  searchStableImage(imageUrl: string, limit: number): Promise<readonly ScoredStableProduct[]>;
  searchStableImages?(
    imageUrls: readonly string[],
    limit: number,
    concurrency?: number,
  ): Promise<readonly BatchStableImageSearchResult[]>;
  searchStableImageBytes?(
    imageBytes: Uint8Array,
    limit: number,
  ): Promise<readonly ScoredStableProduct[]>;
}

export interface BatchStableImageSearchResult {
  readonly candidates: readonly ScoredStableProduct[];
  readonly errorCode: string | null;
}

export interface MultimodalEmbeddingPort {
  embedText(text: string): Promise<readonly number[]>;
  embedImageUrl(imageUrl: string): Promise<readonly number[]>;
  embedImageBytes?(imageBytes: Uint8Array): Promise<readonly number[]>;
}

export type ProductSearchResult =
  | {
      status: "MATCHED";
      matchKind: "EXACT_CODE" | "ALIAS" | "SEMANTIC";
      product: StableProductDocument;
      score: number;
      gap: number | null;
    }
  | {
      status: "AMBIGUOUS";
      reasonCode: "ALIAS_COLLISION" | "LOW_SCORE" | "TOP_GAP_TOO_SMALL";
      candidates: readonly ScoredStableProduct[];
    }
  | { status: "NOT_FOUND"; reasonCode: "NO_CANDIDATES" };

export type MediaProductSearchResult = ProductSearchResult | {
  status: "ERROR";
  reasonCode: string;
};

export interface ProductSearchThresholds {
  textMinScore: number;
  imageMinScore: number;
  minTopGap: number;
  maxCandidates: number;
}

export interface ParentFulfillmentPolicy {
  parentProductId: string;
  policyCode: "READY_STOCK" | "PRE_ORDER" | "COMING_SOON";
  preparationDaysMin: number;
  preparationDaysMax: number;
  policyVersion: string;
  observedAt: string;
  expiresAt: string;
}

export interface FulfillmentPolicyPort {
  getParentPolicy(parentProductId: string): Promise<ParentFulfillmentPolicy | null>;
}

export interface VerifiedPriceFact {
  productId: string;
  listPriceVnd: number | null;
  salePriceVnd: number | null;
  source: Extract<BusinessFactSource, "POS_LIVE" | "POS_SNAPSHOT">;
  observedAt: string;
  expiresAt: string;
}

export interface VerifiedTransitFact {
  /** Verified carrier transit time; preparation time is added from the parent policy. */
  minDays: number;
  maxDays: number;
  observedAt: string;
  expiresAt: string;
}

export interface ProductFactsCompositionInput {
  now: Date;
  product: StableProductDocument;
  offerType: string;
  price: VerifiedPriceFact;
  inventory: InventoryAggregationResult;
  parentPolicy: ParentFulfillmentPolicy;
  transit: VerifiedTransitFact;
}

export interface PromotionAuthorization {
  productId: string;
  allowedPhrases: readonly string[];
  expiresAt: string;
}

export interface ShippingAuthorization {
  productId: string;
  feeVnd: number | null;
  freeShipping: boolean;
  expiresAt: string;
}

export interface GuardInput {
  proposal: unknown;
  facts: BusinessFactEnvelopeV1 | null;
  verifiedProductIds: ReadonlySet<string>;
  buyingSignal?: boolean;
  promotion?: PromotionAuthorization;
  shipping?: ShippingAuthorization;
  now: Date;
}

export interface FactsValidationResult {
  ok: boolean;
  facts: ProductFactsV1 | null;
  reasonCodes: readonly string[];
}

export type GuardResult = GuardedReplyPlanV1;
