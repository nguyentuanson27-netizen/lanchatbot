import { createHash, randomUUID } from "node:crypto";
import {
  CustomerProfileV1Schema,
  SizeChartV1Schema,
  SizeRecommendationV1Schema,
  type BodyMeasurementV1,
  type CustomerProfileV1,
  type MeasurementKind,
  type ProductComponentRole,
  type SizeChartV1,
  type SizeRecommendationV1,
  type SizeRecommendationProtectedClaimV1,
} from "@lana/contracts";

const DIRECT_MEASUREMENTS: readonly MeasurementKind[] = [
  "BUST_CM",
  "WAIST_CM",
  "HIPS_CM",
];
const BODY_PROFILE_MEASUREMENTS: readonly MeasurementKind[] = [
  "HEIGHT_CM",
  "WEIGHT_KG",
];

export interface ImageRegistrySizeChartRow {
  readonly IMAGE_ID?: unknown;
  readonly MA_SP?: unknown;
  readonly IMAGE_URL?: unknown;
  readonly IMAGE_HASH?: unknown;
  readonly AI_IMAGE_TYPE?: unknown;
  readonly AI_UPDATED_AT?: unknown;
}

export interface ExtractedSizeChartData {
  readonly brand: string;
  readonly category: string;
  readonly componentRole: ProductComponentRole | null;
  readonly boundaryPolicy: SizeChartV1["boundaryPolicy"];
  readonly bands: SizeChartV1["bands"];
  readonly extractionVersion: string;
}

export interface SizeChartScope {
  readonly level: "COMPONENT" | "CATEGORY" | "GLOBAL";
  readonly parentProductIds?: readonly string[];
  readonly categories?: readonly string[];
  readonly componentRole?: ProductComponentRole;
  readonly forms?: readonly string[];
  readonly materials?: readonly string[];
}

export type StageSizeChartResult =
  | {
      readonly status: "STAGED";
      readonly chart: SizeChartV1;
      /** Product-bound default scope; an admin may later promote it deliberately. */
      readonly scope: SizeChartScope;
    }
  | {
      readonly status: "SKIPPED_NOT_SIZE_CHART" | "INVALID";
      readonly chart: null;
      readonly reasonCodes: readonly string[];
    };

const text = (value: unknown): string => String(value ?? "").trim();

const normalizeRegistryToken = (value: unknown): string => text(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/gu, "")
  .toLocaleUpperCase("en-US")
  .replace(/[^A-Z0-9]+/gu, "_")
  .replace(/^_+|_+$/gu, "");

const SIZE_CHART_IMAGE_TYPES = new Set([
  "SIZE_CHART",
  "SIZECHART",
  "SIZE_GUIDE",
  "SIZEGUIDE",
  "SIZE_TABLE",
  "BANG_SIZE",
  "BANG_SZ",
  "HUONG_DAN_SIZE",
]);

/**
 * Converts an OCR/vision extraction for an image_registry row into review-only
 * SizeChartV1 data. AI output can never mark itself VERIFIED.
 */
export function stageSizeChartFromImageRegistry(
  row: ImageRegistrySizeChartRow,
  extracted: ExtractedSizeChartData,
): StageSizeChartResult {
  const imageType = normalizeRegistryToken(row.AI_IMAGE_TYPE);
  if (!SIZE_CHART_IMAGE_TYPES.has(imageType)) {
    return {
      status: "SKIPPED_NOT_SIZE_CHART",
      chart: null,
      reasonCodes: ["AI_IMAGE_TYPE_NOT_SIZE_CHART"],
    };
  }

  const imageId = text(row.IMAGE_ID);
  const imageUrl = text(row.IMAGE_URL);
  const imageHash = text(row.IMAGE_HASH).toLocaleLowerCase("en-US");
  const productId = text(row.MA_SP).toLocaleUpperCase("en-US");
  const observedAt = text(row.AI_UPDATED_AT);
  const reasons: string[] = [];
  if (!imageId) reasons.push("IMAGE_ID_REQUIRED");
  if (!imageUrl) reasons.push("IMAGE_URL_REQUIRED");
  if (!productId) reasons.push("MA_SP_REQUIRED");
  if (!/^[a-f0-9]{64}$/u.test(imageHash)) reasons.push("IMAGE_SHA256_REQUIRED");
  if (!Number.isFinite(Date.parse(observedAt))) reasons.push("AI_UPDATED_AT_INVALID");
  if (reasons.length > 0) {
    return { status: "INVALID", chart: null, reasonCodes: reasons };
  }

  const versionSeed = JSON.stringify({
    imageId,
    imageHash,
    extractionVersion: extracted.extractionVersion,
    category: extracted.category,
    componentRole: extracted.componentRole,
    bands: extracted.bands,
  });
  const version = `${extracted.extractionVersion}-${createHash("sha256")
    .update(versionSeed)
    .digest("hex")
    .slice(0, 12)}`;

  const parsed = SizeChartV1Schema.safeParse({
    schemaVersion: 1,
    reference: {
      chartId: `image_registry:${imageId}:${productId}`,
      version,
      source: "IMAGE_EXTRACTION",
      sourceArtifactRef: imageUrl,
      sourceContentSha256: imageHash,
      verificationStatus: "EXTRACTED_UNREVIEWED",
      verifiedByRef: null,
      verifiedAt: null,
    },
    brand: extracted.brand,
    category: extracted.category,
    componentRole: extracted.componentRole,
    boundaryPolicy: extracted.boundaryPolicy,
    bands: extracted.bands,
  });
  if (!parsed.success) {
    return {
      status: "INVALID",
      chart: null,
      reasonCodes: parsed.error.issues.map(
        (issue) => `INVALID_EXTRACTED_CHART:${issue.path.join(".") || "root"}`,
      ),
    };
  }
  return {
    status: "STAGED",
    chart: parsed.data,
    scope: {
      level: extracted.componentRole === null ? "CATEGORY" : "COMPONENT",
      parentProductIds: [productId],
      categories: [extracted.category],
      ...(extracted.componentRole === null
        ? {}
        : { componentRole: extracted.componentRole }),
    },
  };
}

export interface ScopedSizeChart {
  readonly chart: SizeChartV1;
  readonly scope: SizeChartScope;
}

export interface SizeRecommendationTarget {
  readonly brand: string;
  readonly parentProductId: string;
  readonly componentProductId: string;
  readonly componentRole: ProductComponentRole;
  readonly category: string;
  readonly form: string | null;
  readonly material: string | null;
}

export interface SizeEngineInput {
  readonly profile: CustomerProfileV1;
  readonly target: SizeRecommendationTarget;
  readonly charts: readonly ScopedSizeChart[];
  readonly generatedAt: string;
  readonly recommendationId?: string;
}

export interface SizeEngineDecision {
  readonly action: "REPLY" | "ASK_MORE" | "HANDOFF";
  readonly recommendation: SizeRecommendationV1;
  readonly alternativeSizes: readonly string[];
  readonly missingInputs: readonly (MeasurementKind | "FIT_PREFERENCE")[];
  readonly selectedScope: SizeChartScope["level"] | null;
}

const normalize = (value: string): string =>
  value.trim().toLocaleUpperCase("vi-VN");

const includesNormalized = (
  values: readonly string[] | undefined,
  value: string,
): boolean => values === undefined || values.length === 0 || values.some(
  (candidate) => normalize(candidate) === normalize(value),
);

const scopeMatches = (
  scoped: ScopedSizeChart,
  target: SizeRecommendationTarget,
): boolean => {
  const { scope, chart } = scoped;
  if (normalize(chart.brand) !== normalize(target.brand)) return false;
  const chartCategory = normalize(chart.category);
  const categoryMatches = chartCategory === normalize(target.category) || (
    scope.level === "GLOBAL" && ["ALL", "GLOBAL", "*"].includes(chartCategory)
  );
  if (!categoryMatches) return false;
  if (chart.componentRole !== null && chart.componentRole !== target.componentRole) return false;
  if (!includesNormalized(scope.parentProductIds, target.parentProductId)) return false;
  if (!includesNormalized(scope.categories, target.category)) return false;
  if (!includesNormalized(scope.forms, target.form ?? "")) return false;
  if (!includesNormalized(scope.materials, target.material ?? "")) return false;
  if (scope.level === "COMPONENT") {
    return scope.componentRole === target.componentRole &&
      chart.componentRole === target.componentRole;
  }
  return true;
};

const chartSpecificity = (
  scoped: ScopedSizeChart,
  target: SizeRecommendationTarget,
): number => {
  const level = { COMPONENT: 3_000, CATEGORY: 2_000, GLOBAL: 1_000 }[
    scoped.scope.level
  ];
  const product = scoped.scope.parentProductIds?.some(
    (candidate) => normalize(candidate) === normalize(target.parentProductId),
  ) ? 100 : 0;
  const form = target.form !== null && scoped.scope.forms?.some(
    (candidate) => normalize(candidate) === normalize(target.form!),
  ) ? 20 : 0;
  const material = target.material !== null && scoped.scope.materials?.some(
    (candidate) => normalize(candidate) === normalize(target.material!),
  ) ? 10 : 0;
  return level + product + form + material;
};

export function selectVerifiedSizeChart(
  charts: readonly ScopedSizeChart[],
  target: SizeRecommendationTarget,
): ScopedSizeChart | null {
  return charts
    .filter(({ chart }) => chart.reference.verificationStatus === "VERIFIED")
    .filter((chart) => scopeMatches(chart, target))
    .sort((left, right) =>
      chartSpecificity(right, target) - chartSpecificity(left, target) ||
      Date.parse(right.chart.reference.verifiedAt!) -
        Date.parse(left.chart.reference.verifiedAt!),
    )[0] ?? null;
}

const measurementMap = (
  profile: CustomerProfileV1,
): ReadonlyMap<MeasurementKind, BodyMeasurementV1> =>
  new Map(profile.measurements.map((measurement) => [measurement.kind, measurement]));

const chartKinds = (
  chart: SizeChartV1,
  allowed: readonly MeasurementKind[],
): MeasurementKind[] => {
  const allowedSet = new Set(allowed);
  return [...new Set(
    chart.bands.flatMap((band) => band.ranges.map((range) => range.kind)),
  )].filter((kind) => allowedSet.has(kind));
};

const isInside = (
  value: number,
  range: SizeChartV1["bands"][number]["ranges"][number],
): boolean =>
  (range.minInclusive === null || value >= range.minInclusive) &&
  (range.maxInclusive === null || value <= range.maxInclusive);

const SIZE_LABEL_ORDER: ReadonlyMap<string, number> = new Map([
  ["XXXS", 0],
  ["XXS", 1],
  ["XS", 2],
  ["S", 3],
  ["M", 4],
  ["L", 5],
  ["XL", 6],
  ["XXL", 7],
  ["XXXL", 8],
]);

const bandRangeScore = (band: SizeChartV1["bands"][number]): number => {
  const scores = band.ranges.map((range) => {
    if (range.minInclusive !== null && range.maxInclusive !== null) {
      return (range.minInclusive + range.maxInclusive) / 2;
    }
    return range.minInclusive ?? range.maxInclusive ?? 0;
  });
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

function compareSizeBands(
  left: SizeChartV1["bands"][number],
  right: SizeChartV1["bands"][number],
): number {
  const leftRank = SIZE_LABEL_ORDER.get(normalize(left.size));
  const rightRank = SIZE_LABEL_ORDER.get(normalize(right.size));
  if (leftRank !== undefined && rightRank !== undefined && leftRank !== rightRank) {
    return leftRank - rightRank;
  }
  const rangeDifference = bandRangeScore(left) - bandRangeScore(right);
  if (rangeDifference !== 0) return rangeDifference;
  return normalize(left.size).localeCompare(normalize(right.size), "vi-VN");
}

const matchingBands = (
  chart: SizeChartV1,
  used: readonly BodyMeasurementV1[],
): SizeChartV1["bands"] => chart.bands.filter((band) =>
  used.every((measurement) => {
    const range = band.ranges.find(({ kind }) => kind === measurement.kind);
    return range !== undefined && isInside(measurement.value, range);
  }),
).sort(compareSizeBands);

const historySize = (
  profile: CustomerProfileV1,
  target: SizeRecommendationTarget,
  chart: SizeChartV1,
): string | null => {
  const validSizes = new Set(chart.bands.map(({ size }) => normalize(size)));
  return profile.sizeHistory
    .filter((entry) => entry.componentRole === target.componentRole)
    .filter((entry) => entry.productId === null || normalize(entry.productId) === normalize(target.parentProductId))
    .filter((entry) => validSizes.has(normalize(entry.size)))
    .filter((entry) => entry.outcome === "CUSTOMER_ACCEPTED" || entry.outcome === "PURCHASED")
    .sort((left, right) => {
      const leftExact = left.productId !== null &&
        normalize(left.productId) === normalize(target.parentProductId) ? 1 : 0;
      const rightExact = right.productId !== null &&
        normalize(right.productId) === normalize(target.parentProductId) ? 1 : 0;
      return rightExact - leftExact || Date.parse(right.recordedAt) - Date.parse(left.recordedAt);
    })[0]
    ?.size ?? null;
};

const componentSelection = (
  target: SizeRecommendationTarget,
  size: string,
) => ({
  componentProductId: target.componentProductId,
  componentRole: target.componentRole,
  size,
});

const confidenceFor = (
  source: "MEASUREMENTS" | "BODY_PROFILE" | "PAST_SIZE",
  measurements: readonly BodyMeasurementV1[],
  boundaryChoice: boolean,
): number => {
  const base = source === "MEASUREMENTS" ? 0.94 : source === "BODY_PROFILE" ? 0.82 : 0.68;
  const evidence = measurements.length === 0
    ? 1
    : measurements.reduce((sum, item) => sum + item.provenance.confidence, 0) /
      measurements.length;
  return Math.round(Math.min(0.98, base * evidence) * (boundaryChoice ? 0.86 : 1) * 100) / 100;
};

const recommendationBase = (
  input: SizeEngineInput,
  selected: ScopedSizeChart | null,
) => ({
  schemaVersion: 1 as const,
  recommendationId: input.recommendationId ?? randomUUID(),
  parentProductId: input.target.parentProductId,
  customerProfileId: input.profile.profileId,
  customerProfileRevision: input.profile.revision,
  chartRef: selected?.chart.reference ?? null,
  generatedAt: input.generatedAt,
});

export function recommendSize(input: SizeEngineInput): SizeEngineDecision {
  const profile = CustomerProfileV1Schema.parse(input.profile);
  const selected = selectVerifiedSizeChart(input.charts, input.target);
  const base = recommendationBase(input, selected);
  if (selected === null) {
    const recommendation = SizeRecommendationV1Schema.parse({
      ...base,
      status: "NO_VERIFIED_CHART",
      measurementsUsed: [],
      missingMeasurements: [],
      recommendedSizes: [],
      candidateSizes: [],
      confidence: null,
      reasonCodes: ["NO_VERIFIED_SIZE_CHART_FOR_SCOPE"],
    });
    return {
      action: "HANDOFF",
      recommendation,
      alternativeSizes: [],
      missingInputs: [],
      selectedScope: null,
    };
  }

  const measurements = measurementMap(profile);
  const directKinds = chartKinds(selected.chart, DIRECT_MEASUREMENTS);
  const bodyKinds = chartKinds(selected.chart, BODY_PROFILE_MEASUREMENTS);
  let source: "MEASUREMENTS" | "BODY_PROFILE" | "PAST_SIZE" | null = null;
  let requiredKinds: MeasurementKind[] = [];
  if (directKinds.some((kind) => measurements.has(kind))) {
    source = "MEASUREMENTS";
    requiredKinds = directKinds;
  } else if (bodyKinds.some((kind) => measurements.has(kind))) {
    source = "BODY_PROFILE";
    requiredKinds = bodyKinds;
  }

  if (source !== null) {
    const missing = requiredKinds.filter((kind) => !measurements.has(kind));
    if (missing.length > 0) {
      const recommendation = SizeRecommendationV1Schema.parse({
        ...base,
        status: "NEEDS_MEASUREMENTS",
        measurementsUsed: requiredKinds
          .map((kind) => measurements.get(kind))
          .filter((item): item is BodyMeasurementV1 => item !== undefined),
        missingMeasurements: missing,
        recommendedSizes: [],
        candidateSizes: [],
        confidence: null,
        reasonCodes: ["MISSING_REQUIRED_CHART_MEASUREMENTS"],
      });
      return {
        action: "ASK_MORE",
        recommendation,
        alternativeSizes: [],
        missingInputs: missing,
        selectedScope: selected.scope.level,
      };
    }
  }

  let used = requiredKinds
    .map((kind) => measurements.get(kind))
    .filter((item): item is BodyMeasurementV1 => item !== undefined);
  let bands = source === null ? [] : matchingBands(selected.chart, used);
  if (source === null) {
    const priorSize = historySize(profile, input.target, selected.chart);
    if (priorSize !== null) {
      source = "PAST_SIZE";
      bands = selected.chart.bands.filter(
        ({ size }) => normalize(size) === normalize(priorSize),
      ).sort(compareSizeBands);
      used = [];
    }
  }

  if (source === null) {
    const missing = directKinds.length > 0 ? directKinds : bodyKinds;
    const recommendation = SizeRecommendationV1Schema.parse({
      ...base,
      status: "NEEDS_MEASUREMENTS",
      measurementsUsed: [],
      missingMeasurements: missing.length > 0 ? missing : ["WEIGHT_KG"],
      recommendedSizes: [],
      candidateSizes: [],
      confidence: null,
      reasonCodes: ["NO_USABLE_BODY_DATA_OR_PAST_SIZE"],
    });
    return {
      action: "ASK_MORE",
      recommendation,
      alternativeSizes: [],
      missingInputs: recommendation.missingMeasurements,
      selectedScope: selected.scope.level,
    };
  }

  if (bands.length === 0) {
    const recommendation = SizeRecommendationV1Schema.parse({
      ...base,
      status: "OUT_OF_RANGE",
      measurementsUsed: used,
      missingMeasurements: [],
      recommendedSizes: [],
      candidateSizes: [],
      confidence: null,
      reasonCodes: ["PROFILE_OUTSIDE_VERIFIED_CHART"],
    });
    return {
      action: "HANDOFF",
      recommendation,
      alternativeSizes: [],
      missingInputs: [],
      selectedScope: selected.scope.level,
    };
  }

  const candidates = bands.map(({ size }) => size);
  if (candidates.length > 1) {
    let preferredIndex: number | null = null;
    if (profile.fitPreference === "FITTED") preferredIndex = 0;
    else if (profile.fitPreference === "RELAXED") preferredIndex = candidates.length - 1;
    else if (selected.chart.boundaryPolicy === "PREFER_SMALLER_SIZE") preferredIndex = 0;
    else if (selected.chart.boundaryPolicy === "PREFER_LARGER_SIZE") {
      preferredIndex = candidates.length - 1;
    }

    if (preferredIndex !== null) {
      const size = candidates[preferredIndex]!;
      const alternatives = candidates.filter((candidate) => candidate !== size);
      const recommendation = SizeRecommendationV1Schema.parse({
        ...base,
        status: "RECOMMENDED",
        measurementsUsed: used,
        missingMeasurements: [],
        recommendedSizes: [componentSelection(input.target, size)],
        candidateSizes: [],
        confidence: confidenceFor(source, used, true),
        reasonCodes: [
          `${source}_MATCHES_VERIFIED_CHART`,
          profile.fitPreference !== null
            ? `FIT_PREFERENCE_${profile.fitPreference}`
            : `BOUNDARY_POLICY_${selected.chart.boundaryPolicy}`,
        ],
      });
      return {
        action: "REPLY",
        recommendation,
        alternativeSizes: alternatives,
        missingInputs: [],
        selectedScope: selected.scope.level,
      };
    }

    const recommendation = SizeRecommendationV1Schema.parse({
      ...base,
      status: "AMBIGUOUS",
      measurementsUsed: used,
      missingMeasurements: [],
      recommendedSizes: [],
      candidateSizes: candidates.map((size) => componentSelection(input.target, size)),
      confidence: confidenceFor(source, used, true),
      reasonCodes: ["BOUNDARY_REQUIRES_CUSTOMER_FIT_PREFERENCE"],
    });
    return {
      action: "ASK_MORE",
      recommendation,
      alternativeSizes: candidates,
      missingInputs: ["FIT_PREFERENCE"],
      selectedScope: selected.scope.level,
    };
  }

  const size = candidates[0]!;
  const recommendation = SizeRecommendationV1Schema.parse({
    ...base,
    status: "RECOMMENDED",
    measurementsUsed: used,
    missingMeasurements: [],
    recommendedSizes: [componentSelection(input.target, size)],
    candidateSizes: [],
    confidence: confidenceFor(source, used, false),
    reasonCodes: [`${source}_MATCHES_VERIFIED_CHART`],
  });
  return {
    action: "REPLY",
    recommendation,
    alternativeSizes: [],
    missingInputs: [],
    selectedScope: selected.scope.level,
  };
}
/** A short-lived, code-created envelope used only by the final outbound guard. */
export const SIZE_RECOMMENDATION_CLAIM_TTL_MS = 5 * 60 * 1_000;

export interface VerifiedSizeRecommendationClaimInput {
  readonly decision: SizeEngineDecision;
  readonly productId: string;
  readonly variantId: string | null;
  readonly profile: CustomerProfileV1;
}

function sizeMeasurementFingerprint(
  recommendation: SizeRecommendationV1,
): string {
  return createHash("sha256").update(JSON.stringify(
    recommendation.measurementsUsed.map((measurement) => ({
      kind: measurement.kind,
      value: measurement.value,
      source: measurement.provenance.source,
      sourceEventHash: measurement.provenance.sourceEventHash,
      observedAt: measurement.provenance.observedAt,
    })),
  )).digest("hex");
}

/**
 * Only a successful recommendation from this module may mint the evidence the
 * reply guard accepts. The model receives an ID at most; it never creates this
 * provenance object itself.
 */
export function createVerifiedSizeRecommendationClaim(
  input: VerifiedSizeRecommendationClaimInput,
): SizeRecommendationProtectedClaimV1 | null {
  const recommendation = input.decision.recommendation;
  if (
    input.decision.action !== "REPLY" ||
    recommendation.status !== "RECOMMENDED" ||
    recommendation.chartRef?.verificationStatus !== "VERIFIED" ||
    recommendation.confidence === null ||
    recommendation.recommendedSizes.length === 0 ||
    normalize(recommendation.parentProductId) !== normalize(input.productId) ||
    recommendation.customerProfileId !== input.profile.profileId ||
    recommendation.customerProfileRevision !== input.profile.revision
  ) return null;

  const observedAtMs = Date.parse(recommendation.generatedAt);
  if (!Number.isFinite(observedAtMs)) return null;
  const measurementFingerprint = sizeMeasurementFingerprint(recommendation);
  const recommendedSizes = recommendation.recommendedSizes
    .map(({ size }) => size.trim().toLocaleUpperCase("vi-VN"));
  const alternativeSizes = input.decision.alternativeSizes
    .map((size) => size.trim().toLocaleUpperCase("vi-VN"))
    .filter((size) => !recommendedSizes.includes(size));
  return {
    id: recommendation.recommendationId,
    type: "SIZE_RECOMMENDATION",
    value: { recommendedSizes, alternativeSizes },
    productId: input.productId,
    variantId: input.variantId,
    evidenceRef: [
      "size-engine:v1",
      recommendation.recommendationId,
      recommendation.chartRef.chartId,
      input.profile.profileId,
      input.profile.revision,
      measurementFingerprint,
    ].join(":"),
    source: "VERIFIED_SIZE_ENGINE_V1",
    observedAt: recommendation.generatedAt,
    expiresAt: new Date(
      observedAtMs + SIZE_RECOMMENDATION_CLAIM_TTL_MS,
    ).toISOString(),
    customerProfileId: input.profile.profileId,
    customerProfileRevision: input.profile.revision,
    measurementFingerprint,
  };
}
