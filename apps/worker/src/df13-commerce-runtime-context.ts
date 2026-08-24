import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import {
  ProductBindingV2Schema,
  deriveConversationBarriersV2,
  deriveConversationPhaseV2,
  type ProductBindingV2,
  type SalesCycleStageV1,
} from "@lana/contracts";

export type CommerceStrategyStage =
  | "DISCOVERY"
  | "PRODUCT_MATCHED"
  | "FIT_CONSULTING"
  | "READY_TO_BUY"
  | "ORDER_REVIEW"
  | "POST_SALE";

export interface Df13CommerceRuntimeContext {
  readonly contractVersion: "DF13_COMMERCE_RUNTIME_CONTEXT_V1";
  /** This projection is the input for the COMMERCE authority path only. */
  readonly authority: "COMMERCE";
  readonly commerce: Readonly<{
    revision: number;
    stage: SalesCycleStageV1;
    hasCart: boolean;
    hasPreview: boolean;
    hasConfirmation: boolean;
    clarificationActive: boolean;
  }>;
  /**
   * A live projection of Context V2's deterministic phase/barrier content.
   * The historical Gate-E capture schema remains immutable; this wrapper is
   * deliberately outside that candidate and contains no legacy stage field.
   */
  readonly contextV2: Readonly<{
    phase:
      | "DISCOVERY"
      | "PRODUCT_EVALUATION"
      | "FIT_CONSULTATION"
      | "CART_ACTIVE"
      | "ORDER_REVIEW"
      | "ORDER_CONFIRMED";
    sourceStage: SalesCycleStageV1;
    barriers: readonly (
      | "PRODUCT_CONTEXT_UNREADY"
      | "VERIFIED_CLAIMS_UNREADY"
      | "MEASUREMENTS_REQUIRED"
      | "CART_STATE_UNREADY"
      | "CHECKOUT_DETAILS_REQUIRED"
      | "EFFECT_READINESS_BLOCKED"
    )[];
    productBinding: ProductBindingV2;
    conversationRevision: number;
  }>;
}

export interface BuildDf13CommerceRuntimeContextInput {
  readonly commerceState: Pick<
    SalesCycleRuntimeState,
    "revision" | "stage" | "cart" | "preview" | "confirmation" | "clarification"
  >;
  readonly productBinding: ProductBindingV2;
  readonly conversationRevision: number;
  readonly readiness: Readonly<{
    outcome: "NOT_EVALUATED" | "READY" | "BLOCKED";
    reasonCodes: readonly string[];
  }>;
}

/**
 * Maps only the canonical Commerce lifecycle into the existing strategy
 * consumer's stable vocabulary. It is intentionally not a conversion from
 * `ConversationState.salesStage` and therefore cannot re-promote the regex
 * writer on the COMMERCE path.
 */
export function commerceStrategyStage(stage: SalesCycleStageV1): CommerceStrategyStage {
  switch (stage) {
    case "DISCOVERY":
      return "DISCOVERY";
    case "FACTS_PRESENTED":
      return "PRODUCT_MATCHED";
    case "MEASUREMENTS_REQUIRED":
    case "SIZE_RECOMMENDED":
      return "FIT_CONSULTING";
    case "CART_OPEN":
      return "READY_TO_BUY";
    case "ORDER_PREVIEW":
      return "ORDER_REVIEW";
    case "PURCHASE_CONFIRMED":
    case "HANDED_OFF":
      return "POST_SALE";
  }
}

/**
 * Re-derives every Commerce-dependent view from one canonical state snapshot.
 * A disagreement between lifecycle stage and durable artifacts is rejected by
 * the phase contract before a strategy, CTA, reconciliation or side-effect
 * plan can be derived.
 */
export function buildDf13CommerceRuntimeContext(
  input: BuildDf13CommerceRuntimeContextInput,
): Df13CommerceRuntimeContext {
  const productBinding = ProductBindingV2Schema.parse(input.productBinding);
  const state = input.commerceState;
  const hasCart = state.cart !== null;
  const hasPreview = state.preview !== null;
  const hasConfirmation = state.confirmation !== null;
  const clarificationActive = state.clarification !== null && state.clarification !== undefined;
  const phase = deriveConversationPhaseV2({
    commerceStage: state.stage,
    salesCycleRevision: state.revision,
    hasCart,
    hasPreview,
    hasConfirmation,
  });
  const barriers = deriveConversationBarriersV2({
    productScope: productBinding.status,
    commerceStage: state.stage,
    hasCart,
    hasActiveClarification: clarificationActive,
    readiness: input.readiness,
    conversationRevision: input.conversationRevision,
    salesCycleRevision: state.revision,
  });
  return Object.freeze({
    contractVersion: "DF13_COMMERCE_RUNTIME_CONTEXT_V1" as const,
    authority: "COMMERCE" as const,
    commerce: Object.freeze({
      revision: state.revision,
      stage: state.stage,
      hasCart,
      hasPreview,
      hasConfirmation,
      clarificationActive,
    }),
    contextV2: Object.freeze({
      phase: phase.phase,
      sourceStage: phase.sourceStage,
      barriers: Object.freeze([...barriers.active]),
      productBinding,
      conversationRevision: input.conversationRevision,
    }),
  });
}
