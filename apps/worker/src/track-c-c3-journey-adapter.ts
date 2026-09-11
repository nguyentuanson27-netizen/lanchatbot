import type { ShadowContextMessage } from "@lana/database";
import type { CandidateVertexTransport } from "./context-v2-candidate.js";
import {
  materializeTrackCV5CaseCapture,
  type TrackCV5ExecutionLane,
  type TrackCV5MaterializationRecipe,
  type TrackCV5RuntimeClaimFixture,
} from "./track-c-c3-v5-benchmark-materialization.js";
import {
  runTrackCC3TwoPassQualityCandidate,
  type TrackCC3TwoPassQualityCandidateResult,
  type TrackCC3TwoPassQualityFixture,
} from "./track-c-c3-two-pass-quality-adapter.js";

export interface TrackCC2JourneyExpectedTurn {
  readonly required_behaviors: readonly string[];
  readonly forbidden_behaviors: readonly string[];
  readonly next_move: Readonly<{
    readonly requirement: "REQUIRED" | "OPTIONAL" | "NONE";
    readonly allowed_actions: readonly string[];
  }>;
}

export interface TrackCC2JourneyTurn {
  readonly id: string;
  readonly customer_message: string;
  readonly context: TrackCC3TwoPassQualityFixture["context"] & Readonly<{
    readonly simulation_fact_refs: readonly string[];
  }>;
  readonly expected: TrackCC2JourneyExpectedTurn;
}

export interface TrackCC2JourneyFixture {
  readonly id: string;
  readonly theme: string;
  readonly execution: Readonly<{ readonly behavior_simulation: "SUPPORTED" }>;
  readonly turns: readonly TrackCC2JourneyTurn[];
}

export interface TrackCC3JourneyAdapterInput {
  readonly lane: TrackCV5ExecutionLane;
  readonly modelResource: string;
  readonly journey: TrackCC2JourneyFixture;
  readonly runtimeClaimCatalog: Readonly<Record<string, TrackCV5RuntimeClaimFixture>>;
  readonly simulationFactCatalog: Readonly<Record<string, unknown>>;
  readonly recipe: TrackCV5MaterializationRecipe;
  readonly transport: CandidateVertexTransport;
  readonly signal?: AbortSignal;
}

export interface TrackCC3JourneyTurnResult {
  readonly turnId: string;
  readonly customerMessage: string;
  readonly evaluationContext: readonly ShadowContextMessage[];
  readonly result: TrackCC3TwoPassQualityCandidateResult;
}

export interface TrackCC3JourneyAdapterResult {
  readonly contractVersion: "TRACK_C_C3_JOURNEY_RESULT_V1";
  readonly evaluationOnly: true;
  readonly sideEffects: "DISABLED";
  readonly executionLane: "BEHAVIOR_SIMULATION";
  readonly journeyId: string;
  readonly turns: readonly TrackCC3JourneyTurnResult[];
  readonly transcript: readonly ShadowContextMessage[];
}

function occurredAt(
  evaluationAt: Date,
  totalTurns: number,
  ordinal: number,
): string {
  return new Date(
    evaluationAt.getTime() - ((totalTurns * 2) - ordinal) * 1_000,
  ).toISOString();
}

function resolveSimulationFacts(
  refs: readonly string[],
  catalog: Readonly<Record<string, unknown>>,
): readonly unknown[] {
  return Object.freeze(refs.map((ref) => {
    if (!Object.hasOwn(catalog, ref)) {
      throw new Error(`TRACK_C_C3_JOURNEY_SIMULATION_FACT_MISSING:${ref}`);
    }
    return catalog[ref];
  }));
}

function customerMessage(
  text: string,
  occurredAtValue: string,
): ShadowContextMessage {
  return Object.freeze({
    direction: "INBOUND",
    senderType: "CUSTOMER",
    messageType: "TEXT",
    text,
    attachmentCount: 0,
    occurredAt: occurredAtValue,
  });
}

function botMessage(
  text: string,
  occurredAtValue: string,
): ShadowContextMessage {
  return Object.freeze({
    direction: "OUTBOUND",
    senderType: "BOT",
    messageType: "TEXT",
    text,
    attachmentCount: 0,
    occurredAt: occurredAtValue,
  });
}

/**
 * Runs authored C2 journey turns through the current C3 two-pass candidate.
 * Canonical state is materialized independently for every turn; only real
 * dialogue accumulates, and the actual Lana reply becomes history for the next
 * turn. No state transition, persistence, delivery, or effect port exists here.
 */
export async function runTrackCC3Journey(
  input: TrackCC3JourneyAdapterInput,
): Promise<TrackCC3JourneyAdapterResult> {
  if (input.lane !== "BEHAVIOR_SIMULATION") {
    throw new Error("TRACK_C_C3_JOURNEY_SIMULATION_ONLY");
  }
  if (!Array.isArray(input.journey.turns) ||
      input.journey.turns.length < 3 || input.journey.turns.length > 8) {
    throw new Error("TRACK_C_C3_JOURNEY_TURN_COUNT_INVALID");
  }
  if (input.journey.execution.behavior_simulation !== "SUPPORTED") {
    throw new Error("TRACK_C_C3_JOURNEY_EXECUTION_INVALID");
  }

  const evaluationAt = new Date(input.recipe.evaluation_at);
  if (!Number.isFinite(evaluationAt.getTime())) {
    throw new Error("TRACK_C_C3_JOURNEY_EVALUATION_TIME_INVALID");
  }

  const transcript: ShadowContextMessage[] = [];
  const turns: TrackCC3JourneyTurnResult[] = [];
  let ordinal = 0;
  for (const turn of input.journey.turns) {
    transcript.push(customerMessage(
      turn.customer_message,
      occurredAt(evaluationAt, input.journey.turns.length, ordinal++),
    ));
    const evaluationContext = Object.freeze([...transcript]);
    const fixture: TrackCC3TwoPassQualityFixture = {
      id: `${input.journey.id}:${turn.id}`,
      latest_customer_message: turn.customer_message,
      context: turn.context,
    };
    const capture = materializeTrackCV5CaseCapture({
      lane: "BEHAVIOR_SIMULATION",
      fixture,
      runtimeClaimCatalog: input.runtimeClaimCatalog,
      recipe: input.recipe,
    });
    const result = await runTrackCC3TwoPassQualityCandidate({
      lane: "BEHAVIOR_SIMULATION",
      modelResource: input.modelResource,
      fixture,
      capture,
      evaluationAt,
      evaluationContext,
      simulationFacts: resolveSimulationFacts(
        turn.context.simulation_fact_refs,
        input.simulationFactCatalog,
      ),
      transport: input.transport,
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
    turns.push(Object.freeze({
      turnId: turn.id,
      customerMessage: turn.customer_message,
      evaluationContext,
      result,
    }));
    transcript.push(botMessage(
      result.reply,
      occurredAt(evaluationAt, input.journey.turns.length, ordinal++),
    ));
  }

  return Object.freeze({
    contractVersion: "TRACK_C_C3_JOURNEY_RESULT_V1",
    evaluationOnly: true,
    sideEffects: "DISABLED",
    executionLane: "BEHAVIOR_SIMULATION",
    journeyId: input.journey.id,
    turns: Object.freeze(turns),
    transcript: Object.freeze(transcript),
  });
}
