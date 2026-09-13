import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  TRACK_C_C3_V6_STRATEGIST_SYSTEM_INSTRUCTION,
  buildTrackCV6ResponderRequest,
  buildTrackCV6StrategistRequest,
  trackCV6ResponderSystemInstruction,
} from "./track-c-c3-v6-candidate.js";
import { parseTrackCV6DirectivePlan } from "./track-c-c3-v6-directive-plan.js";
import { runTrackCV6Case } from "./track-c-c3-v6-runner.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5CompactCase,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

const MODEL_RESOURCE =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(name, EVAL_ROOT), "utf8")) as T;
}

const recipe = readJson<TrackCV5MaterializationRecipe>(
  "runtime-materialization.json",
);
const facts = readJson<{
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
}>("facts.json");

const fixture: TrackCV5CompactCase = {
  id: "V6_PRICE",
  latest_customer_message: "Giá cao quá em.",
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
};

const capture = materializeTrackCV5CaseCapture({
  lane: "BEHAVIOR_SIMULATION",
  fixture,
  runtimeClaimCatalog: facts.runtime_claim_catalog,
  recipe,
});
const evaluationAt = new Date(recipe.evaluation_at);
const evaluationContext: readonly ShadowContextMessage[] = [{
  direction: "INBOUND",
  senderType: "CUSTOMER",
  messageType: "TEXT",
  text: fixture.latest_customer_message,
  attachmentCount: 0,
  occurredAt: "2026-09-10T01:59:00.000Z",
}];
const common = {
  modelResource: MODEL_RESOURCE,
  capture,
  evaluationAt,
  evaluationContext,
};

function decoded(body: string) {
  const parsed = JSON.parse(body) as {
    systemInstruction: { parts: [{ text: string }] };
    contents: [{ parts: [{ text: string }] }];
    generationConfig: { responseSchema: Record<string, never> };
  };
  return {
    systemInstruction: parsed.systemInstruction.parts[0].text,
    prompt: JSON.parse(parsed.contents[0].parts[0].text) as
      Record<string, unknown>,
    responseSchema: parsed.generationConfig.responseSchema as unknown as {
      properties: Record<string, { items?: { enum?: readonly string[] };
        enum?: readonly string[] }>;
    },
  };
}

const answerPlan = parseTrackCV6DirectivePlan({
  rule: "ANSWER",
  claimRefs: ["CLAIM_001"],
  acknowledge: "PRICE_CONCERN",
  askFor: "NONE",
  supportFacts: 1,
}, ["CLAIM_001"]);

function providerPayload(value: unknown) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  };
}

function transport(responder: unknown, plan: unknown = {
  rule: "ANSWER",
  claimRefs: ["CLAIM_001"],
  acknowledge: "PRICE_CONCERN",
  askFor: "NONE",
  supportFacts: 1,
}) {
  return vi.fn<CandidateVertexTransport["send"]>()
    .mockResolvedValueOnce({
      payload: providerPayload(plan),
      providerModelVersion: "gemini-3.5-flash-lite",
    })
    .mockResolvedValueOnce({
      payload: providerPayload(responder),
      providerModelVersion: "gemini-3.5-flash-lite",
    });
}

const groundedReply = {
  segments: [
    { kind: "GENERAL", text: "Dạ em hiểu chị đang cân mức giá ạ." },
    {
      kind: "VERIFIED_CLAIM",
      text: "Set Tường Vi hiện 849k chị nhé.",
      claimRef: "CLAIM_001",
    },
  ],
  strategy: "ANSWER_VERIFIED_FACTS",
  cta: "NONE",
};

describe("Track C C3 V6 candidate requests", () => {
  it("gives the Strategist the decision vocabulary and no free-text field", () => {
    const { systemInstruction, responseSchema } = decoded(
      buildTrackCV6StrategistRequest(common).body,
    );

    expect(systemInstruction).toBe(TRACK_C_C3_V6_STRATEGIST_SYSTEM_INSTRUCTION);
    expect(Object.keys(responseSchema.properties).sort()).toEqual([
      "acknowledge",
      "askFor",
      "claimRefs",
      "rule",
      "supportFacts",
    ]);
    expect(responseSchema.properties.claimRefs?.items?.enum)
      .toEqual(["CLAIM_001"]);
  });

  it("names every claim the Strategist may select", () => {
    const { prompt } = decoded(buildTrackCV6StrategistRequest(common).body);
    const claims = prompt.verifiedClaims as readonly { claimRef: string }[];

    expect(claims.map(({ claimRef }) => claimRef)).toEqual(["CLAIM_001"]);
  });

  it("narrows the Responder to the claims the plan selected", () => {
    const { prompt, responseSchema } = decoded(
      buildTrackCV6ResponderRequest({ ...common, plan: answerPlan }).body,
    );
    const segments = responseSchema.properties.segments as unknown as {
      items: { properties: { claimRef?: { enum?: readonly string[] } } };
    };

    expect(prompt.conversationPlan).toEqual(answerPlan);
    expect(segments.items.properties.claimRef?.enum).toEqual(["CLAIM_001"]);
  });

  it("keeps the Responder prompt free of decision rules", () => {
    const instruction = trackCV6ResponderSystemInstruction(["CLAIM_001"]);

    for (const decisionRule of [
      "PRODUCT_CONTEXT_UNREADY",
      "MEASUREMENTS_REQUIRED",
      "ORDER_REVIEW",
      "first match",
    ]) {
      expect(instruction).not.toContain(decisionRule);
    }
    expect(instruction).toContain("Do not re-decide any of them.");
    expect(instruction).not.toContain("PRODUCT_PRESENTATION");
  });

  it("attaches the presentation protocol only when that evidence is selected", () => {
    expect(trackCV6ResponderSystemInstruction([
      "PRODUCT_PRESENTATION_DISPLAY_001",
    ])).toContain("placeholder");
  });
});

describe("Track C C3 V6 run", () => {
  it("runs the two passes and returns the plan it enforced", async () => {
    const send = transport(groundedReply);

    const result = await runTrackCV6Case({ ...common, transport: { send } });

    expect(send).toHaveBeenCalledTimes(2);
    expect(result.plan).toEqual(answerPlan);
    expect(result.reply).toContain("849k");
    expect(result.sideEffects).toBe("DISABLED");
    expect(result.identity.planHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects a reply that ignores the plan instead of scoring it", async () => {
    const send = transport({
      ...groundedReply,
      segments: [
        ...groundedReply.segments,
        { kind: "GENERAL", text: "Chị dự kiến ngân sách bao nhiêu ạ?" },
      ],
    });

    await expect(runTrackCV6Case({ ...common, transport: { send } }))
      .rejects.toThrow("TRACK_C_V6_REPLY_UNPLANNED_QUESTION");
  });

  it("rejects a plan that selects a claim this case does not carry", async () => {
    const send = transport(groundedReply, {
      rule: "ANSWER",
      claimRefs: ["CLAIM_004"],
      acknowledge: "NONE",
      askFor: "NONE",
      supportFacts: 0,
    });

    await expect(runTrackCV6Case({ ...common, transport: { send } }))
      .rejects.toThrow("TRACK_C_V6_PLAN_CLAIM_REF_UNKNOWN");
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails closed on a generator identity that is not the pinned one", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: providerPayload({
        rule: "ANSWER",
        claimRefs: [],
        acknowledge: "NONE",
        askFor: "NONE",
        supportFacts: 0,
      }),
      providerModelVersion: "claude-sonnet-4-6",
    });

    await expect(runTrackCV6Case({ ...common, transport: { send } }))
      .rejects.toThrow("TRACK_C_V6_PROVIDER_IDENTITY_MISMATCH");
  });
});
