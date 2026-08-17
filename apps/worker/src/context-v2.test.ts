import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CanonicalDecisionEvidenceV1 } from "@lana/business-tools";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";
import type {
  DeterministicEffectReadinessV1,
  FinalTurnEvidenceV2,
  ProductBindingV2,
  ProtectedClaimV1,
} from "@lana/contracts";
import { inspectContextV2Capture } from "@lana/database";
import {
  buildContextV2,
  buildContextV2Capture,
  parseContextV2WithIntegrity,
  type BuildContextV2Input,
} from "./context-v2.js";
import {
  CONTEXT_V2_CANDIDATE_MODEL_ID,
  CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
  ContextV2CandidateModel,
} from "./context-v2-candidate.js";

const hash = (character: string): string => character.repeat(64);

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

function finalTurnEvidence(): FinalTurnEvidenceV2 {
  return {
    schemaVersion: 2,
    contractVersion: "FINAL_TURN_EVIDENCE_V2",
    sourceMessagePk: "00000000-0000-4000-8000-000000000099",
    sourceMessageIdHash: hash("a"),
    preTransitionConversationRevision: 4,
    finalConversationRevision: 5,
    preTransitionSalesCycleRevision: 2,
    finalSalesCycleRevision: 3,
  };
}

function productBinding(): ProductBindingV2 {
  return {
    schemaVersion: 2,
    contractVersion: "PRODUCT_BINDING_V2",
    status: "RESOLVED",
    productIds: ["SD398"],
    catalogVersion: "catalog:1",
  };
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
      pageId: "page-1",
      conversationId: "conversation-1",
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
    checkedAt: "2026-08-16T10:00:00.000Z",
    expiresAt: "2026-08-16T10:01:00.000Z",
    reasonCodes: [],
    authorization: "NONE",
  } as unknown as DeterministicEffectReadinessV1;
}

function input(): BuildContextV2Input {
  return {
    canonicalEvidence: evidence(),
    verifiedClaims: claims(),
    finalCommerceState: state(),
    readiness: [readiness()],
    finalTurnEvidence: finalTurnEvidence(),
    productBinding: productBinding(),
    owner: "BOT",
    handoffReasonCode: null,
    now: new Date("2026-08-16T10:00:30.000Z"),
  };
}

describe("DF09 final Context V2 capture", () => {
  it("carries one BUILT snapshot through the exact claim gate to candidate egress", async () => {
    const capture = buildContextV2Capture({
      ...input(),
      sourceOccurredAt: new Date("2026-08-16T10:00:00.000Z"),
    });
    const client = {
      query: async () => ({ rows: [{ capture }] }),
    } as unknown as Parameters<typeof inspectContextV2Capture>[0];
    const eligibility = await inspectContextV2Capture(client, {
      conversationId: "00000000-0000-4000-8000-000000000010",
      sourceMessagePk: finalTurnEvidence().sourceMessagePk,
      sourceOccurredAt: new Date("2026-08-16T10:00:00.000Z"),
      now: new Date("2026-08-16T10:00:30.000Z"),
      terminalDeadlineMs: 5 * 60_000,
    });
    expect(eligibility.kind).toBe("BUILT_VALID");
    if (eligibility.kind !== "BUILT_VALID") throw new Error("TEST_BUILT_REQUIRED");
    const send = vi.fn(async (request: Readonly<{ url: string; body: string }>) => ({
      payload: {
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          schemaVersion: 1,
          contractVersion: "CONTEXT_V2_CANDIDATE_OUTPUT_V1",
          reply: "Ứng viên đánh giá, không gửi khách hàng.",
          strategy: "HOLD_POSITION",
          cta: "NONE",
        }) }] } }],
      },
      providerModelVersion: CONTEXT_V2_CANDIDATE_PROVIDER_VERSION,
      request,
    }));
    const generated = await new ContextV2CandidateModel(
      `projects/test/locations/us-central1/publishers/google/models/${CONTEXT_V2_CANDIDATE_MODEL_ID}`,
      { send },
    ).generateCandidate(eligibility.context);
    expect(send).toHaveBeenCalledOnce();
    expect(generated.requestIdentity.promptContentHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(JSON.stringify(send.mock.calls[0]?.[0])).not.toContain(
      finalTurnEvidence().sourceMessagePk,
    );
  });

  it("keeps the source capture gate default-off and absent from runtime wiring", () => {
    const runnerSource = readFileSync(
      new URL("./realtime-runner.ts", import.meta.url),
      "utf8",
    );
    const realtimeServerSource = readFileSync(
      new URL("./realtime-server.ts", import.meta.url),
      "utf8",
    );
    const phase4ServerSource = readFileSync(
      new URL("./phase4-server.ts", import.meta.url),
      "utf8",
    );
    expect(runnerSource).toContain(
      "contextV2CaptureEnabled: options.contextV2CaptureEnabled ?? false",
    );
    expect(realtimeServerSource).not.toContain("contextV2CaptureEnabled");
    expect(phase4ServerSource).not.toContain("contextV2CaptureEnabled");
  });

  it("binds pre-transition readiness to the final committed revisions", () => {
    const context = buildContextV2(input());
    expect(context.finalTurnEvidence).toEqual(finalTurnEvidence());
    expect(context.phase.salesCycleRevision).toBe(3);
    expect(context.barriers.conversationRevision).toBe(5);
    expect(context.cartReadiness?.readinessHash).toBe(hash("1"));
    expect(parseContextV2WithIntegrity(context)).toEqual(context);
  });

  it("changes integrity identity when any final-turn evidence field changes", () => {
    const context = buildContextV2(input());
    for (const [field, value] of [
      ["sourceMessagePk", "00000000-0000-4000-8000-000000000098"],
      ["sourceMessageIdHash", hash("9")],
      ["preTransitionConversationRevision", 3],
      ["finalConversationRevision", 6],
      ["preTransitionSalesCycleRevision", 1],
      ["finalSalesCycleRevision", 4],
    ] as const) {
      expect(() => parseContextV2WithIntegrity({
        ...context,
        finalTurnEvidence: {
          ...context.finalTurnEvidence,
          [field]: value,
        },
      }), field).toThrow();
    }
  });

  it("persists an exact allowlisted capture key-set", () => {
    const capture = buildContextV2Capture({
      ...input(),
      sourceOccurredAt: new Date("2026-08-16T10:00:00.000Z"),
    });
    expect(Object.keys(capture).sort()).toEqual([
      "context",
      "contextHash",
      "contractVersion",
      "reasonCode",
      "schemaVersion",
      "sourceMessagePk",
      "sourceOccurredAt",
      "status",
    ]);
    expect(capture.status).toBe("BUILT");
  });

  it("terminally blocks invalid input without throwing into the live plan", () => {
    const capture = buildContextV2Capture({
      ...input(),
      readiness: [{ ...readiness(), conversationRevision: 3 }],
      sourceOccurredAt: new Date("2026-08-16T10:00:00.000Z"),
    });
    expect(capture).toMatchObject({
      status: "BLOCKED",
      context: null,
      contextHash: null,
      reasonCode: "CONTEXT_V2_READINESS_BINDING_MISMATCH",
    });
  });
});
