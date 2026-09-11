import { createHash } from "node:crypto";
import {
  CartV1Schema,
  ContextV2CaptureV1Schema,
  ContextV2Schema,
  OrderPreviewV1Schema,
  ProtectedClaimV1Schema,
  PurchaseConfirmationV1Schema,
  canonicalJsonV1,
  type AgentBuyingIntentV1,
  type ContextV2,
  type ProductBindingV2,
  type ProtectedClaimV1,
} from "@lana/contracts";
import {
  buildCanonicalDecisionEvidenceV1,
  hashProtectedClaimSetV1,
  type CanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import { buildContextV2Capture } from "./context-v2.js";

export type TrackCV5ExecutionLane =
  | "BEHAVIOR_SIMULATION"
  | "PRODUCTION_CONTRACT";

export interface TrackCV5RuntimeClaimFixture {
  readonly type: ProtectedClaimV1["type"];
  readonly scope: Readonly<{
    readonly kind: "PRODUCT" | "CART";
    readonly productId?: string;
    readonly variantId?: string;
    readonly cartVersion?: number;
  }>;
  readonly value: Readonly<Record<string, unknown>>;
  readonly source: string;
  readonly freshness: "FRESH" | "EXPIRED";
}

export interface TrackCV5CompactCase {
  readonly id: string;
  readonly latest_customer_message: string;
  readonly context: Readonly<{
    readonly product_binding: Readonly<{
      readonly status: ProductBindingV2["status"];
      readonly product_ids: readonly string[];
    }>;
    readonly phase: string;
    readonly canonical_flags: readonly string[];
    readonly buying_intent: Readonly<{
      readonly decision: "NONE" | "CONSIDERING" | "COMMITTED" | "NEGATED";
      readonly requested_action:
        | "NONE"
        | "OPEN_CART"
        | "ADD_TO_CART"
        | "SET_QUANTITY"
        | "PROCEED_TO_PAYMENT";
      readonly quantity: number | null;
      readonly evidence: string | null;
    }>;
    readonly source_stage: "ORDER_PREVIEW" | "PURCHASE_CONFIRMED" | null;
    readonly runtime_claim_refs: readonly string[];
  }>;
}

export interface TrackCV5MaterializationRecipe {
  readonly evaluation_at: string;
  readonly context_projection: Readonly<{
    readonly catalog_version: string;
    readonly browsing_default: Readonly<{
      readonly phase: "PRODUCT_EVALUATION";
      readonly sourceStage: "FACTS_PRESENTED";
    }>;
    readonly measurement_required: Readonly<{
      readonly phase: "FIT_CONSULTATION";
      readonly sourceStage: "MEASUREMENTS_REQUIRED";
    }>;
    readonly explicit_source_stage: Readonly<Record<
      "ORDER_PREVIEW" | "PURCHASE_CONFIRMED",
      Readonly<{
        readonly phase: "ORDER_REVIEW" | "ORDER_CONFIRMED";
        readonly sourceStage: "ORDER_PREVIEW" | "PURCHASE_CONFIRMED";
      }>
    >>;
  }>;
  readonly claim_projection: Readonly<{
    readonly sourceVersion: string;
    readonly evidenceRef: Readonly<{
      readonly default: string;
      readonly SIZE_FIT: string;
    }>;
    readonly authority_by_type: Readonly<Record<string, Readonly<Record<string, string>>>>;
    readonly freshness: Readonly<Record<
      "FRESH" | "EXPIRED",
      Readonly<{ readonly observedAt: string; readonly expiresAt: string }>
    >>;
    readonly size_fit_defaults: Readonly<{
      readonly customerProfileId: string;
      readonly customerProfileRevision: number;
      readonly measurementFingerprint: string;
      readonly evidenceBasisMap: Readonly<Record<string, "MEASUREMENTS" | "BODY_PROFILE" | "PAST_SIZE">>;
    }>;
  }>;
}

export interface MaterializeTrackCV5CaseInput {
  readonly lane: TrackCV5ExecutionLane;
  readonly fixture: TrackCV5CompactCase;
  readonly runtimeClaimCatalog: Readonly<Record<string, TrackCV5RuntimeClaimFixture>>;
  readonly recipe: TrackCV5MaterializationRecipe;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function deterministicUuid(seed: string): string {
  const hash = sha256(seed);
  const variant = ((Number.parseInt(hash[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function shiftedIso(iso: string, milliseconds: number): string {
  return new Date(Date.parse(iso) + milliseconds).toISOString();
}

function expectedProjection(
  fixture: TrackCV5CompactCase,
  recipe: TrackCV5MaterializationRecipe,
) {
  if (fixture.context.source_stage !== null) {
    return recipe.context_projection.explicit_source_stage[
      fixture.context.source_stage
    ];
  }
  if (fixture.context.canonical_flags.includes("MEASUREMENTS_REQUIRED")) {
    return recipe.context_projection.measurement_required;
  }
  return recipe.context_projection.browsing_default;
}

function expectedBarriers(fixture: TrackCV5CompactCase): readonly string[] {
  const active = new Set<string>();
  if (["UNRESOLVED", "AMBIGUOUS", "STALE"].includes(
    fixture.context.product_binding.status,
  )) {
    active.add("PRODUCT_CONTEXT_UNREADY");
  }
  for (const flag of fixture.context.canonical_flags) {
    if ([
      "PRODUCT_CONTEXT_UNREADY",
      "VERIFIED_CLAIMS_UNREADY",
      "MEASUREMENTS_REQUIRED",
      "CART_STATE_UNREADY",
      "CHECKOUT_DETAILS_REQUIRED",
      "EFFECT_READINESS_BLOCKED",
    ].includes(flag)) {
      active.add(flag);
    }
  }
  return [...active];
}

function protectedClaimScope(
  ref: string,
  compact: TrackCV5RuntimeClaimFixture,
) {
  if (compact.scope.kind === "PRODUCT") {
    const productId = compact.scope.productId?.trim();
    if (!productId) {
      throw new Error(`TRACK_C_V5_PRODUCT_SCOPE_INVALID:${ref}`);
    }
    return {
      kind: "PRODUCT" as const,
      productId,
      variantId: compact.scope.variantId ?? null,
    };
  }
  const cartVersion = compact.scope.cartVersion;
  if (!Number.isInteger(cartVersion) || (cartVersion ?? -1) < 0) {
    throw new Error(`TRACK_C_V5_CART_SCOPE_INVALID:${ref}`);
  }
  return {
    kind: "CART" as const,
    cartId: `eval-cart-v${String(cartVersion)}`,
    cartVersion: cartVersion!,
  };
}

function materializedClaim(
  ref: string,
  compact: TrackCV5RuntimeClaimFixture,
  recipe: TrackCV5MaterializationRecipe,
): ProtectedClaimV1 {
  const freshness = recipe.claim_projection.freshness[compact.freshness];
  const authority = recipe.claim_projection.authority_by_type[compact.type]?.[
    compact.source
  ];
  if (authority === undefined) {
    throw new Error(`TRACK_C_V5_CLAIM_AUTHORITY_UNMAPPED:${ref}`);
  }
  const sizeDefaults = recipe.claim_projection.size_fit_defaults;
  let value: Readonly<Record<string, unknown>> = compact.value;
  if (compact.type === "SIZE_FIT") {
    const evidenceBasis = sizeDefaults.evidenceBasisMap[
      String(compact.value.evidenceBasis)
    ];
    if (evidenceBasis === undefined) {
      throw new Error(`TRACK_C_V5_SIZE_EVIDENCE_BASIS_UNMAPPED:${ref}`);
    }
    value = {
      ...compact.value,
      customerProfileId: sizeDefaults.customerProfileId,
      customerProfileRevision: sizeDefaults.customerProfileRevision,
      measurementFingerprint: sizeDefaults.measurementFingerprint,
      evidenceBasis,
    };
  }
  const evidenceTemplate = compact.type === "SIZE_FIT"
    ? recipe.claim_projection.evidenceRef.SIZE_FIT
    : recipe.claim_projection.evidenceRef.default;
  const evidenceRef = evidenceTemplate
    .replace("{runtime_claim_ref}", ref)
    .replace("{measurementFingerprint}", sizeDefaults.measurementFingerprint);
  return ProtectedClaimV1Schema.parse({
    schemaVersion: 1,
    claimId: deterministicUuid(`V5_BENCHMARK_CLAIM_ID_V1\n${ref}`),
    type: compact.type,
    scope: protectedClaimScope(ref, compact),
    value,
    provenance: {
      authority,
      sourceVersion: recipe.claim_projection.sourceVersion,
      evidenceRef,
      contentHash: sha256(
        `V5_BENCHMARK_RUNTIME_CLAIM_V1\n${canonicalJsonV1(compact)}`,
      ),
      observedAt: freshness.observedAt,
      expiresAt: freshness.expiresAt,
    },
    authorization: "NONE",
  });
}

export function materializeTrackCV5Claims(
  fixture: TrackCV5CompactCase,
  runtimeClaimCatalog: Readonly<Record<string, TrackCV5RuntimeClaimFixture>>,
  recipe: TrackCV5MaterializationRecipe,
): readonly ProtectedClaimV1[] {
  const claims = fixture.context.runtime_claim_refs.map((ref) => {
    const compact = runtimeClaimCatalog[ref];
    if (compact === undefined) {
      throw new Error(`TRACK_C_V5_RUNTIME_CLAIM_MISSING:${ref}`);
    }
    return materializedClaim(ref, compact, recipe);
  });
  if (new Set(claims.map(({ claimId }) => claimId)).size !== claims.length) {
    throw new Error("TRACK_C_V5_CLAIM_ID_DUPLICATE");
  }
  return Object.freeze(claims);
}

function productBinding(
  fixture: TrackCV5CompactCase,
  recipe: TrackCV5MaterializationRecipe,
): ProductBindingV2 {
  return {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: fixture.context.product_binding.status,
    productIds: [...fixture.context.product_binding.product_ids].sort(),
    catalogVersion: recipe.context_projection.catalog_version,
  };
}

function simulationCanonicalEvidence(
  fixture: TrackCV5CompactCase,
  evaluationAt: string,
  sourceMessageIdHash: string,
): CanonicalDecisionEvidenceV1 {
  const intent = fixture.context.buying_intent;
  const hasIntent = intent.decision !== "NONE";
  const boundProducts = fixture.context.product_binding.product_ids;
  return {
    dialogueEvidence: {
      schemaVersion: 1,
      contractVersion: "CANONICAL_DIALOGUE_EVIDENCE_V1",
      act: "REQUEST",
      contributors: ["DETERMINISTIC_RUNTIME"],
      confidenceBand: "HIGH",
      sourceMessageIdHash,
      evidenceHash: sha256(`V5_DIALOGUE_EVIDENCE\n${fixture.id}`),
      reasonCodes: [],
      authorization: "NONE",
    },
    buyingIntent: {
      schemaVersion: 1,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: intent.decision,
      requestedAction: intent.requested_action,
      quantity: intent.decision === "COMMITTED" ? intent.quantity : null,
      productId: intent.decision === "COMMITTED" &&
          fixture.context.product_binding.status === "RESOLVED" &&
          boundProducts.length === 1
        ? boundProducts[0]!
        : null,
      contributors: hasIntent ? ["DETERMINISTIC_RUNTIME"] : [],
      sourceMessageIdHash,
      evidenceHash: hasIntent
        ? sha256(`V5_BUYING_INTENT\n${fixture.id}\n${intent.evidence ?? ""}`)
        : null,
      reasonCodes: [],
      evaluatedAt: evaluationAt,
      authorization: "NONE",
    },
  } as CanonicalDecisionEvidenceV1;
}

function productionCanonicalEvidence(
  fixture: TrackCV5CompactCase,
  evaluationAt: string,
  sourceMessageId: string,
): CanonicalDecisionEvidenceV1 {
  const intent = fixture.context.buying_intent;
  const products = fixture.context.product_binding.product_ids;
  const activeProductId = fixture.context.product_binding.status === "RESOLVED" &&
      products.length === 1
    ? products[0]!
    : null;
  const modelBuyingIntent: AgentBuyingIntentV1 = {
    decision: intent.decision,
    requestedAction: intent.requested_action,
    quantity: intent.quantity,
    evidenceText: intent.evidence,
    confidence: 1,
  };
  const evidence = buildCanonicalDecisionEvidenceV1({
    text: fixture.latest_customer_message,
    sourceMessageId,
    productId: activeProductId,
    modelBuyingIntent,
    evaluatedAt: new Date(evaluationAt),
  });
  const expectedQuantity = intent.decision === "COMMITTED" ? intent.quantity : null;
  const expectedProductId = intent.decision === "COMMITTED" ? activeProductId : null;
  if (
    evidence.buyingIntent.decision !== intent.decision ||
    evidence.buyingIntent.requestedAction !== intent.requested_action ||
    evidence.buyingIntent.quantity !== expectedQuantity ||
    evidence.buyingIntent.productId !== expectedProductId
  ) {
    throw new Error("TRACK_C_V5_CANONICAL_EVIDENCE_EXPECTATION_MISMATCH");
  }
  return evidence;
}

function checkoutArtifacts(
  fixture: TrackCV5CompactCase,
  evaluationAt: string,
  productId: string,
) {
  const observedAt = shiftedIso(evaluationAt, -60_000);
  const posExpiresAt = shiftedIso(observedAt, 48 * 60 * 60 * 1_000);
  const cartId = deterministicUuid(`V5_CART\n${fixture.id}`);
  const unitPriceVnd = 1_000;
  const cart = CartV1Schema.parse({
    schemaVersion: 1,
    cartId,
    salesEpisodeId: deterministicUuid(`V5_SALES_EPISODE\n${fixture.id}`),
    customerProfileId: deterministicUuid(`V5_CART_PROFILE\n${fixture.id}`),
    revision: 1,
    currency: "VND",
    status: fixture.context.source_stage === "PURCHASE_CONFIRMED"
      ? "CONFIRMED"
      : "READY_FOR_CONFIRMATION",
    checkoutEligibility: "ELIGIBLE",
    lines: [{
      lineId: deterministicUuid(`V5_CART_LINE\n${fixture.id}`),
      parentProductId: productId,
      offerId: productId,
      offerKind: "DIRECT",
      quantity: 1,
      components: [{
        componentProductId: productId,
        componentSku: `${productId}-EVAL`,
        componentRole: "OTHER",
        color: null,
        size: null,
        quantity: 1,
      }],
      allowMixedSizes: false,
      allowComponentSale: false,
      posUnitPriceVnd: unitPriceVnd,
      priceAuthority: {
        priceFactRef: `eval-price:${fixture.id}`,
        shopId: "eval-shop",
        parentProductId: productId,
        offerId: productId,
        offerPriceKind: "DIRECT",
        componentProductId: null,
        metadata: {
          authority: "PANCAKE_POS",
          sourceVersion: `eval-pos:${fixture.id}`,
          observedAt,
          expiresAt: posExpiresAt,
          freshForSeconds: 48 * 60 * 60,
          freshnessState: "FRESH",
        },
      },
      lineTotalVnd: unitPriceVnd,
    }],
    adjustments: [],
    shippingFeeVnd: 0,
    subtotalVnd: unitPriceVnd,
    discountTotalVnd: 0,
    grandTotalVnd: unitPriceVnd,
    createdAt: observedAt,
    updatedAt: observedAt,
  });
  const checkedAt = shiftedIso(evaluationAt, -30_000);
  const matched = {
    status: "MATCHED" as const,
    sourceVersionBefore: "eval-v1",
    sourceVersionAfter: "eval-v1",
    checkedAt,
  };
  const previewId = deterministicUuid(`V5_PREVIEW\n${fixture.id}`);
  const previewHash = `sha256:${sha256(`V5_PREVIEW_HASH\n${fixture.id}`)}`;
  const preview = OrderPreviewV1Schema.parse({
    schemaVersion: 1,
    previewId,
    previewHash,
    cartId,
    cartVersion: cart.revision,
    stage: "ORDER_PREVIEW",
    recipient: {
      fullName: "Benchmark User",
      phone: "0000000000",
      address: "Benchmark Address 000",
      retentionClass: "CART_48H_OPERATIONAL",
    },
    payment: { method: "COD", bankTransferPolicyRef: null },
    revalidation: {
      cartId,
      cartVersion: cart.revision,
      price: matched,
      inventory: matched,
      size: matched,
      eta: matched,
      eligible: true,
      checkedAt,
    },
    createdAt: shiftedIso(evaluationAt, -20_000),
    expiresAt: shiftedIso(evaluationAt, 5 * 60_000),
  });
  const confirmation = fixture.context.source_stage === "PURCHASE_CONFIRMED"
    ? PurchaseConfirmationV1Schema.parse({
        schemaVersion: 1,
        confirmationId: deterministicUuid(`V5_CONFIRMATION\n${fixture.id}`),
        idempotencyKey: `v5-confirm:${fixture.id}`,
        cartId,
        cartVersion: cart.revision,
        previewId,
        previewHash,
        status: "PURCHASE_CONFIRMED",
        posOrderId: null,
        desiredPancakeTag: "DA_CHOT_DON",
        confirmedAt: shiftedIso(evaluationAt, -10_000),
        sourceMessageId: `eval-source:${fixture.id}`,
      })
    : null;
  return { cart, preview, confirmation };
}

function productionStage(fixture: TrackCV5CompactCase) {
  if (fixture.context.source_stage !== null) return fixture.context.source_stage;
  return fixture.context.canonical_flags.includes("MEASUREMENTS_REQUIRED")
    ? "MEASUREMENTS_REQUIRED" as const
    : "FACTS_PRESENTED" as const;
}

function productionState(
  fixture: TrackCV5CompactCase,
  evaluationAt: string,
): SalesCycleRuntimeState {
  const stage = productionStage(fixture);
  const requiresCart = stage === "ORDER_PREVIEW" || stage === "PURCHASE_CONFIRMED";
  const products = fixture.context.product_binding.product_ids;
  if (requiresCart && products.length !== 1) {
    throw new Error("TRACK_C_V5_PRODUCTION_CART_PRODUCT_UNREACHABLE");
  }
  const artifacts = requiresCart
    ? checkoutArtifacts(fixture, evaluationAt, products[0]!)
    : null;
  return {
    schemaVersion: 2,
    conversationKey: `v5:${fixture.id}`,
    routing: { pageId: "eval-page", conversationId: `v5:${fixture.id}` },
    revision: 3,
    stage,
    cart: artifacts === null
      ? null
      : { value: artifacts.cart, expiresAt: shiftedIso(evaluationAt, 48 * 60 * 60 * 1_000) },
    commerceContext: null,
    negotiation: null,
    checkoutDraft: artifacts === null
      ? null
      : {
          fullName: "Benchmark User",
          phone: "0000000000",
          address: "Benchmark Address 000",
          paymentMethod: "COD",
          updatedAt: shiftedIso(evaluationAt, -30_000),
        },
    clarification: null,
    preview: artifacts?.preview ?? null,
    confirmation: artifacts?.confirmation ?? null,
    processedCommandIds: [],
    updatedAt: shiftedIso(evaluationAt, -10_000),
  };
}

function simulationContext(
  fixture: TrackCV5CompactCase,
  recipe: TrackCV5MaterializationRecipe,
  claims: readonly ProtectedClaimV1[],
  sourceMessagePk: string,
  sourceMessageIdHash: string,
): ContextV2 {
  const projection = expectedProjection(fixture, recipe);
  const finalSalesCycleRevision = 3;
  const finalConversationRevision = 5;
  const evidence = simulationCanonicalEvidence(
    fixture,
    recipe.evaluation_at,
    sourceMessageIdHash,
  );
  const verifiedClaims = [...claims].sort((left, right) =>
    left.claimId.localeCompare(right.claimId)
  );
  const draft: Omit<ContextV2, "contextHash"> = {
    schemaVersion: 2,
    contractVersion: "CONTEXT_V2",
    authority: "SHADOW_ONLY",
    finalTurnEvidence: {
      schemaVersion: 2,
      contractVersion: "FINAL_TURN_EVIDENCE_V2",
      sourceMessagePk,
      sourceMessageIdHash,
      preTransitionConversationRevision: 4,
      finalConversationRevision,
      preTransitionSalesCycleRevision: 2,
      finalSalesCycleRevision,
    },
    productBinding: productBinding(fixture, recipe),
    dialogueEvidence: {
      act: evidence.dialogueEvidence.act,
      confidenceBand: evidence.dialogueEvidence.confidenceBand,
      evidenceHash: evidence.dialogueEvidence.evidenceHash,
      reasonCodes: evidence.dialogueEvidence.reasonCodes,
    },
    verifiedClaimSetHash: verifiedClaims.length === 0
      ? null
      : hashProtectedClaimSetV1(verifiedClaims),
    verifiedClaimTypes: [...new Set(verifiedClaims.map(({ type }) => type))].sort(),
    verifiedClaims,
    phase: {
      schemaVersion: 2,
      contractVersion: "CONVERSATION_PHASE_V2",
      phase: projection.phase,
      source: "CANONICAL_COMMERCE_STATE_V1",
      sourceStage: projection.sourceStage,
      salesCycleRevision: finalSalesCycleRevision,
      authority: "SHADOW_ONLY",
    },
    barriers: {
      schemaVersion: 2,
      contractVersion: "CONVERSATION_BARRIERS_V2",
      active: expectedBarriers(fixture) as ContextV2["barriers"]["active"],
      lifecycle: "UNTIL_AUTHORITATIVE_STATE_CHANGES",
      conversationRevision: finalConversationRevision,
      salesCycleRevision: finalSalesCycleRevision,
      source: "CANONICAL_EVIDENCE_AND_COMMERCE_STATE_V1",
      authority: "SHADOW_ONLY",
    },
    buyingIntent: {
      decision: evidence.buyingIntent.decision,
      requestedAction: evidence.buyingIntent.requestedAction,
      productId: evidence.buyingIntent.productId,
      evidenceHash: evidence.buyingIntent.evidenceHash,
    },
    cartReadiness: null,
    ownership: { owner: "BOT", handoffActive: false, reasonCode: null },
    consumerContractVersions: {
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1",
      cta: "CONTEXT_V2_CTA_INPUT_V1",
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1",
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1",
      audit: "CONTEXT_V2_AUDIT_V1",
    },
  };
  const contextHash = sha256(`CONTEXT_V2\n${canonicalJsonV1(draft)}`);
  return ContextV2Schema.parse({ ...draft, contextHash });
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length &&
    [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export function materializeTrackCV5CaseCapture(
  input: MaterializeTrackCV5CaseInput,
) {
  const evaluationAt = new Date(input.recipe.evaluation_at);
  if (!Number.isFinite(evaluationAt.getTime())) {
    throw new Error("TRACK_C_V5_EVALUATION_TIME_INVALID");
  }
  const claims = materializeTrackCV5Claims(
    input.fixture,
    input.runtimeClaimCatalog,
    input.recipe,
  );
  const sourceMessagePk = deterministicUuid(`V5_SOURCE_MESSAGE\n${input.fixture.id}`);
  const sourceMessageId = `V5_SOURCE_MESSAGE_ID\n${input.fixture.id}`;
  const sourceMessageIdHash = sha256(sourceMessageId);
  const sourceOccurredAt = shiftedIso(input.recipe.evaluation_at, -60_000);

  if (input.lane === "BEHAVIOR_SIMULATION") {
    const context = simulationContext(
      input.fixture,
      input.recipe,
      claims,
      sourceMessagePk,
      sourceMessageIdHash,
    );
    return ContextV2CaptureV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CONTEXT_V2_CAPTURE_V1",
      sourceMessagePk,
      sourceOccurredAt,
      status: "BUILT",
      context,
      contextHash: context.contextHash,
      reasonCode: null,
    });
  }

  if (claims.some(({ scope }) => scope.kind === "CART") &&
      input.fixture.context.source_stage === null) {
    throw new Error("TRACK_C_V5_PRODUCTION_CART_CLAIM_UNREACHABLE");
  }
  const finalTurnEvidence = {
    schemaVersion: 2 as const,
    contractVersion: "FINAL_TURN_EVIDENCE_V2" as const,
    sourceMessagePk,
    sourceMessageIdHash,
    preTransitionConversationRevision: 4,
    finalConversationRevision: 5,
    preTransitionSalesCycleRevision: 2,
    finalSalesCycleRevision: 3,
  };
  const capture = buildContextV2Capture({
    canonicalEvidence: productionCanonicalEvidence(
      input.fixture,
      input.recipe.evaluation_at,
      sourceMessageId,
    ),
    verifiedClaims: claims,
    finalCommerceState: productionState(input.fixture, input.recipe.evaluation_at),
    readiness: [],
    finalTurnEvidence,
    productBinding: productBinding(input.fixture, input.recipe),
    owner: "BOT",
    handoffReasonCode: null,
    now: evaluationAt,
    sourceOccurredAt: new Date(sourceOccurredAt),
  });
  if (capture.status === "BUILT" && capture.context !== null) {
    const projection = expectedProjection(input.fixture, input.recipe);
    if (
      capture.context.phase.phase !== projection.phase ||
      capture.context.phase.sourceStage !== projection.sourceStage ||
      !sameStrings(capture.context.barriers.active, expectedBarriers(input.fixture))
    ) {
      throw new Error("TRACK_C_V5_PRODUCTION_CONTEXT_EXPECTATION_MISMATCH");
    }
  }
  return capture;
}
