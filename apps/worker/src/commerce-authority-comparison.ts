import type { SalesCycleStageV1 } from "@lana/contracts";
import type { SalesStage } from "@lana/conversation-engine";

export interface CommerceAuthorityCandidate {
  readonly pageId: string;
  readonly conversationId: string;
  readonly revision: number;
  readonly stage: SalesCycleStageV1;
  /** Null when the canonical commerce state does not have one unambiguous cart product. */
  readonly productId: string | null;
}

/** The only commerce-state fields that are eligible for comparison telemetry. */
export interface CommerceAuthorityStateProjectionInput {
  readonly routing: {
    readonly pageId: string;
    readonly conversationId: string;
  };
  readonly revision: number;
  readonly stage: SalesCycleStageV1;
  readonly cart: {
    readonly value: {
      readonly lines: readonly { readonly parentProductId: string }[];
    };
  } | null;
}

type AuthorityPhase =
  | "DISCOVERY"
  | "PRODUCT_CONTEXT"
  | "READY_TO_BUY"
  | "ORDER_REVIEW"
  | "PURCHASE_CONFIRMED"
  | "HANDED_OFF";

type ComparisonDifference =
  | "COMMERCE_STATE_UNAVAILABLE"
  | "COMMERCE_SCOPE_MISMATCH"
  | "PHASE_MISMATCH"
  | "PRODUCT_SCOPE_MISMATCH";

export interface CommerceAuthorityComparison {
  readonly contractVersion: "COMMERCE_AUTHORITY_COMPARISON_V1";
  readonly status:
    | "DISABLED"
    | "MATCH"
    | "MISMATCH"
    | "COMMERCE_STATE_UNAVAILABLE";
  /** Comparison does not select authority: customer-visible behavior remains LEGACY. */
  readonly activeAuthority: "LEGACY";
  readonly candidateAuthority: "COMMERCE";
  /** No message, state, tag, order, or other action can be derived from this result. */
  readonly sideEffects: "DISABLED";
  readonly differences: readonly ComparisonDifference[];
}

export interface CompareCommerceAuthorityInput {
  /** Defaults to false. Enabling comparison remains non-authoritative and side-effect-free. */
  readonly enabled?: boolean;
  readonly legacy: {
    readonly pageId: string;
    readonly conversationId: string;
    readonly owner: "BOT" | "HUMAN";
    readonly stage: SalesStage;
    readonly productId: string | null;
  };
  readonly commerce: CommerceAuthorityCandidate | null;
}

function legacyPhase(input: CompareCommerceAuthorityInput["legacy"]): AuthorityPhase {
  if (input.owner === "HUMAN") return "HANDED_OFF";
  switch (input.stage) {
    case "DISCOVERY":
      return "DISCOVERY";
    case "PRODUCT_MATCHED":
    case "FIT_CONSULTING":
    case "OBJECTION_HANDLING":
      return "PRODUCT_CONTEXT";
    case "READY_TO_BUY":
      return "READY_TO_BUY";
    case "ORDER_REVIEW":
      return "ORDER_REVIEW";
    case "POST_SALE":
      return "HANDED_OFF";
  }
}

function commercePhase(stage: SalesCycleStageV1): AuthorityPhase {
  switch (stage) {
    case "DISCOVERY":
      return "DISCOVERY";
    case "FACTS_PRESENTED":
    case "MEASUREMENTS_REQUIRED":
    case "SIZE_RECOMMENDED":
      return "PRODUCT_CONTEXT";
    case "CART_OPEN":
      return "READY_TO_BUY";
    case "ORDER_PREVIEW":
      return "ORDER_REVIEW";
    case "PURCHASE_CONFIRMED":
      return "PURCHASE_CONFIRMED";
    case "HANDED_OFF":
      return "HANDED_OFF";
  }
}

/**
 * Produces the PII-safe comparison projection from canonical commerce state.
 * It never normalizes IDs: a caller must supply canonical identifiers already.
 */
export function projectCommerceAuthorityCandidate(
  state: CommerceAuthorityStateProjectionInput,
): CommerceAuthorityCandidate {
  const productIds = [...new Set(
    (state.cart?.value.lines ?? []).map(({ parentProductId }) => parentProductId),
  )];
  return {
    pageId: state.routing.pageId,
    conversationId: state.routing.conversationId,
    revision: state.revision,
    stage: state.stage,
    productId: productIds.length === 1 ? productIds[0]! : null,
  };
}

/**
 * DF11 comparison-only boundary. Its output is evidence for later review; it
 * cannot be used to choose an authority or to authorize any side effect.
 */
export function compareCommerceAuthority(
  input: CompareCommerceAuthorityInput,
): CommerceAuthorityComparison {
  const base = {
    contractVersion: "COMMERCE_AUTHORITY_COMPARISON_V1" as const,
    activeAuthority: "LEGACY" as const,
    candidateAuthority: "COMMERCE" as const,
    sideEffects: "DISABLED" as const,
  };
  if (input.enabled !== true) {
    return { ...base, status: "DISABLED", differences: [] };
  }
  if (input.commerce === null) {
    return {
      ...base,
      status: "COMMERCE_STATE_UNAVAILABLE",
      differences: ["COMMERCE_STATE_UNAVAILABLE"],
    };
  }

  const differences: ComparisonDifference[] = [];
  if (
    input.legacy.pageId !== input.commerce.pageId ||
    input.legacy.conversationId !== input.commerce.conversationId
  ) differences.push("COMMERCE_SCOPE_MISMATCH");
  if (legacyPhase(input.legacy) !== commercePhase(input.commerce.stage)) {
    differences.push("PHASE_MISMATCH");
  }
  if (
    input.legacy.productId !== null &&
    input.commerce.productId !== null &&
    input.legacy.productId !== input.commerce.productId
  ) differences.push("PRODUCT_SCOPE_MISMATCH");

  return {
    ...base,
    status: differences.length === 0 ? "MATCH" : "MISMATCH",
    differences,
  };
}
