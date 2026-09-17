import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import { materializeTrackCV5CaseCapture } from
  "./track-c-c3-v5-benchmark-materialization.js";
import { runTrackCV5TwoPassBenchmarkCase } from
  "./track-c-c3-v5-benchmark-runner.js";

const evalRoot = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", evalRoot), "utf8",
)) as { evaluation_at: string };
const facts = JSON.parse(readFileSync(new URL("facts.json", evalRoot), "utf8")) as {
  runtime_claim_catalog: Record<string, unknown>;
};
const modelResource =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";

function payload(value: unknown) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] };
}

function capture() {
  return materializeTrackCV5CaseCapture({
    lane: "BEHAVIOR_SIMULATION",
    fixture: {
      id: "STRATEGY_CONTRACT_UNTRUSTED_DIALOGUE",
      latest_customer_message: "Em thấy mẫu này từ quảng cáo nè.",
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
        runtime_claim_refs: ["RC_PRICE_A"],
      },
    },
    runtimeClaimCatalog: facts.runtime_claim_catalog as never,
    recipe: recipe as never,
  });
}

const dialogue = [{
  direction: "INBOUND" as const,
  senderType: "CUSTOMER" as const,
  messageType: "TEXT" as const,
  text: "Em thấy mẫu này từ quảng cáo nè.",
  attachmentCount: 0,
  occurredAt: "2026-09-10T01:00:00.000Z",
}];

const decision = {
  replyAct: "ANSWER",
  goal: "Answer the verified price.",
  proposition: "PRICE",
  evidenceRefs: ["CLAIM_001"],
  continuation: { type: "KEEP_OPEN" },
  canonicalAction: "NONE",
};

const reply = {
  segments: [{
    kind: "VERIFIED_CLAIM",
    text: "Mẫu này hiện 849k chị ạ.",
    claimRef: "CLAIM_001",
    role: "ANSWER",
    decisionInput: "NONE",
  }],
  strategy: "ANSWER_VERIFIED_FACTS",
  cta: "NONE",
};

describe("Track C C3 strategy-contract safety wiring", () => {
  it("does not infer trusted acquisition from customer dialogue", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({ payload: payload(decision), providerModelVersion: "gemini-3.5-flash-lite" })
      .mockResolvedValueOnce({ payload: payload(reply), providerModelVersion: "gemini-3.5-flash-lite" });

    await runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      transport: { send },
    });

    expect(send).toHaveBeenCalledTimes(2);
  });

  it("rejects PII in the Strategist goal before the Responder call", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>()
      .mockResolvedValueOnce({
        payload: payload({ ...decision, goal: "Ask for phone 0900000000." }),
        providerModelVersion: "gemini-3.5-flash-lite",
      });

    await expect(runTrackCV5TwoPassBenchmarkCase({
      lane: "BEHAVIOR_SIMULATION",
      modelResource,
      capture: capture(),
      evaluationAt: new Date(recipe.evaluation_at),
      evaluationContext: dialogue,
      transport: { send },
    })).rejects.toThrow("TRACK_C_STRATEGIST_DECISION_INVALID");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
