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

function modelPayload(value: unknown) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
  };
}

function promptOf(request: { body: string }) {
  const body = JSON.parse(request.body) as {
    contents: [{ parts: [{ text: string }] }];
  };
  return JSON.parse(body.contents[0].parts[0].text) as {
    contractVersion: string;
    constraints?: { permittedCanonicalActions: string[] };
    responderTask?: {
      answer: { kind: string; status: string };
      evidence: unknown[];
      continuation: Readonly<{ type: string }> | null;
      canonicalRequest: { type: string } | null;
    };
  };
}

function strategistPayload(prompt: ReturnType<typeof promptOf>) {
  const canonicalAction = prompt.constraints?.permittedCanonicalActions[0] ?? "NONE";
  return modelPayload({
    replyAct: "ANSWER",
    goal: "Resolve the current customer decision.",
    proposition: "NONE",
    evidenceRefs: [],
    continuation: canonicalAction === "NONE" ? { type: "KEEP_OPEN" } : null,
    canonicalAction,
  });
}

function responderPayload(
  prompt: ReturnType<typeof promptOf>,
  reply: string,
) {
  const task = prompt.responderTask;
  if (task === undefined) throw new Error("TEST_RESPONDER_TASK_REQUIRED");
  const canonical = task.canonicalRequest?.type;
  const hold = canonical === "HOLD_POSITION";
  const needsProgression = canonical === "ASK_PRODUCT" ||
    canonical === "ASK_MEASUREMENTS" || task.continuation?.type === "ASK";
  return modelPayload({
    answerText: task.evidence.length > 0 ||
        canonical === "ASK_CHECKOUT_DETAILS" ? null : reply,
    factualTexts: task.evidence.map(() => "Dạ thông tin này đã được xác minh ạ."),
    progressionText: hold ? null : needsProgression
      ? "Chị cho em biết thêm để em hỗ trợ sát hơn nhé?" : null,
  });
}

function transport(replyPrefix = "actual Lana reply") {
  let call = 0;
  const send = vi.fn<CandidateVertexTransport["send"]>(async (request) => {
    const current = call++;
    const prompt = promptOf(request);
    const turnNumber = current + 1;
    return {
      payload: prompt.contractVersion === "TRACK_C_C3_STRATEGIST_INPUT_V1"
        ? strategistPayload(prompt)
        : responderPayload(prompt, `${replyPrefix} ${turnNumber}`),
      providerModelVersion: "gemini-3.5-flash-lite",
    };
  });
  return { send };
}

function transportWithReply(reply: string) {
  return transport(reply);
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

  it("puts the actual previous Lana reply into the next-turn dialogue and makes two adaptive calls per turn", async () => {
    const candidateTransport = transport();
    const result = await runTrackCC3Journey(input(
      journey(3),
      candidateTransport,
    ));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.sideEffects).toBe("DISABLED");
    expect(result.turns[1]?.evaluationContext.map(({ text }) => text)).toEqual([
      "customer turn 1",
      "actual Lana reply 2",
      "customer turn 2",
    ]);
    const turnTwoStrategistRequest = candidateTransport.send.mock.calls[2]?.[0];
    expect(turnTwoStrategistRequest).toBeDefined();
    const body = JSON.parse(turnTwoStrategistRequest!.body) as {
      contents: [{ parts: [{ text: string }] }];
    };
    const prompt = JSON.parse(body.contents[0].parts[0].text) as {
      dialogue: Array<{ text: string }>;
    };
    expect(prompt.dialogue.some(({ text }) =>
      text.includes("actual Lana reply 2")
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
      text.includes("actual Lana reply")
    )).toBe(true);
  });

  it("carries a non-factual generated reply through the journey intact", async () => {
    const generatedReply = "Dạ em hỗ trợ chị tiếp nhé.";
    const candidateTransport = transportWithReply(generatedReply);
    const result = await runTrackCC3Journey(input(journey(3), candidateTransport));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.turns[0]?.result.reply).toContain(generatedReply);
    expect(result.transcript[1]?.text).toContain(generatedReply);
    expect(result.turns[1]?.evaluationContext[1]?.text).toContain(generatedReply);
  });

  it("returns a sanitized, turn-scoped diagnostic when a model contract fails", async () => {
    const send = vi.fn<CandidateVertexTransport["send"]>().mockResolvedValue({
      payload: modelPayload({}),
      providerModelVersion: "gemini-3.5-flash-lite",
    });

    await expect(runTrackCC3Journey(input(journey(3), { send }))).rejects
      .toMatchObject({
        diagnostic: {
          journeyId: "TEST_JOURNEY_3",
          turnId: "T1",
          stage: "STRATEGIST",
          errorCode: "TRACK_C_STRATEGIST_DECISION_INVALID",
          sanitizedRawModelOutput: "{}",
        },
      });
  });

  it("keeps generated replies redacted in accumulated dialogue", async () => {
    const candidateTransport = transportWithReply("Dạ em hỗ trợ chị tiếp nhé.");
    const result = await runTrackCC3Journey(input(journey(3), candidateTransport));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.transcript[1]?.text).toContain("Dạ em hỗ trợ chị tiếp nhé.");
  });

  it("runs all six authored journeys through the contract", async () => {
    for (const journeyId of [
      "C2J001", "C2J002", "C2J003", "C2J004", "C2J005", "C2J006",
    ]) {
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
      const expectedCalls = authored.turns.reduce((total, turn) => total +
        (turn.context.origin === "ADVERTISEMENT" &&
         turn.context.first_meaningful_inbound ? 1 : 2), 0);
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
