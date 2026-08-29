import type { RealtimeMetaMessageUnit } from "@lana/database";

const vietnameseSentenceSegmenter = new Intl.Segmenter("vi", {
  granularity: "sentence",
});

// "chị" is a second-person pronoun, not a decorative particle, so it is
// intentionally excluded: deduplicating it would drop sentence subjects.
const RESPONSE_GROUP_POLITENESS_TOKENS = new Set(["nhé", "ạ"]);
const RESPONSE_GROUP_POLITENESS_TOKEN =
  /(?<![\p{L}\p{N}_])(nhé|ạ)(?![\p{L}\p{N}_])/giu;

export function splitRealtimeMetaMessages(
  messages: readonly RealtimeMetaMessageUnit[],
): RealtimeMetaMessageUnit[] {
  return messages.flatMap((message) => {
    if (message.kind !== "TEXT") return [message];
    const segments = message.text
      .split(/\r?\n+/gu)
      .flatMap((line) => [...vietnameseSentenceSegmenter.segment(line)])
      .map(({ segment }) => segment.trim())
      .filter(Boolean);
    return segments.map((text): RealtimeMetaMessageUnit => ({
      kind: "TEXT",
      text,
    }));
  });
}

/** Keeps the conversational particles natural by using each at most once per response group. */
export function limitResponseGroupPoliteness(
  messages: readonly RealtimeMetaMessageUnit[],
): RealtimeMetaMessageUnit[] {
  const used = new Set<string>();
  const limited: RealtimeMetaMessageUnit[] = [];
  for (const message of messages) {
    if (message.kind !== "TEXT") {
      limited.push(message);
      continue;
    }
    const text = message.text.replace(RESPONSE_GROUP_POLITENESS_TOKEN, (match) => {
      const token = match.toLocaleLowerCase("vi");
      if (!RESPONSE_GROUP_POLITENESS_TOKENS.has(token) || !used.has(token)) {
        used.add(token);
        return match;
      }
      return "";
    })
      .replace(/[ \t]+([,.;:!?])/gu, "$1")
      .replace(/[ \t]{2,}/gu, " ")
      .replace(/[ \t]*\n[ \t]*/gu, "\n")
      .trim();
    if (text) limited.push({ kind: "TEXT", text });
  }
  return limited;
}

export function groupRealtimeMetaMessagesV2(
  messages: readonly RealtimeMetaMessageUnit[],
  splitProductInfoFollowUp = false,
): RealtimeMetaMessageUnit[] {
  if (!splitProductInfoFollowUp) {
    return limitResponseGroupPoliteness(messages);
  }
  let split = false;
  const grouped = messages.flatMap((message) => {
    if (split || message.kind !== "TEXT") return [message];
    const [information, ...followUpParts] = message.text
      .replace(/\r\n?/gu, "\n")
      .split(/\n{2,}/gu)
      .map((part) => part.trim())
      .filter(Boolean);
    const followUp = followUpParts.join("\n\n").trim();
    if (!information || !followUp) return [message];
    split = true;
    return [
      { kind: "TEXT" as const, text: information },
      { kind: "TEXT" as const, text: followUp },
    ];
  });
  return limitResponseGroupPoliteness(grouped);
}

export type RealtimePostGenerationMode =
  | "PRESERVE"
  | "GROUP_V2"
  | "SPLIT_SENTENCES";

export interface RealtimePostGenerationStage<TProposal> {
  readonly contractVersion: "REALTIME_POST_GENERATION_STAGE_V1";
  readonly stage: "POST_GENERATION";
  readonly proposal: TProposal;
}

/** Marks the single transition from generated/grounded proposal to downstream handling. */
export function beginRealtimePostGenerationStage<TProposal>(
  proposal: TProposal,
): RealtimePostGenerationStage<TProposal> {
  return {
    contractVersion: "REALTIME_POST_GENERATION_STAGE_V1",
    stage: "POST_GENERATION",
    proposal,
  };
}

export interface RealtimePostGenerationReplyInput {
  readonly mode: RealtimePostGenerationMode;
  readonly messages: readonly RealtimeMetaMessageUnit[];
  readonly splitProductInfoFollowUp?: boolean;
}

export interface RealtimePostGenerationReply {
  readonly contractVersion: "REALTIME_POST_GENERATION_REPLY_V1";
  readonly stage: "POST_GENERATION";
  readonly messages: readonly RealtimeMetaMessageUnit[];
}

/**
 * The explicit boundary between proposal/copy production and final delivery.
 * This function is pure: it owns only transport shaping and receives no queue,
 * delivery, persistence, authority, or effect port.
 */
export function finalizeRealtimePostGenerationReply(
  input: RealtimePostGenerationReplyInput,
): RealtimePostGenerationReply {
  const messages = input.mode === "GROUP_V2"
    ? groupRealtimeMetaMessagesV2(
        input.messages,
        input.splitProductInfoFollowUp ?? false,
      )
    : input.mode === "SPLIT_SENTENCES"
      ? splitRealtimeMetaMessages(input.messages)
      : [...input.messages];
  return {
    contractVersion: "REALTIME_POST_GENERATION_REPLY_V1",
    stage: "POST_GENERATION",
    messages,
  };
}

export function textSimilarity(left: string, right: string): number {
  const tokens = (value: string): Set<string> => new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase("vi")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .split(/\s+/u)
      .filter((token) => token.length > 1),
  );
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export interface RealtimeReplySnapshot {
  readonly messages: readonly RealtimeMetaMessageUnit[];
  /** Stable identity of the selected conversational strategy, when one exists. */
  readonly strategyHash: string | null;
  readonly verifiedFactHashes: readonly string[];
  readonly verifiedMediaUrls: readonly string[];
  readonly protectedClaimHashes: readonly string[];
  readonly effectAuthorizationHashes: readonly string[];
  readonly commitOutcome: string;
  readonly generationOutcome: "VALID" | "MALFORMED" | "FAILED";
  readonly inboxOutcome: "COMMITTED" | "RETRYABLE" | "FAILED_PERMANENT";
  readonly protectedOutbound: {
    readonly required: boolean;
    readonly plannedMessageCount: number;
    readonly deliveredMessageCount: number;
  };
}

export type RealtimeReplyDifferenceCode =
  | "OUTBOUND_MESSAGES_CHANGED"
  | "STRATEGY_CHANGED"
  | "VERIFIED_FACTS_CHANGED"
  | "VERIFIED_MEDIA_CHANGED"
  | "PROTECTED_CLAIMS_CHANGED"
  | "EFFECT_AUTHORIZATION_CHANGED"
  | "COMMIT_OUTCOME_CHANGED"
  | "PROTECTED_OUTBOUND_PARTIAL_DELIVERY"
  | "GENERATION_FAILURE_PERMANENT_INBOX_FAILURE";

export interface PermittedRealtimeReplyDifference {
  readonly code: RealtimeReplyDifferenceCode;
  /** A reviewed contract/deviation reason code; free-form prose is not sufficient. */
  readonly reasonCode: string;
}

export interface RealtimeReplyDifference {
  readonly code: RealtimeReplyDifferenceCode;
  readonly disposition: "INTENTIONAL" | "VIOLATION";
  readonly reasonCode: string | null;
}

export interface RealtimeReplyDifferentialResult {
  readonly contractVersion: "REALTIME_REPLY_DIFFERENTIAL_V1";
  readonly status: "MATCH" | "INTENTIONAL_DIFFERENCE" | "VIOLATION";
  /** The comparator cannot authorize or execute queue, delivery, state, or effect work. */
  readonly sideEffects: "DISABLED";
  readonly differences: readonly RealtimeReplyDifference[];
}

function sameOrderedValues(left: readonly unknown[], right: readonly unknown[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return sameOrderedValues([...new Set(left)].sort(), [...new Set(right)].sort());
}

const NON_PERMITTABLE_INVARIANTS = new Set<RealtimeReplyDifferenceCode>([
  "PROTECTED_OUTBOUND_PARTIAL_DELIVERY",
  "GENERATION_FAILURE_PERMANENT_INBOX_FAILURE",
]);

export function compareRealtimeReplySnapshots(input: {
  readonly baseline: RealtimeReplySnapshot;
  readonly candidate: RealtimeReplySnapshot;
  readonly permittedDifferences?: readonly PermittedRealtimeReplyDifference[];
}): RealtimeReplyDifferentialResult {
  const permitted = new Map<RealtimeReplyDifferenceCode, string>();
  for (const difference of input.permittedDifferences ?? []) {
    const reasonCode = difference.reasonCode.trim();
    if (!reasonCode) throw new Error("REALTIME_DIFFERENTIAL_REASON_CODE_REQUIRED");
    permitted.set(difference.code, reasonCode);
  }

  const codes: RealtimeReplyDifferenceCode[] = [];
  if (!sameOrderedValues(input.baseline.messages, input.candidate.messages)) {
    codes.push("OUTBOUND_MESSAGES_CHANGED");
  }
  if (input.baseline.strategyHash !== input.candidate.strategyHash) {
    codes.push("STRATEGY_CHANGED");
  }
  if (!sameSet(input.baseline.verifiedFactHashes, input.candidate.verifiedFactHashes)) {
    codes.push("VERIFIED_FACTS_CHANGED");
  }
  if (!sameSet(input.baseline.verifiedMediaUrls, input.candidate.verifiedMediaUrls)) {
    codes.push("VERIFIED_MEDIA_CHANGED");
  }
  if (!sameSet(input.baseline.protectedClaimHashes, input.candidate.protectedClaimHashes)) {
    codes.push("PROTECTED_CLAIMS_CHANGED");
  }
  if (!sameSet(
    input.baseline.effectAuthorizationHashes,
    input.candidate.effectAuthorizationHashes,
  )) {
    codes.push("EFFECT_AUTHORIZATION_CHANGED");
  }
  if (input.baseline.commitOutcome !== input.candidate.commitOutcome) {
    codes.push("COMMIT_OUTCOME_CHANGED");
  }
  const delivery = input.candidate.protectedOutbound;
  if (
    delivery.required &&
    delivery.deliveredMessageCount !== 0 &&
    delivery.deliveredMessageCount !== delivery.plannedMessageCount
  ) {
    codes.push("PROTECTED_OUTBOUND_PARTIAL_DELIVERY");
  }
  if (
    input.candidate.generationOutcome !== "VALID" &&
    input.candidate.inboxOutcome === "FAILED_PERMANENT"
  ) {
    codes.push("GENERATION_FAILURE_PERMANENT_INBOX_FAILURE");
  }

  const differences = codes.map((code): RealtimeReplyDifference => {
    const reasonCode = permitted.get(code) ?? null;
    const intentional = reasonCode !== null && !NON_PERMITTABLE_INVARIANTS.has(code);
    return {
      code,
      disposition: intentional ? "INTENTIONAL" : "VIOLATION",
      reasonCode: intentional ? reasonCode : null,
    };
  });
  return {
    contractVersion: "REALTIME_REPLY_DIFFERENTIAL_V1",
    status: differences.some(({ disposition }) => disposition === "VIOLATION")
      ? "VIOLATION"
      : differences.length > 0
        ? "INTENTIONAL_DIFFERENCE"
        : "MATCH",
    sideEffects: "DISABLED",
    differences,
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

export async function runRealtimeReplyDifferential<TInput>(input: {
  readonly capturedInput: TInput;
  readonly baseline: (
    capture: Readonly<TInput>,
  ) => RealtimeReplySnapshot | Promise<RealtimeReplySnapshot>;
  readonly candidate: (
    capture: Readonly<TInput>,
  ) => RealtimeReplySnapshot | Promise<RealtimeReplySnapshot>;
  readonly permittedDifferences?: readonly PermittedRealtimeReplyDifference[];
}): Promise<RealtimeReplyDifferentialResult> {
  const baselineCapture = deepFreeze(structuredClone(input.capturedInput));
  const candidateCapture = deepFreeze(structuredClone(input.capturedInput));
  const baseline = await input.baseline(baselineCapture);
  const candidate = await input.candidate(candidateCapture);
  return compareRealtimeReplySnapshots({
    baseline,
    candidate,
    ...(input.permittedDifferences === undefined
      ? {}
      : { permittedDifferences: input.permittedDifferences }),
  });
}
