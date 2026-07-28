import { classifyHandoff } from "./handoff.js";
import { transitionSalesStage } from "./sales-stage.js";
import type {
  ApplyInboundInput,
  ApplyInboundResult,
  ConversationState,
  CreateConversationStateInput,
  DecisionAuthorization,
  EventCursor,
  HandoffDirective,
  InboundConversationEvent,
  PancakeTagObservation,
} from "./types.js";

export const HUMAN_LEASE_MS = 15 * 60 * 1_000;
export const PHASE_2_SEND_ENABLED = false as const;

const iso = (date: Date): string => date.toISOString();
const parseTime = (value: string, code: string): number => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(code);
  return timestamp;
};

function cloneState(state: ConversationState): ConversationState {
  return JSON.parse(JSON.stringify(state)) as ConversationState;
}

function emptyAuthorization(reasonCode: string): DecisionAuthorization {
  return {
    allowEvaluate: false,
    allowCreateMetaOutbox: false,
    allowTagCommand: false,
    metaOutboxEligibleAfterPhase2: false,
    reasonCodes: [reasonCode],
  };
}

function compareEvent(event: InboundConversationEvent, cursor: EventCursor | null): -1 | 0 | 1 {
  if (cursor === null) return 1;
  if (event.eventKey === cursor.eventKey) return 0;
  const eventTime = parseTime(event.occurredAt, "EVENT_OCCURRED_AT_INVALID");
  const cursorTime = parseTime(cursor.occurredAt, "STATE_CURSOR_OCCURRED_AT_INVALID");
  if (eventTime !== cursorTime) return eventTime > cursorTime ? 1 : -1;
  if (event.receiveSequence !== cursor.receiveSequence) {
    return event.receiveSequence > cursor.receiveSequence ? 1 : -1;
  }
  return -1;
}

function leaseUntil(now: Date): string {
  return iso(new Date(now.getTime() + HUMAN_LEASE_MS));
}

function applyTagGate(
  state: ConversationState,
  observation: PancakeTagObservation,
  now: Date,
): ConversationState {
  const ownedOnlyByTagGate =
    state.ownerReason === "UNVERIFIED" || state.ownerReason === "PANCAKE_TAG";
  // Pancake can lag Meta by one or two minutes. A missing/unverified read is
  // fail-open by policy: it must not create or preserve HUMAN ownership on its
  // own. Genuine HUMAN_ECHO/POST_SALE/AGENT_HANDOFF ownership is preserved.
  if (!observation.verified) {
    return {
      ...state,
      ...(ownedOnlyByTagGate
        ? {
            conversationOwner: "BOT" as const,
            ownerReason: "DEFAULT" as const,
            ownerLeaseUntil: null,
          }
        : {}),
      tagGateStatus: "UNVERIFIED",
      blockingTag: null,
      blockingTagVerifiedAt: observation.observedAt,
    };
  }
  if (observation.blockingTag !== null) {
    return {
      ...state,
      conversationOwner: "HUMAN",
      ownerReason: "PANCAKE_TAG",
      ownerLeaseUntil: leaseUntil(now),
      tagGateStatus: "BLOCKING",
      blockingTag: observation.blockingTag,
      blockingTagVerifiedAt: observation.observedAt,
    };
  }
  // Every inbound event is fenced and committed with optimistic concurrency.
  // Therefore a verified provider response is authoritative for that event:
  // an empty tag list must overwrite an older blocking-tag projection.
  return {
    ...state,
    ...(ownedOnlyByTagGate
      ? {
          conversationOwner: "BOT" as const,
          ownerReason: "DEFAULT" as const,
          ownerLeaseUntil: null,
        }
      : {}),
    tagGateStatus: "VERIFIED_ABSENT",
    blockingTag: null,
    blockingTagVerifiedAt: observation.observedAt,
  };
}

function canResumeBot(
  state: ConversationState,
  event: InboundConversationEvent,
  now: Date,
): boolean {
  if (state.conversationOwner !== "HUMAN") return false;
  if (event.actor !== "CUSTOMER") return false;
  if (state.tagGateStatus === "BLOCKING" || state.blockingTag !== null) return false;
  if (state.ownerLeaseUntil === null) return false;
  const leaseEnd = parseTime(state.ownerLeaseUntil, "OWNER_LEASE_INVALID");
  const eventTime = parseTime(event.occurredAt, "EVENT_OCCURRED_AT_INVALID");
  return now.getTime() >= leaseEnd && eventTime > leaseEnd;
}

function authorizationFor(
  state: ConversationState,
  event: InboundConversationEvent,
  handoff: HandoffDirective | null,
): DecisionAuthorization {
  const reasons: string[] = [];
  const tagClear = state.tagGateStatus !== "BLOCKING" && state.blockingTag === null;
  const botOwned = state.conversationOwner === "BOT";
  const customerEvent = event.actor === "CUSTOMER";
  const allowEvaluate = customerEvent && tagClear && botOwned && handoff === null;
  const metaEligible = allowEvaluate && state.routingOwner === "APP";
  const allowTagCommand = handoff !== null && state.routingOwner === "APP";

  if (!customerEvent) reasons.push("ACTOR_NOT_CUSTOMER");
  if (state.tagGateStatus === "UNVERIFIED") reasons.push("PANCAKE_TAG_UNVERIFIED");
  if (state.blockingTag !== null) reasons.push("PANCAKE_BLOCKING_TAG");
  if (!botOwned) reasons.push("CONVERSATION_OWNER_HUMAN");
  if (handoff !== null) reasons.push("SILENT_HANDOFF");
  if (state.routingOwner === "N8N") reasons.push("ROUTING_OWNER_N8N_SHADOW");
  if (metaEligible) reasons.push("PHASE2_SEND_DISABLED");

  return {
    allowEvaluate,
    allowCreateMetaOutbox: false,
    allowTagCommand,
    metaOutboxEligibleAfterPhase2: metaEligible,
    reasonCodes: [...new Set(reasons)],
  };
}

export function createConversationState(input: CreateConversationStateInput): ConversationState {
  if (input.conversationId.trim() === "") throw new Error("CONVERSATION_ID_REQUIRED");
  return {
    schemaVersion: 1,
    conversationId: input.conversationId,
    routingOwner: input.routingOwner,
    conversationOwner: "BOT",
    ownerReason: "DEFAULT",
    ownerLeaseUntil: null,
    tagGateStatus: "UNVERIFIED",
    blockingTag: null,
    blockingTagVerifiedAt: null,
    revision: 0,
    lastFence: 0,
    lastEvent: null,
    currentProductId: null,
    productSelections: [],
    mediaClarification: null,
    consideredVariant: { offerType: null, color: null, size: null },
    verifiedVariant: null,
    orderDraft: null,
    salesStage: "DISCOVERY",
    objectionType: "NONE",
    updatedAt: iso(input.now),
  };
}

export function applyInboundEvent(input: ApplyInboundInput): ApplyInboundResult {
  if (input.expectedRevision !== input.state.revision) throw new Error("STATE_REVISION_CONFLICT");
  if (!Number.isSafeInteger(input.fence) || input.fence <= 0) throw new Error("FENCE_INVALID");
  if (input.fence < input.state.lastFence) throw new Error("STALE_FENCE");
  if (!Number.isSafeInteger(input.event.receiveSequence) || input.event.receiveSequence < 0) {
    throw new Error("RECEIVE_SEQUENCE_INVALID");
  }
  parseTime(input.event.occurredAt, "EVENT_OCCURRED_AT_INVALID");
  parseTime(input.tagObservation.observedAt, "TAG_OBSERVED_AT_INVALID");

  const order = compareEvent(input.event, input.state.lastEvent);
  if (order === 0) {
    return {
      status: "DUPLICATE",
      state: cloneState(input.state),
      authorization: emptyAuthorization("DUPLICATE_EVENT"),
      handoff: null,
      stageTransitionCode: null,
    };
  }
  if (order < 0) {
    return {
      status: "STALE",
      state: cloneState(input.state),
      authorization: emptyAuthorization("STALE_EVENT"),
      handoff: null,
      stageTransitionCode: null,
    };
  }

  let next = applyTagGate(cloneState(input.state), input.tagObservation, input.now);
  if (canResumeBot(next, input.event, input.now)) {
    next = {
      ...next,
      conversationOwner: "BOT",
      ownerReason: "DEFAULT",
      ownerLeaseUntil: null,
    };
  }

  if (input.event.actor === "HUMAN") {
    next = {
      ...next,
      conversationOwner: "HUMAN",
      ownerReason: "HUMAN_ECHO",
      ownerLeaseUntil: leaseUntil(input.now),
    };
  }

  let handoff: HandoffDirective | null = null;
  const requestedHandoff =
    input.event.journey === "POST_SALE"
      ? input.event.requestedHandoffReason ?? "POST_SALE"
      : input.event.requestedHandoffReason;
  if (requestedHandoff !== null) {
    handoff = classifyHandoff(requestedHandoff);
    next = {
      ...next,
      conversationOwner: "HUMAN",
      ownerReason: handoff.category === "POST_SALE" ? "POST_SALE" : "AGENT_HANDOFF",
      ownerLeaseUntil: leaseUntil(input.now),
      salesStage: handoff.category === "POST_SALE" ? "POST_SALE" : next.salesStage,
    };
  }

  let stageTransitionCode: string | null = null;
  const productChanged =
    input.event.productId !== null &&
    next.currentProductId !== null &&
    input.event.productId !== next.currentProductId;
  if (input.event.actor === "CUSTOMER" && input.event.productId !== null) {
    next = {
      ...next,
      currentProductId: input.event.productId,
      ...(productChanged
        ? {
            consideredVariant: { offerType: null, color: null, size: null },
            verifiedVariant: null,
            orderDraft: null,
          }
        : {}),
    };
  }
  if (handoff?.category !== "POST_SALE" && input.event.requestedSalesStage !== null) {
    const trigger = productChanged ? "PRODUCT_SWITCHED" : input.event.salesStageTrigger;
    const transition = transitionSalesStage(
      next.salesStage,
      input.event.requestedSalesStage,
      trigger,
    );
    next = { ...next, salesStage: transition.stage };
    stageTransitionCode = transition.code;
  }
  if (input.event.actor === "CUSTOMER") {
    next = { ...next, objectionType: input.event.objectionType };
  }

  next = {
    ...next,
    revision: input.state.revision + 1,
    lastFence: input.fence,
    lastEvent: {
      eventKey: input.event.eventKey,
      occurredAt: input.event.occurredAt,
      receiveSequence: input.event.receiveSequence,
    },
    updatedAt: iso(input.now),
  };

  return {
    status: "APPLIED",
    state: next,
    authorization: authorizationFor(next, input.event, handoff),
    handoff,
    stageTransitionCode,
  };
}

export function withRoutingOwner(
  state: ConversationState,
  routingOwner: ConversationState["routingOwner"],
  expectedRevision: number,
  fence: number,
  now: Date,
): ConversationState {
  if (state.revision !== expectedRevision) throw new Error("STATE_REVISION_CONFLICT");
  if (!Number.isSafeInteger(fence) || fence <= 0) throw new Error("FENCE_INVALID");
  if (fence < state.lastFence) throw new Error("STALE_FENCE");
  return {
    ...state,
    routingOwner,
    revision: state.revision + 1,
    lastFence: fence,
    updatedAt: iso(now),
  };
}

/** Apply a deterministic, silent handoff produced after business/policy validation. */
export function applySilentHandoff(
  state: ConversationState,
  reason: HandoffDirective["reason"],
  expectedRevision: number,
  fence: number,
  now: Date,
): { readonly state: ConversationState; readonly handoff: HandoffDirective } {
  if (state.revision !== expectedRevision) throw new Error("STATE_REVISION_CONFLICT");
  if (!Number.isSafeInteger(fence) || fence <= 0) throw new Error("FENCE_INVALID");
  if (fence < state.lastFence) throw new Error("STALE_FENCE");
  const handoff = classifyHandoff(reason);
  return {
    handoff,
    state: {
      ...state,
      conversationOwner: "HUMAN",
      ownerReason: handoff.category === "POST_SALE" ? "POST_SALE" : "AGENT_HANDOFF",
      ownerLeaseUntil: leaseUntil(now),
      salesStage: handoff.category === "POST_SALE" ? "POST_SALE" : state.salesStage,
      revision: state.revision + 1,
      lastFence: fence,
      updatedAt: iso(now),
    },
  };
}
