import { createHash } from "node:crypto";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type { LatestContextV2ForCommerce } from "@lana/database";
import {
  ProductBindingV2Schema,
  canonicalJsonV1,
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

export interface Df13CommerceContextV2ReadPort {
  readLatestContextV2ForCommerce(
    conversationId: string,
    now: Date,
    maximumAgeMs: number,
  ): Promise<LatestContextV2ForCommerce>;
}

export type Df13CommerceRuntimeContextLoadResult =
  | Readonly<{
    status: "READY";
    context: Df13CommerceRuntimeContext;
    /** Exact fresh Context V2 input identity retained for audit/readback. */
    sourceContextHash: string;
  }>
  | Readonly<{ status: "BLOCKED"; reasonCode: string }>;

/** The sole system-message payload for a live COMMERCE model call. */
export function serializeDf13CommerceAuthorityModelState(input: Readonly<{
  context: Df13CommerceRuntimeContext;
  sourceContextHash: string;
  /** Already minimized by the caller; customer identifiers never belong here. */
  customerProfile: unknown;
}>) {
  if (!/^[a-f0-9]{64}$/u.test(input.sourceContextHash)) {
    throw new Error("DF13_COMMERCE_CONTEXT_HASH_INVALID");
  }
  return Object.freeze({
    type: "DF13_COMMERCE_RUNTIME_CONTEXT_V1" as const,
    authority: "COMMERCE" as const,
    context: input.context,
    sourceContextHash: input.sourceContextHash,
    customerProfile: input.customerProfile,
  });
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

function matchesCurrentCommerceSnapshot(
  context: import("@lana/contracts").ContextV2,
  state: BuildDf13CommerceRuntimeContextInput["commerceState"],
  conversationRevision: number,
): boolean {
  return context.phase.sourceStage === state.stage &&
    context.phase.salesCycleRevision === state.revision &&
    context.barriers.salesCycleRevision === state.revision &&
    context.barriers.conversationRevision === conversationRevision &&
    context.finalTurnEvidence.finalSalesCycleRevision === state.revision &&
    context.finalTurnEvidence.finalConversationRevision === conversationRevision;
}

function pristineCommerceDiscovery(
  state: BuildDf13CommerceRuntimeContextInput["commerceState"],
): boolean {
  return state.revision === 0 &&
    state.stage === "DISCOVERY" &&
    state.cart === null &&
    state.preview === null &&
    state.confirmation === null &&
    (state.clarification === null || state.clarification === undefined);
}

function bootstrapCommerceDiscoveryContext(input: Readonly<{
  conversationId: string;
  commerceState: BuildDf13CommerceRuntimeContextInput["commerceState"];
  conversationRevision: number;
}>): Df13CommerceRuntimeContextLoadResult {
  if (input.conversationRevision !== 0) {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_COMMERCE_CONTEXT_BOOTSTRAP_NOT_NEW_CONVERSATION",
    });
  }
  if (!pristineCommerceDiscovery(input.commerceState)) {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_COMMERCE_CONTEXT_BOOTSTRAP_NOT_PRISTINE",
    });
  }
  try {
    const context = buildDf13CommerceRuntimeContext({
      commerceState: input.commerceState,
      productBinding: {
        schemaVersion: 2,
        contractVersion: "PRODUCT_BINDING_V2",
        status: "NOT_REQUIRED",
        productIds: [],
        catalogVersion: "df13-commerce-bootstrap-v1",
      },
      conversationRevision: input.conversationRevision,
      readiness: { outcome: "NOT_EVALUATED", reasonCodes: [] },
    });
    const sourceContextHash = createHash("sha256")
      .update(canonicalJsonV1({
        contractVersion: "DF13_COMMERCE_RUNTIME_BOOTSTRAP_V1",
        conversationId: input.conversationId,
        commerce: context.commerce,
        contextV2: context.contextV2,
      }), "utf8")
      .digest("hex");
    return Object.freeze({ status: "READY" as const, context, sourceContextHash });
  } catch {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_COMMERCE_CONTEXT_BOOTSTRAP_INVALID",
    });
  }
}

/**
 * Reads the only admissible Context V2 snapshot for a COMMERCE turn. The
 * supplied reader already verifies capture integrity and expiry; this boundary
 * additionally proves the snapshot describes the exact currently locked
 * Commerce/conversation revisions. It never substitutes ConversationState.
 */
export async function loadDf13CommerceRuntimeContext(input: Readonly<{
  runtime: Df13CommerceContextV2ReadPort;
  conversationId: string;
  commerceState: BuildDf13CommerceRuntimeContextInput["commerceState"];
  conversationRevision: number;
  now: Date;
  maximumAgeMs: number;
}>): Promise<Df13CommerceRuntimeContextLoadResult> {
  let latest: LatestContextV2ForCommerce;
  try {
    latest = await input.runtime.readLatestContextV2ForCommerce(
      input.conversationId,
      input.now,
      input.maximumAgeMs,
    );
  } catch {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "CONTEXT_V2_RUNTIME_SNAPSHOT_READ_FAILED",
    });
  }
  if (latest.kind === "ABSENT") {
    return bootstrapCommerceDiscoveryContext(input);
  }
  if (latest.kind !== "READY") {
    return Object.freeze({ status: "BLOCKED" as const, reasonCode: latest.reasonCode });
  }
  if (!matchesCurrentCommerceSnapshot(
    latest.context,
    input.commerceState,
    input.conversationRevision,
  )) {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_COMMERCE_CONTEXT_REVISION_MISMATCH",
    });
  }
  const readiness = latest.context.cartReadiness === null
    ? { outcome: "NOT_EVALUATED" as const, reasonCodes: [] }
    : { outcome: "READY" as const, reasonCodes: [] };
  try {
    return Object.freeze({
      status: "READY" as const,
      context: buildDf13CommerceRuntimeContext({
        commerceState: input.commerceState,
        productBinding: latest.context.productBinding,
        conversationRevision: input.conversationRevision,
        readiness,
      }),
      sourceContextHash: latest.context.contextHash,
    });
  } catch {
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: "DF13_COMMERCE_CONTEXT_INVALID",
    });
  }
}
