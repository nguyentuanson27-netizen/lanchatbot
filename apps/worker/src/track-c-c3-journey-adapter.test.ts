import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  runTrackCC3Journey,
  type TrackCC2JourneyFixture,
} from "./track-c-c3-journey-adapter.js";
import type {
  TrackCV5MaterializationRecipe,
  TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";

const MODEL_RESOURCE =
  "projects/test/locations/us-central1/publishers/google/models/gemini-3.5-flash-lite";
const EVAL_ROOT = new URL("../evals/track-c-c2/v2/", import.meta.url);
const recipe = JSON.parse(readFileSync(
  new URL("runtime-materialization.json", EVAL_ROOT),
  "utf8",
)) as TrackCV5MaterializationRecipe;
const facts = JSON.parse(readFileSync(
  new URL("facts.json", EVAL_ROOT),
  "utf8",
)) as {
  runtime_claim_catalog: Record<string, TrackCV5RuntimeClaimFixture>;
  simulation_fact_catalog: Record<string, unknown>;
};
const authoredJourneys = JSON.parse(readFileSync(
  new URL("journeys.json", EVAL_ROOT),
  "utf8",
)) as { journeys: readonly TrackCC2JourneyFixture[] };

function authoredJourney(id: string): TrackCC2JourneyFixture {
  const found = authoredJourneys.journeys.find((entry) => entry.id === id);
  if (found === undefined) throw new Error(`missing authored journey ${id}`);
  return found;
}

function journey(turnCount: number): TrackCC2JourneyFixture {
  return {
    id: `TEST_JOURNEY_${turnCount}`,
    theme: "TEST",
    execution: { behavior_simulation: "SUPPORTED" },
    turns: Array.from({ length: turnCount }, (_, index) => ({
      id: `T${index + 1}`,
      customer_message: `customer turn ${index + 1}`,
      context: {
        origin: "ORGANIC",
        first_meaningful_inbound: false,
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
        runtime_claim_refs: [],
        simulation_fact_refs: [],
      },
      expected: {
        required_behaviors: ["answer current turn"],
        forbidden_behaviors: ["no unauthorized effect"],
        next_move: { requirement: "NONE", allowed_actions: ["NONE"] },
      },
    })),
  };
}

function payload(value: unknown) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  };
}

function promptFromRequest(request: { body: string }): Record<string, unknown> {
  const body = JSON.parse(request.body) as { contents: [{ parts: [{ text: string }] }] };
  return JSON.parse(body.contents[0].parts[0].text) as Record<string, unknown>;
}

function strategistPayload(prompt: Record<string, unknown>) {
  const constraints = prompt.strategistConstraints as {
    permittedCanonicalActions?: readonly string[];
    evidenceCapabilities?: Record<string, string>;
  } | undefined;
  if (constraints?.permittedCanonicalActions?.includes("ASK_CHECKOUT_DETAILS")) {
    return payload({
      replyAct: "CLARIFY",
      goal: "Request the smallest missing checkout detail.",
      proposition: "NONE",
      evidenceRefs: [],
      continuation: null,
      canonicalAction: "ASK_CHECKOUT_DETAILS",
    });
  }
  const evidenceRefs = constraints?.evidenceCapabilities?.CLAIM_001 === "PRICE"
    ? ["CLAIM_001"]
    : [];
  return payload({
    replyAct: evidenceRefs.length > 0 ? "ANSWER" : "ACKNOWLEDGE",
    goal: "Resolve the current customer need without creating authority.",
    proposition: evidenceRefs.length > 0 ? "PRICE" : "NONE",
    evidenceRefs,
    continuation: { type: "KEEP_OPEN" },
    canonicalAction: "NONE",
  });
}

function responderPayload(
  task: Record<string, unknown>,
  reply: string,
) {
  const canonical = task.canonicalRequest as { type?: string } | null;
  const answer = task.answer as { status?: string };
  const evidenceRefs = task.evidenceRefs as readonly string[];
  const segments: Array<Record<string, unknown>> = [];
  if (answer.status === "SUPPORTED") {
    segments.push({
      kind: "VERIFIED_CLAIM",
      text: reply,
      claimRef: evidenceRefs[0],
      role: "ANSWER",
      decisionInput: "NONE",
    });
  } else {
    segments.push({
      kind: "GENERAL",
      text: reply,
      role: "ANSWER",
      decisionInput: "NONE",
    });
  }
  if (canonical?.type === "ASK_MEASUREMENTS") {
    segments.push({
      kind: "CLARIFICATION",
      text: "Chị cho em xin chiều cao và cân nặng để tư vấn size sát hơn ạ?",
      target: "MEASUREMENTS",
      role: "CANONICAL",
      decisionInput: "NONE",
    }, {
      kind: "ACTION_REQUEST",
      text: "Em dựa vào số đo để tư vấn size cho mình ạ.",
      action: "PROVIDE_MEASUREMENTS",
      role: "CANONICAL",
      decisionInput: "NONE",
    });
    return payload({ segments, strategy: "ASK_CLARIFICATION", cta: "ASK_MEASUREMENTS" });
  }
  if (canonical?.type === "ASK_CHECKOUT_DETAILS") {
    segments.push({
      kind: "CLARIFICATION",
      text: "Chị cho em xin thông tin nhận hàng còn thiếu ạ.",
      target: "CHECKOUT_DETAILS",
      role: "CANONICAL",
      decisionInput: "NONE",
    }, {
      kind: "ACTION_REQUEST",
      text: "Em cần thông tin còn thiếu để tiếp tục ạ.",
      action: "PROVIDE_CHECKOUT_DETAILS",
      role: "CANONICAL",
      decisionInput: "NONE",
    });
    return payload({ segments, strategy: "ASK_CLARIFICATION", cta: "ASK_CHECKOUT_DETAILS" });
  }
  segments.push({
    kind: "GENERAL",
    text: "Chị cần em hỗ trợ thêm điều gì thì nhắn em nhé.",
    role: "PROGRESSION",
    decisionInput: "NONE",
  });
  return payload({
    segments,
    strategy: answer.status === "SUPPORTED" ? "ANSWER_VERIFIED_FACTS" : "HOLD_POSITION",
    cta: "NONE",
  });
}

function transport(reply = "actual Lana reply", numbered = true) {
  let responderCalls = 0;
  const send = vi.fn<CandidateVertexTransport["send"]>(async (request) => {
    const prompt = promptFromRequest(request);
    const task = prompt.responderTask;
    return {
      payload: task === undefined
        ? strategistPayload(prompt)
        : responderPayload(
            task as Record<string, unknown>,
            numbered ? `${reply} ${++responderCalls}` : reply,
          ),
      providerModelVersion: "gemini-3.5-flash-lite",
    };
  });
  return { send };
}

function transportWithReply(reply: string) {
  return transport(reply, false);
}

function input(
  fixture: TrackCC2JourneyFixture,
  candidateTransport: ReturnType<typeof transport>,
  lane: "BEHAVIOR_SIMULATION" | "PRODUCTION_CONTRACT" = "BEHAVIOR_SIMULATION",
) {
  return {
    lane,
    modelResource: MODEL_RESOURCE,
    journey: fixture,
    runtimeClaimCatalog: {},
    simulationFactCatalog: {},
    recipe,
    transport: candidateTransport,
  } as const;
}

describe("Track C C3 journey adapter", () => {
  it("rejects journeys shorter than three turns", async () => {
    const candidateTransport = transport();
    await expect(runTrackCC3Journey(input(
      journey(2),
      candidateTransport,
    ))).rejects.toThrow("TRACK_C_C3_JOURNEY_TURN_COUNT_INVALID");
    expect(candidateTransport.send).not.toHaveBeenCalled();
  });

  it("rejects journeys longer than eight turns", async () => {
    const candidateTransport = transport();
    await expect(runTrackCC3Journey(input(
      journey(9),
      candidateTransport,
    ))).rejects.toThrow("TRACK_C_C3_JOURNEY_TURN_COUNT_INVALID");
    expect(candidateTransport.send).not.toHaveBeenCalled();
  });

  it("is behavior-simulation only", async () => {
    const candidateTransport = transport();
    await expect(runTrackCC3Journey(input(
      journey(3),
      candidateTransport,
      "PRODUCTION_CONTRACT",
    ))).rejects.toThrow("TRACK_C_C3_JOURNEY_SIMULATION_ONLY");
    expect(candidateTransport.send).not.toHaveBeenCalled();
  });

  it("puts the actual previous Lana reply into the next-turn dialogue and makes exactly two generator calls per turn", async () => {
    const candidateTransport = transport();
    const result = await runTrackCC3Journey(input(
      journey(3),
      candidateTransport,
    ));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.sideEffects).toBe("DISABLED");
    expect(result.turns[1]?.evaluationContext.map(({ text }) => text)).toEqual([
      "customer turn 1",
      expect.stringContaining("actual Lana reply 1"),
      "customer turn 2",
    ]);
    const turnTwoStrategistRequest = candidateTransport.send.mock.calls[2]?.[0];
    expect(turnTwoStrategistRequest).toBeDefined();
    const body = JSON.parse(turnTwoStrategistRequest!.body) as {
      contents: [{ parts: [{ text: string }] }];
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      evaluationContext: Array<{ text: string }>;
    };
    expect(prompt.evaluationContext.some(({ text }) =>
      text.includes("actual Lana reply 1")
    )).toBe(true);
    expect(Object.hasOwn(result, "persistence")).toBe(false);
    expect(Object.hasOwn(result, "effectPort")).toBe(false);
    expect(Object.hasOwn(result, "delivery")).toBe(false);
  });

  it("supports the eight-turn upper bound without truncating accumulated dialogue", async () => {
    const candidateTransport = transport();
    const result = await runTrackCC3Journey(input(
      journey(8),
      candidateTransport,
    ));

    expect(candidateTransport.send).toHaveBeenCalledTimes(16);
    expect(result.turns).toHaveLength(8);
    expect(result.turns[7]?.evaluationContext).toHaveLength(15);
    expect(result.turns[7]?.evaluationContext.some(({ text }) =>
      text.startsWith("actual Lana reply 7")
    )).toBe(true);
  });

  it("carries a guarded ordinary reply through the journey without truncation", async () => {
    const ordinaryReply = "Chị cần em hỗ trợ thêm nhé.";
    const candidateTransport = transportWithReply(ordinaryReply);
    const result = await runTrackCC3Journey(input(journey(3), candidateTransport));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.turns[0]?.result.reply).toContain(ordinaryReply);
    expect(result.transcript[1]?.text).toContain(ordinaryReply);
    expect(result.turns[1]?.evaluationContext[1]?.text).toContain(ordinaryReply);
  });

  it("keeps a six-digit price reply inside the PII-guarded frozen dialogue", async () => {
    const candidateTransport = transportWithReply("Dạ bộ này 849000 đồng chị nhé.");
    const result = await runTrackCC3Journey(input(journey(3), candidateTransport));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.transcript[1]?.text).toContain("Dạ bộ này [NUMBER] đồng chị nhé.");
  });

  it("runs the authored checkout and ad-lead journeys end to end", async () => {
    for (const journeyId of ["C2J001", "C2J006"]) {
      const authored = authoredJourney(journeyId);
      const candidateTransport = transport();
      const result = await runTrackCC3Journey({
        lane: "BEHAVIOR_SIMULATION",
        modelResource: MODEL_RESOURCE,
        journey: authored,
        runtimeClaimCatalog: facts.runtime_claim_catalog,
        simulationFactCatalog: facts.simulation_fact_catalog,
        recipe,
        transport: candidateTransport,
      });

      expect(result.journeyId).toBe(journeyId);
      expect(result.turns.map(({ turnId }) => turnId))
        .toEqual(authored.turns.map(({ id }) => id));
      const expectedCalls = authored.turns.reduce((total, turn) => total + (
        turn.context.origin === "ADVERTISEMENT" &&
        turn.context.first_meaningful_inbound ? 1 : 2
      ), 0);
      expect(candidateTransport.send).toHaveBeenCalledTimes(expectedCalls);
      expect(result.transcript).toHaveLength(authored.turns.length * 2);
      expect(result.sideEffects).toBe("DISABLED");
    }
  });

  it("keeps supplemental journeys outside the frozen 100-case quality population", () => {
    const manifest = JSON.parse(readFileSync(
      new URL("manifest.json", EVAL_ROOT),
      "utf8",
    )) as { quality: { total: number; dev: number; holdout: number } };
    const supplemental = JSON.parse(readFileSync(
      new URL("journeys.json", EVAL_ROOT),
      "utf8",
    )) as { supplemental: boolean; quality_population_delta: number; journeys: unknown[] };

    expect(manifest.quality).toMatchObject({ total: 100, dev: 70, holdout: 30 });
    expect(supplemental.supplemental).toBe(true);
    expect(supplemental.quality_population_delta).toBe(0);
    expect(supplemental.journeys).toHaveLength(6);
  });
});
