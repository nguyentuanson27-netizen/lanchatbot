import { describe, expect, it } from "vitest";
import type { CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type {
  DeterministicEffectReadinessV1,
  FinalTurnEvidenceV2,
  ProductBindingV2,
  ProtectedClaimV1,
} from "@lana/contracts";
import {
  buildContextV2Capture,
  type BuildContextV2Input,
} from "./context-v2.js";
import { buildTrackCOfflineCandidateRequest } from "./track-c-offline-candidate.js";

const hash = (character: string): string => character.repeat(64);
const snapshotAt = new Date("2026-09-05T00:00:00.000Z");

function capture(options: Readonly<{
  claimProductId?: string;
  claimObservedAt?: Date;
  readinessExpiresAt?: string;
  captureAt?: Date;
}> = {}) {
  const claimProductId = options.claimProductId ?? "SD398";
  const claimObservedAt = options.claimObservedAt ?? snapshotAt;
  const captureAt = options.captureAt ?? snapshotAt;
  const finalTurnEvidence: FinalTurnEvidenceV2 = {
    schemaVersion: 2,
    contractVersion: "FINAL_TURN_EVIDENCE_V2",
    sourceMessagePk: "00000000-0000-4000-8000-000000000099",
    sourceMessageIdHash: hash("a"),
    preTransitionConversationRevision: 4,
    finalConversationRevision: 5,
    preTransitionSalesCycleRevision: 2,
    finalSalesCycleRevision: 3,
  };
  const canonicalEvidence: CanonicalDecisionEvidenceV1 = {
    dialogueEvidence: {
      schemaVersion: 1,
      contractVersion: "CANONICAL_DIALOGUE_EVIDENCE_V1",
      act: "REQUEST",
      contributors: ["DETERMINISTIC_RUNTIME"],
      confidenceBand: "HIGH",
      sourceMessageIdHash: hash("a"),
      evidenceHash: hash("b"),
      reasonCodes: ["DIRECT_PURCHASE_VERB"],
      authorization: "NONE",
    },
    buyingIntent: {
      schemaVersion: 1,
      authorityVersion: "CANONICAL_BUYING_INTENT_V1",
      decision: "CONSIDERING",
      requestedAction: "NONE",
      quantity: null,
      productId: "SD398",
      contributors: ["DETERMINISTIC_RUNTIME"],
      sourceMessageIdHash: hash("a"),
      evidenceHash: hash("c"),
      reasonCodes: ["DIRECT_PURCHASE_VERB"],
      evaluatedAt: snapshotAt.toISOString(),
      authorization: "NONE",
    },
  };
  const finalCommerceState: SalesCycleRuntimeState = {
    schemaVersion: 2,
    conversationKey: "track-c-offline-fixture",
    routing: { pageId: "fixture-page", conversationId: "track-c-offline-fixture" },
    revision: 3,
    stage: "DISCOVERY",
    cart: null,
    commerceContext: null,
    negotiation: null,
    checkoutDraft: null,
    clarification: null,
    preview: null,
    confirmation: null,
    processedCommandIds: [],
    updatedAt: snapshotAt.toISOString(),
  };
  const verifiedClaims: readonly ProtectedClaimV1[] = [{
    schemaVersion: 1,
    claimId: "00000000-0000-4000-8000-000000000001",
    type: "PRICE",
    scope: { kind: "PRODUCT", productId: claimProductId, variantId: null },
    value: { amountVnd: 1_199_000, currency: "VND" },
    provenance: {
      authority: "POS_SNAPSHOT",
      sourceVersion: "fixture:1",
      evidenceRef: "fixture:price:SD398",
      contentHash: hash("d"),
      observedAt: claimObservedAt.toISOString(),
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
    authorization: "NONE",
  }];
  const productBinding: ProductBindingV2 = {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: "RESOLVED",
    productIds: ["SD398"],
    catalogVersion: "fixture:catalog:1",
  };
  const readiness = options.readinessExpiresAt === undefined
    ? []
    : [{
      schemaVersion: 1,
      rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
      effect: "CART_READY",
      outcome: "READY",
      pageId: "fixture-page",
      conversationId: "track-c-offline-fixture",
      sourceMessageIdHash: hash("a"),
      conversationRevision: 4,
      salesCycleRevision: 2,
      productIds: ["SD398"],
      cartId: "00000000-0000-4000-8000-000000000010",
      cartVersion: 1,
      cartStateHash: hash("e"),
      orderPreviewId: null,
      orderPreviewHash: null,
      buyingIntentHash: hash("c"),
      deterministicEvidenceHash: null,
      claimSetHash: hash("f"),
      binding: {
        schemaVersion: 1,
        contractVersion: "EFFECT_BINDING_V1",
        pageId: "fixture-page",
        conversationId: "track-c-offline-fixture",
        sourceMessageIdHash: hash("a"),
        conversationRevision: 4,
        salesCycleRevision: 2,
        productIds: ["SD398"],
        cart: {
          cartId: "00000000-0000-4000-8000-000000000010",
          cartRevision: 1,
          cartStateHash: hash("e"),
        },
        preview: null,
        claimSetHash: hash("f"),
        parentReadinessHash: null,
        payloadHash: null,
      },
      bindingHash: hash("0"),
      readinessHash: hash("1"),
      protectedClaimTypes: ["PRICE"],
      checkedAt: snapshotAt.toISOString(),
      expiresAt: options.readinessExpiresAt,
      reasonCodes: [],
      authorization: "NONE",
    } as unknown as DeterministicEffectReadinessV1];
  const input: BuildContextV2Input = {
    canonicalEvidence,
    verifiedClaims,
    finalCommerceState,
    readiness,
    finalTurnEvidence,
    productBinding,
    owner: "BOT",
    handoffReasonCode: null,
    now: captureAt,
  };
  return buildContextV2Capture({ ...input, sourceOccurredAt: captureAt });
}

const modelResource =
  "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const candidatePrompt = "Offline-only candidate prompt for bounded Track C evaluation.";

describe("Track C offline candidate boundary", () => {
  it("builds a distinct, identity-pinned request from an integrity-valid frozen capture", () => {
    const request = buildTrackCOfflineCandidateRequest({
      modelResource,
      capture: capture(),
      evaluationAt: snapshotAt,
      systemInstruction: candidatePrompt,
    });

    expect(request.identity.systemInstructionHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(request.identity.promptContentHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(request.body).toContain(candidatePrompt);
    expect(request.body).not.toContain("fixture:price:SD398");
  });

  it.each([
    ["missing", null, snapshotAt, "TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INVALID"],
    ["blocked", { ...capture(), status: "BLOCKED", context: null, contextHash: null, reasonCode: "CONTEXT_V2_BUILD_FAILED" }, snapshotAt, "TRACK_C_OFFLINE_CANDIDATE_CAPTURE_UNAVAILABLE"],
    ["source mismatch", { ...capture(), sourceMessagePk: "00000000-0000-4000-8000-000000000098" }, snapshotAt, "TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INVALID"],
    ["expired", capture(), new Date("2100-01-01T00:00:00.000Z"), "TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE"],
  ] as const)("fails closed for %s snapshots", (_name, invalidCapture, evaluationAt, errorCode) => {
    expect(() => buildTrackCOfflineCandidateRequest({
      modelResource,
      capture: invalidCapture,
      evaluationAt,
      systemInstruction: candidatePrompt,
    })).toThrow(errorCode);
  });

  it("fails closed when capture integrity is malformed", () => {
    const valid = capture();
    expect(valid.status).toBe("BUILT");
    if (valid.status !== "BUILT") throw new Error("TEST_CAPTURE_REQUIRED");
    expect(() => buildTrackCOfflineCandidateRequest({
      modelResource,
      capture: {
        ...valid,
        context: { ...valid.context!, contextHash: hash("e") },
      },
      evaluationAt: snapshotAt,
      systemInstruction: candidatePrompt,
    })).toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INVALID");
  });

  it("fails closed when a valid snapshot carries a mismatched product claim", () => {
    expect(() => buildTrackCOfflineCandidateRequest({
      modelResource,
      capture: capture({ claimProductId: "SD399" }),
      evaluationAt: snapshotAt,
      systemInstruction: candidatePrompt,
    })).toThrow("TRACK_C_OFFLINE_CANDIDATE_PRODUCT_BINDING_MISMATCH");
  });

  it("fails closed when frozen cart readiness has expired", () => {
    expect(() => buildTrackCOfflineCandidateRequest({
      modelResource,
      capture: capture({ readinessExpiresAt: "2026-09-05T00:00:30.000Z" }),
      evaluationAt: new Date("2026-09-05T00:00:31.000Z"),
      systemInstruction: candidatePrompt,
    })).toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE");
  });

  it("fails closed when a claim was observed too far after evaluation time", () => {
    expect(() => buildTrackCOfflineCandidateRequest({
      modelResource,
      capture: capture({
        claimObservedAt: new Date("2026-09-05T00:05:01.000Z"),
        captureAt: new Date("2026-09-05T00:06:00.000Z"),
      }),
      evaluationAt: snapshotAt,
      systemInstruction: candidatePrompt,
    })).toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_STALE");
  });
});
