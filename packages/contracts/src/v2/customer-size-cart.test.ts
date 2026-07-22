import { describe, expect, it } from "vitest";
import {
  CartAdjustmentV1Schema,
  CartV1Schema,
  CustomerProfileV1Schema,
  SizeChartV1Schema,
  SizeRecommendationV1Schema,
} from "./customer-size-cart.js";

const customerKey = {
  namespace: "lana-customer-v1",
  algorithm: "HMAC_SHA256" as const,
  digest: "a".repeat(64),
};

const measurement = {
  kind: "WAIST_CM" as const,
  value: 72,
  provenance: {
    source: "CUSTOMER_MESSAGE" as const,
    sourceEventHash: "b".repeat(64),
    observedAt: "2026-07-22T02:00:00.000Z",
    confidence: 1,
  },
};

const chartRef = {
  chartId: "set-quan-default",
  version: "2026-07-22.1",
  source: "IMAGE_EXTRACTION" as const,
  sourceArtifactRef: "size-chart-image:2026-07-22",
  sourceContentSha256: "b".repeat(64),
  verificationStatus: "VERIFIED" as const,
  verifiedByRef: "admin:owner",
  verifiedAt: "2026-07-22T02:10:00.000Z",
};

const priceAuthority = {
  priceFactRef: "pos:shop-4741464:offer-cb182",
  shopId: "LANA_DESIGN",
  parentProductId: "CB182",
  offerId: "CB182-COMBO3",
  offerPriceKind: "COMBO_3" as const,
  componentProductId: null,
  metadata: {
    authority: "PANCAKE_POS" as const,
    sourceVersion: "snapshot-20260722T020000Z",
    observedAt: "2026-07-22T02:00:00.000Z",
    expiresAt: "2026-07-24T02:00:00.000Z",
    freshForSeconds: 172_800 as const,
    freshnessState: "FRESH" as const,
  },
};

const policyAuthorization = {
  policyBundleId: "lana-sales-policy",
  policyBundleVersion: "1",
  ruleId: "BUY_2_DISCOUNT_5_PERCENT",
  decisionId: "b69f377e-8a2a-48c4-ad77-6d1ea1fd1810",
  authorizedAt: "2026-07-22T02:15:00.000Z",
};

describe("CustomerProfileV1", () => {
  it("accepts an analytics-safe pseudonymous profile with measurement provenance", () => {
    const profile = CustomerProfileV1Schema.parse({
      schemaVersion: 1,
      profileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      customerKey,
      revision: 1,
      measurements: [measurement],
      fitPreference: "REGULAR",
      createdAt: "2026-07-22T02:00:00.000Z",
      updatedAt: "2026-07-22T02:00:00.000Z",
    });

    expect(profile.measurements[0]?.provenance.confidence).toBe(1);
    expect(profile.preferences.colors).toEqual([]);
  });

  it("rejects raw identity fields and duplicate current measurements", () => {
    const base = {
      schemaVersion: 1,
      profileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      customerKey,
      revision: 1,
      measurements: [measurement, measurement],
      fitPreference: null,
      createdAt: "2026-07-22T02:00:00.000Z",
      updatedAt: "2026-07-22T02:01:00.000Z",
    };

    expect(CustomerProfileV1Schema.safeParse(base).success).toBe(false);
    expect(
      CustomerProfileV1Schema.safeParse({
        ...base,
        measurements: [measurement],
        phone: "0984000000",
      }).success,
    ).toBe(false);
  });
});

describe("SizeChartV1", () => {
  it("stores image-extracted bands for review without making them authoritative", () => {
    const extracted = SizeChartV1Schema.parse({
      schemaVersion: 1,
      reference: {
        ...chartRef,
        verificationStatus: "EXTRACTED_UNREVIEWED",
        verifiedByRef: null,
        verifiedAt: null,
      },
      brand: "LANA_DESIGN",
      category: "SET_QUAN",
      componentRole: null,
      boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
      bands: [
        {
          size: "S",
          ranges: [
            { kind: "WEIGHT_KG", minInclusive: 44, maxInclusive: 50 },
            { kind: "WAIST_CM", minInclusive: 64, maxInclusive: 70 },
          ],
          note: null,
        },
      ],
    });

    expect(extracted.reference.verificationStatus).toBe("EXTRACTED_UNREVIEWED");
  });
});

describe("SizeRecommendationV1", () => {
  it("accepts a recommendation backed by an approved chart", () => {
    expect(
      SizeRecommendationV1Schema.parse({
        schemaVersion: 1,
        recommendationId: "5443b12e-724a-4a18-8610-97cc8694f812",
        parentProductId: "CB182",
        customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
        customerProfileRevision: 1,
        status: "RECOMMENDED",
        chartRef,
        measurementsUsed: [measurement],
        missingMeasurements: [],
        recommendedSizes: [
          {
            componentProductId: "CB182-AO",
            componentRole: "TOP",
            size: "M",
          },
        ],
        candidateSizes: [],
        confidence: 0.92,
        reasonCodes: ["WAIST_IN_SIZE_M_RANGE"],
        generatedAt: "2026-07-22T02:12:00.000Z",
      }).status,
    ).toBe("RECOMMENDED");
  });

  it("forbids a size recommendation without a verified chart", () => {
    const result = SizeRecommendationV1Schema.safeParse({
      schemaVersion: 1,
      recommendationId: "5443b12e-724a-4a18-8610-97cc8694f812",
      parentProductId: "CB182",
      customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      customerProfileRevision: 1,
      status: "RECOMMENDED",
      chartRef: null,
      measurementsUsed: [measurement],
      missingMeasurements: [],
      recommendedSizes: [
        {
          componentProductId: "CB182-AO",
          componentRole: "TOP",
          size: "M",
        },
      ],
      candidateSizes: [],
      confidence: 0.7,
      reasonCodes: ["MODEL_GUESS"],
      generatedAt: "2026-07-22T02:12:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("rejects size output backed only by an unreviewed image extraction", () => {
    const result = SizeRecommendationV1Schema.safeParse({
      schemaVersion: 1,
      recommendationId: "5443b12e-724a-4a18-8610-97cc8694f812",
      parentProductId: "CB182",
      customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      customerProfileRevision: 1,
      status: "RECOMMENDED",
      chartRef: {
        ...chartRef,
        verificationStatus: "EXTRACTED_UNREVIEWED",
        verifiedByRef: null,
        verifiedAt: null,
      },
      measurementsUsed: [measurement],
      missingMeasurements: [],
      recommendedSizes: [
        {
          componentProductId: "CB182-AO",
          componentRole: "TOP",
          size: "M",
        },
      ],
      candidateSizes: [],
      confidence: 0.7,
      reasonCodes: ["UNREVIEWED_IMAGE_EXTRACTION"],
      generatedAt: "2026-07-22T02:12:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("supports an explicit no-chart result without guessing a size", () => {
    expect(
      SizeRecommendationV1Schema.safeParse({
        schemaVersion: 1,
        recommendationId: "5443b12e-724a-4a18-8610-97cc8694f812",
        parentProductId: "CB182",
        customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
        customerProfileRevision: 1,
        status: "NO_VERIFIED_CHART",
        chartRef: null,
        measurementsUsed: [measurement],
        missingMeasurements: [],
        recommendedSizes: [],
        candidateSizes: [],
        confidence: null,
        reasonCodes: ["SIZE_CHART_NOT_APPROVED"],
        generatedAt: "2026-07-22T02:12:00.000Z",
      }).success,
    ).toBe(true);
  });
});

describe("CartV1", () => {
  const components = [
    {
      componentProductId: "CB182-AO",
      componentSku: "CB182-AO-BE-M",
      componentRole: "TOP" as const,
      color: "BE",
      size: "M",
      quantity: 1,
    },
    {
      componentProductId: "CB182-CV",
      componentSku: "CB182-CV-BE-S",
      componentRole: "SKIRT" as const,
      color: "BE",
      size: "S",
      quantity: 1,
    },
    {
      componentProductId: "CB182-QUAN",
      componentSku: "CB182-QUAN-BE-M",
      componentRole: "PANTS" as const,
      color: "BE",
      size: "M",
      quantity: 1,
    },
  ];

  it("accepts a POS-priced three-piece combo with authorized adjustment", () => {
    const cart = CartV1Schema.parse({
      schemaVersion: 1,
      cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
      salesEpisodeId: "7cb56372-6328-4a0b-9b6e-91a894f7d5e8",
      customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      revision: 2,
      currency: "VND",
      status: "READY_FOR_CONFIRMATION",
      checkoutEligibility: "ELIGIBLE",
      lines: [
        {
          lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
          parentProductId: "CB182",
          offerId: "CB182-COMBO3",
          offerKind: "COMBO_3",
          quantity: 1,
          components,
          allowMixedSizes: true,
          allowComponentSale: true,
          posUnitPriceVnd: 1_000_000,
          priceAuthority,
          lineTotalVnd: 1_000_000,
        },
      ],
      adjustments: [
        {
          adjustmentId: "114c2fbf-3b92-422a-b965-02e0275a1bf2",
          kind: "PERCENT_DISCOUNT",
          amountVnd: 50_000,
          percentageBps: 500,
          policyAuthorization,
        },
      ],
      shippingFeeVnd: 30_000,
      subtotalVnd: 1_000_000,
      discountTotalVnd: 50_000,
      grandTotalVnd: 980_000,
      createdAt: "2026-07-22T02:13:00.000Z",
      updatedAt: "2026-07-22T02:15:00.000Z",
    });

    expect(cart.grandTotalVnd).toBe(980_000);
  });

  it("blocks calculation and confirmation when any POS price is null", () => {
    const result = CartV1Schema.safeParse({
      schemaVersion: 1,
      cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
      salesEpisodeId: "7cb56372-6328-4a0b-9b6e-91a894f7d5e8",
      customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      revision: 1,
      currency: "VND",
      status: "CONFIRMED",
      checkoutEligibility: "ELIGIBLE",
      lines: [
        {
          lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
          parentProductId: "CB182",
          offerId: "CB182-COMBO3",
          offerKind: "COMBO_3",
          quantity: 1,
          components,
          allowMixedSizes: true,
          allowComponentSale: true,
          posUnitPriceVnd: null,
          priceAuthority: null,
          lineTotalVnd: null,
        },
      ],
      adjustments: [],
      shippingFeeVnd: 30_000,
      subtotalVnd: 0,
      discountTotalVnd: 0,
      grandTotalVnd: 30_000,
      createdAt: "2026-07-22T02:13:00.000Z",
      updatedAt: "2026-07-22T02:15:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("enforces mixed-size and component-sale permissions", () => {
    const mixedSet = {
      lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
      parentProductId: "CB182",
      offerId: "CB182-SET",
      offerKind: "SET" as const,
      quantity: 1,
      components: components.slice(0, 2),
      allowMixedSizes: false,
      allowComponentSale: false,
      posUnitPriceVnd: 699_000,
      priceAuthority: { ...priceAuthority, offerId: "CB182-SET", offerPriceKind: "SET" as const },
      lineTotalVnd: 699_000,
    };
    const cartBase = {
      schemaVersion: 1,
      cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
      salesEpisodeId: "7cb56372-6328-4a0b-9b6e-91a894f7d5e8",
      customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      revision: 1,
      currency: "VND",
      status: "OPEN",
      checkoutEligibility: "BLOCKED_OTHER",
      adjustments: [],
      shippingFeeVnd: 30_000,
      subtotalVnd: 699_000,
      discountTotalVnd: 0,
      grandTotalVnd: 729_000,
      createdAt: "2026-07-22T02:13:00.000Z",
      updatedAt: "2026-07-22T02:15:00.000Z",
    };

    expect(CartV1Schema.safeParse({ ...cartBase, lines: [mixedSet] }).success).toBe(false);
    expect(
      CartV1Schema.safeParse({
        ...cartBase,
        lines: [
          {
            ...mixedSet,
            offerKind: "COMPONENT",
            components: components.slice(0, 1),
            allowMixedSizes: true,
            priceAuthority: {
              ...priceAuthority,
              offerPriceKind: "COMPONENT",
              componentProductId: "CB182-AO",
            },
          },
        ],
      }).success,
    ).toBe(false);

    const wrongComponentPrice = {
      ...mixedSet,
      offerId: "CB182-AO",
      offerKind: "COMPONENT" as const,
      components: components.slice(0, 1),
      allowMixedSizes: true,
      allowComponentSale: true,
      priceAuthority: { ...priceAuthority, offerId: "CB182-AO", offerPriceKind: "COMPONENT" as const, componentProductId: "CB182-CV" },
    };
    expect(CartV1Schema.safeParse({ ...cartBase, lines: [wrongComponentPrice] }).success).toBe(false);
  });

  it("supports a directly sold one-piece product", () => {
    const direct = {
      lineId: "0b884806-7c77-4410-bc47-a3d2bb51c936",
      parentProductId: "V123",
      offerId: "V123-DIRECT",
      offerKind: "DIRECT" as const,
      quantity: 1,
      components: [{ ...components[0], componentProductId: "V123", componentSku: "V123-M" }],
      allowMixedSizes: false,
      allowComponentSale: false,
      posUnitPriceVnd: 599_000,
      priceAuthority: { ...priceAuthority, parentProductId: "V123", offerId: "V123-DIRECT", offerPriceKind: "DIRECT" as const },
      lineTotalVnd: 599_000,
    };
    const candidate = {
      schemaVersion: 1,
      cartId: "15f9b215-2085-44f2-8d21-af4244577f5e",
      salesEpisodeId: "7cb56372-6328-4a0b-9b6e-91a894f7d5e8",
      customerProfileId: "30709206-8f96-4a1b-9311-6f03ef4dd8b2",
      revision: 1,
      currency: "VND",
      status: "READY_FOR_CONFIRMATION",
      checkoutEligibility: "ELIGIBLE",
      lines: [direct],
      adjustments: [],
      shippingFeeVnd: 30_000,
      subtotalVnd: 599_000,
      discountTotalVnd: 0,
      grandTotalVnd: 629_000,
      createdAt: "2026-07-22T02:13:00.000Z",
      updatedAt: "2026-07-22T02:15:00.000Z",
    };
    expect(CartV1Schema.safeParse(candidate).success).toBe(true);
    expect(CartV1Schema.safeParse({ ...candidate, lines: [{ ...direct, components }] }).success).toBe(false);
  });

  it("requires policy authorization and integer VND adjustments", () => {
    const unauthorizedAdjustment = {
      adjustmentId: "114c2fbf-3b92-422a-b965-02e0275a1bf2",
      kind: "FIXED_DISCOUNT",
      amountVnd: 20_000.5,
      percentageBps: null,
    };

    expect(CartAdjustmentV1Schema.safeParse(unauthorizedAdjustment).success).toBe(false);
  });
});
