import { describe, expect, it } from "vitest";
import type { CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type {
  FinalTurnEvidenceV2,
  ProductBindingV2,
  ProtectedClaimV1,
} from "@lana/contracts";
import { buildContextV2Capture } from "./context-v2.js";
import { buildTrackCOfflineCandidateRequest } from "./track-c-offline-candidate.js";
import {
  TRACK_C_C3_SALES_QUALITY_CANDIDATE,
  TRACK_C_C3_SALES_QUALITY_SYSTEM_INSTRUCTION,
  buildTrackCC3SalesQualityCandidateRequest,
} from "./track-c-c3-sales-quality-candidate.js";

const hash = (character: string): string => character.repeat(64);
const snapshotAt = new Date("2026-09-05T00:00:00.000Z");
const modelResource =
  "projects/track-c-fixture/locations/global/publishers/google/models/gemini-3.5-flash-lite";
const evaluationContext = [{
  direction: "INBOUND",
  senderType: "CUSTOMER",
  messageType: "TEXT",
  text: "Mẫu SD398 còn hàng không?",
  attachmentCount: 0,
  occurredAt: snapshotAt.toISOString(),
}] as const;

function validCapture() {
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
    conversationKey: "track-c-c3-fixture",
    routing: { pageId: "fixture-page", conversationId: "track-c-c3-fixture" },
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
    scope: { kind: "PRODUCT", productId: "SD398", variantId: null },
    value: { amountVnd: 1_199_000, currency: "VND" },
    provenance: {
      authority: "POS_SNAPSHOT",
      sourceVersion: "fixture:1",
      evidenceRef: "fixture:price:SD398",
      contentHash: hash("d"),
      observedAt: snapshotAt.toISOString(),
      expiresAt: "2099-01-01T00:00:00.000Z",
    },
    authorization: "NONE",
  }];
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
  const productBinding: ProductBindingV2 = {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: "RESOLVED",
    productIds: ["SD398"],
    catalogVersion: "fixture:catalog:1",
  };
  return buildContextV2Capture({
    canonicalEvidence,
    verifiedClaims,
    finalCommerceState,
    readiness: [],
    finalTurnEvidence,
    productBinding,
    owner: "BOT",
    handoffReasonCode: null,
    now: snapshotAt,
    sourceOccurredAt: snapshotAt,
  });
}

describe("Track C C3 sales-quality candidate", () => {
  it("declares one bounded prompt hypothesis without changing the generator", () => {
    expect(TRACK_C_C3_SALES_QUALITY_CANDIDATE).toEqual({
      id: "TRACK_C_C3_SALES_QUALITY_V2",
      primaryHypothesis:
        "Use the exact frozen customer turn to answer only the requested need, concisely and without unrelated verified facts.",
      materialAxes: ["PROMPT"],
      generatorModel: "gemini-3.5-flash-lite",
      providerModelVersion: "gemini-3.5-flash-lite",
    });
  });

  it("adds bounded naturalness and CTA guidance without inventing unavailable objection context", () => {
    const instruction = TRACK_C_C3_SALES_QUALITY_SYSTEM_INSTRUCTION;

    expect(instruction).toContain(
      "never override the first-matching canonical-state rules, verified-claim requirements, provenance, guard, or effect restrictions",
    );
    expect(instruction).toContain(
      "use concise natural wording and avoid greetings, restatements, or repeated verified facts that do not add information",
    );
    expect(instruction).toContain(
      "use at most one smallest useful next-step objective",
    );
    expect(instruction).toContain(
      "Answer only the need expressed in the latest customer message",
    );
    expect(instruction).toContain(
      "do not enumerate unrelated eligible verified claims",
    );
    expect(instruction).toContain(
      "unverified external link",
    );
    expect(instruction).toContain(
      "A required CLARIFICATION plus its matching ACTION_REQUEST counts as one next-step objective",
    );
    expect(instruction).toContain("do not create urgency or pressure");
    expect(instruction).not.toMatch(/objection|hesitation|actual question|actual concern/iu);

    expect(instruction).toContain("Use only the verified claims and canonical state in Context V2.");
    expect(instruction).toContain("Never claim to have sent a message, changed a cart, confirmed an order, or performed any side effect.");
    expect(instruction).toContain("PRODUCT_CONTEXT_UNREADY");
    expect(instruction).toContain("MEASUREMENTS_REQUIRED");
    expect(instruction).toContain("Do not claim stock, availability, price, delivery");
    expect(instruction).toContain("Return only the registered JSON response schema.");
  });

  it("changes only the system prompt relative to the existing offline candidate request", () => {
    const capture = validCapture();
    expect(capture.status).toBe("BUILT");
    if (capture.status !== "BUILT" || capture.context === null) {
      throw new Error("TEST_CAPTURE_REQUIRED");
    }

    const base = buildTrackCOfflineCandidateRequest({
      modelResource,
      capture,
      evaluationAt: snapshotAt,
      evaluationContext,
      systemInstruction: "Base offline Track C candidate.",
    });
    const candidate = buildTrackCC3SalesQualityCandidateRequest({
      modelResource,
      capture,
      evaluationAt: snapshotAt,
      evaluationContext,
    });
    const baseBody = JSON.parse(base.body) as {
      systemInstruction: unknown;
      contents: unknown;
      generationConfig: unknown;
      safetySettings: unknown;
    };
    const candidateBody = JSON.parse(candidate.body) as typeof baseBody;

    expect(candidate.url).toBe(base.url);
    expect(candidateBody.contents).toEqual(baseBody.contents);
    expect(candidateBody.generationConfig).toEqual(baseBody.generationConfig);
    expect(candidateBody.safetySettings).toEqual(baseBody.safetySettings);
    expect(candidateBody.systemInstruction).toEqual({
      parts: [{ text: TRACK_C_C3_SALES_QUALITY_SYSTEM_INSTRUCTION }],
    });
    expect(candidateBody.systemInstruction).not.toEqual(baseBody.systemInstruction);

    expect(candidate.identity.modelResource).toBe(base.identity.modelResource);
    expect(candidate.identity.promptContentHash).toBe(base.identity.promptContentHash);
    expect(candidate.identity.responseSchemaHash).toBe(base.identity.responseSchemaHash);
    expect(candidate.identity.generationConfigHash).toBe(base.identity.generationConfigHash);
    expect(candidate.identity.safetySettingsHash).toBe(base.identity.safetySettingsHash);
    expect(candidate.identity.systemInstructionHash).not.toBe(base.identity.systemInstructionHash);
    expect(candidate.identity.requestEnvelopeHash).not.toBe(base.identity.requestEnvelopeHash);
  });

  it("uses the existing fail-closed frozen-capture request boundary", () => {
    expect(() => buildTrackCC3SalesQualityCandidateRequest({
      modelResource,
      capture: null,
      evaluationAt: snapshotAt,
      evaluationContext,
    })).toThrow("TRACK_C_OFFLINE_CANDIDATE_CAPTURE_INVALID");
  });
});
