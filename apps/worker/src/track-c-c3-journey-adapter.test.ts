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

function planPayload() {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      currentNeed: "Resolve the current customer need.",
      mustResolve: "Use only supplied authority.",
      conversationRead: "Use accumulated dialogue without creating authority.",
      nextMove: "NONE",
      avoid: "Do not invent facts or effects.",
    }) }] } }],
  };
}

function replyPayload(reply: string) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify({
      segments: [{ kind: "GENERAL", text: reply }],
      strategy: "HOLD_POSITION",
      cta: "NONE",
    }) }] } }],
  };
}

function transport() {
  let call = 0;
  const send = vi.fn<CandidateVertexTransport["send"]>(async () => {
    const current = call++;
    const turnNumber = Math.floor(current / 2) + 1;
    return {
      payload: current % 2 === 0
        ? planPayload()
        : replyPayload(`actual Lana reply ${turnNumber}`),
      providerModelVersion: "gemini-3.5-flash-lite",
    };
  });
  return { send };
}

function transportWithReply(reply: string) {
  let call = 0;
  const send = vi.fn<CandidateVertexTransport["send"]>(async () => {
    const current = call++;
    return {
      payload: current % 2 === 0 ? planPayload() : replyPayload(reply),
      providerModelVersion: "gemini-3.5-flash-lite",
    };
  });
  return { send };
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
      "actual Lana reply 1",
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
    expect(prompt.evaluationContext.map(({ text }) => text)).toContain(
      "actual Lana reply 1",
    );
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
      text === "actual Lana reply 7"
    )).toBe(true);
  });

  it("carries the candidate's prescribed checkout wording through the journey intact", async () => {
    // Naming the checkout fields carries no identifier, so the reply reaches
    // the next turn verbatim instead of aborting the journey or arriving
    // truncated.
    const checkoutReply = "Chị gửi em tên, số điện thoại và địa chỉ nhận hàng nhé.";
    const candidateTransport = transportWithReply(checkoutReply);
    const result = await runTrackCC3Journey(input(journey(3), candidateTransport));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.turns[0]?.result.reply).toBe(checkoutReply);
    expect(result.transcript[1]?.text).toBe(checkoutReply);
    expect(result.turns[1]?.evaluationContext[1]?.text).toBe(checkoutReply);
  });

  it("keeps a six-digit price reply inside the PII-guarded frozen dialogue", async () => {
    const candidateTransport = transportWithReply("Dạ bộ này 849000 đồng chị nhé.");
    const result = await runTrackCC3Journey(input(journey(3), candidateTransport));

    expect(candidateTransport.send).toHaveBeenCalledTimes(6);
    expect(result.transcript[1]?.text).toBe("Dạ bộ này [NUMBER] đồng chị nhé.");
  });

  it("runs the authored checkout and ad-lead journeys end to end", async () => {
    for (const journeyId of ["C2J001", "C2J006"]) {
      const authored = authoredJourney(journeyId);
      const candidateTransport = transportWithReply(
        "Chị gửi em tên, số điện thoại và địa chỉ nhận hàng nhé.",
      );
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
      expect(candidateTransport.send).toHaveBeenCalledTimes(authored.turns.length * 2);
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
