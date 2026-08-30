import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "@lana/contracts";
import {
  compareCommerceAuthority,
  type CommerceAuthorityComparison,
  type CompareCommerceAuthorityInput,
} from "./commerce-authority-comparison.js";
import {
  runRealtimeReplyDifferential,
  type PermittedRealtimeReplyDifference,
  type RealtimeReplyDifferentialResult,
  type RealtimeReplySnapshot,
} from "./realtime-reply-differential.js";

export const TRACK_B_REPLAY_REQUIRED_RISK_CLASSES = Object.freeze([
  "UNSUPPORTED_OUTPUT",
  "PROTECTED_CLAIM",
  "PII_SECURITY",
  "UNAUTHORIZED_EFFECT",
  "STALE_OR_MISSING_FACTS",
  "MALFORMED_OUTPUT",
  "SINGLE_REPAIR_BUDGET",
  "VERIFIED_FACTS_FALLBACK",
  "BF04_SIZE",
] as const);

export type TrackBReplayRiskClass =
  typeof TRACK_B_REPLAY_REQUIRED_RISK_CLASSES[number];

export interface TrackBReplayIdentity {
  readonly modelProvider: string;
  readonly providerModel: string;
  readonly capability: "BASELINE_MODEL_CAPABILITY";
  readonly promptVersion: string;
  readonly promptTemplateHash: string;
  readonly generationConfigHash: string;
  readonly policyIdentityHash: string;
  readonly schemaIdentityHash: string;
  readonly behaviorContentHash: string;
  readonly authorityBundleHash: string;
  readonly factFixtureHash: string;
}

export interface TrackBReplaySideEffectCapture {
  /** Operational queue claims. Reading a fixed fixture is not a claim. */
  readonly queueClaims: number;
  /** Customer-visible sends, including Meta Outbox delivery attempts. */
  readonly customerMessages: number;
  /** Durable conversation, commerce, Inbox, or Outbox state mutations. */
  readonly stateMutations: number;
  /** Executed cart/order/handoff/tag/network effects. */
  readonly protectedEffects: number;
  /** In-memory commit plans captured for comparison but never executed. */
  readonly capturedCommitPlans: number;
}

export interface TrackBReplayObservation {
  readonly reply: RealtimeReplySnapshot;
  readonly sideEffects: TrackBReplaySideEffectCapture;
}

type StateDifferenceCode = CommerceAuthorityComparison["differences"][number];

export interface PermittedTrackBStateDifference {
  readonly code: StateDifferenceCode;
  readonly reasonCode: string;
}

export interface TrackBLivePathReplayCase<TInput> {
  readonly caseId: string;
  readonly riskClasses: readonly TrackBReplayRiskClass[];
  readonly capturedInput: TInput;
  readonly baseline: (
    capture: Readonly<TInput>,
  ) => TrackBReplayObservation | Promise<TrackBReplayObservation>;
  readonly candidate: (
    capture: Readonly<TInput>,
  ) => TrackBReplayObservation | Promise<TrackBReplayObservation>;
  readonly permittedReplyDifferences?: readonly PermittedRealtimeReplyDifference[];
  readonly stateComparison: CompareCommerceAuthorityInput;
  readonly permittedStateDifferences?: readonly PermittedTrackBStateDifference[];
}

interface TrackBStateDifference {
  readonly code: StateDifferenceCode;
  readonly disposition: "INTENTIONAL" | "VIOLATION";
  readonly reasonCode: string | null;
}

interface TrackBReplayCaseResult {
  readonly caseId: string;
  readonly riskClasses: readonly TrackBReplayRiskClass[];
  readonly status: "PASS" | "VIOLATION";
  readonly reply: RealtimeReplyDifferentialResult;
  readonly state: {
    readonly status: "MATCH" | "INTENTIONAL_DIFFERENCE" | "VIOLATION";
    readonly differences: readonly TrackBStateDifference[];
  };
  readonly sideEffects: {
    readonly status: "NONE" | "VIOLATION";
    readonly reasonCodes: readonly string[];
    readonly capturedCommitPlans: number;
  };
}

export interface TrackBLivePathReplayResult {
  readonly contractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1";
  readonly status: "PASS" | "VIOLATION";
  readonly sideEffects: "DISABLED";
  readonly identity: TrackBReplayIdentity;
  readonly identityHash: string;
  readonly coverage: {
    readonly complete: boolean;
    readonly coveredRiskClasses: readonly TrackBReplayRiskClass[];
    readonly missingRiskClasses: readonly TrackBReplayRiskClass[];
  };
  readonly cases: readonly TrackBReplayCaseResult[];
}

const SHA256_IDENTITY = /^(?:sha256:)?[a-f0-9]{64}$/u;
const REQUIRED_RISK_CLASSES = new Set<string>(
  TRACK_B_REPLAY_REQUIRED_RISK_CLASSES,
);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function validateIdentity(identity: TrackBReplayIdentity): void {
  if (identity.capability !== "BASELINE_MODEL_CAPABILITY") {
    throw new Error("TRACK_B_REPLAY_BASELINE_CAPABILITY_REQUIRED");
  }
  for (const field of [
    "modelProvider",
    "providerModel",
    "promptVersion",
  ] as const) {
    if (!identity[field].trim()) {
      throw new Error(`TRACK_B_REPLAY_IDENTITY_${field.toUpperCase()}_REQUIRED`);
    }
  }
  for (const field of [
    "promptTemplateHash",
    "generationConfigHash",
    "policyIdentityHash",
    "schemaIdentityHash",
    "behaviorContentHash",
    "authorityBundleHash",
    "factFixtureHash",
  ] as const) {
    if (!SHA256_IDENTITY.test(identity[field])) {
      throw new Error(`TRACK_B_REPLAY_IDENTITY_${field.toUpperCase()}_INVALID`);
    }
  }
}

function validCounter(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function sideEffectResult(
  baseline: TrackBReplaySideEffectCapture,
  candidate: TrackBReplaySideEffectCapture,
): TrackBReplayCaseResult["sideEffects"] {
  const captures = [baseline, candidate];
  const reasonCodes: string[] = [];
  if (captures.some((capture) => !Object.values(capture).every(validCounter))) {
    reasonCodes.push("TRACK_B_REPLAY_SIDE_EFFECT_CAPTURE_INVALID");
  } else {
    if (captures.some(({ queueClaims }) => queueClaims > 0)) {
      reasonCodes.push("TRACK_B_REPLAY_QUEUE_CLAIMED");
    }
    if (captures.some(({ customerMessages }) => customerMessages > 0)) {
      reasonCodes.push("TRACK_B_REPLAY_CUSTOMER_MESSAGE_SENT");
    }
    if (captures.some(({ stateMutations }) => stateMutations > 0)) {
      reasonCodes.push("TRACK_B_REPLAY_STATE_MUTATED");
    }
    if (captures.some(({ protectedEffects }) => protectedEffects > 0)) {
      reasonCodes.push("TRACK_B_REPLAY_PROTECTED_EFFECT_EXECUTED");
    }
  }
  return {
    status: reasonCodes.length === 0 ? "NONE" : "VIOLATION",
    reasonCodes,
    capturedCommitPlans: validCounter(baseline.capturedCommitPlans) &&
        validCounter(candidate.capturedCommitPlans)
      ? baseline.capturedCommitPlans + candidate.capturedCommitPlans
      : 0,
  };
}

function stateResult<TInput>(
  replayCase: TrackBLivePathReplayCase<TInput>,
): TrackBReplayCaseResult["state"] {
  const comparison = compareCommerceAuthority(replayCase.stateComparison);
  const permitted = new Map<StateDifferenceCode, string>();
  for (const difference of replayCase.permittedStateDifferences ?? []) {
    const reasonCode = difference.reasonCode.trim();
    if (!reasonCode) throw new Error("TRACK_B_REPLAY_STATE_REASON_CODE_REQUIRED");
    if (permitted.has(difference.code)) {
      throw new Error("TRACK_B_REPLAY_DUPLICATE_STATE_PERMISSION");
    }
    permitted.set(difference.code, reasonCode);
  }
  const differences = comparison.differences.map((code): TrackBStateDifference => {
    const reasonCode = permitted.get(code) ?? null;
    return {
      code,
      disposition: reasonCode === null ? "VIOLATION" : "INTENTIONAL",
      reasonCode,
    };
  });
  return {
    status: differences.some(({ disposition }) => disposition === "VIOLATION")
      ? "VIOLATION"
      : differences.length > 0
        ? "INTENTIONAL_DIFFERENCE"
        : comparison.status === "MATCH"
          ? "MATCH"
          : "VIOLATION",
    differences,
  };
}

/**
 * Thin B3 adapter over the B2.1 reply comparator and the existing commerce
 * state comparator. Callers supply capture-only executions; this function has
 * no queue, delivery, persistence, model-provider, or protected-effect port.
 */
export async function runTrackBLivePathReplay<TInput>(input: {
  readonly identity: TrackBReplayIdentity;
  readonly cases: readonly TrackBLivePathReplayCase<TInput>[];
}): Promise<TrackBLivePathReplayResult> {
  validateIdentity(input.identity);
  const covered = new Set<TrackBReplayRiskClass>();
  const caseIds = new Set<string>();
  const cases: TrackBReplayCaseResult[] = [];

  for (const replayCase of input.cases) {
    const caseId = replayCase.caseId.trim();
    if (!caseId) throw new Error("TRACK_B_REPLAY_CASE_ID_REQUIRED");
    if (caseIds.has(caseId)) throw new Error("TRACK_B_REPLAY_CASE_ID_DUPLICATE");
    caseIds.add(caseId);
    for (const riskClass of replayCase.riskClasses) {
      if (!REQUIRED_RISK_CLASSES.has(riskClass)) {
        throw new Error("TRACK_B_REPLAY_RISK_CLASS_INVALID");
      }
      covered.add(riskClass);
    }
  }

  for (const replayCase of input.cases) {
    const caseId = replayCase.caseId.trim();
    const observations: {
      baseline?: TrackBReplayObservation;
      candidate?: TrackBReplayObservation;
    } = {};
    const reply = await runRealtimeReplyDifferential({
      capturedInput: replayCase.capturedInput,
      baseline: async (capture) => {
        observations.baseline = await replayCase.baseline(capture);
        return observations.baseline.reply;
      },
      candidate: async (capture) => {
        observations.candidate = await replayCase.candidate(capture);
        return observations.candidate.reply;
      },
      ...(replayCase.permittedReplyDifferences === undefined
        ? {}
        : { permittedDifferences: replayCase.permittedReplyDifferences }),
    });
    if (observations.baseline === undefined || observations.candidate === undefined) {
      throw new Error("TRACK_B_REPLAY_OBSERVATION_MISSING");
    }
    const state = stateResult(replayCase);
    const sideEffects = sideEffectResult(
      observations.baseline.sideEffects,
      observations.candidate.sideEffects,
    );
    cases.push({
      caseId,
      riskClasses: [...replayCase.riskClasses],
      status: reply.status === "VIOLATION" ||
          state.status === "VIOLATION" ||
          sideEffects.status === "VIOLATION"
        ? "VIOLATION"
        : "PASS",
      reply,
      state,
      sideEffects,
    });
  }

  const coveredRiskClasses = TRACK_B_REPLAY_REQUIRED_RISK_CLASSES.filter(
    (riskClass) => covered.has(riskClass),
  );
  const missingRiskClasses = TRACK_B_REPLAY_REQUIRED_RISK_CLASSES.filter(
    (riskClass) => !covered.has(riskClass),
  );
  return {
    contractVersion: "TRACK_B_LIVE_PATH_REPLAY_V1",
    status: missingRiskClasses.length > 0 ||
        cases.some(({ status }) => status === "VIOLATION")
      ? "VIOLATION"
      : "PASS",
    sideEffects: "DISABLED",
    identity: Object.freeze({ ...input.identity }),
    identityHash: sha256(canonicalJsonV1(input.identity)),
    coverage: {
      complete: missingRiskClasses.length === 0,
      coveredRiskClasses,
      missingRiskClasses,
    },
    cases,
  };
}
