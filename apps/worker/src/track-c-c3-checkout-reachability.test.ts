import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import {
  runTrackCC3TwoPassQualityCandidate,
  type TrackCC3TwoPassQualityFixture,
} from "./track-c-c3-two-pass-quality-adapter.js";

/**
 * Checkout reachability through the real adapter entrypoint.
 *
 * The runner permits an open-cart checkout request, but the adapter used to
 * reject that fixture before the runner ever saw it, so the state could only
 * be reached by calling the compiler directly.
 */

const MODEL_RESOURCE =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", EVAL_ROOT), "utf8",
)) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(
  new URL("facts.json", EVAL_ROOT), "utf8",
)) as { runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture> };

function payload(value: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
}

function openCartFixture(
  missingFields: readonly string[],
  sourceStage: "CART_OPEN" | "ORDER_PREVIEW" = "CART_OPEN",
): TrackCC3TwoPassQualityFixture {
  return {
    id: "C3_CHECKOUT_REACHABILITY",
    latest_customer_message: "Chị chốt mẫu này nhé.",
    context: {
      origin: "ORGANIC",
      first_meaningful_inbound: false,
      product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
      phase: "ORDER_REVIEW",
      canonical_flags: [],
      buying_intent: {
        decision: "COMMITTED", requested_action: "PROCEED_TO_PAYMENT",
        quantity: 1, evidence: "DETERMINISTIC_RUNTIME",
      },
      source_stage: sourceStage,
      runtime_claim_refs: ["RC_PRICE_A"],
      checkout_completeness: {
        state: "REQUIRED",
        missing_fields: missingFields as never,
      },
    },
  } as unknown as TrackCC3TwoPassQualityFixture;
}

function capture(sourceStage: "CART_OPEN" | "ORDER_PREVIEW") {
  return materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "C3_CHECKOUT_REACHABILITY",
      latest_customer_message: "Chị chốt mẫu này nhé.",
      context: {
        product_binding: { status: "RESOLVED", product_ids: ["SQ9012"] },
        phase: sourceStage === "CART_OPEN" ? "BROWSING" : "ORDER_REVIEW",
        canonical_flags: [],
        buying_intent: {
          decision: "COMMITTED", requested_action: "PROCEED_TO_PAYMENT",
          quantity: 1, evidence: "DETERMINISTIC_RUNTIME",
        },
        source_stage: sourceStage,
        runtime_claim_refs: ["RC_PRICE_A"],
      },
    },
    runtimeClaimCatalog: facts.runtime_claim_catalog,
    recipe,
  });
}

function transport(fields: readonly string[]) {
  return vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({
      payload: payload({
        replyAct: "ACKNOWLEDGE", goal: "Collect the missing checkout details.",
        proposition: "NONE", evidenceRefs: [], continuation: null,
        canonicalAction: "ASK_CHECKOUT_DETAILS",
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    })
    .mockResolvedValueOnce({
      // A checkout task writes its own exact fields, so the Responder emits
      // neither an answer nor a progression here.
      payload: payload({
        answerText: null, factualTexts: [], progressionText: null,
      }),
      providerModelVersion: "gemini-3.5-flash-lite",
    });
}

async function run(
  missingFields: readonly string[],
  sourceStage: "CART_OPEN" | "ORDER_PREVIEW" = "CART_OPEN",
) {
  return runTrackCC3TwoPassQualityCandidate({
    lane: "BEHAVIOR_SIMULATION",
    modelResource: MODEL_RESOURCE,
    capture: capture(sourceStage),
    evaluationAt: new Date(recipe.evaluation_at),
    evaluationContext: [{
      direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
      text: "Chị chốt mẫu này nhé.", attachmentCount: 0,
      occurredAt: "2026-09-10T01:59:00.000Z",
    }],
    fixture: openCartFixture(missingFields, sourceStage),
    transport: { send: transport(missingFields) },
  } as never);
}

describe("Track C C3 checkout reachability", () => {
  it("uses the frozen DEV checkout completeness for Q092 and Q100", async () => {
    const chunk = JSON.parse(readFileSync(
      new URL("quality-10.json", EVAL_ROOT), "utf8",
    )) as { cases: TrackCC3TwoPassQualityFixture[] };
    const q092 = chunk.cases.find(({ id }) => id === "V5V4Q092")!;
    const q100 = chunk.cases.find(({ id }) => id === "V5V4Q100")!;
    expect(q092.context.source_stage).toBe("CART_OPEN");
    expect(q092.context.checkout_completeness).toEqual({
      state: "REQUIRED",
      missing_fields: ["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"],
    });
    expect(q100.context.checkout_completeness).toEqual({
      state: "COMPLETE", missing_fields: [],
    });
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION", fixture: q092,
      runtimeClaimCatalog: facts.runtime_claim_catalog, recipe,
    });
    const result = await runTrackCC3TwoPassQualityCandidate({
      lane: "BEHAVIOR_SIMULATION", modelResource: MODEL_RESOURCE,
      capture, evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: [{
        direction: "INBOUND", senderType: "CUSTOMER", messageType: "TEXT",
        text: "Ok em", attachmentCount: 0,
        occurredAt: "2026-09-10T01:59:00.000Z",
      }],
      fixture: q092, transport: { send: transport([]) },
    } as never);
    expect(result.responderTask.canonicalRequest).toMatchObject({
      type: "ASK_CHECKOUT_DETAILS",
      requestedFields: ["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"],
    });
  });
  it("reaches the runner from an open cart through the adapter", async () => {
    const result = await run(["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"]);
    expect(result.responderTask.canonicalRequest).toMatchObject({
      type: "ASK_CHECKOUT_DETAILS",
      requestedFields: ["FULL_NAME", "PHONE", "ADDRESS", "PAYMENT_METHOD"],
    });
  });

  it("asks only for a missing payment method", async () => {
    const result = await run(["PAYMENT_METHOD"]);
    expect(result.responderTask.canonicalRequest).toMatchObject({
      requestedFields: ["PAYMENT_METHOD"],
    });
    const action = result.output.segments.find(
      ({ kind }) => kind === "ACTION_REQUEST",
    );
    expect(action?.text).toContain("hình thức thanh toán");
    expect(action?.text).not.toContain("họ tên");
  });

  it("still reaches the runner from a preview whose draft was invalidated", async () => {
    const result = await run(["ADDRESS"], "ORDER_PREVIEW");
    expect(result.responderTask.canonicalRequest).toMatchObject({
      requestedFields: ["ADDRESS"],
    });
  });
});
