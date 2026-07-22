import { guardAgentProposal, type GuardInput } from "@lana/business-tools";
import {
  PancakeTagCommandV1Schema,
  type BusinessFactEnvelopeV1,
  type GuardedReplyPlanV1,
  type PancakeTagCommandV1,
} from "@lana/contracts";
import {
  applyInboundEvent,
  applySilentHandoff,
  type ConversationState,
  type DecisionAuthorization,
  type HandoffDirective,
  type InboundConversationEvent,
  type PancakeTagObservation,
} from "@lana/conversation-engine";

export interface Phase2RuntimeInput {
  readonly pageId: string;
  readonly state: ConversationState;
  readonly expectedRevision: number;
  readonly fence: number;
  readonly event: InboundConversationEvent;
  readonly tagObservation: PancakeTagObservation;
  readonly proposal?: unknown;
  readonly facts: BusinessFactEnvelopeV1 | null;
  readonly verifiedProductIds: ReadonlySet<string>;
  readonly promotion?: GuardInput["promotion"];
  readonly shipping?: GuardInput["shipping"];
  readonly now: Date;
}

export interface Phase2RuntimeResult {
  readonly status: "APPLIED" | "STALE" | "DUPLICATE";
  readonly state: ConversationState;
  readonly authorization: DecisionAuthorization;
  readonly guardedPlan: GuardedReplyPlanV1 | null;
  readonly handoff: HandoffDirective | null;
  readonly pancakeTagIntent: PancakeTagCommandV1 | null;
  /** Phase 2 cannot create a customer-send intent under any routing mode. */
  readonly metaOutboxIntent: null;
  readonly sendEnabled: false;
}

export function evaluatePhase2Runtime(input: Phase2RuntimeInput): Phase2RuntimeResult {
  const applied = applyInboundEvent({
    state: input.state,
    expectedRevision: input.expectedRevision,
    fence: input.fence,
    event: input.event,
    tagObservation: input.tagObservation,
    now: input.now,
  });

  if (applied.status !== "APPLIED") {
    return {
      status: applied.status,
      state: applied.state,
      authorization: applied.authorization,
      guardedPlan: null,
      handoff: null,
      pancakeTagIntent: null,
      metaOutboxIntent: null,
      sendEnabled: false,
    };
  }

  let nextState = applied.state;
  let handoff = applied.handoff;
  let guardedPlan: GuardedReplyPlanV1 | null = null;

  if (handoff === null && applied.authorization.allowEvaluate && input.proposal !== undefined) {
    guardedPlan = guardAgentProposal({
      proposal: input.proposal,
      facts: input.facts,
      verifiedProductIds: input.verifiedProductIds,
      ...(input.promotion === undefined ? {} : { promotion: input.promotion }),
      ...(input.shipping === undefined ? {} : { shipping: input.shipping }),
      now: input.now,
    });
    if (guardedPlan.action === "HANDOFF") {
      const transitioned = applySilentHandoff(
        nextState,
        guardedPlan.blockedReasonCodes.length > 0
          ? "UNVERIFIED_BUSINESS_FACT"
          : "AGENT_REQUEST",
        nextState.revision,
        input.fence,
        input.now,
      );
      nextState = transitioned.state;
      handoff = transitioned.handoff;
      guardedPlan = {
        ...guardedPlan,
        textUnits: [],
        imageUrls: [],
        handoffReason: transitioned.handoff.reason,
        sendAuthorized: false,
      };
    }
  }

  const allowTagCommand = handoff !== null && nextState.routingOwner === "APP";
  let pancakeTagIntent: PancakeTagCommandV1 | null = null;
  if (handoff !== null && allowTagCommand) {
    pancakeTagIntent = PancakeTagCommandV1Schema.parse({
        schemaVersion: 1,
        pageId: input.pageId,
        conversationId: nextState.conversationId,
        desiredTag: handoff.desiredTag,
        operation: "ADD",
      });
  }

  return {
    status: "APPLIED",
    state: nextState,
    authorization: {
      ...applied.authorization,
      allowCreateMetaOutbox: false,
      allowTagCommand,
    },
    guardedPlan,
    handoff,
    pancakeTagIntent,
    metaOutboxIntent: null,
    sendEnabled: false,
  };
}
