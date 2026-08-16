import { describe, expect, it } from "vitest";
import {
  buildContextV2,
  contextV2ConsumerInputs,
  contextV2ModelInput,
} from "./context-v2.js";
import type {
  CanonicalDecisionEvidenceV1,
} from "@lana/business-tools";
import type {
  DeterministicEffectReadinessV1,
  ProtectedClaimV1,
} from "@lana/contracts";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";

const hash = (character: string): string => character.repeat(64);
const sha = (character: string): `sha256:${string}` => `sha256:${hash(character)}`;

function evidence(): CanonicalDecisionEvidenceV1 {
  return {
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
      decision: "COMMITTED",
      requestedAction: "OPEN_CART",
      quantity: 1,
      productId: "SD398",
      contributors: ["DETERMINISTIC_RUNTIME"],
      sourceMessageIdHash: hash("a"),
      evidenceHash: hash("c"),
      reasonCodes: ["DIRECT_PURCHASE_VERB"],
      evaluatedAt: "2026-08-16T10:00:00.000Z",
      authorization: "NONE",
    },
  };
}

function state(): SalesCycleRuntimeState {
  return {
    schemaVersion: 2,
    conversationKey: "conversation-1",
    routing: { pageId: "page-1", conversationId: "conversation-1" },
    revision: 3,
    stage: "CART_OPEN",
    cart: {
      value: {} as never,
      expiresAt: "2026-08-18T10:00:00.000Z",
    },
    commerceContext: null,
    negotiation: null,
    checkoutDraft: null,
    clarification: null,
    preview: null,
    confirmation: null,
    processedCommandIds: [],
    updatedAt: "2026-08-16T10:00:00.000Z",
  };
}

function claims(): readonly ProtectedClaimV1[] {
  return [{
    schemaVersion: 1,
    claimId: "00000000-0000-4000-8000-000000000001",
    type: "PRICE",
    scope: { kind: "PRODUCT", productId: "SD398", variantId: null },
    value: { amountVnd: 699_000, currency: "VND" },
    provenance: {
      authority: "POS_SNAPSHOT",
      sourceVersion: "pos:1",
      evidenceRef: "price:SD398",
      contentHash: hash("d"),
      observedAt: "2026-08-16T10:00:00.000Z",
      expiresAt: "2026-08-16T10:05:00.000Z",
    },
    authorization: "NONE",
  }];
}

function readiness(): DeterministicEffectReadinessV1 {
  return {
    schemaVersion: 1,
    rulesetVersion: "DETERMINISTIC_EFFECT_READINESS_V1",
    effect: "CART_READY",
    outcome: "READY",
    pageId: "page-1",
    conversationId: "conversation-1",
    sourceMessageIdHash: hash("a"),
    conversationRevision: 5,
    salesCycleRevision: 3,
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
      pageId: "page-1",
      conversationId: "conversation-1",
      sourceMessageIdHash: hash("a"),
      conversationRevision: 5,
      salesCycleRevision: 3,
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
    protectedClaimTypes: ["PRICE", "STOCK"],
    checkedAt: "2026-08-16T10:00:00.000Z",
    expiresAt: "2026-08-16T10:01:00.000Z",
    reasonCodes: [],
    authorization: "NONE",
  } as unknown as DeterministicEffectReadinessV1;
}

describe("DF09 Context V2 construction", () => {
  it("binds canonical evidence, typed claims, derived phase/barriers and readiness", () => {
    const context = buildContextV2({
      canonicalEvidence: evidence(),
      verifiedClaims: claims(),
      commerceState: state(),
      readiness: [readiness()],
      productScope: "RESOLVED",
      conversationRevision: 5,
      owner: "BOT",
      handoffReasonCode: null,
      now: new Date("2026-08-16T10:00:30.000Z"),
    });
    expect(context.phase.phase).toBe("CART_ACTIVE");
    expect(context.barriers.active).toEqual([]);
    expect(context.verifiedClaimTypes).toEqual(["PRICE"]);
    expect(context.cartReadiness?.readinessHash).toBe(hash("1"));
    expect(context.contextHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(context)).not.toContain("customer-hash");
    const modelInput = JSON.stringify(contextV2ModelInput(context));
    expect(modelInput).not.toMatch(
      /claimId|evidenceRef|customerProfileId|sourceMessageIdHash|cartId/u,
    );
  });

  it("projects every intended consumer from the same immutable context hash", () => {
    const context = buildContextV2({
      canonicalEvidence: evidence(),
      verifiedClaims: claims(),
      commerceState: state(),
      readiness: [readiness()],
      productScope: "RESOLVED",
      conversationRevision: 5,
      owner: "BOT",
      handoffReasonCode: null,
      now: new Date("2026-08-16T10:00:30.000Z"),
    });
    const consumers = contextV2ConsumerInputs(context);
    expect(consumers.strategy.contextHash).toBe(context.contextHash);
    expect(consumers.cta.contextHash).toBe(context.contextHash);
    expect(consumers.postMedia.contextHash).toBe(context.contextHash);
    expect(consumers.outputInterpretation.contextHash).toBe(context.contextHash);
    expect(consumers.audit.contextHash).toBe(context.contextHash);
    expect(consumers.outputInterpretation.verifiedClaims).toEqual(context.verifiedClaims);
    expect(() => contextV2ConsumerInputs({
      ...context,
      ownership: { owner: "HUMAN", handoffActive: true, reasonCode: "TEST" },
    })).toThrow("CONTEXT_V2_INTEGRITY_MISMATCH");
  });

  it("keeps handoff ownership separate from phase and barriers", () => {
    const handedOff = { ...state(), stage: "HANDED_OFF" as const };
    const context = buildContextV2({
      canonicalEvidence: evidence(),
      verifiedClaims: claims(),
      commerceState: handedOff,
      readiness: [{ ...readiness(), conversationRevision: 6 }],
      productScope: "RESOLVED",
      conversationRevision: 6,
      owner: "HUMAN",
      handoffReasonCode: "PAYMENT_RECEIPT_REVIEW_REQUIRED",
      now: new Date("2026-08-16T10:00:30.000Z"),
    });
    expect(context.phase.phase).toBe("CART_ACTIVE");
    expect(context.barriers.active).toEqual([]);
    expect(context.ownership).toEqual({
      owner: "HUMAN",
      handoffActive: true,
      reasonCode: "PAYMENT_RECEIPT_REVIEW_REQUIRED",
    });
  });

  it("rejects canonical evidence whose dialogue and buying-intent identities diverge", () => {
    const original = evidence();
    const mismatched: CanonicalDecisionEvidenceV1 = {
      ...original,
      dialogueEvidence: {
        ...original.dialogueEvidence,
        sourceMessageIdHash: hash("9"),
      },
    };
    expect(() => buildContextV2({
      canonicalEvidence: mismatched,
      verifiedClaims: claims(),
      commerceState: state(),
      readiness: [readiness()],
      productScope: "RESOLVED",
      conversationRevision: 5,
      owner: "BOT",
      handoffReasonCode: null,
      now: new Date("2026-08-16T10:00:30.000Z"),
    })).toThrow("CONTEXT_V2_EVIDENCE_BINDING_MISMATCH");
  });

  it("closes stale and cross-revision evidence before producing a context hash", () => {
    const base = {
      canonicalEvidence: evidence(),
      verifiedClaims: claims(),
      commerceState: state(),
      productScope: "RESOLVED" as const,
      conversationRevision: 5,
      owner: "BOT" as const,
      handoffReasonCode: null,
      now: new Date("2026-08-16T10:00:30.000Z"),
    };
    expect(() => buildContextV2({
      ...base,
      readiness: [{ ...readiness(), conversationRevision: 4 }],
    })).toThrow("CONTEXT_V2_READINESS_BINDING_MISMATCH");
    expect(() => buildContextV2({
      ...base,
      verifiedClaims: claims().map((claim) => ({
        ...claim,
        provenance: {
          ...claim.provenance,
          expiresAt: "2026-08-16T10:00:00.000Z",
        },
      })),
      readiness: [readiness()],
    })).toThrow("CONTEXT_V2_CLAIM_STALE");
  });
});
