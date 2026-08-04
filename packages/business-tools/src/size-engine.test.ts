import { describe, expect, it } from "vitest";
import {
  CustomerProfileV1Schema,
  SizeChartV1Schema,
  type CustomerProfileV1,
  type ProductComponentRole,
  type SizeChartV1,
} from "@lana/contracts";
import {
  createVerifiedSizeRecommendationClaim,
  recommendSize,
  selectVerifiedSizeChart,
  stageSizeChartFromImageRegistry,
  type ScopedSizeChart,
} from "./size-engine.js";

const id = "30709206-8f96-4a1b-9311-6f03ef4dd8b2";
const recommendationId = "5443b12e-724a-4a18-8610-97cc8694f812";
const hash = (letter: string): string => letter.repeat(64);
const generatedAt = "2026-07-22T05:00:00.000Z";

const profile = (
  measurements: CustomerProfileV1["measurements"] = [],
  overrides: Partial<CustomerProfileV1> = {},
): CustomerProfileV1 => CustomerProfileV1Schema.parse({
  schemaVersion: 1,
  profileId: id,
  customerKey: {
    namespace: "lana-customer-v1",
    algorithm: "HMAC_SHA256",
    digest: hash("a"),
  },
  revision: 3,
  measurements,
  fitPreference: null,
  preferences: { colors: [], styles: [], materials: [] },
  sizeHistory: [],
  createdAt: "2026-07-22T01:00:00.000Z",
  updatedAt: "2026-07-22T04:00:00.000Z",
  ...overrides,
});

const measurement = (
  kind: CustomerProfileV1["measurements"][number]["kind"],
  value: number,
  confidence = 1,
  observedAt = "2026-07-22T04:00:00.000Z",
  sourceEventHash: string | null = hash(kind === "WEIGHT_KG" ? "b" : "c"),
): CustomerProfileV1["measurements"][number] => ({
  kind,
  value,
  provenance: {
    source: "CUSTOMER_MESSAGE",
    sourceEventHash,
    observedAt,
    confidence,
  },
});

const chart = (
  chartId: string,
  componentRole: ProductComponentRole | null,
  verificationStatus: "VERIFIED" | "EXTRACTED_UNREVIEWED" = "VERIFIED",
): SizeChartV1 => SizeChartV1Schema.parse({
  schemaVersion: 1,
  reference: {
    chartId,
    version: "1",
    source: "IMAGE_EXTRACTION",
    sourceArtifactRef: `https://img.example/${chartId}.jpg`,
    sourceContentSha256: hash("d"),
    verificationStatus,
    verifiedByRef: verificationStatus === "VERIFIED" ? "admin:owner" : null,
    verifiedAt: verificationStatus === "VERIFIED" ? "2026-07-22T03:00:00.000Z" : null,
  },
  brand: "LANA_DESIGN",
  category: "SET_QUAN",
  componentRole,
  boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
  bands: [
    {
      size: "S",
      ranges: [
        { kind: "WAIST_CM", minInclusive: 64, maxInclusive: 70 },
        { kind: "WEIGHT_KG", minInclusive: 44, maxInclusive: 50 },
        { kind: "HEIGHT_CM", minInclusive: 150, maxInclusive: 160 },
      ],
      note: null,
    },
    {
      size: "M",
      ranges: [
        { kind: "WAIST_CM", minInclusive: 70, maxInclusive: 76 },
        { kind: "WEIGHT_KG", minInclusive: 50, maxInclusive: 57 },
        { kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 168 },
      ],
      note: null,
    },
    {
      size: "L",
      ranges: [
        { kind: "WAIST_CM", minInclusive: 76, maxInclusive: 82 },
        { kind: "WEIGHT_KG", minInclusive: 57, maxInclusive: 65 },
        { kind: "HEIGHT_CM", minInclusive: 158, maxInclusive: 172 },
      ],
      note: null,
    },
  ],
});

const scoped = (
  level: "COMPONENT" | "CATEGORY" | "GLOBAL",
  value: SizeChartV1 = chart(`${level.toLowerCase()}-chart`, level === "COMPONENT" ? "TOP" : null),
): ScopedSizeChart => ({
  chart: value,
  scope: {
    level,
    ...(level === "COMPONENT" ? { componentRole: "TOP" as const } : {}),
    ...(level === "CATEGORY" ? { categories: ["SET_QUAN"] } : {}),
  },
});

const target = {
  brand: "LANA_DESIGN",
  parentProductId: "CB182",
  componentProductId: "CB182-AO",
  componentRole: "TOP" as const,
  category: "SET_QUAN",
  form: "SUONG",
  material: "GAM",
};


const input = (
  customer: CustomerProfileV1,
  charts: readonly ScopedSizeChart[],
) => ({ customer, charts });

describe("stageSizeChartFromImageRegistry", () => {
  const row = {
    IMAGE_ID: "img-cb182-size",
    MA_SP: "CB182",
    IMAGE_URL: "https://img.example/cb182-size.jpg",
    IMAGE_HASH: hash("e"),
    AI_IMAGE_TYPE: "SIZE_CHART",
    AI_UPDATED_AT: "2026-07-22T02:00:00.000Z",
  };
  const extracted = {
    brand: "LANA_DESIGN",
    category: "SET_QUAN",
    componentRole: "TOP" as const,
    boundaryPolicy: "REQUIRE_HUMAN_REVIEW" as const,
    bands: chart("fixture", "TOP").bands,
    extractionVersion: "size-ocr-v1",
  };

  it("stages the canonical size-chart type and never self-verifies", () => {
    const result = stageSizeChartFromImageRegistry(row, extracted);
    expect(result.status).toBe("STAGED");
    if (result.status === "STAGED") {
      expect(result.chart.reference.verificationStatus).toBe("EXTRACTED_UNREVIEWED");
      expect(result.chart.reference.verifiedByRef).toBeNull();
      expect(result.chart.reference.sourceContentSha256).toBe(hash("e"));
      expect(result.scope).toEqual({
        level: "COMPONENT",
        parentProductIds: ["CB182"],
        categories: ["SET_QUAN"],
        componentRole: "TOP",
      });
    }
  });

  it("normalizes the legacy SIZE_GUIDE label, ignores other types and rejects missing evidence", () => {
    expect(stageSizeChartFromImageRegistry(
      { ...row, AI_IMAGE_TYPE: "SIZE_GUIDE" },
      extracted,
    ).status).toBe("STAGED");
    for (const alias of ["size chart", "size-chart", "Bảng size", "SIZE_TABLE"]) {
      expect(stageSizeChartFromImageRegistry(
        { ...row, AI_IMAGE_TYPE: alias },
        extracted,
      ).status).toBe("STAGED");
    }
    expect(stageSizeChartFromImageRegistry(
      { ...row, AI_IMAGE_TYPE: "FULL_LOOK" },
      extracted,
    ).status).toBe("SKIPPED_NOT_SIZE_CHART");
    const invalid = stageSizeChartFromImageRegistry(
      { ...row, IMAGE_HASH: "not-a-sha" },
      extracted,
    );
    expect(invalid.status).toBe("INVALID");
  });
});

describe("size chart selection", () => {
  it("uses component before category before global and ignores unverified charts", () => {
    const selected = selectVerifiedSizeChart([
      scoped("GLOBAL"),
      scoped("CATEGORY"),
      scoped("COMPONENT", chart("unreviewed", "TOP", "EXTRACTED_UNREVIEWED")),
      scoped("COMPONENT", chart("verified-component", "TOP")),
    ], target);
    expect(selected?.chart.reference.chartId).toBe("verified-component");
  });

  it("uses form and material constraints rather than a mismatched component chart", () => {
    const wrong: ScopedSizeChart = {
      chart: chart("wrong-fabric", "TOP"),
      scope: { level: "COMPONENT", componentRole: "TOP", materials: ["REN"] },
    };
    expect(selectVerifiedSizeChart([wrong, scoped("CATEGORY")], target)?.scope.level)
      .toBe("CATEGORY");
  });

  it("rejects a verified chart whose intrinsic brand, category, component or product scope is wrong", () => {
    const wrongBrand = scoped("COMPONENT", SizeChartV1Schema.parse({
      ...chart("wrong-brand", "TOP"),
      brand: "OTHER_BRAND",
    }));
    const wrongCategory = scoped("COMPONENT", SizeChartV1Schema.parse({
      ...chart("wrong-category", "TOP"),
      category: "VAY",
    }));
    const wrongComponent = scoped("COMPONENT", chart("wrong-component", "SKIRT"));
    const wrongProduct: ScopedSizeChart = {
      ...scoped("COMPONENT"),
      scope: {
        level: "COMPONENT",
        componentRole: "TOP",
        parentProductIds: ["OTHER"],
      },
    };
    expect(selectVerifiedSizeChart([
      wrongBrand,
      wrongCategory,
      wrongComponent,
      wrongProduct,
    ], target)).toBeNull();
  });
});

describe("recommendSize", () => {
  it("prioritizes direct measurements over height/weight and prior size", () => {
    const customer = profile([
      measurement("WAIST_CM", 72),
      measurement("HEIGHT_CM", 160),
      measurement("WEIGHT_KG", 60),
    ], {
      sizeHistory: [{
        productId: "CB182",
        componentRole: "TOP",
        size: "S",
        outcome: "PURCHASED",
        sourceEventHash: hash("f"),
        recordedAt: "2026-07-22T03:30:00.000Z",
      }],
    });
    const decision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("REPLY");
    expect(decision.recommendation.recommendedSizes[0]?.size).toBe("M");
    expect(decision.recommendation.reasonCodes).toContain("MEASUREMENTS_MATCHES_VERIFIED_CHART");
  });

  it("mints a fresh scoped protected claim only for a verified Size Engine reply", () => {
    const customer = profile([
      measurement("HEIGHT_CM", 162),
      measurement("WEIGHT_KG", 54),
    ]);
    const decision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    const claim = createVerifiedSizeRecommendationClaim({
      decision,
      productId: "CB182",
      profile: customer,
    });
    expect(claim).toMatchObject({
      id: recommendationId,
      type: "SIZE_RECOMMENDATION",
      source: "VERIFIED_SIZE_ENGINE_V1",
      productId: "CB182",
      customerProfileId: customer.profileId,
      customerProfileRevision: customer.revision,
      value: { recommendedSizes: ["M"] },
    });
    expect(Date.parse(claim!.expiresAt)).toBeGreaterThan(Date.parse(generatedAt));
    expect(claim).toMatchObject({
      evidenceBasis: {
        kind: "CURRENT_MEASUREMENTS",
        sourceEventHashes: [hash("b"), hash("c")],
      },
    });
    expect(claim!.evidenceRef).toContain(`measurements:${claim!.measurementFingerprint}`);
    expect(claim?.variantId).toBeNull();

    const callerOnlyScope = {
      decision,
      productId: "CB182",
      profile: customer,
      variantScope: { variantId: "caller-only", parentProductId: "CB182", size: "M" },
    };
    expect(createVerifiedSizeRecommendationClaim(callerOnlyScope)?.variantId).toBeNull();

    const callerAuthoredVariant = {
      source: "VERIFIED_CATALOG_VARIANT_V2",
      sourceVersion: "caller-authored-version",
      verifiedAt: generatedAt,
      variantId: "CALLER-EVIL",
      parentProductId: "CB182",
      size: "M",
    };
    const forgedDecision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
      variantBinding: callerAuthoredVariant,
    } as Parameters<typeof recommendSize>[0]);
    const forgedClaim = createVerifiedSizeRecommendationClaim({
      decision: forgedDecision,
      productId: "CB182",
      profile: customer,
      variantScope: callerAuthoredVariant,
    } as Parameters<typeof createVerifiedSizeRecommendationClaim>[0]);
    expect(forgedClaim?.variantId).toBeNull();
    expect(forgedClaim?.evidenceRef).not.toContain("CALLER-EVIL");
    expect(JSON.stringify(forgedClaim?.evidenceBasis)).not.toContain("CALLER-EVIL");
    expect(forgedClaim?.evidenceBasis).not.toHaveProperty("variantBinding");

    const unavailable = recommendSize({
      profile: customer,
      target,
      charts: [],
      generatedAt,
      recommendationId,
    });
    expect(createVerifiedSizeRecommendationClaim({
      decision: unavailable,
      productId: "CB182",
      profile: customer,
    })).toBeNull();
  });
  it("fails closed for stale, future, invalid or unhashed current measurements", () => {
    const claimFor = (observedAt: string, sourceEventHash: string | null = hash("b")) => {
      const customer = profile([
        measurement("HEIGHT_CM", 162, 1, observedAt, hash("c")),
        measurement("WEIGHT_KG", 54, 1, observedAt, sourceEventHash),
      ]);
      const decision = recommendSize({
        profile: customer,
        target,
        charts: [scoped("COMPONENT")],
        generatedAt,
        recommendationId,
      });
      return createVerifiedSizeRecommendationClaim({
        decision,
        productId: "CB182",
        profile: customer,
      });
    };

    expect(claimFor("2026-07-20T05:00:00.000Z")).not.toBeNull();
    expect(claimFor("2026-07-20T04:59:59.999Z")).toBeNull();
    expect(claimFor("2026-07-22T05:00:00.001Z")).toBeNull();
    expect(claimFor("2026-07-22T04:00:00.000Z", null)).toBeNull();

    const customer = profile([
      measurement("HEIGHT_CM", 162),
      measurement("WEIGHT_KG", 54),
    ]);
    const validDecision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    const invalidMeasurements = validDecision.recommendation.measurementsUsed.map(
      (item) => ({
        ...item,
        provenance: { ...item.provenance, observedAt: "not-a-date" },
      }),
    );
    const invalidDecision = {
      ...validDecision,
      recommendation: {
        ...validDecision.recommendation,
        measurementsUsed: invalidMeasurements,
      },
      evidenceBasis: {
        kind: "CURRENT_MEASUREMENTS" as const,
        measurements: invalidMeasurements,
      },
    };
    expect(createVerifiedSizeRecommendationClaim({
      decision: invalidDecision,
      productId: "CB182",
      profile: customer,
    })).toBeNull();
  });
  it("asks for every required direct measurement before selecting a size", () => {
    const withBust = SizeChartV1Schema.parse({
      ...chart("with-bust", "TOP"),
      bands: chart("with-bust-base", "TOP").bands.map((band) => ({
        ...band,
        ranges: [...band.ranges, {
          kind: "BUST_CM" as const,
          minInclusive: band.size === "S" ? 80 : band.size === "M" ? 86 : 92,
          maxInclusive: band.size === "S" ? 86 : band.size === "M" ? 92 : 98,
        }],
      })),
    });
    const decision = recommendSize({
      profile: profile([measurement("WAIST_CM", 72)]),
      target,
      charts: [scoped("COMPONENT", withBust)],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("ASK_MORE");
    expect(decision.missingInputs).toContain("BUST_CM");
    expect(decision.recommendation.recommendedSizes).toEqual([]);
  });

  it("falls back to height/weight only when direct measurements are absent", () => {
    const decision = recommendSize({
      profile: profile([
        measurement("HEIGHT_CM", 162),
        measurement("WEIGHT_KG", 54),
      ]),
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("REPLY");
    expect(decision.recommendation.recommendedSizes[0]?.size).toBe("M");
    expect(decision.recommendation.confidence).toBeLessThan(0.9);
  });

  it("mints PAST_SIZE only with accepted history provenance bound to its source event", () => {
    const customer = profile([], {
      sizeHistory: [{
        productId: "CB182",
        componentRole: "TOP",
        size: "L",
        outcome: "CUSTOMER_ACCEPTED",
        sourceEventHash: hash("f"),
        recordedAt: "2026-07-22T03:30:00.000Z",
      }],
    });
    const decision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    const claim = createVerifiedSizeRecommendationClaim({
      decision,
      productId: "CB182",
      profile: customer,
    });
    expect(decision.recommendation.measurementsUsed).toEqual([]);
    expect(claim).toMatchObject({
      variantId: null,
      evidenceBasis: {
        kind: "ACCEPTED_SIZE_HISTORY",
        sourceEventHash: hash("f"),
        productId: "CB182",
        size: "L",
        outcome: "CUSTOMER_ACCEPTED",
      },
    });
    expect(claim!.evidenceRef).toContain(`history:${hash("f")}`);

    const staleCustomer = profile([], {
      sizeHistory: [{
        productId: "CB182", componentRole: "TOP", size: "L", outcome: "PURCHASED",
        sourceEventHash: hash("e"), recordedAt: "2026-07-19T03:30:00.000Z",
      }],
    });
    const staleDecision = recommendSize({
      profile: staleCustomer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(createVerifiedSizeRecommendationClaim({
      decision: staleDecision,
      productId: "CB182",
      profile: staleCustomer,
    })).toBeNull();
  });

  it.each([null, "OTHER"])(
    "does not bind accepted history with product %s to the active product",
    (historyProductId) => {
      const customer = profile([], {
        sizeHistory: [{
          productId: historyProductId,
          componentRole: "TOP",
          size: "L",
          outcome: "PURCHASED",
          sourceEventHash: hash("f"),
          recordedAt: "2026-07-22T03:30:00.000Z",
        }],
      });
      const decision = recommendSize({
        profile: customer,
        target,
        charts: [scoped("COMPONENT")],
        generatedAt,
        recommendationId,
      });
      expect(decision.action).toBe("ASK_MORE");
      expect(createVerifiedSizeRecommendationClaim({
        decision,
        productId: "CB182",
        profile: customer,
      })).toBeNull();
    },
  );
  it("does not use PAST_SIZE without an accepted-history source event", () => {
    const customer = profile([], {
      sizeHistory: [{
        productId: "CB182", componentRole: "TOP", size: "L", outcome: "PURCHASED",
        sourceEventHash: null, recordedAt: "2026-07-22T03:30:00.000Z",
      }],
    });
    const decision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("ASK_MORE");
    expect(decision.recommendation.recommendedSizes).toEqual([]);
  });
  it("does not reuse an unaccepted prior recommendation as proof of worn size", () => {
    const customer = profile([], {
      sizeHistory: [{
        productId: "CB182",
        componentRole: "TOP",
        size: "L",
        outcome: "RECOMMENDED",
        sourceEventHash: hash("f"),
        recordedAt: "2026-07-22T03:30:00.000Z",
      }],
    });
    const decision = recommendSize({
      profile: customer,
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("ASK_MORE");
    expect(decision.recommendation.recommendedSizes).toEqual([]);
  });

  it("asks for fit preference at a shared boundary rather than guessing", () => {
    const decision = recommendSize({
      profile: profile([measurement("WAIST_CM", 70)]),
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("ASK_MORE");
    expect(decision.recommendation.status).toBe("AMBIGUOUS");
    expect(decision.alternativeSizes).toEqual(["S", "M"]);
    expect(decision.missingInputs).toEqual(["FIT_PREFERENCE"]);
  });

  it("returns an alternative when verified fit preference resolves a boundary", () => {
    const decision = recommendSize({
      profile: profile([measurement("WAIST_CM", 70)], { fitPreference: "RELAXED" }),
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("REPLY");
    expect(decision.recommendation.recommendedSizes[0]?.size).toBe("M");
    expect(decision.alternativeSizes).toEqual(["S"]);
  });

  it("orders boundary candidates by semantic size rather than OCR band order", () => {
    const reversed = SizeChartV1Schema.parse({
      ...chart("reversed", "TOP"),
      boundaryPolicy: "PREFER_SMALLER_SIZE",
      bands: [...chart("reversed-source", "TOP").bands].reverse(),
    });
    const decision = recommendSize({
      profile: profile([measurement("WAIST_CM", 70)]),
      target,
      charts: [scoped("COMPONENT", reversed)],
      generatedAt,
      recommendationId,
    });
    expect(decision.recommendation.recommendedSizes[0]?.size).toBe("S");
    expect(decision.alternativeSizes).toEqual(["M"]);
  });

  it("hands off without size output when no verified chart exists", () => {
    const decision = recommendSize({
      profile: profile([measurement("WAIST_CM", 72)]),
      target,
      charts: [scoped("COMPONENT", chart("draft", "TOP", "EXTRACTED_UNREVIEWED"))],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("HANDOFF");
    expect(decision.recommendation.status).toBe("NO_VERIFIED_CHART");
    expect(decision.recommendation.recommendedSizes).toEqual([]);
  });

  it("hands off out-of-range profiles instead of selecting the nearest size", () => {
    const decision = recommendSize({
      profile: profile([measurement("WAIST_CM", 100)]),
      target,
      charts: [scoped("COMPONENT")],
      generatedAt,
      recommendationId,
    });
    expect(decision.action).toBe("HANDOFF");
    expect(decision.recommendation.status).toBe("OUT_OF_RANGE");
    expect(decision.recommendation.recommendedSizes).toEqual([]);
  });
});
