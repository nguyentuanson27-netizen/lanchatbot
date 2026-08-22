import {
  deriveConversationPhaseV2,
  type ConversationPhaseV2Value,
  type ProductBindingV2,
  type SalesCycleStageV1,
} from "@lana/contracts";
import type { SalesStage } from "@lana/conversation-engine";

type CommerceProductScope =
  | { readonly kind: "NONE" }
  | { readonly kind: "UNAVAILABLE" }
  | { readonly kind: "SINGLE"; readonly productId: string }
  | { readonly kind: "AMBIGUOUS" };

type CartProductScope =
  | { readonly kind: "ABSENT" }
  | { readonly kind: "EMPTY" }
  | { readonly kind: "SINGLE"; readonly productId: string }
  | { readonly kind: "AMBIGUOUS" };

export interface CommerceAuthorityCandidate {
  readonly pageId: string;
  readonly conversationId: string;
  readonly revision: number;
  readonly stage: SalesCycleStageV1;
  /**
   * Canonical product scope from ProductBindingV2. Unavailable and ambiguous
   * bindings remain explicit so incomplete state cannot turn into a false match.
   */
  readonly productScope: CommerceProductScope;
  /** Cart lines are retained as separate comparison evidence, not product authority. */
  readonly cartProductScope: CartProductScope;
  /** Presence-only artifacts; no preview, confirmation, or recipient content is projected. */
  readonly artifacts: {
    readonly hasCart: boolean;
    readonly hasOrderPreview: boolean;
    readonly hasPurchaseConfirmation: boolean;
  };
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
  readonly hasOrderPreview: boolean;
  readonly hasPurchaseConfirmation: boolean;
  /** Canonical pre-cart product authority; callers must provide the parsed contract. */
  readonly productBinding: ProductBindingV2;
}

type AuthorityPhase = ConversationPhaseV2Value;

type ComparisonDifference =
  | "COMMERCE_STATE_UNAVAILABLE"
  | "COMMERCE_SCOPE_MISMATCH"
  | "LEGACY_PHASE_UNCOMPARABLE"
  | "COMMERCE_PHASE_UNAVAILABLE"
  | "PHASE_MISMATCH"
  | "PRODUCT_SCOPE_UNAVAILABLE"
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

/**
 * Legacy ownership is intentionally not a phase input: HUMAN may be a
 * temporary HUMAN_ECHO, while canonical commerce records handoff separately.
 */
function legacyPhase(stage: SalesStage): AuthorityPhase | null {
  switch (stage) {
    case "DISCOVERY":
      return "DISCOVERY";
    case "PRODUCT_MATCHED":
      return "PRODUCT_EVALUATION";
    case "FIT_CONSULTING":
      return "FIT_CONSULTATION";
    case "OBJECTION_HANDLING":
      return null;
    case "READY_TO_BUY":
      return "CART_ACTIVE";
    case "ORDER_REVIEW":
      return "ORDER_REVIEW";
    case "POST_SALE":
      return null;
  }
}

/** Uses the existing canonical phase contract; handoff retains its artifact-derived phase. */
function commercePhase(candidate: CommerceAuthorityCandidate): AuthorityPhase | null {
  try {
    const { hasCart, hasOrderPreview, hasPurchaseConfirmation } = candidate.artifacts;
    return deriveConversationPhaseV2({
      commerceStage: candidate.stage,
      salesCycleRevision: candidate.revision,
      hasCart,
      hasPreview: hasOrderPreview,
      hasConfirmation: hasPurchaseConfirmation,
    }).phase;
  } catch {
    return null;
  }
}

function legacyProductScope(productId: string | null): CommerceAuthorityCandidate["productScope"] {
  return productId === null ? { kind: "NONE" } : { kind: "SINGLE", productId };
}

function productScopesMatch(
  legacy: CommerceAuthorityCandidate["productScope"],
  commerce: CommerceAuthorityCandidate["productScope"],
): boolean {
  return legacy.kind === commerce.kind &&
    (legacy.kind !== "SINGLE" || commerce.kind === "SINGLE" && legacy.productId === commerce.productId);
}

function productScopeFromCanonicalBinding(
  binding: ProductBindingV2,
): CommerceProductScope {
  if (binding.status === "NOT_REQUIRED") return { kind: "NONE" };
  if (binding.status === "RESOLVED" && binding.productIds.length === 1) {
    return { kind: "SINGLE", productId: binding.productIds[0]! };
  }
  if (binding.status === "AMBIGUOUS") return { kind: "AMBIGUOUS" };
  return { kind: "UNAVAILABLE" };
}

function cartProductScope(
  cart: CommerceAuthorityStateProjectionInput["cart"],
): CartProductScope {
  if (cart === null) return { kind: "ABSENT" };
  const productIds = [...new Set(cart.value.lines.map(({ parentProductId }) => parentProductId))];
  if (productIds.length === 0) return { kind: "EMPTY" };
  if (productIds.length === 1) return { kind: "SINGLE", productId: productIds[0]! };
  return { kind: "AMBIGUOUS" };
}

/**
 * Produces the PII-safe comparison projection from canonical commerce state.
 * It never normalizes IDs: a caller must supply canonical identifiers already.
 */
export function projectCommerceAuthorityCandidate(
  state: CommerceAuthorityStateProjectionInput,
): CommerceAuthorityCandidate {
  return {
    pageId: state.routing.pageId,
    conversationId: state.routing.conversationId,
    revision: state.revision,
    stage: state.stage,
    productScope: productScopeFromCanonicalBinding(state.productBinding),
    cartProductScope: cartProductScope(state.cart),
    artifacts: {
      hasCart: state.cart !== null,
      hasOrderPreview: state.hasOrderPreview,
      hasPurchaseConfirmation: state.hasPurchaseConfirmation,
    },
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
  const legacyPhaseValue = legacyPhase(input.legacy.stage);
  const commercePhaseValue = commercePhase(input.commerce);
  if (legacyPhaseValue === null) {
    differences.push("LEGACY_PHASE_UNCOMPARABLE");
  } else if (commercePhaseValue === null) {
    differences.push("COMMERCE_PHASE_UNAVAILABLE");
  } else if (legacyPhaseValue !== commercePhaseValue) {
    differences.push("PHASE_MISMATCH");
  }
  const legacyProductScopeValue = legacyProductScope(input.legacy.productId);
  if (
    input.commerce.productScope.kind === "UNAVAILABLE" ||
    input.commerce.productScope.kind === "AMBIGUOUS"
  ) {
    differences.push("PRODUCT_SCOPE_UNAVAILABLE");
  } else if (!productScopesMatch(legacyProductScopeValue, input.commerce.productScope)) {
    differences.push("PRODUCT_SCOPE_MISMATCH");
  }

  return {
    ...base,
    status: differences.length === 0 ? "MATCH" : "MISMATCH",
    differences,
  };
}
