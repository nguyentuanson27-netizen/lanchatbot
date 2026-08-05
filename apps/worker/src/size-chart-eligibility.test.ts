import { describe, expect, it } from "vitest";
import type { RuntimePolicyResolution } from "@lana/chat-runtime";
import { evaluateSizeChartEligibility } from "./size-chart-eligibility.js";

const observedAt = "2026-08-04T00:00:00.000Z";
const target = {
  brand: "LANA",
  parentProductId: "SD398",
  componentProductId: "SD398",
  componentRole: "DRESS" as const,
  category: "AO_DAI",
  form: null,
  material: null,
};

type ArtifactOptions = {
  readonly verificationStatus?: "VERIFIED" | "EXTRACTED_UNREVIEWED";
  readonly measurementBasis?: "BODY" | "GARMENT" | "UNKNOWN";
  readonly parentProductIds?: readonly string[];
};

function artifact(options: ArtifactOptions = {}) {
  const verificationStatus = options.verificationStatus ?? "VERIFIED";
  return {
    schemaVersion: 1,
    kind: "SIZE_CHART",
    chart: {
      schemaVersion: 1,
      reference: {
        chartId: "ao-dai-dress",
        version: "1",
        source: "IMAGE_EXTRACTION",
        sourceArtifactRef: "https://cdn.example/ao-dai-size.jpg",
        sourceContentSha256: "d".repeat(64),
        verificationStatus,
        verifiedByRef: verificationStatus === "VERIFIED" ? "admin:owner" : null,
        verifiedAt: verificationStatus === "VERIFIED" ? observedAt : null,
      },
      brand: "LANA",
      category: "AO_DAI",
      componentRole: "DRESS",
      boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
      bands: [{
        size: "M",
        ranges: [
          { kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 168 },
          { kind: "WEIGHT_KG", minInclusive: 50, maxInclusive: 57 },
        ],
        note: null,
      }],
    },
    scope: {
      level: "COMPONENT",
      parentProductIds: options.parentProductIds ?? ["SD398"],
      categories: ["AO_DAI"],
      componentRole: "DRESS",
      forms: [],
      materials: [],
    },
    extraction: {
      measurementBasis: options.measurementBasis ?? "BODY",
      confidence: 1,
      extractorVersion: "fixture",
    },
    sourceMetadata: {
      source: "IMAGE_EXTRACTION",
      sourceReference: "https://cdn.example/ao-dai-size.jpg",
      sourceVersion: "fixture",
      observedAt,
    },
  };
}

function resolution(input: {
  readonly status?: "RESOLVED" | "LAST_KNOWN_GOOD";
  readonly reasonCodes?: readonly string[];
  readonly channel?: "CANARY_LIVE" | "PUBLISHED";
  readonly artifacts?: readonly {
    readonly key: string;
    readonly content: ReturnType<typeof artifact>;
    readonly lifecycle: "CANARY" | "PUBLISHED";
  }[];
} = {}): RuntimePolicyResolution {
  const artifacts = input.artifacts ?? [{
    key: "ao-dai-dress",
    content: artifact(),
    lifecycle: "PUBLISHED" as const,
  }];
  return {
    status: input.status ?? "RESOLVED",
    reasonCodes: input.reasonCodes ?? [],
    bundle: {
      channel: input.channel ?? "PUBLISHED",
      resolvedAt: observedAt,
      versionReferences: artifacts.map(({ key, lifecycle }) => ({
        artifactKey: key,
        artifactKind: "SIZE_CHART",
        lifecycle,
      })),
      artifacts: {
        sizeCharts: Object.fromEntries(artifacts.map(({ key, content }) => [key, content])),
      },
    },
  } as unknown as RuntimePolicyResolution;
}

function unavailable(reasonCodes: readonly string[]): RuntimePolicyResolution {
  return {
    status: "UNAVAILABLE",
    reasonCodes,
    bundle: null,
  } as unknown as RuntimePolicyResolution;
}

describe("verified size-chart eligibility", () => {
  it("projects an eligible published BODY chart with fresh bundle evidence", () => {
    const result = evaluateSizeChartEligibility({
      policy: resolution(),
      productId: "SD398",
      target,
    });

    expect(result.eligibility).toEqual({
      schemaVersion: 1,
      status: "ELIGIBLE",
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "VERIFIED",
      measurementBasis: "BODY",
      scope: "MATCHED",
      reasonCodes: [],
    });
    expect(result.sizeChart).toMatchObject({
      sizeChartId: "ao-dai-dress",
      verificationStatus: "VERIFIED",
      metadata: { observedAt },
    });
    expect(result.charts).toHaveLength(1);
  });

  it("accepts a hash-valid legacy PUBLISHED pin whose refs predate lifecycle", () => {
    const current = resolution();
    const legacy = {
      ...current,
      bundle: {
        ...current.bundle!,
        versionReferences: current.bundle!.versionReferences.map(({ lifecycle: ignored, ...reference }) => {
          void ignored;
          return reference;
        }),
      },
    } as RuntimePolicyResolution;

    const result = evaluateSizeChartEligibility({ policy: legacy, productId: "SD398", target });
    expect(result.eligibility).toMatchObject({
      status: "ELIGIBLE",
      policyBundle: "FRESH",
      publication: "PUBLISHED",
      verification: "VERIFIED",
      measurementBasis: "BODY",
      scope: "MATCHED",
    });
    expect(result.sizeChart?.verificationStatus).toBe("VERIFIED");
  });
  it("rejects a mixed legacy/current lifecycle pin without defaulting it", () => {
    const current = resolution();
    const mixed = {
      ...current,
      bundle: {
        ...current.bundle!,
        versionReferences: [
          ...current.bundle!.versionReferences.map((reference) => {
            const { lifecycle: ignored, ...legacyReference } = reference;
            void ignored;
            return legacyReference;
          }),
          {
            ...current.bundle!.versionReferences[0]!,
            artifactKey: "shop-policy",
            artifactKind: "SHOP_POLICY" as const,
            lifecycle: "PUBLISHED" as const,
          },
        ],
      },
    } as RuntimePolicyResolution;
    const result = evaluateSizeChartEligibility({ policy: mixed, productId: "SD398", target });
    expect(result.eligibility).toMatchObject({
      status: "INELIGIBLE",
      policyBundle: "INTEGRITY_FAILED",
      reasonCodes: ["SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED"],
    });
  });
  it("rejects explicit lifecycle references that conflict with a PUBLISHED bundle", () => {
    const conflictingSizeChart = resolution({
      artifacts: [
        { key: "ao-dai-published", content: artifact(), lifecycle: "PUBLISHED" },
        { key: "ao-dai-canary", content: artifact(), lifecycle: "CANARY" },
      ],
    });
    const current = resolution();
    const nonSizeReference = {
      ...current,
      bundle: {
        ...current.bundle!,
        versionReferences: [
          ...current.bundle!.versionReferences,
          {
            ...current.bundle!.versionReferences[0]!,
            artifactKey: "shop-policy",
            artifactKind: "SHOP_POLICY" as const,
            lifecycle: "CANARY" as const,
          },
        ],
      },
    } as RuntimePolicyResolution;

    for (const policy of [conflictingSizeChart, nonSizeReference]) {
      const result = evaluateSizeChartEligibility({ policy, productId: "SD398", target });
      expect(result.eligibility).toMatchObject({
        status: "INELIGIBLE",
        policyBundle: "INTEGRITY_FAILED",
        reasonCodes: ["SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED"],
      });
      expect(result.sizeChart).toBeNull();
      expect(result.charts).toEqual([]);
    }
  });
  it.each([
    {
      name: "missing policy bundle",
      policy: null,
      code: "SIZE_CHART_POLICY_BUNDLE_UNAVAILABLE",
      state: { policyBundle: "UNAVAILABLE", publication: "NOT_EVALUATED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "stale last-known-good bundle",
      policy: resolution({ status: "LAST_KNOWN_GOOD", reasonCodes: ["POLICY_SOURCE_UNAVAILABLE"] }),
      code: "SIZE_CHART_POLICY_BUNDLE_STALE",
      state: { policyBundle: "STALE", publication: "NOT_EVALUATED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "policy parsing failure",
      policy: unavailable(["POLICY_ARTIFACT_SCHEMA_INVALID"]),
      code: "SIZE_CHART_POLICY_BUNDLE_PARSE_FAILED",
      state: { policyBundle: "PARSE_FAILED", publication: "NOT_EVALUATED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "policy integrity failure",
      policy: unavailable(["POLICY_CONTENT_HASH_MISMATCH"]),
      code: "SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED",
      state: { policyBundle: "INTEGRITY_FAILED", publication: "NOT_EVALUATED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "no published size-chart artifact",
      policy: resolution({ artifacts: [] }),
      code: "SIZE_CHART_PUBLISHED_ARTIFACT_MISSING",
      state: { policyBundle: "FRESH", publication: "NOT_PUBLISHED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "bundle channel is not published",
      policy: resolution({
        channel: "CANARY_LIVE",
        artifacts: [{ key: "ao-dai-dress", content: artifact(), lifecycle: "CANARY" }],
      }),
      code: "SIZE_CHART_ARTIFACT_NOT_PUBLISHED",
      state: { policyBundle: "FRESH", publication: "NOT_PUBLISHED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "published bundle carries a CANARY size-chart reference",
      policy: resolution({ artifacts: [{ key: "ao-dai-dress", content: artifact(), lifecycle: "CANARY" }] }),
      code: "SIZE_CHART_POLICY_BUNDLE_INTEGRITY_FAILED",
      state: { policyBundle: "INTEGRITY_FAILED", publication: "NOT_EVALUATED", verification: "NOT_EVALUATED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "published artifact is unverified",
      policy: resolution({ artifacts: [{ key: "ao-dai-dress", content: artifact({ verificationStatus: "EXTRACTED_UNREVIEWED" }), lifecycle: "PUBLISHED" }] }),
      code: "SIZE_CHART_ARTIFACT_UNVERIFIED",
      state: { policyBundle: "FRESH", publication: "PUBLISHED", verification: "UNVERIFIED", measurementBasis: "NOT_EVALUATED", scope: "NOT_EVALUATED" },
    },
    {
      name: "published verified artifact has unsupported basis",
      policy: resolution({ artifacts: [{ key: "ao-dai-dress", content: artifact({ measurementBasis: "GARMENT" }), lifecycle: "PUBLISHED" }] }),
      code: "SIZE_CHART_MEASUREMENT_BASIS_UNSUPPORTED",
      state: { policyBundle: "FRESH", publication: "PUBLISHED", verification: "VERIFIED", measurementBasis: "UNSUPPORTED", scope: "NOT_EVALUATED" },
    },
    {
      name: "published verified BODY artifact has wrong scope",
      policy: resolution({ artifacts: [{ key: "ao-dai-dress", content: artifact({ parentProductIds: ["OTHER"] }), lifecycle: "PUBLISHED" }] }),
      code: "SIZE_CHART_SCOPE_MISMATCH",
      state: { policyBundle: "FRESH", publication: "PUBLISHED", verification: "VERIFIED", measurementBasis: "BODY", scope: "MISMATCH" },
    },
  ])("fails closed for $name with its exact stage code", ({ policy, code, state }) => {
    const result = evaluateSizeChartEligibility({ policy, productId: "SD398", target });
    expect(result.sizeChart).toBeNull();
    expect(result.charts).toEqual([]);
    expect(result.eligibility).toMatchObject({ status: "INELIGIBLE", ...state });
    expect(result.eligibility.reasonCodes).toContain(code);
  });
});
