import { createHash } from "node:crypto";
import { hashProtectedClaimSetV1, type CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import {
  ContextV2CaptureV1Schema,
  ContextV2Schema,
  canonicalJsonV1,
  deriveConversationBarriersV2,
  deriveConversationPhaseV2,
  validateEffectReadinessTemporalWindowV1,
  type ContextV2,
  type ContextV2CaptureV1,
  type DeterministicEffectReadinessV1,
  type FinalTurnEvidenceV2,
  type ProductBindingV2,
  type ProtectedClaimV1,
} from "@lana/contracts";

export interface BuildContextV2Input {
  readonly canonicalEvidence: CanonicalDecisionEvidenceV1;
  readonly verifiedClaims: readonly ProtectedClaimV1[];
  readonly finalCommerceState: SalesCycleRuntimeState;
  readonly readiness: readonly DeterministicEffectReadinessV1[];
  readonly finalTurnEvidence: FinalTurnEvidenceV2;
  readonly productBinding: ProductBindingV2;
  readonly owner: "BOT" | "HUMAN";
  readonly handoffReasonCode: string | null;
  readonly now: Date;
}

export interface BuildContextV2CaptureInput extends BuildContextV2Input {
  readonly sourceOccurredAt: Date;
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

function contextHash(value: Omit<ContextV2, "contextHash">): string {
  return sha256(`CONTEXT_V2\n${canonicalJsonV1(value)}`);
}

export function parseContextV2WithIntegrity(value: unknown): ContextV2 {
  const parsed = ContextV2Schema.parse(value);
  const { contextHash: observed, ...draft } = parsed;
  if (observed !== contextHash(draft)) {
    throw new Error("CONTEXT_V2_INTEGRITY_MISMATCH");
  }
  return parsed;
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

function exactReadiness(input: BuildContextV2Input): Readonly<{
  matching: readonly DeterministicEffectReadinessV1[];
  bindingMismatch: boolean;
}> {
  const matching: DeterministicEffectReadinessV1[] = [];
  let bindingMismatch = false;
  for (const artifact of input.readiness) {
    if (!CART_READINESS_EFFECTS.has(artifact.effect)) continue;
    const exact =
      artifact.sourceMessageIdHash ===
        input.finalTurnEvidence.sourceMessageIdHash &&
      artifact.conversationRevision ===
        input.finalTurnEvidence.preTransitionConversationRevision &&
      artifact.salesCycleRevision ===
        input.finalTurnEvidence.preTransitionSalesCycleRevision &&
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

export function buildContextV2(input: BuildContextV2Input): ContextV2 {
  if (input.canonicalEvidence.dialogueEvidence.sourceMessageIdHash !==
      input.canonicalEvidence.buyingIntent.sourceMessageIdHash ||
      input.canonicalEvidence.buyingIntent.sourceMessageIdHash !==
        input.finalTurnEvidence.sourceMessageIdHash) {
    throw new Error("CONTEXT_V2_EVIDENCE_BINDING_MISMATCH");
  }
  if (input.finalCommerceState.revision !==
      input.finalTurnEvidence.finalSalesCycleRevision) {
    throw new Error("CONTEXT_V2_FINAL_SALES_REVISION_MISMATCH");
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
    commerceStage: input.finalCommerceState.stage,
    hasCart: input.finalCommerceState.cart !== null,
    hasPreview: input.finalCommerceState.preview !== null,
    hasConfirmation: input.finalCommerceState.confirmation !== null,
    salesCycleRevision: input.finalTurnEvidence.finalSalesCycleRevision,
  });
  const barriers = deriveConversationBarriersV2({
    productScope: input.productBinding.status,
    commerceStage: input.finalCommerceState.stage,
    hasCart: input.finalCommerceState.cart !== null,
    hasActiveClarification: input.finalCommerceState.clarification !== null,
    readiness: {
      outcome: readinessOutcome,
      reasonCodes: readinessReasonCodes,
    },
    conversationRevision: input.finalTurnEvidence.finalConversationRevision,
    salesCycleRevision: input.finalTurnEvidence.finalSalesCycleRevision,
  });
  const verifiedClaims = [...input.verifiedClaims]
    .sort((left, right) => left.claimId.localeCompare(right.claimId));
  const verifiedClaimTypes = [...new Set(verifiedClaims.map(({ type }) => type))]
    .sort();
  const draft: Omit<ContextV2, "contextHash"> = {
    schemaVersion: 2,
    contractVersion: "CONTEXT_V2",
    authority: "SHADOW_ONLY",
    finalTurnEvidence: input.finalTurnEvidence,
    productBinding: input.productBinding,
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
      strategy: "CONTEXT_V2_STRATEGY_INPUT_V1",
      cta: "CONTEXT_V2_CTA_INPUT_V1",
      postMedia: "CONTEXT_V2_POST_MEDIA_INPUT_V1",
      outputInterpretation: "CONTEXT_V2_OUTPUT_INTERPRETATION_V1",
      audit: "CONTEXT_V2_AUDIT_V1",
    },
  };
  return ContextV2Schema.parse({ ...draft, contextHash: contextHash(draft) });
}

function terminalReasonCode(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  return /^CONTEXT_V2_[A-Z0-9_]{1,96}$/u.test(code)
    ? code
    : "CONTEXT_V2_BUILD_FAILED";
}

export function buildContextV2Capture(
  input: BuildContextV2CaptureInput,
): ContextV2CaptureV1 {
  try {
    const context = buildContextV2(input);
    return ContextV2CaptureV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CONTEXT_V2_CAPTURE_V1",
      sourceMessagePk: input.finalTurnEvidence.sourceMessagePk,
      sourceOccurredAt: input.sourceOccurredAt.toISOString(),
      status: "BUILT",
      context,
      contextHash: context.contextHash,
      reasonCode: null,
    });
  } catch (error) {
    return ContextV2CaptureV1Schema.parse({
      schemaVersion: 1,
      contractVersion: "CONTEXT_V2_CAPTURE_V1",
      sourceMessagePk: input.finalTurnEvidence.sourceMessagePk,
      sourceOccurredAt: input.sourceOccurredAt.toISOString(),
      status: "BLOCKED",
      context: null,
      contextHash: null,
      reasonCode: terminalReasonCode(error),
    });
  }
}

export function blockedContextV2Capture(input: Readonly<{
  sourceMessagePk: string;
  sourceOccurredAt: Date;
  reasonCode: string;
}>): ContextV2CaptureV1 {
  return ContextV2CaptureV1Schema.parse({
    schemaVersion: 1,
    contractVersion: "CONTEXT_V2_CAPTURE_V1",
    sourceMessagePk: input.sourceMessagePk,
    sourceOccurredAt: input.sourceOccurredAt.toISOString(),
    status: "BLOCKED",
    context: null,
    contextHash: null,
    reasonCode: /^CONTEXT_V2_[A-Z0-9_]{1,96}$/u.test(input.reasonCode)
      ? input.reasonCode
      : "CONTEXT_V2_BUILD_FAILED",
  });
}
