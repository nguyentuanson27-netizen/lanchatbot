import {
  MediaSelectionV2Schema,
  type MediaSelectionV2,
  type ProductComponentRole,
  type ProductFactsV2,
  type ProductMediaAssetV2,
  type ProductMediaPurposeV2,
} from "@lana/contracts";

/** Taxonomy presented to the conversation engine. SIZE_CHART is accepted as an ingestion alias. */
export const MEDIA_REQUEST_KINDS_V2 = [
  "FULL_LOOK",
  "AO",
  "CHAN_VAY",
  "QUAN",
  "DETAIL_FABRIC",
  "FEEDBACK",
  "SIZE_GUIDE",
] as const;
export type MediaRequestKindV2 = (typeof MEDIA_REQUEST_KINDS_V2)[number];
export type MediaRequestKindInputV2 = MediaRequestKindV2 | "SIZE_CHART";
export const DEFAULT_MEDIA_SIMILARITY_MIN_SCORE = 0.82;

const normalizeMediaToken = (value: unknown): string => String(value ?? "")
  .trim()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLocaleUpperCase("en-US")
  .replace(/[^A-Z0-9]+/gu, "_")
  .replace(/^_+|_+$/gu, "");

const IMAGE_REGISTRY_KIND_ALIASES: Readonly<Record<string, MediaRequestKindV2>> = {
  FULL_LOOK: "FULL_LOOK",
  FULL_SET: "FULL_LOOK",
  FULL_BODY: "FULL_LOOK",
  MODEL: "FULL_LOOK",
  LOOKBOOK: "FULL_LOOK",
  AO: "AO",
  TOP: "AO",
  SHIRT: "AO",
  CHAN_VAY: "CHAN_VAY",
  CV: "CHAN_VAY",
  SKIRT: "CHAN_VAY",
  QUAN: "QUAN",
  PANTS: "QUAN",
  DETAIL_FABRIC: "DETAIL_FABRIC",
  FABRIC_DETAIL: "DETAIL_FABRIC",
  CLOSE_UP: "DETAIL_FABRIC",
  FEEDBACK: "FEEDBACK",
  REVIEW: "FEEDBACK",
  SIZE_GUIDE: "SIZE_GUIDE",
  SIZE_CHART: "SIZE_GUIDE",
  SIZE_TABLE: "SIZE_GUIDE",
  BANG_SIZE: "SIZE_GUIDE",
};

/** Normalizes image_registry AI_IMAGE_TYPE into the seven conversation media intents. */
export function normalizeImageRegistryMediaTypeV2(value: unknown): MediaRequestKindV2 | null {
  return IMAGE_REGISTRY_KIND_ALIASES[normalizeMediaToken(value)] ?? null;
}

export type MediaSimilarityMatchV2 = Readonly<{
  /** Qdrant is only allowed to return stable media for this exact parent product. */
  productId: string;
  asset: ProductMediaAssetV2;
  score: number;
}>;

export type MediaClosingStepV2 =
  | "ASK_SIZE_PROFILE"
  | "ASK_COLOR_AND_SIZE"
  | "CONFIRM_PRODUCT"
  | "CONFIRM_ORDER";

export interface VerifiedMediaFallbackFactV2 {
  /** Already rendered from a verified business fact. This selector never asks a model to invent it. */
  readonly answer: string;
  readonly source:
    | "PRODUCT_FACTS_V2"
    | "POLICY_BUNDLE_V1"
    | "CUSTOMER_PROFILE_V1"
    | "SIZE_RECOMMENDATION_V1";
  readonly freshnessState: "FRESH";
  readonly sourceVersion: string;
  readonly observedAt: string;
}

export interface MediaSelectionRequestV2 {
  readonly product: ProductFactsV2;
  readonly kind: MediaRequestKindInputV2;
  /** Optional for DETAIL_FABRIC/FEEDBACK/SIZE_GUIDE; resolved from BOM for AO/CV/QUAN. */
  readonly componentProductId?: string | null;
  readonly maxAssets?: number;
  /** Cosine similarity floor for the secondary Qdrant tier. Defaults to 0.82. */
  readonly similarityMinScore?: number;
  readonly now: Date;
  /** Stable Qdrant similarity results. Cross-product and cross-component results are rejected. */
  readonly similarityMatches?: readonly MediaSimilarityMatchV2[];
  /** Required to produce the no-image customer response. */
  readonly unavailableFallback: Readonly<{
    verifiedFact: VerifiedMediaFallbackFactV2;
    nextStep: MediaClosingStepV2;
  }>;
}

export type MediaUnavailableReasonV2 =
  | "AMBIGUOUS_COMPONENT"
  | "COMPONENT_NOT_FOUND"
  | "MEDIA_FACTS_STALE"
  | "NO_VERIFIED_MEDIA";

export interface MediaSelectionOutcomeV2 {
  readonly requestKind: MediaRequestKindV2;
  readonly selection: MediaSelectionV2;
  readonly selectedVia: readonly ("EXACT_METADATA" | "QDRANT_SIMILARITY")[];
  readonly unavailableReason: MediaUnavailableReasonV2 | null;
  /** Empty when media is selected. Otherwise: explicit unavailability + verified answer/next step. */
  readonly customerTextUnits: readonly string[];
}

type IntentRule = Readonly<{
  purpose: ProductMediaPurposeV2;
  componentRole: ProductComponentRole | null;
  allowSimilarity: boolean;
}>;

const RULES: Readonly<Record<MediaRequestKindV2, IntentRule>> = {
  FULL_LOOK: { purpose: "PRODUCT_OVERVIEW", componentRole: null, allowSimilarity: true },
  AO: { purpose: "PRODUCT_OVERVIEW", componentRole: "TOP", allowSimilarity: true },
  CHAN_VAY: { purpose: "PRODUCT_OVERVIEW", componentRole: "SKIRT", allowSimilarity: true },
  QUAN: { purpose: "PRODUCT_OVERVIEW", componentRole: "PANTS", allowSimilarity: true },
  DETAIL_FABRIC: { purpose: "FABRIC_DETAIL", componentRole: null, allowSimilarity: true },
  FEEDBACK: { purpose: "FEEDBACK", componentRole: null, allowSimilarity: false },
  SIZE_GUIDE: { purpose: "SIZE_CHART", componentRole: null, allowSimilarity: false },
};

const UNAVAILABLE_LABELS: Readonly<Record<MediaRequestKindV2, string>> = {
  FULL_LOOK: "ảnh toàn bộ thiết kế",
  AO: "ảnh riêng phần áo",
  CHAN_VAY: "ảnh riêng phần chân váy",
  QUAN: "ảnh riêng phần quần",
  DETAIL_FABRIC: "ảnh cận chất vải",
  FEEDBACK: "ảnh feedback",
  SIZE_GUIDE: "ảnh bảng size",
};

const CLOSING_PROMPTS: Readonly<Record<MediaClosingStepV2, string>> = {
  ASK_SIZE_PROFILE: "Chị gửi chiều cao, cân nặng để em tư vấn size phù hợp nha.",
  ASK_COLOR_AND_SIZE: "Chị chọn màu và size để em kiểm tra mẫu phù hợp nha.",
  CONFIRM_PRODUCT: "Chị chốt mẫu này để em xác nhận thông tin nha.",
  CONFIRM_ORDER: "Chị xác nhận lấy mẫu này để em lên đơn nha.",
};

export function normalizeMediaRequestKindV2(kind: MediaRequestKindInputV2): MediaRequestKindV2 {
  const normalized = kind === "SIZE_CHART" ? "SIZE_GUIDE" : kind;
  if (!(MEDIA_REQUEST_KINDS_V2 as readonly string[]).includes(normalized)) {
    throw new Error("MEDIA_REQUEST_KIND_UNSUPPORTED");
  }
  return normalized;
}

function isMediaFresh(product: ProductFactsV2, now: Date): boolean {
  const metadata = product.media.metadata;
  return metadata.authority === "QDRANT_STABLE"
    && metadata.freshnessState === "FRESH"
    && Date.parse(metadata.observedAt) <= now.getTime()
    && Date.parse(metadata.expiresAt) > now.getTime();
}

function resolveComponentId(
  product: ProductFactsV2,
  kind: MediaRequestKindV2,
  requestedId: string | null | undefined,
): { id: string | null; error: MediaUnavailableReasonV2 | null } {
  const rule = RULES[kind];
  if (requestedId) {
    const component = product.bom.components.find(({ componentProductId }) =>
      componentProductId === requestedId);
    if (!component || (rule.componentRole !== null && component.role !== rule.componentRole)) {
      return { id: null, error: "COMPONENT_NOT_FOUND" };
    }
    return { id: requestedId, error: null };
  }
  if (rule.componentRole === null) return { id: null, error: null };
  const matches = product.bom.components.filter(({ role }) => role === rule.componentRole);
  if (matches.length === 0) return { id: null, error: "COMPONENT_NOT_FOUND" };
  if (matches.length > 1) return { id: null, error: "AMBIGUOUS_COMPONENT" };
  return { id: matches[0]?.componentProductId ?? null, error: null };
}

function matchesComponent(
  asset: ProductMediaAssetV2,
  kind: MediaRequestKindV2,
  componentId: string | null,
): boolean {
  if (componentId !== null) return asset.componentProductId === componentId;
  // A full-look request must stay parent-level. This prevents a crop of one item replacing the set.
  if (kind === "FULL_LOOK") return asset.componentProductId === null;
  return true;
}

function hasExactPurpose(asset: ProductMediaAssetV2, kind: MediaRequestKindV2): boolean {
  const purpose = RULES[kind].purpose;
  if (kind === "FULL_LOOK") {
    return asset.view === "FULL_LOOK"
      && (asset.purposes.includes(purpose) || asset.purposes.includes("LOOKBOOK"));
  }
  if (asset.purposes.includes(purpose)) return true;
  return false;
}

function purposeAndViewAreCompatible(
  asset: ProductMediaAssetV2,
  kind: MediaRequestKindV2,
): boolean {
  switch (kind) {
    case "FULL_LOOK":
      return asset.view === "FULL_LOOK" && asset.purposes.some((purpose) =>
        purpose === "PRODUCT_OVERVIEW" || purpose === "LOOKBOOK" || purpose === "HERO");
    case "DETAIL_FABRIC":
      return asset.view !== "FULL_LOOK" && asset.purposes.some((purpose) =>
        purpose === "FABRIC_DETAIL" || purpose === "DETAIL");
    case "AO":
    case "CHAN_VAY":
    case "QUAN":
      return asset.view !== "FULL_LOOK" && asset.view !== "CLOSE_UP" &&
        asset.purposes.some((purpose) =>
          purpose === "PRODUCT_OVERVIEW" || purpose === "HERO" || purpose === "LOOKBOOK");
    // Authentic feedback and size charts must carry exact reviewed metadata.
    case "FEEDBACK":
      return asset.purposes.includes("FEEDBACK");
    case "SIZE_GUIDE":
      return asset.purposes.includes("SIZE_CHART");
  }
}

function byStableOrder(left: ProductMediaAssetV2, right: ProductMediaAssetV2): number {
  if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
  return left.assetId.localeCompare(right.assetId);
}

function validateFallbackFact(fact: VerifiedMediaFallbackFactV2, now: Date): void {
  const allowedSources = new Set<VerifiedMediaFallbackFactV2["source"]>([
    "PRODUCT_FACTS_V2",
    "POLICY_BUNDLE_V1",
    "CUSTOMER_PROFILE_V1",
    "SIZE_RECOMMENDATION_V1",
  ]);
  if (!allowedSources.has(fact.source) || fact.freshnessState !== "FRESH") {
    throw new Error("MEDIA_FALLBACK_EVIDENCE_NOT_VERIFIED");
  }
  const normalizedAnswer = fact.answer.trim().replace(/[.!?…]+$/u, "");
  if (normalizedAnswer.length === 0 || fact.answer.length > 500 || /[\r\n]/u.test(fact.answer)) {
    throw new Error("MEDIA_FALLBACK_FACT_INVALID");
  }
  if (fact.sourceVersion.trim().length === 0 || !Number.isFinite(Date.parse(fact.observedAt))) {
    throw new Error("MEDIA_FALLBACK_EVIDENCE_INVALID");
  }
  if (Date.parse(fact.observedAt) > now.getTime()) {
    throw new Error("MEDIA_FALLBACK_EVIDENCE_FROM_FUTURE");
  }
}

function makeNoMediaText(
  kind: MediaRequestKindV2,
  fallback: MediaSelectionRequestV2["unavailableFallback"],
  now: Date,
): readonly string[] {
  validateFallbackFact(fallback.verifiedFact, now);
  const factAnswer = fallback.verifiedFact.answer.trim().replace(/[.!?…]+$/u, "");
  const closingPrompt = CLOSING_PROMPTS[fallback.nextStep];
  if (!closingPrompt) throw new Error("MEDIA_CLOSING_STEP_UNSUPPORTED");
  const joinedClosingPrompt = closingPrompt.charAt(0).toLocaleLowerCase("vi-VN")
    + closingPrompt.slice(1);
  return [
    `Hiện shop chưa có ${UNAVAILABLE_LABELS[kind]} của mẫu này.`,
    `${factAnswer}; ${joinedClosingPrompt}`,
  ];
}

function uniqueAssets(assets: readonly ProductMediaAssetV2[]): ProductMediaAssetV2[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.assetId)) return false;
    seen.add(asset.assetId);
    return true;
  });
}

export function selectProductMediaV2(request: MediaSelectionRequestV2): MediaSelectionOutcomeV2 {
  if (!Number.isFinite(request.now.getTime())) throw new Error("MEDIA_SELECTION_NOW_INVALID");
  const kind = normalizeMediaRequestKindV2(request.kind);
  const maxAssets = request.maxAssets ?? 3;
  if (!Number.isInteger(maxAssets) || maxAssets < 1 || maxAssets > 3) {
    throw new Error("MEDIA_SELECTION_MAX_ASSETS_MUST_BE_1_TO_3");
  }
  const similarityMinScore = request.similarityMinScore
    ?? DEFAULT_MEDIA_SIMILARITY_MIN_SCORE;
  if (!Number.isFinite(similarityMinScore) || similarityMinScore < 0 || similarityMinScore > 1) {
    throw new Error("MEDIA_SIMILARITY_MIN_SCORE_MUST_BE_0_TO_1");
  }

  const rule = RULES[kind];
  const component = resolveComponentId(request.product, kind, request.componentProductId);
  let unavailableReason = component.error;
  const exactAssets: ProductMediaAssetV2[] = [];
  const similarityAssets: ProductMediaAssetV2[] = [];

  if (unavailableReason === null && !isMediaFresh(request.product, request.now)) {
    unavailableReason = "MEDIA_FACTS_STALE";
  }

  if (unavailableReason === null) {
    exactAssets.push(...request.product.media.assets
      .filter((asset) => asset.verified)
      .filter((asset) => matchesComponent(asset, kind, component.id))
      .filter((asset) => hasExactPurpose(asset, kind))
      .filter((asset) => purposeAndViewAreCompatible(asset, kind))
      .sort(byStableOrder));

    if (exactAssets.length < maxAssets && rule.allowSimilarity) {
      similarityAssets.push(...(request.similarityMatches ?? [])
        .filter((candidate) => candidate.productId === request.product.productId)
        .filter((candidate) => Number.isFinite(candidate.score)
          && candidate.score >= similarityMinScore
          && candidate.score <= 1)
        .filter(({ asset }) => asset.verified)
        .filter(({ asset }) => matchesComponent(asset, kind, component.id))
        .filter(({ asset }) => purposeAndViewAreCompatible(asset, kind))
        .sort((left, right) => right.score - left.score || byStableOrder(left.asset, right.asset))
        .map(({ asset }) => asset));
    }
  }

  const selectedAssets = uniqueAssets([...exactAssets, ...similarityAssets]).slice(0, maxAssets);
  if (unavailableReason === null && selectedAssets.length === 0) {
    unavailableReason = "NO_VERIFIED_MEDIA";
  }

  const requestedComponentProductIds = component.id === null ? [] : [component.id];
  const selected = selectedAssets.map((asset) => ({
    assetId: asset.assetId,
    url: asset.url,
    componentProductId: asset.componentProductId,
    selectedForPurpose: rule.purpose,
  }));
  const selection = MediaSelectionV2Schema.parse({
    schemaVersion: 2,
    productId: request.product.productId,
    requestedPurposes: [rule.purpose],
    requestedComponentProductIds,
    maxAssets,
    status: selected.length > 0 ? "COMPLETE" : "NONE",
    selected,
    unavailablePurposes: selected.length > 0 ? [] : [rule.purpose],
    mediaMetadata: request.product.media.metadata,
    selectedAt: request.now.toISOString(),
  });

  const exactIds = new Set(exactAssets.map(({ assetId }) => assetId));
  return {
    requestKind: kind,
    selection,
    selectedVia: selectedAssets.map(({ assetId }) =>
      exactIds.has(assetId) ? "EXACT_METADATA" : "QDRANT_SIMILARITY"),
    unavailableReason,
    customerTextUnits: selected.length > 0
      ? []
      : makeNoMediaText(kind, request.unavailableFallback, request.now),
  };
}
