import { z } from "zod";
import { SalesCycleStageV1Schema } from "../v3/sales-cycle.js";

export const CheckoutRecipientFieldV1Schema = z.enum([
  "FULL_NAME",
  "PHONE",
  "ADDRESS",
]);
export type CheckoutRecipientFieldV1 = z.infer<
  typeof CheckoutRecipientFieldV1Schema
>;

const CHECKOUT_RECIPIENT_FIELD_ORDER: readonly CheckoutRecipientFieldV1[] = [
  "FULL_NAME",
  "PHONE",
  "ADDRESS",
];

export const CanonicalCheckoutCompletenessV1Schema = z.object({
  schemaVersion: z.literal(1),
  contractVersion: z.literal("CANONICAL_CHECKOUT_COMPLETENESS_V1"),
  state: z.enum(["REQUIRED", "COMPLETE"]),
  missingFields: z.array(CheckoutRecipientFieldV1Schema).max(3),
  source: z.literal("CANONICAL_COMMERCE_STATE_V1"),
  salesCycleRevision: z.number().int().nonnegative(),
  authority: z.literal("SHADOW_ONLY"),
  authorization: z.literal("NONE"),
}).strict().superRefine((value, context) => {
  const canonicalMissingFields = CHECKOUT_RECIPIENT_FIELD_ORDER.filter((field) =>
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
  readonly recipientFields: Readonly<{
    fullNamePresent: boolean;
    phonePresent: boolean;
    addressPresent: boolean;
  }>;
  readonly salesCycleRevision: number;
}

/**
 * PII-free projection of checkout readiness from canonical commerce state.
 * An authoritative order preview proves that its validated recipient payload
 * already exists; earlier cart state exposes only which fields remain absent.
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

  const missingFields: CheckoutRecipientFieldV1[] = input.hasPreview
    ? []
    : [
        input.recipientFields.fullNamePresent ? null : "FULL_NAME",
        input.recipientFields.phonePresent ? null : "PHONE",
        input.recipientFields.addressPresent ? null : "ADDRESS",
      ].filter((field): field is CheckoutRecipientFieldV1 => field !== null);

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
