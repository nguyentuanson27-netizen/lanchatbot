import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { buildProductAttributesV1 } from "@lana/business-tools";
import { canonicalJsonV1, type ContextV2CaptureV1 } from "@lana/contracts";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5CompactCase,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import { runTrackCV5TwoPassBenchmarkCase } from "./track-c-c3-v5-benchmark-runner.js";

const MODEL_RESOURCE =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const EVAL_ROOT = new URL("../evals/track-c-c3-v5/v4/", import.meta.url);

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, EVAL_ROOT), "utf8")) as T;
}

const recipe = readJson<TrackCV5MaterializationRecipe>(
  "runtime-materialization.json",
);
const facts = readJson<{
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
  simulation_fact_catalog: Record<string, unknown>;
}>("facts.json");

function fixture(ref: string): TrackCV5CompactCase {
  return {
    id: `V5_TEST_${ref}`,
    latest_customer_message: "Mẫu này bao nhiêu em?",
    context: {
      product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
      phase: "BROWSING",
      canonical_flags: [],
      buying_intent: {
        decision: "NONE",
        requested_action: "NONE",
        quantity: null,
        evidence: null,
      },
      source_stage: null,
      runtime_claim_refs: [ref],
    },
  };
}

function multiProductFixture(): TrackCV5CompactCase {
  return {
    id: "V5_TEST_MULTI_PRICE",
    latest_customer_message: "Hai mẫu này giá từng mẫu bao nhiêu em?",
    context: {
      product_binding: {
        status: "RESOLVED",
        product_ids: ["SQ9012", "SV9031"],
      },
      phase: "BROWSING",
      canonical_flags: [],
      buying_intent: {
        decision: "NONE",
        requested_action: "NONE",
        quantity: null,
        evidence: null,
      },
      source_stage: null,
      runtime_claim_refs: ["RC_PRICE_A", "RC_PRICE_B"],
    },
  };
}

function dialogue(): readonly ShadowContextMessage[] {
  return [{
    direction: "INBOUND",
    senderType: "CUSTOMER",
    messageType: "TEXT",
    text: "Mẫu này bao nhiêu em?",
    attachmentCount: 0,
    occurredAt: "2026-09-10T01:59:00.000Z",
  }];
}

function providerPayload(value: unknown) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  };
}

function planPayload() {
  return providerPayload({
    currentNeed: "Answer the current price question.",
    mustResolve: "Give the verified price directly.",
    conversationRead: "The product is already resolved.",
    nextMove: "NONE",
    avoid: "Do not invent another fact.",
  });
}

function freshCapture(
  lane: "PRODUCTION_CONTRACT" | "BEHAVIOR_SIMULATION" = "PRODUCTION_CONTRACT",
) {
  return materializeTrackCV5CaseCapture({
    lane,
    fixture: fixture("RC_PRICE_A"),
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
}

function captureWithProductAttributes(): ContextV2CaptureV1 {
  const capture = freshCapture();
  if (capture.status !== "BUILT" || capture.context === null) {
    throw new Error("TEST_V5_BUILT_CAPTURE_REQUIRED");
  }
  const attributes = buildProductAttributesV1({
    productId: "SQ9012",
    data: {
      materials: ["LỤA"],
      materialComponents: { AO: ["LỤA"] },
      colors: ["ĐEN"],
      styles: ["THANH LỊCH"],
      silhouettes: ["CHIẾT EO"],
      occasions: ["ĐI LÀM"],
      designAttributes: { waist: ["CHIẾT EO"] },
      careInstructions: null,
      wearProperties: null,
      backCoverage: "FULL",
      designComplexity: "MINIMAL",
    },
    observedAt: recipe.evaluation_at,
  });
  const { contextHash: _oldContextHash, ...oldDraft } = capture.context;
  const draft = { ...oldDraft, productAttributes: attributes };
  const contextHash = createHash("sha256")
    .update(`CONTEXT_V2\n${canonicalJsonV1(draft)}`, "utf8")
    .digest("hex");
  return {
    ...capture,
    context: { ...draft, contextHash },
    contextHash,
  };
}

function successfulTransport() {
  return vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({
      payload: planPayload(),
      providerModelVersion: "gemini-3.5-flash-lite",
    })
    .mockResolvedValueOnce({
      payload: providerPayload({
        segments: [{
          kind: "VERIFIED_CLAIM",
          text: "Mẫu này hiện 849k chị ạ.",
          claimRef: "CLAIM_001",
        }],
        strategy: "ANSWER_VERIFIED_FACTS",
        cta: "NONE",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });
}

describe("Track C C3 V5 benchmark runner", () => {
  it("derives production dialogue evidence through the canonical producer", () => {
    const capture = freshCapture();
    if (capture.status !== "BUILT" || capture.context === null) {
      throw new Error("TEST_V5_BUILT_CAPTURE_REQUIRED");
    }
    expect(capture.context.dialogueEvidence.act).toBe("QUESTION");
  });

  it("runs exactly strategist then responder and binds claimRef to frozen provenance", async () => {
    const capture = freshCapture();
    if (capture.status !== "BUILT" || capture.context === null) {
      throw new Error("TEST_V5_BUILT_CAPTURE_REQUIRED");
    }
    const send = successfulTransport();

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      transport: { send },
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.executionLane).toBe("PRODUCTION_CONTRACT");
    expect(result.sideEffects).toBe("DISABLED");
    expect(result.output.segments).toEqual([{
      kind: "VERIFIED_CLAIM",
      text: "Mẫu này hiện 849k chị ạ.",
      claimContentHash: capture.context.verifiedClaims[0]?.provenance.contentHash,
    }]);
    expect(result.identity.captureContextHash).toBe(capture.context.contextHash);
    expect(result.identity.compositionHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(send.mock.calls.map(([request]) => request.body).join("\n"))
      .not.toContain("benchmarkSimulationFacts");
  });

  it("binds product-attribute claimRef to the integrity-valid Context V2 evidence", async () => {
    const capture = captureWithProductAttributes();
    if (capture.status !== "BUILT" || capture.context === null ||
        capture.context.productAttributes === null ||
        capture.context.productAttributes === undefined) {
      throw new Error("TEST_V5_PRODUCT_ATTRIBUTES_REQUIRED");
    }
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: planPayload(),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: providerPayload({
          segments: [{
            kind: "VERIFIED_CLAIM",
            text: "Mẫu này dùng chất liệu lụa ạ.",
            claimRef: "PRODUCT_ATTRIBUTES_001",
          }],
          strategy: "ANSWER_VERIFIED_FACTS",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      transport: { send },
    });

    expect(result.output.segments).toEqual([{
      kind: "VERIFIED_CLAIM",
      text: "Mẫu này dùng chất liệu lụa ạ.",
      claimContentHash:
        capture.context.productAttributes.metadata.contentHash,
    }]);
    expect(result.sideEffects).toBe("DISABLED");
  });

  it("guards multi-product verified claims against each exact product scope", async () => {
    const capture = materializeTrackCV5CaseCapture({
      lane: "PRODUCTION_CONTRACT",
      fixture: multiProductFixture(),
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    if (capture.status !== "BUILT" || capture.context === null) {
      throw new Error("TEST_V5_MULTI_CAPTURE_REQUIRED");
    }
    const segments = capture.context.verifiedClaims.map((claim, index) => {
      if (claim.type !== "PRICE" || claim.scope.kind !== "PRODUCT") {
        throw new Error("TEST_V5_MULTI_PRICE_CLAIM_REQUIRED");
      }
      return {
        kind: "VERIFIED_CLAIM" as const,
        text: `${claim.scope.productId} hiện ${claim.value.amountVnd / 1_000}k chị ạ.`,
        claimRef: `CLAIM_${String(index + 1).padStart(3, "0")}`,
      };
    });
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: planPayload(),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: providerPayload({
          segments,
          strategy: "ANSWER_VERIFIED_FACTS",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      transport: { send },
    });

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.output.segments).toHaveLength(2);
    expect(result.output.segments.every(({ kind }) => kind === "VERIFIED_CLAIM"))
      .toBe(true);
  });

  it("blocks protected price text hidden inside a GENERAL production segment", async () => {
    const capture = freshCapture();
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: planPayload(),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: providerPayload({
          segments: [{
            kind: "GENERAL",
            text: "Mẫu này hiện 999k chị ạ.",
          }],
          strategy: "ANSWER_VERIFIED_FACTS",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_PRODUCTION_GUARD_FAILED:UNAUTHORIZED_PRICE");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("fails closed when SIZE_FIT evidence basis has no registered mapping", () => {
    const sizeClaim = facts.runtime_claim_catalog.RC_SIZE_A_M;
    if (sizeClaim === undefined) throw new Error("TEST_V5_SIZE_FIXTURE_REQUIRED");
    const catalog = {
      ...facts.runtime_claim_catalog,
      RC_SIZE_BAD_BASIS: {
        ...sizeClaim,
        value: { ...sizeClaim.value, evidenceBasis: "unregistered basis" },
      },
    };

    expect(() => materializeTrackCV5CaseCapture({
      lane: "PRODUCTION_CONTRACT",
      fixture: fixture("RC_SIZE_BAD_BASIS"),
      runtimeClaimCatalog: catalog,
      recipe,
    })).toThrow("TRACK_C_V5_SIZE_EVIDENCE_BASIS_UNMAPPED:RC_SIZE_BAD_BASIS");
  });

  it("fails closed when a cart-scoped runtime claim omits cartVersion", () => {
    const shippingClaim = facts.runtime_claim_catalog.RC_SHIP_30;
    if (shippingClaim === undefined) throw new Error("TEST_V5_SHIP_FIXTURE_REQUIRED");
    const catalog = {
      ...facts.runtime_claim_catalog,
      RC_SHIP_BAD_SCOPE: {
        ...shippingClaim,
        scope: { kind: "CART" as const },
      },
    };

    expect(() => materializeTrackCV5CaseCapture({
      lane: "PRODUCTION_CONTRACT",
      fixture: fixture("RC_SHIP_BAD_SCOPE"),
      runtimeClaimCatalog: catalog,
      recipe,
    })).toThrow("TRACK_C_V5_CART_SCOPE_INVALID:RC_SHIP_BAD_SCOPE");
  });

  it("injects simulation facts only on the behavior-simulation request path", async () => {
    const capture = freshCapture("BEHAVIOR_SIMULATION");
    const send = successfulTransport();
    const simulationFact = facts.simulation_fact_catalog.SF_PRODUCT_A;

    const result = await runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      simulationFacts: [simulationFact],
      transport: { send },
    });

    expect(result.executionLane).toBe("BEHAVIOR_SIMULATION");
    expect(send).toHaveBeenCalledTimes(2);
    for (const [request] of send.mock.calls) {
      expect(request.body).toContain("benchmarkExecutionLane");
      expect(request.body).toContain("benchmarkSimulationFacts");
      expect(request.body).toContain("BEHAVIOR_SIMULATION");
    }
  });

  it("rejects any simulation-fact leak on the production path before provider execution", async () => {
    const capture = freshCapture();
    const send = vi.fn<CandidateVertexTransport["send"]>();

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      simulationFacts: [facts.simulation_fact_catalog.SF_PRODUCT_A],
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_PRODUCTION_SIMULATION_FACT_LEAK");
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects stale protected evidence before the first provider call", async () => {
    const capture = materializeTrackCV5CaseCapture({
      lane: "PRODUCTION_CONTRACT",
      fixture: fixture("RC_PRICE_A_EXPIRED"),
      runtimeClaimCatalog: facts.runtime_claim_catalog,
      recipe,
    });
    const send = vi.fn<CandidateVertexTransport["send"]>();

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_PRE_MODEL_REJECT");
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects responder effect claims instead of turning model text into authority", async () => {
    const capture = freshCapture();
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: providerPayload({
          currentNeed: "Answer the current question.",
          mustResolve: "Stay within verified evidence.",
          conversationRead: "The product is resolved.",
          nextMove: "NONE",
          avoid: "Do not claim effects.",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      })
      .mockResolvedValueOnce({
        payload: providerPayload({
          segments: [{
            kind: "EFFECT_CLAIM",
            text: "Em đã tạo đơn cho chị.",
            effect: "ORDER_PLACED",
          }],
          strategy: "HOLD_POSITION",
          cta: "NONE",
        }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "PRODUCTION_CONTRACT",
      modelResource: MODEL_RESOURCE,
      capture,
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue(),
      transport: { send },
    })).rejects.toThrow("TRACK_C_V5_EFFECT_CLAIM_FORBIDDEN");
    expect(send).toHaveBeenCalledTimes(2);
  });
});
