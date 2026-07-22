import { z } from "zod";
import {
  PosPriceInventoryMetadataV1Schema,
  ProductComponentRoleSchema,
} from "./product-policy-media.js";

const DateTimeSchema = z.string().datetime();
const ConfidenceSchema = z.number().min(0).max(1);

export const VndAmountSchema = z
  .number()
  .int()
  .nonnegative()
  .max(999_999_999_999);
export type VndAmount = z.infer<typeof VndAmountSchema>;

export const PseudonymousCustomerKeyV1Schema = z
  .object({
    namespace: z.string().trim().min(1).max(64),
    algorithm: z.literal("HMAC_SHA256"),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export type PseudonymousCustomerKeyV1 = z.infer<
  typeof PseudonymousCustomerKeyV1Schema
>;

export const MeasurementKindSchema = z.enum([
  "HEIGHT_CM",
  "WEIGHT_KG",
  "BUST_CM",
  "WAIST_CM",
  "HIPS_CM",
]);
export type MeasurementKind = z.infer<typeof MeasurementKindSchema>;

export const MeasurementProvenanceV1Schema = z
  .object({
    source: z.enum([
      "CUSTOMER_MESSAGE",
      "HUMAN_CONFIRMED",
      "ADMIN_APPROVED_IMPORT",
    ]),
    sourceEventHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    observedAt: DateTimeSchema,
    confidence: ConfidenceSchema,
  })
  .strict();
export type MeasurementProvenanceV1 = z.infer<
  typeof MeasurementProvenanceV1Schema
>;

export const BodyMeasurementV1Schema = z
  .object({
    kind: MeasurementKindSchema,
    value: z.number().positive().max(300),
    provenance: MeasurementProvenanceV1Schema,
  })
  .strict()
  .superRefine((measurement, context) => {
    if (measurement.kind === "WEIGHT_KG" && measurement.value > 250) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "weight must not exceed 250 kg",
      });
    }
  });
export type BodyMeasurementV1 = z.infer<typeof BodyMeasurementV1Schema>;

export const CustomerPreferenceV1Schema = z
  .object({
    colors: z.array(z.string().trim().min(1).max(64)).max(20),
    styles: z.array(z.string().trim().min(1).max(64)).max(20),
    materials: z.array(z.string().trim().min(1).max(64)).max(20),
  })
  .strict();

export const CustomerSizeHistoryV1Schema = z
  .object({
    productId: z.string().trim().min(1).max(128).nullable(),
    componentRole: ProductComponentRoleSchema,
    size: z.string().trim().min(1).max(16),
    outcome: z.enum([
      "RECOMMENDED",
      "CUSTOMER_ACCEPTED",
      "PURCHASED",
      "RETURNED_FIT_ISSUE",
    ]),
    sourceEventHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
    recordedAt: DateTimeSchema,
  })
  .strict();

/**
 * Analytics-safe customer profile. Raw phone numbers, names and addresses belong
 * in a separately protected identity store and are deliberately absent here.
 */
export const CustomerProfileV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    profileId: z.string().uuid(),
    customerKey: PseudonymousCustomerKeyV1Schema,
    revision: z.number().int().positive(),
    measurements: z.array(BodyMeasurementV1Schema).max(5),
    fitPreference: z.enum(["FITTED", "REGULAR", "RELAXED"]).nullable(),
    preferences: CustomerPreferenceV1Schema.default({
      colors: [],
      styles: [],
      materials: [],
    }),
    sizeHistory: z.array(CustomerSizeHistoryV1Schema).max(50).default([]),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .strict()
  .superRefine((profile, context) => {
    const measurementKinds = profile.measurements.map(({ kind }) => kind);
    if (new Set(measurementKinds).size !== measurementKinds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["measurements"],
        message: "customer profile may contain at most one current value per measurement kind",
      });
    }
    if (Date.parse(profile.updatedAt) < Date.parse(profile.createdAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updatedAt"],
        message: "updatedAt must not be earlier than createdAt",
      });
    }
  });
export type CustomerProfileV1 = z.infer<typeof CustomerProfileV1Schema>;

export const SizeChartReferenceV1Schema = z
  .object({
    chartId: z.string().trim().min(1).max(128),
    version: z.string().trim().min(1).max(64),
    source: z.enum(["IMAGE_EXTRACTION", "STRUCTURED_IMPORT"]),
    sourceArtifactRef: z.string().trim().min(1).max(1_024),
    sourceContentSha256: z.string().regex(/^[a-f0-9]{64}$/),
    verificationStatus: z.enum(["EXTRACTED_UNREVIEWED", "VERIFIED"]),
    verifiedByRef: z.string().trim().min(1).max(128).nullable(),
    verifiedAt: DateTimeSchema.nullable(),
  })
  .strict()
  .superRefine((chart, context) => {
    const hasVerifier = chart.verifiedByRef !== null;
    const hasVerificationTime = chart.verifiedAt !== null;
    const hasVerification = hasVerifier && hasVerificationTime;
    if (hasVerifier !== hasVerificationTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verifiedAt"],
        message: "verifier and verification time must be present or absent together",
      });
    }
    if (chart.verificationStatus === "VERIFIED" && !hasVerification) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verifiedAt"],
        message: "VERIFIED chart requires verifier and verification time",
      });
    }
    if (chart.verificationStatus === "EXTRACTED_UNREVIEWED" && hasVerification) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["verificationStatus"],
        message: "unreviewed chart cannot include verification evidence",
      });
    }
  });
export type SizeChartReferenceV1 = z.infer<
  typeof SizeChartReferenceV1Schema
>;

export const SizeChartMeasurementRangeV1Schema = z
  .object({
    kind: MeasurementKindSchema,
    minInclusive: z.number().nonnegative().nullable(),
    maxInclusive: z.number().positive().nullable(),
  })
  .strict()
  .superRefine((range, context) => {
    if (range.minInclusive === null && range.maxInclusive === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "a size-chart range needs at least one boundary",
      });
    }
    if (
      range.minInclusive !== null &&
      range.maxInclusive !== null &&
      range.maxInclusive < range.minInclusive
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxInclusive"],
        message: "size-chart maximum cannot be below its minimum",
      });
    }
  });

export const SizeChartBandV1Schema = z
  .object({
    size: z.string().trim().min(1).max(16),
    ranges: z.array(SizeChartMeasurementRangeV1Schema).min(1).max(5),
    note: z.string().trim().min(1).max(500).nullable(),
  })
  .strict()
  .superRefine((band, context) => {
    const kinds = band.ranges.map((range) => range.kind);
    if (new Set(kinds).size !== kinds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ranges"],
        message: "a size band cannot repeat a measurement kind",
      });
    }
  });

/** Structured staging result produced from a size-chart image or import. */
export const SizeChartV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    reference: SizeChartReferenceV1Schema,
    brand: z.string().trim().min(1).max(128),
    category: z.string().trim().min(1).max(128),
    componentRole: ProductComponentRoleSchema.nullable(),
    boundaryPolicy: z.enum([
      "PREFER_SMALLER_SIZE",
      "PREFER_LARGER_SIZE",
      "REQUIRE_HUMAN_REVIEW",
    ]),
    bands: z.array(SizeChartBandV1Schema).min(1).max(32),
  })
  .strict()
  .superRefine((chart, context) => {
    const sizes = chart.bands.map((band) => band.size);
    if (new Set(sizes).size !== sizes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bands"],
        message: "size-chart bands must use unique size labels",
      });
    }
  });
export type SizeChartV1 = z.infer<typeof SizeChartV1Schema>;

export const ComponentSizeSelectionV1Schema = z
  .object({
    componentProductId: z.string().trim().min(1).max(128),
    componentRole: ProductComponentRoleSchema,
    size: z.string().trim().min(1).max(16),
  })
  .strict();
export type ComponentSizeSelectionV1 = z.infer<
  typeof ComponentSizeSelectionV1Schema
>;

export const SizeRecommendationStatusSchema = z.enum([
  "RECOMMENDED",
  "AMBIGUOUS",
  "NEEDS_MEASUREMENTS",
  "NO_VERIFIED_CHART",
  "OUT_OF_RANGE",
]);
export type SizeRecommendationStatus = z.infer<
  typeof SizeRecommendationStatusSchema
>;

export const SizeRecommendationV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    recommendationId: z.string().uuid(),
    parentProductId: z.string().trim().min(1).max(128),
    customerProfileId: z.string().uuid(),
    customerProfileRevision: z.number().int().positive(),
    status: SizeRecommendationStatusSchema,
    chartRef: SizeChartReferenceV1Schema.nullable(),
    measurementsUsed: z.array(BodyMeasurementV1Schema).max(5),
    missingMeasurements: z.array(MeasurementKindSchema).max(5),
    recommendedSizes: z.array(ComponentSizeSelectionV1Schema).max(4),
    candidateSizes: z.array(ComponentSizeSelectionV1Schema).max(8),
    confidence: ConfidenceSchema.nullable(),
    reasonCodes: z.array(z.string().trim().min(1).max(128)).min(1).max(16),
    generatedAt: DateTimeSchema,
  })
  .strict()
  .superRefine((recommendation, context) => {
    const hasVerifiedChart =
      recommendation.chartRef?.verificationStatus === "VERIFIED";
    const hasAnySize =
      recommendation.recommendedSizes.length > 0 ||
      recommendation.candidateSizes.length > 0;

    if (hasAnySize && !hasVerifiedChart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["chartRef"],
        message: "size output requires an approved, verified size chart",
      });
    }
    if (hasAnySize && recommendation.confidence === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confidence"],
        message: "size output requires confidence",
      });
    }

    if (recommendation.status === "RECOMMENDED") {
      if (!hasVerifiedChart || recommendation.recommendedSizes.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recommendedSizes"],
          message: "RECOMMENDED requires a verified chart and at least one recommendation",
        });
      }
      if (recommendation.candidateSizes.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["candidateSizes"],
          message: "RECOMMENDED must not contain ambiguous candidates",
        });
      }
      if (recommendation.confidence === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confidence"],
          message: "RECOMMENDED requires confidence",
        });
      }
    } else if (recommendation.recommendedSizes.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recommendedSizes"],
        message: "only RECOMMENDED may contain final size recommendations",
      });
    }

    if (
      recommendation.status === "AMBIGUOUS" &&
      (!hasVerifiedChart || recommendation.candidateSizes.length < 2)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["candidateSizes"],
        message: "AMBIGUOUS requires a verified chart and at least two candidates",
      });
    }

    if (recommendation.status === "NO_VERIFIED_CHART") {
      if (hasVerifiedChart || hasAnySize || recommendation.confidence !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["status"],
          message: "NO_VERIFIED_CHART cannot include a verified chart, size output or confidence",
        });
      }
    }

    if (
      recommendation.status === "NEEDS_MEASUREMENTS" &&
      recommendation.missingMeasurements.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["missingMeasurements"],
        message: "NEEDS_MEASUREMENTS requires at least one missing measurement",
      });
    }
    if (
      (recommendation.status === "NEEDS_MEASUREMENTS" ||
        recommendation.status === "OUT_OF_RANGE") &&
      (hasAnySize || recommendation.confidence !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: `${recommendation.status} cannot expose a size result or confidence`,
      });
    }

    const usedKinds = recommendation.measurementsUsed.map(({ kind }) => kind);
    if (new Set(usedKinds).size !== usedKinds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["measurementsUsed"],
        message: "measurementsUsed must not contain duplicate kinds",
      });
    }
  });
export type SizeRecommendationV1 = z.infer<typeof SizeRecommendationV1Schema>;

export const PosPriceAuthorityV1Schema = z
  .object({
    priceFactRef: z.string().trim().min(1).max(256),
    shopId: z.string().trim().min(1).max(128),
    parentProductId: z.string().trim().min(1).max(128),
    offerId: z.string().trim().min(1).max(128),
    offerPriceKind: z.enum(["DIRECT", "SET", "COMPONENT", "COMBO_3"]),
    componentProductId: z.string().trim().min(1).max(128).nullable(),
    metadata: PosPriceInventoryMetadataV1Schema,
  })
  .strict()
  .superRefine((authority, context) => {
    const isComponent = authority.offerPriceKind === "COMPONENT";
    if (isComponent !== (authority.componentProductId !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["componentProductId"],
        message: "component price authority must identify exactly one component",
      });
    }
    if (authority.metadata.freshnessState !== "FRESH") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["metadata", "freshnessState"],
        message: "stale or unknown POS price cannot authorize a cart amount",
      });
    }
  });
export type PosPriceAuthorityV1 = z.infer<typeof PosPriceAuthorityV1Schema>;

export const CartComponentSelectionV1Schema = z
  .object({
    componentProductId: z.string().trim().min(1).max(128),
    componentSku: z.string().trim().min(1).max(128),
    componentRole: ProductComponentRoleSchema,
    color: z.string().trim().min(1).max(64).nullable(),
    size: z.string().trim().min(1).max(16).nullable(),
    quantity: z.number().int().positive().max(20),
  })
  .strict();
export type CartComponentSelectionV1 = z.infer<
  typeof CartComponentSelectionV1Schema
>;

export const CartLineV1Schema = z
  .object({
    lineId: z.string().uuid(),
    parentProductId: z.string().trim().min(1).max(128),
    offerId: z.string().trim().min(1).max(128),
    offerKind: z.enum(["DIRECT", "SET", "COMPONENT", "COMBO_3"]),
    quantity: z.number().int().positive().max(20),
    components: z.array(CartComponentSelectionV1Schema).min(1).max(4),
    allowMixedSizes: z.boolean(),
    allowComponentSale: z.boolean(),
    posUnitPriceVnd: VndAmountSchema.nullable(),
    priceAuthority: PosPriceAuthorityV1Schema.nullable(),
    lineTotalVnd: VndAmountSchema.nullable(),
  })
  .strict()
  .superRefine((line, context) => {
    if (line.offerKind === "COMPONENT") {
      if (line.components.length !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["components"],
          message: "COMPONENT offer must contain exactly one component",
        });
      }
      if (!line.allowComponentSale) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allowComponentSale"],
          message: "component sale is not allowed for this product",
        });
      }
    }
    if (line.offerKind === "DIRECT" && line.components.length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "DIRECT offer must contain exactly one product component",
      });
    }
    if (line.offerKind === "SET" && line.components.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "SET offer must contain at least two components",
      });
    }
    if (line.offerKind === "COMBO_3" && line.components.length !== 3) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "COMBO_3 offer must contain exactly three components",
      });
    }

    const componentIds = line.components.map(({ componentProductId }) => componentProductId);
    if (new Set(componentIds).size !== componentIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "cart line components must be unique",
      });
    }

    const selectedSizes = new Set(
      line.components
        .map(({ size }) => size)
        .filter((size): size is string => size !== null),
    );
    if (!line.allowMixedSizes && selectedSizes.size > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "mixed component sizes are not allowed for this product",
      });
    }

    const hasPrice = line.posUnitPriceVnd !== null;
    if (hasPrice !== (line.priceAuthority !== null)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceAuthority"],
        message: "POS price and its authority must be present or absent together",
      });
    }
    if (
      line.priceAuthority !== null &&
      line.priceAuthority.offerPriceKind !== line.offerKind
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceAuthority", "offerPriceKind"],
        message: "POS price kind must match the cart offer kind",
      });
    }
    if (line.priceAuthority !== null && (
      line.priceAuthority.parentProductId !== line.parentProductId ||
      line.priceAuthority.offerId !== line.offerId
    )) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceAuthority"],
        message: "POS price authority identity must match the cart line",
      });
    }
    if (
      line.offerKind === "COMPONENT" &&
      line.priceAuthority !== null &&
      line.priceAuthority.componentProductId !== line.components[0]?.componentProductId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceAuthority", "componentProductId"],
        message: "component price authority must match the selected component",
      });
    }
    if (!hasPrice && line.lineTotalVnd !== null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineTotalVnd"],
        message: "a line without an authoritative POS price cannot be calculated",
      });
    }
    if (
      hasPrice &&
      line.lineTotalVnd !== line.posUnitPriceVnd! * line.quantity
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineTotalVnd"],
        message: "lineTotalVnd must equal POS unit price multiplied by quantity",
      });
    }
  });
export type CartLineV1 = z.infer<typeof CartLineV1Schema>;

export const PolicyAuthorizationV1Schema = z
  .object({
    policyBundleId: z.string().trim().min(1).max(128),
    policyBundleVersion: z.string().trim().min(1).max(64),
    ruleId: z.string().trim().min(1).max(128),
    decisionId: z.string().uuid(),
    authorizedAt: DateTimeSchema,
  })
  .strict();
export type PolicyAuthorizationV1 = z.infer<
  typeof PolicyAuthorizationV1Schema
>;

export const CartAdjustmentV1Schema = z
  .object({
    adjustmentId: z.string().uuid(),
    kind: z.enum(["PERCENT_DISCOUNT", "FIXED_DISCOUNT", "FREE_SHIPPING"]),
    amountVnd: VndAmountSchema,
    percentageBps: z.number().int().min(1).max(10_000).nullable(),
    policyAuthorization: PolicyAuthorizationV1Schema,
  })
  .strict()
  .superRefine((adjustment, context) => {
    if (
      adjustment.kind === "PERCENT_DISCOUNT" &&
      adjustment.percentageBps === null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentageBps"],
        message: "percentage discount requires percentageBps",
      });
    }
    if (
      adjustment.kind !== "PERCENT_DISCOUNT" &&
      adjustment.percentageBps !== null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentageBps"],
        message: "only percentage discount may include percentageBps",
      });
    }
  });
export type CartAdjustmentV1 = z.infer<typeof CartAdjustmentV1Schema>;

export const CartCheckoutEligibilitySchema = z.enum([
  "ELIGIBLE",
  "BLOCKED_MISSING_PRICE",
  "BLOCKED_MISSING_SHIPPING_FEE",
  "BLOCKED_POLICY",
  "BLOCKED_OTHER",
]);
export type CartCheckoutEligibility = z.infer<
  typeof CartCheckoutEligibilitySchema
>;

export const CartV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    cartId: z.string().uuid(),
    salesEpisodeId: z.string().uuid(),
    customerProfileId: z.string().uuid(),
    revision: z.number().int().positive(),
    currency: z.literal("VND"),
    status: z.enum(["OPEN", "READY_FOR_CONFIRMATION", "CONFIRMED", "ABANDONED"]),
    checkoutEligibility: CartCheckoutEligibilitySchema,
    lines: z.array(CartLineV1Schema).min(1).max(50),
    adjustments: z.array(CartAdjustmentV1Schema).max(10),
    shippingFeeVnd: VndAmountSchema.nullable(),
    subtotalVnd: VndAmountSchema.nullable(),
    discountTotalVnd: VndAmountSchema.nullable(),
    grandTotalVnd: VndAmountSchema.nullable(),
    createdAt: DateTimeSchema,
    updatedAt: DateTimeSchema,
  })
  .strict()
  .superRefine((cart, context) => {
    const lineIds = cart.lines.map(({ lineId }) => lineId);
    if (new Set(lineIds).size !== lineIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lines"],
        message: "cart line IDs must be unique",
      });
    }
    const adjustmentIds = cart.adjustments.map(({ adjustmentId }) => adjustmentId);
    if (new Set(adjustmentIds).size !== adjustmentIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adjustments"],
        message: "cart adjustment IDs must be unique",
      });
    }
    const policyDecisionIds = cart.adjustments.map(
      ({ policyAuthorization }) => policyAuthorization.decisionId,
    );
    if (new Set(policyDecisionIds).size !== policyDecisionIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adjustments"],
        message: "one policy authorization decision cannot be applied more than once",
      });
    }
    const freeShippingAdjustments = cart.adjustments.filter(
      ({ kind }) => kind === "FREE_SHIPPING",
    );
    if (freeShippingAdjustments.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adjustments"],
        message: "free shipping may be applied at most once",
      });
    }
    if (
      cart.shippingFeeVnd !== null &&
      freeShippingAdjustments[0] !== undefined &&
      freeShippingAdjustments[0].amountVnd !== cart.shippingFeeVnd
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adjustments"],
        message: "free-shipping adjustment must equal the authoritative shipping fee",
      });
    }

    const missingPrice = cart.lines.some(({ posUnitPriceVnd }) => posUnitPriceVnd === null);
    const totalFields = [cart.subtotalVnd, cart.discountTotalVnd, cart.grandTotalVnd];

    if (missingPrice) {
      if (totalFields.some((value) => value !== null)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subtotalVnd"],
          message: "cart totals must remain null while any POS price is missing",
        });
      }
      if (cart.checkoutEligibility !== "BLOCKED_MISSING_PRICE") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["checkoutEligibility"],
          message: "missing POS price must block checkout",
        });
      }
    } else {
      const expectedSubtotal = cart.lines.reduce(
        (sum, line) => sum + line.lineTotalVnd!,
        0,
      );
      const expectedDiscount = cart.adjustments.reduce(
        (sum, adjustment) => sum + adjustment.amountVnd,
        0,
      );

      if (cart.subtotalVnd !== expectedSubtotal) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["subtotalVnd"],
          message: "subtotalVnd must equal the sum of line totals",
        });
      }
      if (cart.discountTotalVnd !== expectedDiscount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["discountTotalVnd"],
          message: "discountTotalVnd must equal authorized adjustments",
        });
      }

      if (cart.shippingFeeVnd === null) {
        if (cart.grandTotalVnd !== null) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["grandTotalVnd"],
            message: "grand total requires a known shipping fee",
          });
        }
        if (cart.checkoutEligibility !== "BLOCKED_MISSING_SHIPPING_FEE") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["checkoutEligibility"],
            message: "unknown shipping fee must block checkout",
          });
        }
      } else {
        if (cart.checkoutEligibility === "BLOCKED_MISSING_SHIPPING_FEE") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["checkoutEligibility"],
            message: "known shipping fee cannot use BLOCKED_MISSING_SHIPPING_FEE",
          });
        }
        const beforeDiscount = expectedSubtotal + cart.shippingFeeVnd;
        if (expectedDiscount > beforeDiscount) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["discountTotalVnd"],
            message: "discounts must not exceed merchandise plus shipping",
          });
        }
        if (cart.grandTotalVnd !== Math.max(0, beforeDiscount - expectedDiscount)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["grandTotalVnd"],
            message: "grandTotalVnd is inconsistent with subtotal, shipping and adjustments",
          });
        }
      }
    }

    if (
      (cart.status === "READY_FOR_CONFIRMATION" || cart.status === "CONFIRMED") &&
      cart.checkoutEligibility !== "ELIGIBLE"
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["status"],
        message: "a cart cannot be ready or confirmed while checkout is blocked",
      });
    }

    if (Date.parse(cart.updatedAt) < Date.parse(cart.createdAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["updatedAt"],
        message: "updatedAt must not be earlier than createdAt",
      });
    }
  });
export type CartV1 = z.infer<typeof CartV1Schema>;
