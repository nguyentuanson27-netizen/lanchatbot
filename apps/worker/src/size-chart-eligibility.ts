import {
  normalizeCatalogToken,
  selectVerifiedSizeChart,
  type ScopedSizeChart,
  type SizeRecommendationTarget,
} from "@lana/business-tools";
import type {
  AdminArtifactContentV1,
  ProductFactsV2,
  ProductSizeChartEligibilityV1,
} from "@lana/contracts";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";

export type SizeChartEligibilityReasonCode =
  | "SIZE_CHART_POLICY_BUNDLE_UNAVAILABLE"
  | "SIZE_CHART_POLICY_BUNDLE_STALE"
  | "SIZE_CHART_POLICY_BUNDLE_PARSE_FAILED"
  | "SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED"
  | "SIZE_CHART_PUBLISHED_ARTIFACT_MISSING"
  | "SIZE_CHART_ARTIFACT_NOT_PUBLISHED"
  | "SIZE_CHART_ARTIFACT_UNVERIFIED"
  | "SIZE_CHART_MEASUREMENT_BASIS_UNSUPPORTED"
  | "SIZE_CHART_SCOPE_MISMATCH";

export interface SizeChartEligibilityEvaluation {
  readonly sizeChart: ProductFactsV2["sizeChart"];
  readonly eligibility: ProductSizeChartEligibilityV1;
  /** Empty unless every chart-eligibility gate is satisfied. */
  readonly charts: readonly ScopedSizeChart[];
}

type SizeChartArtifact = Extract<AdminArtifactContentV1, { kind: "SIZE_CHART" }>;

const POLICY_PARSE_FAILURES = new Set([
  "POLICY_ARTIFACT_SCHEMA_INVALID",
]);
const POLICY_INTEGRITY_FAILURES = new Set([
  "POLICY_CONTENT_HASH_MISMATCH",
  "POLICY_LIFECYCLE_INVALID",
  "POLICY_POINTER_SCOPE_DUPLICATE",
  "POLICY_POINTER_VERSION_MISMATCH",
]);

function boundedReasonCodes(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => /^[A-Z0-9_]{1,128}$/u.test(value)))].slice(0, 8);
}

function ineligible(input: Omit<ProductSizeChartEligibilityV1, "schemaVersion" | "status">): SizeChartEligibilityEvaluation {
  return {
    sizeChart: null,
    eligibility: {
      schemaVersion: 1,
      status: "INELIGIBLE",
      ...input,
      reasonCodes: boundedReasonCodes(input.reasonCodes),
    },
    charts: [],
  };
}

function scopedChart(content: SizeChartArtifact): ScopedSizeChart {
  const { chart, scope } = content;
  return {
    chart,
    scope: scope ? {
      level: scope.level,
      ...(scope.parentProductIds.length > 0 ? { parentProductIds: scope.parentProductIds } : {}),
      ...(scope.categories.length > 0 ? { categories: scope.categories } : {}),
      ...(scope.componentRole === null ? {} : { componentRole: scope.componentRole }),
      ...(scope.forms.length > 0 ? { forms: scope.forms } : {}),
      ...(scope.materials.length > 0 ? { materials: scope.materials } : {}),
    } : {
      level: chart.category.trim().toLocaleUpperCase("vi-VN") === "ALL"
        ? "GLOBAL"
        : chart.componentRole === null ? "CATEGORY" : "COMPONENT",
      categories: [chart.category],
      ...(chart.componentRole === null ? {} : { componentRole: chart.componentRole }),
    },
  };
}

function productScopeMatches(scoped: ScopedSizeChart, productId: string): boolean {
  const ids = scoped.scope.parentProductIds;
  return ids === undefined || ids.length === 0 || ids.some((id) =>
    normalizeCatalogToken(id) === normalizeCatalogToken(productId)
  );
}

function policyFailure(
  policy: RuntimePolicyResolution | null,
): SizeChartEligibilityEvaluation | null {
  if (policy === null) {
    return ineligible({
      policyBundle: "UNAVAILABLE",
      publication: "NOT_EVALUATED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_POLICY_BUNDLE_UNAVAILABLE"],
    });
  }
  if (policy.status === "LAST_KNOWN_GOOD") {
    const reasons = boundedReasonCodes(policy.reasonCodes ?? []);
    return ineligible({
      policyBundle: "STALE",
      publication: "NOT_EVALUATED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_POLICY_BUNDLE_STALE", ...reasons],
    });
  }
  if (policy.bundle !== null) return null;
  const reasons = boundedReasonCodes(policy.reasonCodes ?? []);
  const parseFailed = reasons.some((reason) => POLICY_PARSE_FAILURES.has(reason));
  const integrityFailed = reasons.some((reason) => POLICY_INTEGRITY_FAILURES.has(reason));
  return ineligible({
    policyBundle: parseFailed ? "PARSE_FAILED" : integrityFailed ? "INTEGRITY_FAILED" : "UNAVAILABLE",
    publication: "NOT_EVALUATED",
    verification: "NOT_EVALUATED",
    measurementBasis: "NOT_EVALUATED",
    scope: "NOT_EVALUATED",
    reasonCodes: [
      parseFailed
        ? "SIZE_CHART_POLICY_BUNDLE_PARSE_FAILED"
        : integrityFailed
          ? "SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED"
          : "SIZE_CHART_POLICY_BUNDLE_UNAVAILABLE",
      ...reasons,
    ],
  });
}

/**
 * Resolves size-chart eligibility as ordered, explicit gates. It intentionally
 * never converts a rejected stage into a chart list: callers can surface the
 * reason and Size Engine remains fail-closed.
 */
export function evaluateSizeChartEligibility(input: {
  readonly policy: RuntimePolicyResolution | null;
  readonly productId: string;
  readonly target?: SizeRecommendationTarget;
}): SizeChartEligibilityEvaluation {
  const failedPolicy = policyFailure(input.policy);
  if (failedPolicy) return failedPolicy;
  const bundle = input.policy!.bundle!;
  const expectedLifecycle = bundle.channel === "PUBLISHED" ? "PUBLISHED" : "CANARY";
  const missingLifecycleCount = bundle.versionReferences.filter((reference) =>
    reference.lifecycle === undefined
  ).length;
  const lifecycleReferencesAreConsistent =
    missingLifecycleCount === bundle.versionReferences.length ||
    (
      missingLifecycleCount === 0 &&
      bundle.versionReferences.every((reference) => reference.lifecycle === expectedLifecycle)
    );
  if (!lifecycleReferencesAreConsistent) {
    return ineligible({
      policyBundle: "INTEGRITY_FAILED",
      publication: "NOT_EVALUATED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED"],
    });
  }
  if (bundle.channel !== "PUBLISHED") {
    return ineligible({
      policyBundle: "FRESH",
      publication: "NOT_PUBLISHED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_ARTIFACT_NOT_PUBLISHED"],
    });
  }

  const artifacts = Object.entries(bundle.artifacts.sizeCharts)
    .map(([artifactKey, content]) => ({ artifactKey, content }));
  if (artifacts.length === 0) {
    return ineligible({
      policyBundle: "FRESH",
      publication: "NOT_PUBLISHED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_PUBLISHED_ARTIFACT_MISSING"],
    });
  }
  // Pre-BF-05 pins are hash-valid persisted bundles that did not carry ref lifecycle.
  // Their channel remains authoritative until the pin naturally rolls over; no backfill or mutation.
  const legacyLifecycle = expectedLifecycle;
  const lifecycles = new Map(
    bundle.versionReferences
      .filter((reference) => reference.artifactKind === "SIZE_CHART")
      .map((reference) => [reference.artifactKey, reference.lifecycle ?? legacyLifecycle]),
  );
  if (artifacts.some(({ artifactKey }) => lifecycles.get(artifactKey) === undefined)) {
    return ineligible({
      policyBundle: "INTEGRITY_FAILED",
      publication: "NOT_EVALUATED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED"],
    });
  }
  const published = artifacts.filter(({ artifactKey }) => lifecycles.get(artifactKey) === "PUBLISHED");
  if (published.length === 0) {
    return ineligible({
      policyBundle: "FRESH",
      publication: "NOT_PUBLISHED",
      verification: "NOT_EVALUATED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_ARTIFACT_NOT_PUBLISHED"],
    });
  }
  const verified = published.filter(({ content }) => content.chart.reference.verificationStatus === "VERIFIED");
  if (verified.length === 0) {
    return ineligible({
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "UNVERIFIED",
      measurementBasis: "NOT_EVALUATED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_ARTIFACT_UNVERIFIED"],
    });
  }
  const bodyCharts = verified.filter(({ content }) => content.extraction?.measurementBasis === "BODY");
  if (bodyCharts.length === 0) {
    return ineligible({
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "VERIFIED",
      measurementBasis: "UNSUPPORTED",
      scope: "NOT_EVALUATED",
      reasonCodes: ["SIZE_CHART_MEASUREMENT_BASIS_UNSUPPORTED"],
    });
  }
  const charts = bodyCharts.map(({ content }) => scopedChart(content));
  const selected = input.target
    ? selectVerifiedSizeChart(charts, input.target)
    : charts.filter((chart) => productScopeMatches(chart, input.productId))
      .sort((left, right) =>
        Date.parse(right.chart.reference.verifiedAt!) - Date.parse(left.chart.reference.verifiedAt!) ||
        left.chart.reference.chartId.localeCompare(right.chart.reference.chartId)
      )[0] ?? null;
  if (selected === null) {
    return ineligible({
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "VERIFIED",
      measurementBasis: "BODY",
      scope: "MISMATCH",
      reasonCodes: ["SIZE_CHART_SCOPE_MISMATCH"],
    });
  }
  return {
    sizeChart: {
      sizeChartId: selected.chart.reference.chartId,
      sizeChartVersion: selected.chart.reference.version,
      verificationStatus: "VERIFIED",
      sourceContentSha256: selected.chart.reference.sourceContentSha256,
      metadata: {
        authority: "ADMIN_POLICY",
        sourceVersion: selected.chart.reference.version,
        observedAt: bundle.resolvedAt,
        expiresAt: null,
        freshForSeconds: null,
        freshnessState: "FRESH",
      },
    },
    eligibility: {
      schemaVersion: 1,
      status: "ELIGIBLE",
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "VERIFIED",
      measurementBasis: "BODY",
      scope: "MATCHED",
      reasonCodes: [],
    },
    charts,
  };
}
