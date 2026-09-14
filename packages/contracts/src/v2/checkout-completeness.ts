import { z } from "zod";
import { SalesCycleStageV1Schema } from "../v3/sales-cycle.js";

export const CheckoutRequiredFieldV1Schema = z.enum([
  "FULL_NAME",
  "PHONE",
  "ADDRESS",
  "PAYMENT_METHOD",
]);
export type CheckoutRequiredFieldV1 = z.infer<
  typeof CheckoutRequiredFieldV1Schema
>;

const CHECKOUT_REQUIRED_FIELD_ORDER: readonly CheckoutRequiredFieldV1[] = [
  "FULL_NAME",
  "PHONE",
  "ADDRESS",
  "PAYMENT_METHOD",
];

export const CanonicalCheckoutCompletenessV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CANONICAL_CHECKOUT_COMPLETENESS_V1"),
  state: z.enum(["REQUIRED", "COMPLETE"]),
  missingFields: z.array(CheckoutRequiredFieldV1Schema).max(4),
  source: z.literal("CANONICAL_COMMERCE_STATE_V1"),
  salesCycleRevision: z.number().int().nonnegative(),
  authority: z.literal("SHADOW_ONLY"),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  const canonicalMissingFields = CHECKOUT_REQUIRED_FIELD_ORDER.filter((field) =>
    value.missingFields.includes(field)
  );
  if (JSON.stringify(canonicalMissingFields) !== JSON.stringify(value.missingFields)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["missingFields"],
      message: "missing checkout fields must be unique and canonically ordered",
    });
  }
  if ((value.state === "COMPLETE") !== (value.missingFields.length === 0)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["state"],
      message: "checkout completeness state must match the missing field set",
    });
  }
});
export type CanonicalCheckoutCompletenessV1 = z.infer<
  typeof CanonicalCheckoutCompletenessV1Schema
>;

export interface DeriveCanonicalCheckoutCompletenessV1Input {
  readonly commerceStage: z.infer<typeof SalesCycleStageV1Schema>;
  readonly hasCart: boolean;
  readonly hasPreview: boolean;
  readonly hasCheckoutDraft: boolean;
  readonly checkoutClarificationActive: boolean;
  readonly checkoutFields: Readonly<{
    fullNamePresent: boolean;
    phonePresent: boolean;
    addressPresent: boolean;
    paymentMethodPresent: boolean;
  }>;
  readonly salesCycleRevision: number;
}

/**
 * PII-free projection of checkout readiness from canonical commerce state.
 * An authoritative order preview proves that its validated checkout payload
 * already exists; earlier cart state exposes only which required fields remain absent.
 */
export function deriveCanonicalCheckoutCompletenessV1(
  input: DeriveCanonicalCheckoutCompletenessV1Input,
): CanonicalCheckoutCompletenessV1 | null {
  if (input.hasPreview && !input.hasCart) {
    throw new Error("CANONICAL_CHECKOUT_COMPLETENESS_V1_STATE_INVALID");
  }
  if ((input.commerceStage === "ORDER_PREVIEW" ||
      input.commerceStage === "PURCHASE_CONFIRMED") && !input.hasPreview) {
    throw new Error("CANONICAL_CHECKOUT_COMPLETENESS_V1_STATE_INVALID");
  }
  if (input.commerceStage === "CART_OPEN" && !input.hasCart) {
    throw new Error("CANONICAL_CHECKOUT_COMPLETENESS_V1_STATE_INVALID");
  }
  if (!input.hasCart || (!input.hasPreview && !input.hasCheckoutDraft &&
      !input.checkoutClarificationActive)) return null;

  const missingFields: CheckoutRequiredFieldV1[] = input.hasPreview
    ? []
    : [
        input.checkoutFields.fullNamePresent ? null : "FULL_NAME",
        input.checkoutFields.phonePresent ? null : "PHONE",
        input.checkoutFields.addressPresent ? null : "ADDRESS",
        input.checkoutFields.paymentMethodPresent ? null : "PAYMENT_METHOD",
      ].filter((field): field is CheckoutRequiredFieldV1 => field !== null);

  return CanonicalCheckoutCompletenessV1Schema.parse({
    schemaVersion: 1,
    contractVersion: "CANONICAL_CHECKOUT_COMPLETENESS_V1",
    state: missingFields.length === 0 ? "COMPLETE" : "REQUIRED",
    missingFields,
    source: "CANONICAL_COMMERCE_STATE_V1",
    salesCycleRevision: input.salesCycleRevision,
    authority: "SHADOW_ONLY",
    authorization: "NONE",
  });
}
