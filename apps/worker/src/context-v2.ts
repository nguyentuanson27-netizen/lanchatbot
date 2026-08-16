import { createHash } from "node:crypto";
import { hashProtectedClaimSetV1, type CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import {
  ContextV2Schema,
  canonicalJsonV1,
  deriveConversationBarriersV2,
  deriveConversationPhaseV2,
  validateEffectReadinessTemporalWindowV1,
  type ContextV2,
  type DeterministicEffectReadinessV1,
  type ProtectedClaimV1,
} from "@lana/contracts";

type ProductScope = "NOT_REQUIRED" | "UNRESOLVED" | "RESOLVED" | "AMBIGUOUS" | "STALE";

export interface BuildContextV2Input {
  readonly canonicalEvidence: CanonicalDecisionEvidenceV1;
  readonly verifiedClaims: readonly ProtectedClaimV1[];
  readonly commerceState: SalesCycleRuntimeState;
  readonly readiness: readonly DeterministicEffectReadinessV1[];
  readonly productScope: ProductScope;
  readonly conversationRevision: number;
  readonly owner: "BOT" | "HUMAN";
  readonly handoffReasonCode: string | null;
  readonly now: Date;
  /** Readiness binds the locked pre-transition revision, while phase binds the projected final state. */
  readonly readinessSalesCycleRevision?: number;
}

const CART_READINESS_EFFECTS = new Set<DeterministicEffectReadinessV1["effect"]>([
  "CART_OPEN",
  "CART_MUTATION",
  "CART_READY",
  "PREVIEW_READY",
  "PURCHASE_CONFIRMATION_READY",
]);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parsedContextWithIntegrity(context: ContextV2): ContextV2 {
  const parsed = ContextV2Schema.parse(context);
  const { contextHash, ...draft } = parsed;
  if (contextHash !== sha256(`CONTEXT_V2\n${canonicalJsonV1(draft)}`)) {
    throw new Error("CONTEXT_V2_INTEGRITY_MISMATCH");
  }
  return parsed;
}

function exactReadiness(
  input: BuildContextV2Input,
): Readonly<{
  matching: readonly DeterministicEffectReadinessV1[];
  bindingMismatch: boolean;
}> {
  const matching: DeterministicEffectReadinessV1[] = [];
  let bindingMismatch = false;
  for (const artifact of input.readiness) {
    if (!CART_READINESS_EFFECTS.has(artifact.effect)) continue;
    const exact =
      artifact.sourceMessageIdHash === input.canonicalEvidence.buyingIntent.sourceMessageIdHash &&
      artifact.conversationRevision === input.conversationRevision &&
      artifact.salesCycleRevision ===
        (input.readinessSalesCycleRevision ?? input.commerceState.revision) &&
      validateEffectReadinessTemporalWindowV1({
        checkedAt: artifact.checkedAt,
        expiresAt: artifact.expiresAt,
        now: input.now,
      }) === "VALID";
    if (exact) matching.push(artifact);
    else bindingMismatch = true;
  }
  return {
    matching: matching.sort((left, right) =>
      left.checkedAt.localeCompare(right.checkedAt) ||
      left.effect.localeCompare(right.effect) ||
      left.readinessHash.localeCompare(right.readinessHash)
    ),
    bindingMismatch,
  };
}

function assertFreshClaims(
  claims: readonly ProtectedClaimV1[],
  now: Date,
): void {
  if (!Number.isFinite(now.getTime())) throw new Error("CONTEXT_V2_CLOCK_INVALID");
  if (claims.some(({ provenance }) =>
    Date.parse(provenance.observedAt) > now.getTime() + 5 * 60_000 ||
    Date.parse(provenance.expiresAt) <= now.getTime()
  )) {
    throw new Error("CONTEXT_V2_CLAIM_STALE");
  }
}

/**
 * Constructs the immutable, PII-free Context V2 projection for evaluation.
 * This function has no state/Outbox/network ports and cannot authorize an
 * effect. Callers must treat any exception as a missing shadow observation,
 * never as a reason to change the live plan.
 */
export function buildContextV2(input: BuildContextV2Input): ContextV2 {
  if (input.canonicalEvidence.dialogueEvidence.sourceMessageIdHash !==
      input.canonicalEvidence.buyingIntent.sourceMessageIdHash) {
    throw new Error("CONTEXT_V2_EVIDENCE_BINDING_MISMATCH");
  }
  assertFreshClaims(input.verifiedClaims, input.now);
  const readiness = exactReadiness(input);
  if (readiness.bindingMismatch) {
    throw new Error("CONTEXT_V2_READINESS_BINDING_MISMATCH");
  }
  const lastReadiness = readiness.matching
    .filter(({ outcome }) => outcome === "BLOCKED")
    .at(-1) ?? readiness.matching.at(-1) ?? null;
  const readinessOutcome = readiness.matching.some(({ outcome }) =>
    outcome === "BLOCKED"
  )
    ? "BLOCKED" as const
    : readiness.matching.length > 0
      ? "READY" as const
      : "NOT_EVALUATED" as const;
  const readinessReasonCodes = [
    ...new Set(readiness.matching.flatMap(({ reasonCodes }) => reasonCodes)),
  ].sort();
  const phase = deriveConversationPhaseV2({
    commerceStage: input.commerceState.stage,
    hasCart: input.commerceState.cart !== null,
    hasPreview: input.commerceState.preview !== null,
    hasConfirmation: input.commerceState.confirmation !== null,
    salesCycleRevision: input.commerceState.revision,
  });
  const barriers = deriveConversationBarriersV2({
    productScope: input.productScope,
    commerceStage: input.commerceState.stage,
    hasCart: input.commerceState.cart !== null,
    hasActiveClarification: input.commerceState.clarification != null,
    readiness: {
      outcome: readinessOutcome,
      reasonCodes: readinessReasonCodes,
    },
    conversationRevision: input.conversationRevision,
    salesCycleRevision: input.commerceState.revision,
  });
  const verifiedClaims = [...input.verifiedClaims]
    .sort((left, right) => left.claimId.localeCompare(right.claimId));
  const verifiedClaimTypes = [...new Set(verifiedClaims.map(({ type }) => type))]
    .sort();
  const draft = {
    schemaVersion: 2 as const,
    contractVersion: "CONTEXT_V2" as const,
    authority: "SHADOW_ONLY" as const,
    sourceMessageIdHash: input.canonicalEvidence.buyingIntent.sourceMessageIdHash,
    conversationRevision: input.conversationRevision,
    salesCycleRevision: input.commerceState.revision,
    dialogueEvidence: {
      act: input.canonicalEvidence.dialogueEvidence.act,
      confidenceBand: input.canonicalEvidence.dialogueEvidence.confidenceBand,
      evidenceHash: input.canonicalEvidence.dialogueEvidence.evidenceHash,
      reasonCodes: input.canonicalEvidence.dialogueEvidence.reasonCodes,
    },
    verifiedClaimSetHash: verifiedClaims.length === 0
      ? null
      : hashProtectedClaimSetV1(verifiedClaims),
    verifiedClaimTypes,
    verifiedClaims,
    phase,
    barriers,
    buyingIntent: {
      decision: input.canonicalEvidence.buyingIntent.decision,
      requestedAction: input.canonicalEvidence.buyingIntent.requestedAction,
      productId: input.canonicalEvidence.buyingIntent.productId,
      evidenceHash: input.canonicalEvidence.buyingIntent.evidenceHash,
    },
    cartReadiness: lastReadiness === null
      ? null
      : {
          effect: lastReadiness.effect as Exclude<
            DeterministicEffectReadinessV1["effect"],
            "PROTECTED_OUTBOUND" | "ORDER_PREVIEW" | "PURCHASE_CONFIRMATION"
          >,
          outcome: lastReadiness.outcome,
          readinessHash: lastReadiness.readinessHash,
          expiresAt: lastReadiness.expiresAt,
        },
    ownership: {
      owner: input.owner,
      handoffActive: input.owner === "HUMAN",
      reasonCode: input.owner === "HUMAN" ? input.handoffReasonCode : null,
    },
    consumerContractVersions: {
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1" as const,
      cta: "CONTEXT_V2_CTA_INPUT_V1" as const,
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1" as const,
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1" as const,
      audit: "CONTEXT_V2_AUDIT_V1" as const,
    },
  };
  return ContextV2Schema.parse({
    ...draft,
    contextHash: sha256(`CONTEXT_V2\n${canonicalJsonV1(draft)}`),
  });
}

/** Consumer adapters are evaluation inputs only; none returns an action. */
export function contextV2ConsumerInputs(context: ContextV2) {
  const parsed = parsedContextWithIntegrity(context);
  return {
    strategy: {
      contractVersion: parsed.consumerContractVersions.strategy,
      contextHash: parsed.contextHash,
      dialogueEvidence: parsed.dialogueEvidence,
      buyingIntent: parsed.buyingIntent,
      phase: parsed.phase,
      barriers: parsed.barriers,
    },
    cta: {
      contractVersion: parsed.consumerContractVersions.cta,
      contextHash: parsed.contextHash,
      phase: parsed.phase,
      barriers: parsed.barriers,
      cartReadiness: parsed.cartReadiness,
    },
    postMedia: {
      contractVersion: parsed.consumerContractVersions.postMedia,
      contextHash: parsed.contextHash,
      phase: parsed.phase,
      barriers: parsed.barriers,
      verifiedClaimTypes: parsed.verifiedClaimTypes,
    },
    outputInterpretation: {
      contractVersion: parsed.consumerContractVersions.outputInterpretation,
      contextHash: parsed.contextHash,
      sourceMessageIdHash: parsed.sourceMessageIdHash,
      verifiedClaimSetHash: parsed.verifiedClaimSetHash,
      verifiedClaims: parsed.verifiedClaims,
      buyingIntent: parsed.buyingIntent,
      cartReadiness: parsed.cartReadiness,
    },
    audit: {
      contractVersion: parsed.consumerContractVersions.audit,
      contextHash: parsed.contextHash,
      conversationRevision: parsed.conversationRevision,
      salesCycleRevision: parsed.salesCycleRevision,
      authority: parsed.authority,
    },
  } as const;
}

/**
 * External-model projection. Linkable profile identifiers, raw evidence refs,
 * and internal claim IDs remain in the audit envelope and never enter Vertex.
 */
export function contextV2ModelInput(context: ContextV2) {
  const consumers = contextV2ConsumerInputs(context);
  const outputInterpretation = consumers.outputInterpretation;
  return {
    schemaVersion: 1 as const,
    contractVersion: "CONTEXT_V2_MODEL_INPUT_V1" as const,
    contextHash: context.contextHash,
    strategy: consumers.strategy,
    cta: consumers.cta,
    postMedia: consumers.postMedia,
    outputInterpretation: {
      contractVersion: outputInterpretation.contractVersion,
      contextHash: outputInterpretation.contextHash,
      verifiedClaimSetHash: outputInterpretation.verifiedClaimSetHash,
      buyingIntent: outputInterpretation.buyingIntent,
      cartReadiness: outputInterpretation.cartReadiness,
      verifiedClaims: outputInterpretation.verifiedClaims.map((claim) => ({
        type: claim.type,
        scope: claim.scope.kind === "CART"
          ? { kind: claim.scope.kind, cartVersion: claim.scope.cartVersion }
          : claim.scope,
        value: claim.type === "SIZE_FIT"
          ? {
              recommendedSizes: claim.value.recommendedSizes,
              alternativeSizes: claim.value.alternativeSizes,
              customerProfileRevision: claim.value.customerProfileRevision,
              measurementFingerprint: claim.value.measurementFingerprint,
              evidenceBasis: claim.value.evidenceBasis,
            }
          : claim.value,
        provenance: {
          authority: claim.provenance.authority,
          sourceVersion: claim.provenance.sourceVersion,
          contentHash: claim.provenance.contentHash,
          observedAt: claim.provenance.observedAt,
          expiresAt: claim.provenance.expiresAt,
        },
        authorization: claim.authorization,
      })),
    },
  } as const;
}
export type ContextV2ModelInput = ReturnType<typeof contextV2ModelInput>;
