import { describe, expect, it } from "vitest";
import {
  BOM_FRESH_FOR_SECONDS,
  FactGroupMetadataV1Schema,
  FULFILLMENT_FRESH_FOR_SECONDS,
  MEDIA_FRESH_FOR_SECONDS,
  MediaSelectionV2Schema,
  PolicyBundleV1Schema,
  PRICE_INVENTORY_FRESH_FOR_SECONDS,
  ProductFactsV2Schema,
} from "./product-policy-media.js";

const observedAt = "2026-07-22T00:00:00.000Z";
const bomExpiresAt = "2026-07-29T00:00:00.000Z";
const shortExpiresAt = "2026-07-24T00:00:00.000Z";
const etaValidUntil = "2026-07-27T00:00:00.000Z";
const mediaExpiresAt = "2026-08-21T00:00:00.000Z";

const posBomMetadata = {
  authority: "PANCAKE_POS",
  sourceVersion: "pos-snapshot-20260722",
  observedAt,
  expiresAt: bomExpiresAt,
  freshForSeconds: BOM_FRESH_FOR_SECONDS,
  freshnessState: "FRESH",
} as const;

const posShortMetadata = {
  authority: "PANCAKE_POS",
  sourceVersion: "pos-snapshot-20260722",
  observedAt,
  expiresAt: shortExpiresAt,
  freshForSeconds: PRICE_INVENTORY_FRESH_FOR_SECONDS,
  freshnessState: "FRESH",
} as const;

const untilReplacedProductMetadata = {
  authority: "GOOGLE_SHEETS_PRODUCT_REGISTRY",
  sourceVersion: "registry-v12",
  observedAt,
  expiresAt: null,
  freshForSeconds: null,
  freshnessState: "FRESH",
} as const;

const policyMetadata = {
  authority: "ADMIN_POLICY",
  sourceVersion: "policy-2026-07",
  observedAt,
  expiresAt: null,
  freshForSeconds: null,
  freshnessState: "FRESH",
} as const;

const validProductFacts = {
  schemaVersion: 2,
  productId: "CB182",
  identity: {
    parentProductId: "CB182",
    shopId: "LANA_DESIGN",
    brand: "LANA_DESIGN",
    active: true,
    availableOfferKinds: ["SET", "COMBO_3"],
    metadata: untilReplacedProductMetadata,
  },
  content: {
    productName: "Combo CB182",
    description: "Combo ba món",
    productUrl: "https://example.com/cb182",
    metadata: {
      authority: "WEBSTORE_XML",
      sourceVersion: "xml-v12",
      observedAt,
      expiresAt: null,
      freshForSeconds: null,
      freshnessState: "FRESH",
    },
  },
  bom: {
    components: [
      { componentProductId: "CB182-AO", sku: "CB182-AO", role: "TOP", quantity: 1, required: true },
      { componentProductId: "CB182-CV", sku: "CB182-CV", role: "SKIRT", quantity: 1, required: true },
      { componentProductId: "CB182-QUAN", sku: "CB182-QUAN", role: "PANTS", quantity: 1, required: true },
    ],
    offerCompositions: [
      { offerKind: "SET", posOfferKey: "SET", componentProductIds: ["CB182-AO", "CB182-CV"] },
      { offerKind: "COMBO_3", posOfferKey: "COMBO_3", componentProductIds: ["CB182-AO", "CB182-CV", "CB182-QUAN"] },
    ],
    metadata: posBomMetadata,
  },
  pricing: {
    setPrice: { currency: "VND", listPriceVnd: 899_000, salePriceVnd: 799_000 },
    comboThreePiecePrice: { currency: "VND", listPriceVnd: 1_099_000, salePriceVnd: 999_000 },
    componentPrices: [
      { componentProductId: "CB182-AO", price: { currency: "VND", listPriceVnd: 399_000, salePriceVnd: 349_000 } },
      { componentProductId: "CB182-CV", price: null },
      { componentProductId: "CB182-QUAN", price: { currency: "VND", listPriceVnd: null, salePriceVnd: 399_000 } },
    ],
    metadata: posShortMetadata,
  },
  inventory: {
    variants: [
      {
        variantId: "cb182-ao-be-s",
        sku: "CB182-AO-BE-S",
        offerKind: "SET",
        posOfferKey: "SET",
        componentProductId: null,
        color: "BE",
        size: "S",
        remainQuantity: 5,
        sellableQuantity: 4,
        stockStatus: "IN_STOCK",
      },
    ],
    metadata: posShortMetadata,
  },
  sellingRules: {
    allowMixedSizes: true,
    allowComponentSale: false,
    metadata: untilReplacedProductMetadata,
  },
  fulfillment: {
    appliesToParentProductId: "CB182",
    policyType: "READY_STOCK",
    canOrderWhenZero: true,
    etaToCustomer: { minDays: 3, maxDays: 7, validUntil: etaValidUntil },
    metadata: {
      authority: "GOOGLE_SHEETS_FULFILLMENT_POLICY",
      sourceVersion: "fulfillment-v8",
      observedAt,
      expiresAt: etaValidUntil,
      expiryBasis: "ETA_VALID_UNTIL",
      freshForSeconds: null,
      freshnessState: "FRESH",
    },
  },
  sizeChart: {
    sizeChartId: "LANA-WOMEN-DEFAULT",
    sizeChartVersion: "2026-07",
    verificationStatus: "VERIFIED",
    sourceContentSha256: "a".repeat(64),
    metadata: policyMetadata,
  },
  media: {
    assets: [
      {
        assetId: "cb182-ao-detail-1",
        url: "https://example.com/cb182-ao-detail.jpg",
        componentProductId: "CB182-AO",
        purposes: ["DETAIL", "FABRIC_DETAIL"],
        view: "CLOSE_UP",
        sortOrder: 1,
        verified: true,
      },
    ],
    metadata: {
      authority: "QDRANT_STABLE",
      sourceVersion: "qdrant-point-v14",
      observedAt,
      expiresAt: mediaExpiresAt,
      freshForSeconds: MEDIA_FRESH_FOR_SECONDS,
      freshnessState: "FRESH",
    },
  },
} as const;

describe("ProductFactsV2", () => {
  it("accepts parent facts with POS BOM/pricing/inventory and an explicit null component price", () => {
    const facts = ProductFactsV2Schema.parse(validProductFacts);
    expect(facts.pricing.componentPrices[1]?.price).toBeNull();
    expect(facts.sellingRules).toMatchObject({ allowMixedSizes: true, allowComponentSale: false });
  });

  it("keeps two-piece SET and three-piece COMBO_3 compositions separate", () => {
    const facts = ProductFactsV2Schema.parse(validProductFacts);
    expect(facts.bom.offerCompositions).toEqual([
      expect.objectContaining({ offerKind: "SET", componentProductIds: ["CB182-AO", "CB182-CV"] }),
      expect.objectContaining({ offerKind: "COMBO_3", componentProductIds: ["CB182-AO", "CB182-CV", "CB182-QUAN"] }),
    ]);
  });

  it("rejects any non-POS authority for price facts", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.pricing.metadata.authority = "ADMIN_POLICY";
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("requires every BOM component to have a price slot, using null when unavailable", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.pricing.componentPrices.pop();
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("rejects an incorrect fixed freshness window", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.inventory.metadata.expiresAt = "2026-07-23T00:00:00.000Z";
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("requires fulfillment to apply to the parent product", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.fulfillment.appliesToParentProductId = "CB182-AO";
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("allows a missing size-chart link without inventing a recommendation", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.sizeChart = null;
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(true);
  });

  it("rejects a sale price above its POS list price", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.pricing.setPrice.salePriceVnd = 999_001;
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(false);
  });

  it("uses a seven-day fulfillment TTL when ETA has no explicit validUntil", () => {
    const candidate = structuredClone(validProductFacts) as Record<string, any>;
    candidate.fulfillment.etaToCustomer.validUntil = null;
    candidate.fulfillment.metadata.expiresAt = bomExpiresAt;
    candidate.fulfillment.metadata.expiryBasis = "DEFAULT_7_DAY_TTL";
    candidate.fulfillment.metadata.freshForSeconds = FULFILLMENT_FRESH_FOR_SECONDS;
    expect(ProductFactsV2Schema.safeParse(candidate).success).toBe(true);
  });
});

describe("shared fact metadata", () => {
  it("is reusable and rejects expiry before observation", () => {
    expect(
      FactGroupMetadataV1Schema.safeParse({
        authority: "QDRANT_STABLE",
        sourceVersion: "v1",
        observedAt,
        expiresAt: "2026-07-21T00:00:00.000Z",
        freshnessState: "STALE",
      }).success,
    ).toBe(false);
  });
});

describe("PolicyBundleV1", () => {
  const policy = {
    schemaVersion: 1,
    policyBundleId: "lana-shopwide-sales",
    policyVersion: "2026-07-22.1",
    shopId: "LANA_DESIGN",
    status: "ACTIVE",
    effectiveAt: observedAt,
    effectiveUntil: null,
    supersedesPolicyVersion: null,
    scope: "SHOP_WIDE",
    commerceAuthority: {
      bomAuthority: "PANCAKE_POS",
      priceAuthority: "PANCAKE_POS",
      inventoryAuthority: "PANCAKE_POS",
      allowGoogleSheetsPriceOverride: false,
      allowAdminPriceOverride: false,
      missingPriceBehavior: "DO_NOT_QUOTE",
      metadata: policyMetadata,
    },
    shipping: { defaultFeeVnd: 30_000, scope: "SHOP_WIDE", metadata: policyMetadata },
    multiItemOffer: {
      minimumProductCount: 2,
      discountBps: 500,
      countingUnit: "PARENT_PRODUCT_UNIT",
      setAndComboCountAsOne: true,
      scope: "SHOP_WIDE",
      metadata: policyMetadata,
    },
    negotiation: {
      secondConcession: { freeShipping: true, fixedDiscountVnd: 0 },
      finalConcession: { freeShipping: true, fixedDiscountVnd: 20_000 },
      stacking: {
        multiItemDiscountWithSecondConcession: true,
        multiItemDiscountWithFinalConcession: true,
        deduplicateFreeShipping: true,
      },
      scope: "SHOP_WIDE",
      metadata: policyMetadata,
    },
    closing: {
      customerStates: ["READY", "HESITANT", "CAUTIOUS"],
      decisionMode: "DETERMINISTIC_POLICY_ONLY",
      allowUnlistedOffers: false,
      metadata: policyMetadata,
    },
  } as const;

  it("accepts the approved shop-wide sales policy", () => {
    expect(PolicyBundleV1Schema.parse(policy).shipping.defaultFeeVnd).toBe(30_000);
  });

  it("cannot enable a Sheets or Admin price override", () => {
    const candidate = structuredClone(policy) as Record<string, any>;
    candidate.commerceAuthority.allowAdminPriceOverride = true;
    expect(PolicyBundleV1Schema.safeParse(candidate).success).toBe(false);
  });

  it("does not allow the model to invent an unlisted closing offer", () => {
    const candidate = structuredClone(policy) as Record<string, any>;
    candidate.closing.allowUnlistedOffers = true;
    expect(PolicyBundleV1Schema.safeParse(candidate).success).toBe(false);
  });

  it("locks the approved final concession to stack with the five-percent offer", () => {
    const parsed = PolicyBundleV1Schema.parse(policy);
    expect(parsed.negotiation.stacking.multiItemDiscountWithFinalConcession).toBe(true);
    expect(parsed.multiItemOffer.setAndComboCountAsOne).toBe(true);
  });
});

describe("MediaSelectionV2", () => {
  it("selects component-specific media only for requested purposes", () => {
    const selection = MediaSelectionV2Schema.parse({
      schemaVersion: 2,
      productId: "CB182",
      requestedPurposes: ["FABRIC_DETAIL"],
      requestedComponentProductIds: ["CB182-AO"],
      maxAssets: 2,
      status: "COMPLETE",
      selected: [
        {
          assetId: "cb182-ao-detail-1",
          url: "https://example.com/cb182-ao-detail.jpg",
          componentProductId: "CB182-AO",
          selectedForPurpose: "FABRIC_DETAIL",
        },
      ],
      unavailablePurposes: [],
      mediaMetadata: {
        authority: "QDRANT_STABLE",
        sourceVersion: "qdrant-point-v14",
        observedAt,
        expiresAt: mediaExpiresAt,
        freshForSeconds: MEDIA_FRESH_FOR_SECONDS,
        freshnessState: "FRESH",
      },
      selectedAt: observedAt,
    });
    expect(selection.selected).toHaveLength(1);
  });

  it("rejects assets from a component that was not requested", () => {
    expect(
      MediaSelectionV2Schema.safeParse({
        schemaVersion: 2,
        productId: "CB182",
        requestedPurposes: ["DETAIL", "FABRIC_DETAIL"],
        requestedComponentProductIds: ["CB182-CV"],
        maxAssets: 1,
        status: "PARTIAL",
        selected: [
          {
            assetId: "cb182-ao-detail-1",
            url: "https://example.com/cb182-ao-detail.jpg",
            componentProductId: "CB182-AO",
            selectedForPurpose: "DETAIL",
          },
        ],
        unavailablePurposes: ["FABRIC_DETAIL"],
        mediaMetadata: {
          authority: "QDRANT_STABLE",
          sourceVersion: "v1",
          observedAt,
          expiresAt: mediaExpiresAt,
          freshForSeconds: MEDIA_FRESH_FOR_SECONDS,
          freshnessState: "FRESH",
        },
        selectedAt: observedAt,
      }).success,
    ).toBe(false);
  });
});
