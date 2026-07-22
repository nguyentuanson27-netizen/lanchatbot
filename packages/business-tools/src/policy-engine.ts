import {
  PRICE_INVENTORY_FRESH_FOR_SECONDS,
  PolicyBundleV1Schema,
  type PolicyBundleV1,
  type ProductOfferKindV2,
} from "@lana/contracts";
import { z } from "zod";

export type ClosingCustomerState = "READY" | "HESITANT" | "CAUTIOUS";
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1_000;

const PosPriceEvidenceSchema = z
  .object({
    authority: z.literal("PANCAKE_POS"),
    shopId: z.string().trim().min(1).max(128),
    parentProductId: z.string().trim().min(1).max(128),
    offerKind: z.enum(["DIRECT", "SET", "COMPONENT", "COMBO_3"]),
    sourceVersion: z.string().trim().min(1).max(128),
    observedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
    freshForSeconds: z.literal(PRICE_INVENTORY_FRESH_FOR_SECONDS),
    unitPriceVnd: z.number().int().nonnegative().nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.expiresAt) - Date.parse(value.observedAt) !== PRICE_INVENTORY_FRESH_FOR_SECONDS * 1_000) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["expiresAt"], message: "POS price evidence must use the 48-hour freshness window" });
    }
  });
export type PosPriceEvidence = z.infer<typeof PosPriceEvidenceSchema>;

const PolicyCartLineInputSchema = z.object({
  lineId: z.string().trim().min(1).max(128),
  shopId: z.string().trim().min(1).max(128),
  parentProductId: z.string().trim().min(1).max(128),
  offerKind: z.enum(["DIRECT", "SET", "COMPONENT", "COMBO_3"]),
  quantity: z.number().int().positive().max(100),
  priceEvidence: PosPriceEvidenceSchema,
}).strict();
export interface PolicyCartLineInput {
  readonly lineId: string;
  readonly shopId: string;
  readonly parentProductId: string;
  readonly offerKind: ProductOfferKindV2;
  readonly quantity: number;
  readonly priceEvidence: PosPriceEvidence;
}

const ClosingEvidenceSchema = z.object({
  previousState: z.enum(["READY", "HESITANT", "CAUTIOUS"]).nullable(),
  purchaseReady: z.boolean(),
  priceObjectionCount: z.number().int().nonnegative().max(100),
  secondConcessionAlreadyApplied: z.boolean(),
}).strict();
export type ClosingEvidence = z.infer<typeof ClosingEvidenceSchema>;

export interface ShopPolicyEvaluationInput {
  readonly policy: PolicyBundleV1;
  readonly lines: readonly PolicyCartLineInput[];
  /** Raw structured evidence; the engine derives the state and callers cannot select CAUTIOUS directly. */
  readonly closingEvidence: ClosingEvidence;
  readonly now: Date;
}

export interface AuthorizedPolicyAdjustment {
  readonly ruleId:
    | "SHOP_WIDE_MULTI_ITEM_PERCENT"
    | "SHOP_WIDE_SECOND_FREE_SHIPPING"
    | "SHOP_WIDE_FINAL_FREE_SHIPPING"
    | "SHOP_WIDE_FINAL_FIXED_DISCOUNT";
  readonly kind: "PERCENT_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_SHIPPING";
  readonly amountVnd: number;
  readonly percentageBps: number | null;
}

export type ShopPolicyEvaluation =
  | {
      readonly status: "AUTHORIZED";
      readonly policyBundleId: string;
      readonly policyVersion: string;
      readonly customerState: ClosingCustomerState;
      readonly parentProductUnitCount: number;
      readonly subtotalVnd: number;
      readonly shippingFeeVnd: number;
      readonly adjustments: readonly AuthorizedPolicyAdjustment[];
      readonly discountTotalVnd: number;
      readonly grandTotalVnd: number;
    }
  | {
      readonly status: "BLOCKED";
      readonly reasonCode:
        | "POLICY_NOT_ACTIVE"
        | "POLICY_NOT_EFFECTIVE"
        | "POLICY_EXPIRED"
        | "CART_EMPTY"
        | "CART_LINE_INVALID"
        | "DUPLICATE_LINE_ID"
        | "PRICE_EVIDENCE_IDENTITY_MISMATCH"
        | "POS_PRICE_STALE"
        | "POS_PRICE_FROM_FUTURE"
        | "POS_PRICE_MISSING"
        | "CLOSING_TRANSITION_NOT_ALLOWED"
        | "CART_TOTAL_UNSAFE";
      readonly canQuotePrice: false;
    };

function blocked(reasonCode: Extract<ShopPolicyEvaluation, { status: "BLOCKED" }>["reasonCode"]): ShopPolicyEvaluation {
  return { status: "BLOCKED", reasonCode, canQuotePrice: false };
}

function sameId(left: string, right: string): boolean {
  return left.trim().normalize("NFC").toUpperCase() === right.trim().normalize("NFC").toUpperCase();
}

export function deriveClosingCustomerState(rawEvidence: unknown): ClosingCustomerState | null {
  const parsed = ClosingEvidenceSchema.safeParse(rawEvidence);
  if (!parsed.success) return null;
  const evidence = parsed.data;
  if (evidence.purchaseReady) return "READY";
  if (evidence.priceObjectionCount >= 2 && evidence.secondConcessionAlreadyApplied) {
    return evidence.previousState === "HESITANT" || evidence.previousState === "CAUTIOUS" ? "CAUTIOUS" : null;
  }
  if (evidence.priceObjectionCount >= 1 && !evidence.secondConcessionAlreadyApplied) {
    return evidence.previousState === null || evidence.previousState === "READY" || evidence.previousState === "HESITANT"
      ? "HESITANT"
      : null;
  }
  return evidence.previousState === null || evidence.previousState === "READY" ? "READY" : null;
}

/** Deterministic shop-wide policy; only fresh, identity-bound POS evidence can enter totals. */
export function evaluateShopPolicy(input: ShopPolicyEvaluationInput): ShopPolicyEvaluation {
  const policy = PolicyBundleV1Schema.parse(input.policy);
  if (policy.status !== "ACTIVE") return blocked("POLICY_NOT_ACTIVE");
  if (input.now.getTime() < Date.parse(policy.effectiveAt)) return blocked("POLICY_NOT_EFFECTIVE");
  if (policy.effectiveUntil !== null && input.now.getTime() >= Date.parse(policy.effectiveUntil)) return blocked("POLICY_EXPIRED");
  if (input.lines.length === 0) return blocked("CART_EMPTY");

  const customerState = deriveClosingCustomerState(input.closingEvidence);
  if (customerState === null || !policy.closing.customerStates.includes(customerState)) {
    return blocked("CLOSING_TRANSITION_NOT_ALLOWED");
  }

  const parsedLines = input.lines.map((line) => PolicyCartLineInputSchema.safeParse(line));
  if (parsedLines.some((result) => !result.success)) return blocked("CART_LINE_INVALID");
  const lines = parsedLines.map((result) => {
    if (!result.success) throw new Error("unreachable");
    return result.data;
  });
  if (new Set(lines.map(({ lineId }) => lineId)).size !== lines.length) return blocked("DUPLICATE_LINE_ID");

  let parentProductUnitCount = 0;
  let subtotalVnd = 0;
  for (const line of lines) {
    const evidence = line.priceEvidence;
    if (
      !sameId(line.shopId, policy.shopId) ||
      !sameId(evidence.shopId, line.shopId) ||
      !sameId(evidence.parentProductId, line.parentProductId) ||
      evidence.offerKind !== line.offerKind
    ) return blocked("PRICE_EVIDENCE_IDENTITY_MISMATCH");
    if (Date.parse(evidence.observedAt) > input.now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS) return blocked("POS_PRICE_FROM_FUTURE");
    if (Date.parse(evidence.expiresAt) <= input.now.getTime()) return blocked("POS_PRICE_STALE");
    if (evidence.unitPriceVnd === null) return blocked("POS_PRICE_MISSING");
    const nextCount = parentProductUnitCount + line.quantity;
    const lineTotal = evidence.unitPriceVnd * line.quantity;
    const nextSubtotal = subtotalVnd + lineTotal;
    if (![nextCount, lineTotal, nextSubtotal].every(Number.isSafeInteger)) return blocked("CART_TOTAL_UNSAFE");
    parentProductUnitCount = nextCount;
    subtotalVnd = nextSubtotal;
  }

  const adjustments: AuthorizedPolicyAdjustment[] = [];
  const multiItemEligible = parentProductUnitCount >= policy.multiItemOffer.minimumProductCount;
  if (multiItemEligible) {
    adjustments.push({
      ruleId: "SHOP_WIDE_MULTI_ITEM_PERCENT",
      kind: "PERCENT_DISCOUNT",
      amountVnd: Math.floor((subtotalVnd * policy.multiItemOffer.discountBps) / 10_000),
      percentageBps: policy.multiItemOffer.discountBps,
    });
  }

  const shippingFeeVnd = policy.shipping.defaultFeeVnd;
  if (customerState === "HESITANT") {
    adjustments.push({
      ruleId: "SHOP_WIDE_SECOND_FREE_SHIPPING",
      kind: "FREE_SHIPPING",
      amountVnd: shippingFeeVnd,
      percentageBps: null,
    });
  } else if (customerState === "CAUTIOUS") {
    adjustments.push(
      { ruleId: "SHOP_WIDE_FINAL_FREE_SHIPPING", kind: "FREE_SHIPPING", amountVnd: shippingFeeVnd, percentageBps: null },
      { ruleId: "SHOP_WIDE_FINAL_FIXED_DISCOUNT", kind: "FIXED_DISCOUNT", amountVnd: policy.negotiation.finalConcession.fixedDiscountVnd, percentageBps: null },
    );
  }

  const discountTotalVnd = adjustments.reduce((sum, adjustment) => sum + adjustment.amountVnd, 0);
  return {
    status: "AUTHORIZED",
    policyBundleId: policy.policyBundleId,
    policyVersion: policy.policyVersion,
    customerState,
    parentProductUnitCount,
    subtotalVnd,
    shippingFeeVnd,
    adjustments,
    discountTotalVnd,
    grandTotalVnd: Math.max(0, subtotalVnd + shippingFeeVnd - discountTotalVnd),
  };
}
