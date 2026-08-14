import { z } from "zod";
import { CanonicalProductIdV1Schema } from "./canonical-identifiers.js";

export const PRICE_INVENTORY_FRESH_FOR_SECONDS = 48 * 60 * 60;
export const BOM_FRESH_FOR_SECONDS = 7 * 24 * 60 * 60;
export const FULFILLMENT_FRESH_FOR_SECONDS = 7 * 24 * 60 * 60;
export const MEDIA_FRESH_FOR_SECONDS = 30 * 24 * 60 * 60;
export const DEFAULT_SHIPPING_FEE_VND = 30_000;
export const MULTI_ITEM_OFFER_MINIMUM_PRODUCTS = 2;
export const MULTI_ITEM_OFFER_PERCENT_DISCOUNT = 5;
export const FINAL_CONCESSION_DISCOUNT_VND = 20_000;

export const FactFreshnessSchema = z.enum(["FRESH", "STALE", "UNKNOWN"]);
export type FactFreshness = z.infer<typeof FactFreshnessSchema>;

export const ProductFactSourceSchema = z.enum([
  "PANCAKE_POS",
  "GOOGLE_SHEETS_PRODUCT_REGISTRY",
  "GOOGLE_SHEETS_FULFILLMENT_POLICY",
  "ADMIN_POLICY",
  "WEBSTORE_XML",
  "QDRANT_STABLE",
]);
export type ProductFactSource = z.infer<typeof ProductFactSourceSchema>;

const SourceVersionSchema = z.string().trim().min(1).max(128);
const DateTimeSchema = z.string().datetime();

export const FactGroupMetadataV1Schema = z
  .object({
    authority: ProductFactSourceSchema,
    sourceVersion: SourceVersionSchema,
    observedAt: DateTimeSchema,
    expiresAt: DateTimeSchema.nullable(),
    freshnessState: FactFreshnessSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.expiresAt !== null && Date.parse(value.expiresAt) <= Date.parse(value.observedAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "expiresAt must be later than observedAt",
      });
    }
  });
export type FactGroupMetadataV1 = z.infer<typeof FactGroupMetadataV1Schema>;

const makeFixedTtlMetadataSchema = <
  TSource extends [ProductFactSource, ...ProductFactSource[]],
  TSeconds extends number,
>(sources: TSource, freshForSeconds: TSeconds) =>
  z
    .object({
      authority: z.enum(sources),
      sourceVersion: SourceVersionSchema,
      observedAt: DateTimeSchema,
      expiresAt: DateTimeSchema,
      freshForSeconds: z.literal(freshForSeconds),
      freshnessState: FactFreshnessSchema,
    })
    .strict()
    .superRefine((value, context) => {
      const observedAt = Date.parse(value.observedAt);
      const expiresAt = Date.parse(value.expiresAt);
      if (expiresAt - observedAt !== freshForSeconds * 1_000) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: `expiresAt must be exactly ${freshForSeconds} seconds after observedAt`,
        });
      }
    });

export const ProductIdentityMetadataV1Schema = z
  .object({
    authority: z.literal("GOOGLE_SHEETS_PRODUCT_REGISTRY"),
    sourceVersion: SourceVersionSchema,
    observedAt: DateTimeSchema,
    expiresAt: z.null(),
    freshForSeconds: z.null(),
    freshnessState: FactFreshnessSchema,
  })
  .strict();

export const ProductContentMetadataV1Schema = z
  .object({
    authority: z.literal("WEBSTORE_XML"),
    sourceVersion: SourceVersionSchema,
    observedAt: DateTimeSchema,
    expiresAt: z.null(),
    freshForSeconds: z.null(),
    freshnessState: FactFreshnessSchema,
  })
  .strict();

export const PosBomMetadataV1Schema = makeFixedTtlMetadataSchema(
  ["PANCAKE_POS"],
  BOM_FRESH_FOR_SECONDS,
);

export const PosPriceInventoryMetadataV1Schema = makeFixedTtlMetadataSchema(
  ["PANCAKE_POS"],
  PRICE_INVENTORY_FRESH_FOR_SECONDS,
);

export const FulfillmentMetadataV1Schema = z
  .object({
    authority: z.enum(["GOOGLE_SHEETS_FULFILLMENT_POLICY", "ADMIN_POLICY"]),
    sourceVersion: SourceVersionSchema,
    observedAt: DateTimeSchema,
    expiresAt: DateTimeSchema,
    expiryBasis: z.enum(["DEFAULT_7_DAY_TTL", "ETA_VALID_UNTIL"]),
    freshForSeconds: z.literal(FULFILLMENT_FRESH_FOR_SECONDS).nullable(),
    freshnessState: FactFreshnessSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const observedAt = Date.parse(value.observedAt);
    const expiresAt = Date.parse(value.expiresAt);
    if (expiresAt <= observedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "fulfillment expiresAt must be later than observedAt",
      });
    }
    if (value.expiryBasis === "DEFAULT_7_DAY_TTL") {
      if (value.freshForSeconds !== FULFILLMENT_FRESH_FOR_SECONDS) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["freshForSeconds"],
          message: "default fulfillment freshness must be seven days",
        });
      }
      if (expiresAt - observedAt !== FULFILLMENT_FRESH_FOR_SECONDS * 1_000) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: "default fulfillment expiresAt must be seven days after observedAt",
        });
      }
    } else if (value.freshForSeconds !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["freshForSeconds"],
        message: "ETA valid-until freshness must not claim the default TTL",
      });
    }
  });

export const MediaMetadataV1Schema = makeFixedTtlMetadataSchema(
  ["QDRANT_STABLE"],
  MEDIA_FRESH_FOR_SECONDS,
);

export const UntilReplacedMetadataV1Schema = z
  .object({
    authority: z.enum(["GOOGLE_SHEETS_PRODUCT_REGISTRY", "ADMIN_POLICY"]),
    sourceVersion: SourceVersionSchema,
    observedAt: DateTimeSchema,
    expiresAt: z.null(),
    freshForSeconds: z.null(),
    freshnessState: FactFreshnessSchema,
  })
  .strict();

export const ProductComponentRoleSchema = z.enum([
  "TOP",
  "SKIRT",
  "PANTS",
  "DRESS",
  "JACKET",
  "ACCESSORY",
  "OTHER",
]);
export type ProductComponentRole = z.infer<typeof ProductComponentRoleSchema>;

export const ProductOfferKindV2Schema = z.enum(["DIRECT", "SET", "COMPONENT", "COMBO_3"]);
export type ProductOfferKindV2 = z.infer<typeof ProductOfferKindV2Schema>;

export const ProductIdentityV2Schema = z
  .object({
    parentProductId: CanonicalProductIdV1Schema,
    shopId: z.string().trim().min(1).max(128),
    brand: z.string().trim().min(1).max(128),
    active: z.boolean(),
    availableOfferKinds: z
      .array(ProductOfferKindV2Schema)
      .min(1)
      .max(4),
    metadata: ProductIdentityMetadataV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.availableOfferKinds).size !== value.availableOfferKinds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availableOfferKinds"],
        message: "available offer kinds must be unique",
      });
    }
  });

export const ProductContentV1Schema = z
  .object({
    productName: z.string().trim().min(1).max(500),
    description: z.string().trim().min(1).max(8_000).nullable(),
    productUrl: z.string().url().nullable(),
    metadata: ProductContentMetadataV1Schema,
  })
  .strict();

export const BomComponentV1Schema = z
  .object({
    componentProductId: CanonicalProductIdV1Schema,
    sku: z.string().trim().min(1).max(128),
    role: ProductComponentRoleSchema,
    quantity: z.number().int().positive().max(99),
    required: z.boolean(),
  })
  .strict();

export const ProductOfferCompositionV1Schema = z
  .object({
    offerKind: z.enum(["DIRECT", "SET", "COMBO_3"]),
    /** Exact POS offer key used to build this composition. */
    posOfferKey: z.string().trim().min(1).max(128),
    componentProductIds: z.array(z.string().trim().min(1).max(128)).min(1).max(16),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.componentProductIds).size !== value.componentProductIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["componentProductIds"],
        message: "offer component IDs must be unique",
      });
    }
    if (value.offerKind === "DIRECT" && value.componentProductIds.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["componentProductIds"],
        message: "DIRECT requires exactly one component",
      });
    }
    if (value.offerKind === "COMBO_3" && value.componentProductIds.length !== 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["componentProductIds"],
        message: "COMBO_3 requires exactly three components",
      });
    }
  });

export const ProductBomV1Schema = z
  .object({
    components: z.array(BomComponentV1Schema).min(1).max(16),
    /** Composition is offer-specific: a two-piece SET may coexist with a three-piece COMBO_3. */
    offerCompositions: z.array(ProductOfferCompositionV1Schema).min(1).max(3),
    metadata: PosBomMetadataV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.components.map((component) => component.componentProductId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "BOM componentProductId values must be unique",
      });
    }
    const compositionKinds = value.offerCompositions.map(({ offerKind }) => offerKind);
    if (new Set(compositionKinds).size !== compositionKinds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["offerCompositions"],
        message: "offer composition kinds must be unique",
      });
    }
    const componentIds = new Set(ids);
    value.offerCompositions.forEach((composition, index) => {
      if (composition.componentProductIds.some((id) => !componentIds.has(id))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["offerCompositions", index, "componentProductIds"],
          message: "offer composition may only reference BOM components",
        });
      }
    });
  });

export const VndPriceV1Schema = z
  .object({
    currency: z.literal("VND"),
    listPriceVnd: z.number().int().nonnegative().nullable(),
    salePriceVnd: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.listPriceVnd === null && value.salePriceVnd === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "a price object must contain at least one amount; use null when price is unavailable",
      });
    }
    if (
      value.listPriceVnd !== null &&
      value.salePriceVnd !== null &&
      value.salePriceVnd > value.listPriceVnd
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["salePriceVnd"],
        message: "sale price cannot exceed list price",
      });
    }
  });
export type VndPriceV1 = z.infer<typeof VndPriceV1Schema>;

export const ComponentPriceV1Schema = z
  .object({
    componentProductId: CanonicalProductIdV1Schema,
    price: VndPriceV1Schema.nullable(),
  })
  .strict();

export const ProductPricingV2Schema = z
  .object({
    setPrice: VndPriceV1Schema.nullable(),
    comboThreePiecePrice: VndPriceV1Schema.nullable(),
    componentPrices: z.array(ComponentPriceV1Schema).max(16),
    metadata: PosPriceInventoryMetadataV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.componentPrices.map((price) => price.componentProductId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["componentPrices"],
        message: "component price IDs must be unique",
      });
    }
  });

export const ProductStockStatusV2Schema = z.enum([
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "PRE_ORDER",
  "INBOUND",
  "UNKNOWN",
]);

export const ProductVariantInventoryV2Schema = z
  .object({
    variantId: CanonicalProductIdV1Schema,
    sku: z.string().trim().min(1).max(128),
    offerKind: ProductOfferKindV2Schema,
    /** Exact POS offer key that produced the row; never inferred from display text. */
    posOfferKey: z.string().trim().min(1).max(128),
    componentProductId: CanonicalProductIdV1Schema.nullable(),
    color: z.string().trim().min(1).max(64).nullable(),
    size: z.string().trim().min(1).max(32).nullable(),
    remainQuantity: z.number().int().nonnegative().nullable(),
    sellableQuantity: z.number().int().nonnegative().nullable(),
    stockStatus: ProductStockStatusV2Schema,
  })
  .strict();

export const ProductInventoryV2Schema = z
  .object({
    variants: z.array(ProductVariantInventoryV2Schema).max(1_000),
    metadata: PosPriceInventoryMetadataV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.variants.map((variant) => variant.variantId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants"],
        message: "inventory variantId values must be unique",
      });
    }
  });

export const ProductSellingRulesV1Schema = z
  .object({
    allowMixedSizes: z.boolean(),
    allowComponentSale: z.boolean(),
    metadata: UntilReplacedMetadataV1Schema,
  })
  .strict();

export const FulfillmentPolicyTypeV1Schema = z.enum([
  "READY_STOCK",
  "PRE_ORDER",
  "INBOUND",
  "MADE_TO_ORDER",
  "PAUSED",
  "DISCONTINUED",
]);

export const CustomerDeliveryEtaV1Schema = z
  .object({
    minDays: z.number().int().nonnegative().max(365),
    maxDays: z.number().int().nonnegative().max(365),
    validUntil: DateTimeSchema.nullable(),
  })
  .strict()
  .refine((value) => value.maxDays >= value.minDays, {
    message: "ETA maxDays must be greater than or equal to minDays",
    path: ["maxDays"],
  });

export const ParentFulfillmentV1Schema = z
  .object({
    appliesToParentProductId: CanonicalProductIdV1Schema,
    policyType: FulfillmentPolicyTypeV1Schema,
    canOrderWhenZero: z.boolean(),
    etaToCustomer: CustomerDeliveryEtaV1Schema.nullable(),
    metadata: FulfillmentMetadataV1Schema,
  })
  .strict();

export const ProductSizeChartLinkV1Schema = z
  .object({
    sizeChartId: z.string().trim().min(1).max(128),
    sizeChartVersion: SourceVersionSchema,
    verificationStatus: z.literal("VERIFIED"),
    sourceContentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    metadata: UntilReplacedMetadataV1Schema,
  })
  .strict();
export type ProductSizeChartLinkV1 = z.infer<typeof ProductSizeChartLinkV1Schema>;

/**
 * Additive runtime projection evidence for a size-chart link. A missing link
 * is not self-explanatory: the caller must retain which eligibility gate
 * rejected it so that an unavailable chart is never mistaken for a verified
 * one.
 */
export const ProductSizeChartEligibilityV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.enum(["ELIGIBLE", "INELIGIBLE"]),
    policyBundle: z.enum([
      "FRESH",
      "STALE",
      "UNAVAILABLE",
      "PARSE_FAILED",
      "INTEGRITY_FAILED",
    ]),
    publication: z.enum(["PUBLISHED", "NOT_PUBLISHED", "NOT_EVALUATED"]),
    verification: z.enum(["VERIFIED", "UNVERIFIED", "NOT_EVALUATED"]),
    measurementBasis: z.enum(["BODY", "UNSUPPORTED", "NOT_EVALUATED"]),
    scope: z.enum(["MATCHED", "MISMATCH", "NOT_EVALUATED"]),
    reasonCodes: z.array(z.string().trim().min(1).max(128)).max(8),
  })
  .strict();
export type ProductSizeChartEligibilityV1 = z.infer<
  typeof ProductSizeChartEligibilityV1Schema
>;

export const ProductMediaPurposeV2Schema = z.enum([
  "HERO",
  "PRODUCT_OVERVIEW",
  "DETAIL",
  "FABRIC_DETAIL",
  "FEEDBACK",
  "LOOKBOOK",
  "SIZE_CHART",
]);
export type ProductMediaPurposeV2 = z.infer<typeof ProductMediaPurposeV2Schema>;

export const ProductMediaViewV2Schema = z.enum([
  "FRONT",
  "BACK",
  "SIDE",
  "FULL_LOOK",
  "CLOSE_UP",
  "OTHER",
]);

export const ProductMediaAssetV2Schema = z
  .object({
    assetId: z.string().trim().min(1).max(256),
    url: z.string().url(),
    componentProductId: CanonicalProductIdV1Schema.nullable(),
    purposes: z.array(ProductMediaPurposeV2Schema).min(1).max(8),
    view: ProductMediaViewV2Schema,
    sortOrder: z.number().int().nonnegative().max(10_000),
    verified: z.boolean(),
    sourceContentSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
    reviewStatus: z.literal("APPROVED").nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.purposes).size !== value.purposes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purposes"],
        message: "media purposes must be unique",
      });
    }
  });
export type ProductMediaAssetV2 = z.infer<typeof ProductMediaAssetV2Schema>;

export const ProductMediaFactsV2Schema = z
  .object({
    assets: z.array(ProductMediaAssetV2Schema).max(500),
    metadata: MediaMetadataV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    const ids = value.assets.map((asset) => asset.assetId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assets"],
        message: "media assetId values must be unique",
      });
    }
  });

export const ProductFactsV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    productId: CanonicalProductIdV1Schema,
    identity: ProductIdentityV2Schema,
    content: ProductContentV1Schema,
    bom: ProductBomV1Schema,
    pricing: ProductPricingV2Schema,
    inventory: ProductInventoryV2Schema,
    sellingRules: ProductSellingRulesV1Schema,
    fulfillment: ParentFulfillmentV1Schema,
    sizeChart: ProductSizeChartLinkV1Schema.nullable(),
    media: ProductMediaFactsV2Schema,
    sizeChartEligibility: ProductSizeChartEligibilityV1Schema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const parentProductId = value.identity.parentProductId;
    if (value.productId !== parentProductId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identity", "parentProductId"],
        message: "ProductFactsV2 must be keyed by its parent product",
      });
    }
    if (value.fulfillment.appliesToParentProductId !== parentProductId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillment", "appliesToParentProductId"],
        message: "fulfillment must apply to the parent product",
      });
    }

    const offerKinds = new Set(value.identity.availableOfferKinds);
    const compositionKinds = new Set(value.bom.offerCompositions.map(({ offerKind }) => offerKind));
    for (const offerKind of ["DIRECT", "SET", "COMBO_3"] as const) {
      if (offerKinds.has(offerKind) !== compositionKinds.has(offerKind)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bom", "offerCompositions"],
          message: `${offerKind} availability and offer composition must agree`,
        });
      }
    }
    if (value.pricing.comboThreePiecePrice !== null && !offerKinds.has("COMBO_3")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricing", "comboThreePiecePrice"],
        message: "combo-three-piece price requires the COMBO_3 offer kind",
      });
    }
    if (
      value.pricing.setPrice !== null &&
      !offerKinds.has("SET") &&
      !offerKinds.has("DIRECT")
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricing", "setPrice"],
        message: "set price requires SET or DIRECT offer kind",
      });
    }

    const bomIds = new Set(value.bom.components.map((component) => component.componentProductId));
    const priceIds = new Set(value.pricing.componentPrices.map((price) => price.componentProductId));
    if (bomIds.size !== priceIds.size || [...bomIds].some((id) => !priceIds.has(id))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pricing", "componentPrices"],
        message: "componentPrices must contain every BOM component exactly once; unavailable prices use null",
      });
    }
    value.inventory.variants.forEach((variant, index) => {
      if (variant.componentProductId !== null && !bomIds.has(variant.componentProductId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inventory", "variants", index, "componentProductId"],
          message: "inventory component must exist in the BOM",
        });
      }
      if (variant.offerKind === "COMPONENT" && variant.componentProductId === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inventory", "variants", index, "componentProductId"],
          message: "component inventory must identify its exact BOM component",
        });
      }
      if (variant.offerKind !== "COMPONENT" && variant.componentProductId !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inventory", "variants", index, "componentProductId"],
          message: "non-component inventory is scoped by offer composition, not a component",
        });
      }
    });
    value.media.assets.forEach((asset, index) => {
      if (asset.componentProductId !== null && !bomIds.has(asset.componentProductId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["media", "assets", index, "componentProductId"],
          message: "media component must exist in the BOM",
        });
      }
    });

    const eta = value.fulfillment.etaToCustomer;
    if (eta?.validUntil !== null && eta?.validUntil !== undefined) {
      if (
        value.fulfillment.metadata.expiryBasis !== "ETA_VALID_UNTIL" ||
        value.fulfillment.metadata.expiresAt !== eta.validUntil
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fulfillment", "metadata", "expiresAt"],
          message: "fulfillment must expire at ETA validUntil when provided",
        });
      }
    } else if (value.fulfillment.metadata.expiryBasis !== "DEFAULT_7_DAY_TTL") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fulfillment", "metadata", "expiryBasis"],
        message: "fulfillment without ETA validUntil must use the default seven-day TTL",
      });
    }
  });
export type ProductFactsV2 = z.infer<typeof ProductFactsV2Schema>;

export const PolicyMetadataV1Schema = z
  .object({
    authority: z.literal("ADMIN_POLICY"),
    sourceVersion: SourceVersionSchema,
    observedAt: DateTimeSchema,
    expiresAt: z.null(),
    freshForSeconds: z.null(),
    freshnessState: FactFreshnessSchema,
  })
  .strict();

export const CommerceAuthorityPolicyV1Schema = z
  .object({
    bomAuthority: z.literal("PANCAKE_POS"),
    priceAuthority: z.literal("PANCAKE_POS"),
    inventoryAuthority: z.literal("PANCAKE_POS"),
    allowGoogleSheetsPriceOverride: z.literal(false),
    allowAdminPriceOverride: z.literal(false),
    missingPriceBehavior: z.literal("DO_NOT_QUOTE"),
    metadata: PolicyMetadataV1Schema,
  })
  .strict();

export const ShippingPolicyV1Schema = z
  .object({
    defaultFeeVnd: z.number().int().nonnegative(),
    scope: z.literal("SHOP_WIDE"),
    metadata: PolicyMetadataV1Schema,
  })
  .strict();

export const MultiItemOfferPolicyV1Schema = z
  .object({
    minimumProductCount: z.number().int().min(2).max(100),
    discountBps: z.number().int().min(1).max(10_000),
    countingUnit: z.literal("PARENT_PRODUCT_UNIT"),
    setAndComboCountAsOne: z.literal(true),
    scope: z.literal("SHOP_WIDE"),
    metadata: PolicyMetadataV1Schema,
  })
  .strict();

export const NegotiationPolicyV1Schema = z
  .object({
    secondConcession: z
      .object({
        freeShipping: z.literal(true),
        fixedDiscountVnd: z.literal(0),
      })
      .strict(),
    finalConcession: z
      .object({
        freeShipping: z.literal(true),
        fixedDiscountVnd: z.number().int().positive(),
      })
      .strict(),
    stacking: z
      .object({
        multiItemDiscountWithSecondConcession: z.literal(true),
        multiItemDiscountWithFinalConcession: z.literal(true),
        deduplicateFreeShipping: z.literal(true),
      })
      .strict(),
    scope: z.literal("SHOP_WIDE"),
    metadata: PolicyMetadataV1Schema,
  })
  .strict();

export const ClosingPolicyV1Schema = z
  .object({
    customerStates: z
      .array(z.enum(["READY", "HESITANT", "CAUTIOUS"]))
      .length(3),
    decisionMode: z.literal("DETERMINISTIC_POLICY_ONLY"),
    allowUnlistedOffers: z.literal(false),
    metadata: PolicyMetadataV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.customerStates).size !== value.customerStates.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerStates"],
        message: "closing customer states must be unique",
      });
    }
  });

export const PolicyBundleV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    policyBundleId: z.string().trim().min(1).max(128),
    policyVersion: SourceVersionSchema,
    shopId: z.string().trim().min(1).max(128),
    status: z.enum(["DRAFT", "ACTIVE", "RETIRED"]),
    effectiveAt: DateTimeSchema,
    effectiveUntil: DateTimeSchema.nullable(),
    supersedesPolicyVersion: SourceVersionSchema.nullable(),
    scope: z.literal("SHOP_WIDE"),
    commerceAuthority: CommerceAuthorityPolicyV1Schema,
    shipping: ShippingPolicyV1Schema,
    multiItemOffer: MultiItemOfferPolicyV1Schema,
    negotiation: NegotiationPolicyV1Schema,
    closing: ClosingPolicyV1Schema,
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.effectiveUntil !== null &&
      Date.parse(value.effectiveUntil) <= Date.parse(value.effectiveAt)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["effectiveUntil"],
        message: "policy effectiveUntil must be later than effectiveAt",
      });
    }
  });
export type PolicyBundleV1 = z.infer<typeof PolicyBundleV1Schema>;

export const MediaSelectionStatusV2Schema = z.enum(["COMPLETE", "PARTIAL", "NONE"]);

export const MediaSelectionItemV2Schema = z
  .object({
    assetId: z.string().trim().min(1).max(256),
    url: z.string().url(),
    componentProductId: CanonicalProductIdV1Schema.nullable(),
    selectedForPurpose: ProductMediaPurposeV2Schema,
  })
  .strict();

export const MediaSelectionV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    productId: CanonicalProductIdV1Schema,
    requestedPurposes: z.array(ProductMediaPurposeV2Schema).min(1).max(8),
    requestedComponentProductIds: z.array(CanonicalProductIdV1Schema).max(16),
    maxAssets: z.number().int().min(1).max(4),
    status: MediaSelectionStatusV2Schema,
    selected: z.array(MediaSelectionItemV2Schema).max(4),
    unavailablePurposes: z.array(ProductMediaPurposeV2Schema).max(8),
    mediaMetadata: MediaMetadataV1Schema,
    selectedAt: DateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.requestedPurposes).size !== value.requestedPurposes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedPurposes"],
        message: "requested purposes must be unique",
      });
    }
    if (new Set(value.requestedComponentProductIds).size !== value.requestedComponentProductIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requestedComponentProductIds"],
        message: "requested component IDs must be unique",
      });
    }
    if (new Set(value.unavailablePurposes).size !== value.unavailablePurposes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unavailablePurposes"],
        message: "unavailable purposes must be unique",
      });
    }
    if (value.selected.length > value.maxAssets) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selected"],
        message: "selected assets cannot exceed maxAssets",
      });
    }
    const selectedIds = value.selected.map((asset) => asset.assetId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selected"],
        message: "selected asset IDs must be unique",
      });
    }
    value.selected.forEach((asset, index) => {
      if (!value.requestedPurposes.includes(asset.selectedForPurpose)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selected", index, "selectedForPurpose"],
          message: "selected purpose must have been requested",
        });
      }
      if (
        value.requestedComponentProductIds.length > 0 &&
        (asset.componentProductId === null || !value.requestedComponentProductIds.includes(asset.componentProductId))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["selected", index, "componentProductId"],
          message: "selected asset must match a requested component",
        });
      }
    });
    if (value.status === "NONE" && value.selected.length !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selected"],
        message: "NONE media selection cannot contain selected assets",
      });
    }
    const selectedPurposes = new Set(
      value.selected.map(({ selectedForPurpose }) => selectedForPurpose),
    );
    if (
      value.status === "NONE" &&
      (value.unavailablePurposes.length !== value.requestedPurposes.length ||
        value.requestedPurposes.some(
          (purpose) => !value.unavailablePurposes.includes(purpose),
        ))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unavailablePurposes"],
        message: "NONE must mark every requested purpose unavailable",
      });
    }
    if (
      value.status === "COMPLETE" &&
      (value.unavailablePurposes.length !== 0 ||
        value.requestedPurposes.some((purpose) => !selectedPurposes.has(purpose)))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unavailablePurposes"],
        message: "COMPLETE must cover every requested purpose",
      });
    }
    if (
      value.status === "PARTIAL" &&
      (value.selected.length === 0 || value.unavailablePurposes.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "PARTIAL requires selected media and at least one unavailable purpose",
      });
    }
  });
export type MediaSelectionV2 = z.infer<typeof MediaSelectionV2Schema>;
