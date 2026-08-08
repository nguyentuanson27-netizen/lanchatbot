import { AsyncLocalStorage } from "node:async_hooks";
import type {
  AgentProposalV1,
  CorrectionDialoguePolicyV1,
} from "@lana/contracts";
import type { RuntimePolicyResolverPort } from "@lana/chat-runtime";
import {
  redactAnalyticsMessage,
  type RealtimeDecisionEventPlan,
} from "@lana/database";
import { createConversationState } from "@lana/conversation-engine";
import {
  RealtimeRunner as Bf01RealtimeRunner,
  hasCustomerMeasurementSignal,
  type CanonicalChatHistoryPort,
  type RealtimeInboxPort,
  type RealtimeMediaRecognitionPort,
  type RealtimeModelPort,
  type RealtimeProductSearchPort,
  type RealtimeRuntimePort,
  type RealtimeRunnerOptions,
  type RealtimeTagObservationProvider,
  type RealtimeVideoFrameExtractorPort,
  type RuntimeBehaviorModeResolverPort,
} from "./bf01-realtime-runner.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import type { ChatHistoryPort } from "./redis-chat-history.js";
import { classifyPreSalePolicyIntent } from "./pre-sale-policy.js";

export * from "./bf01-realtime-runner.js";

export const BF03_CORRECTION_REASON_CODE = "CORRECTION_CONTAINMENT" as const;

export interface Bf03CorrectionContainmentDecision {
  readonly applies: boolean;
  readonly reasonCodes: readonly string[];
}

type Bf03PolicyResolution = Awaited<
  ReturnType<RuntimePolicyResolverPort["resolve"]>
>;

interface Bf03RawMessage {
  readonly eventKey: string;
  readonly occurredAt: string;
  readonly messageId: string | null;
  readonly text: string;
}

interface Bf03ExecutionContext {
  customerText: string;
  correctionDialoguePolicy: CorrectionDialoguePolicyV1;
  rawMessages: readonly Bf03RawMessage[];
  preResolvedPolicy: Bf03PolicyResolution | undefined;
}

function bindOrReturn<T extends object>(
  target: T,
  property: string | symbol,
): unknown {
  const value = Reflect.get(target, property, target);
  return typeof value === "function" ? value.bind(target) : value;
}

function asciiFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[đĐ]/gu, "d")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/gu, " ")
    .trim();
}

function mentionsLegacySizeTopic(text: string): boolean {
  return /\b(size|sz|kich co|co nao|mac co)\b/u.test(text);
}

function hasClearCorrectionMarker(text: string): boolean {
  return (
    /\broi\s+(?:ma|a|nha|nhe)\b/u.test(text) ||
    /\bda\s+co\b.{0,80}\broi\b/u.test(text) ||
    /\b(?:gia|size|sz|kich co|co nao|mac co)\b.{0,60}\broi\b/u.test(text)
  );
}

function hasSizeRequestEvidence(value: string, text: string): boolean {
  if (hasCustomerMeasurementSignal(value)) return true;
  if (/[?？]/u.test(value)) return true;
  if (
    /\b(size|sz|kich co|co nao|mac co)\b.{0,48}\b(nao|gi|bao nhieu|may|vua|hop|nen|chon|lay|doi|muon|can|tu van|recommend|hay)\b/u.test(text)
  ) return true;
  if (
    /\b(nao|gi|bao nhieu|may|vua|hop|nen|chon|lay|doi|muon|can|tu van|recommend)\b.{0,48}\b(size|sz|kich co|co nao|mac co)\b/u.test(text)
  ) return true;
  if (
    /\b(?:size|sz)\s*(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\b/u.test(text)
  ) return true;
  if (
    /\b(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\s+(?:hay|or|voi)\s+(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\b/u.test(text)
  ) return true;
  return false;
}

/**
 * BF-03 is a temporary negative gate on the known legacy SIZE keyword path.
 * It never promotes another business intent. Clear size requests keep the
 * legacy path; only correction-shaped topic mentions are contained.
 *
 * Retirement dependency: DF-09 Context V2 evidence + atomic DF-11 legacy-regex
 * demotion/cutover.
 */
export function bf03CorrectionContainmentDecision(
  value: string,
  policy: CorrectionDialoguePolicyV1,
): Bf03CorrectionContainmentDecision {
  if (policy !== "CORRECTION_CONTAINMENT_V1") {
    return { applies: false, reasonCodes: [] };
  }
  const text = asciiFold(value);
  if (
    !mentionsLegacySizeTopic(text) ||
    !hasClearCorrectionMarker(text) ||
    hasSizeRequestEvidence(value, text)
  ) {
    return { applies: false, reasonCodes: [] };
  }
  return {
    applies: true,
    reasonCodes: [BF03_CORRECTION_REASON_CODE],
  };
}

/**
 * Internal classifier view only. Raw customer text is restored before model,
 * canonical-history and context-history writes. The neutral view prevents the
 * pre-model legacy multi-fact/SIZE regex from treating an already-answered
 * topic mention as a new capability request.
 */
export function bf03LegacyClassifierView(
  value: string,
  decision: Bf03CorrectionContainmentDecision,
): string {
  return decision.applies ? "đã có thông tin đó rồi mà" : value;
}

export function bf03ContainProposal(
  proposal: AgentProposalV1,
  decision: Bf03CorrectionContainmentDecision,
): AgentProposalV1 {
  if (!decision.applies || proposal.businessFactQuery.intent === "NONE") {
    return proposal;
  }
  return {
    ...proposal,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

export function bf03ContainDecisionEvents(
  events: readonly RealtimeDecisionEventPlan[],
  decision: Bf03CorrectionContainmentDecision,
): readonly RealtimeDecisionEventPlan[] {
  if (!decision.applies) return events;
  return events
    .filter((event) => event.eventType !== "SIZE_CONSULT_STARTED")
    .map((event) => ({
      ...event,
      intent: event.intent === "SIZE" ? null : event.intent,
      reasonCodes: [
        ...new Set([...event.reasonCodes, BF03_CORRECTION_REASON_CODE]),
      ],
    }));
}

function correctionDecision(store: Bf03ExecutionContext): Bf03CorrectionContainmentDecision {
  return bf03CorrectionContainmentDecision(
    store.customerText,
    store.correctionDialoguePolicy,
  );
}

function captureRawMessages(
  store: Bf03ExecutionContext,
  claims: readonly {
    readonly receiveSequence: number;
    readonly envelope: {
      readonly message: {
        readonly eventKey: string;
        readonly occurredAt: string;
        readonly messageId: string | null;
        readonly text: string | null;
      };
    };
  }[],
): void {
  const ordered = [...claims].sort((left, right) =>
    left.receiveSequence - right.receiveSequence
  );
  store.rawMessages = ordered.map(({ envelope }) => ({
    eventKey: envelope.message.eventKey,
    occurredAt: envelope.message.occurredAt,
    messageId: envelope.message.messageId,
    text: envelope.message.text ?? "",
  }));
  store.customerText = store.rawMessages
    .map(({ text }) => text.trim())
    .filter(Boolean)
    .join("\n");
}

function correctionPolicyFromResolution(
  resolution: Bf03PolicyResolution,
): CorrectionDialoguePolicyV1 {
  const livePolicy = resolution.bundle?.sideEffects === "LIVE_OUTBOUND";
  return livePolicy
    ? resolution.bundle?.artifacts.closingStrategy?.correctionDialoguePolicy ?? "LEGACY"
    : "LEGACY";
}

async function preResolveCorrectionPolicy(
  store: Bf03ExecutionContext,
  input: {
    readonly pageId: string;
    readonly conversationHash: string;
    readonly routingOwner: "N8N" | "APP";
  },
  runtime: RealtimeRuntimePort,
  resolver: RuntimePolicyResolverPort | undefined,
  options: RealtimeRunnerOptions,
): Promise<void> {
  if (!resolver || !store.customerText.trim()) return;
  const candidate = bf03CorrectionContainmentDecision(
    store.customerText,
    "CORRECTION_CONTAINMENT_V1",
  );
  if (!candidate.applies) return;

  const now = new Date();
  try {
    const record = await runtime.loadOrCreate(
      input.pageId,
      input.conversationHash,
      input.routingOwner,
      (conversationId) => createConversationState({
        conversationId,
        routingOwner: input.routingOwner,
        now,
      }),
      now,
    );
    const channel = options.policyChannel ?? "CANARY_SHADOW";
    const preSalePolicyIntent = classifyPreSalePolicyIntent(store.customerText);
    const resolution = await resolver.resolve({
      pageId: input.pageId,
      channel,
      ...(channel === "CANARY_SHADOW" || preSalePolicyIntent !== null
        ? {}
        : {
            pin: {
              scopeType: "SALES_EPISODE" as const,
              scopeId: `${record.conversationId}:${channel}`,
            },
          }),
      now,
    });
    store.preResolvedPolicy = resolution;
    store.correctionDialoguePolicy = correctionPolicyFromResolution(resolution);
  } catch {
    // Pre-resolution is an optimization for the legacy classifier view, never
    // an authorization fallback. On any read/pin error BF-03 stays LEGACY and
    // the core resolver still gets its normal chance to resolve later.
    store.preResolvedPolicy = undefined;
    store.correctionDialoguePolicy = "LEGACY";
  }
}

function containedClaim<T extends {
  readonly envelope: {
    readonly message: { readonly text: string | null };
  };
}>(
  claim: T,
  decision: Bf03CorrectionContainmentDecision,
): T {
  if (!decision.applies) return claim;
  return {
    ...claim,
    envelope: {
      ...claim.envelope,
      message: {
        ...claim.envelope.message,
        text: bf03LegacyClassifierView(
          claim.envelope.message.text ?? "",
          decision,
        ),
      },
    },
  };
}

function wrapInbox(
  inbox: RealtimeInboxPort,
  runtime: RealtimeRuntimePort,
  resolver: RuntimePolicyResolverPort | undefined,
  options: RealtimeRunnerOptions,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RealtimeInboxPort {
  return new Proxy(inbox, {
    get(target, property) {
      if (property === "claimNext") {
        return async (...args: Parameters<RealtimeInboxPort["claimNext"]>) => {
          const claim = await target.claimNext(...args);
          const store = scope.getStore();
          if (!claim || !store) return claim;
          captureRawMessages(store, [claim]);
          await preResolveCorrectionPolicy(store, {
            pageId: claim.pageId,
            conversationHash: claim.conversationHash,
            routingOwner: claim.envelope.routing.routingOwner,
          }, runtime, resolver, options);
          return containedClaim(claim, correctionDecision(store));
        };
      }
      if (property === "claimNextBatch") {
        if (!target.claimNextBatch) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeInboxPort["claimNextBatch"]>>) => {
          const batch = await target.claimNextBatch!(...args);
          const store = scope.getStore();
          if (!batch || !store) return batch;
          captureRawMessages(store, batch.items);
          const latest = [...batch.items]
            .sort((left, right) => left.receiveSequence - right.receiveSequence)
            .at(-1);
          if (!latest) return batch;
          await preResolveCorrectionPolicy(store, {
            pageId: latest.pageId,
            conversationHash: latest.conversationHash,
            routingOwner: latest.envelope.routing.routingOwner,
          }, runtime, resolver, options);
          const decision = correctionDecision(store);
          return decision.applies
            ? {
                ...batch,
                items: batch.items.map((item) => containedClaim(item, decision)),
              }
            : batch;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapPolicyResolver(
  resolver: RuntimePolicyResolverPort | undefined,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RuntimePolicyResolverPort | undefined {
  if (!resolver) return undefined;
  return new Proxy(resolver, {
    get(target, property) {
      if (property === "resolve") {
        return async (...args: Parameters<RuntimePolicyResolverPort["resolve"]>) => {
          const store = scope.getStore();
          const resolution = store?.preResolvedPolicy ?? await target.resolve(...args);
          if (store) {
            store.correctionDialoguePolicy = correctionPolicyFromResolution(resolution);
            store.preResolvedPolicy = undefined;
          }
          return resolution;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function originalTextForOccurredAt(
  store: Bf03ExecutionContext,
  occurredAt: string,
): string | null {
  return store.rawMessages.find((message) => message.occurredAt === occurredAt)?.text ?? null;
}

function bf03Instruction(
  occurredAt: string,
): Parameters<RealtimeModelPort["generate"]>[0][number] {
  return {
    direction: "INBOUND",
    senderType: "SYSTEM",
    messageType: "EVENT",
    text: JSON.stringify({
      type: "BF03_CORRECTION_CONTAINMENT",
      reasonCode: BF03_CORRECTION_REASON_CODE,
      instruction:
        "The latest customer turn is a correction indicating the mentioned size/price information was already provided. A topic mention is not a new capability request. Reply naturally and concisely in Vietnamese without repeating price or size facts, without requesting Size Engine/business facts, and without proposing any side effect. Keep businessFactQuery.intent=NONE.",
    }),
    attachmentCount: 0,
    occurredAt,
  };
}

function wrapModel(
  model: RealtimeModelPort,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RealtimeModelPort {
  const generate: RealtimeModelPort["generate"] = async (...args) => {
    const store = scope.getStore();
    const decision = store ? correctionDecision(store) : { applies: false, reasonCodes: [] };
    if (!store || !decision.applies) return model.generate(...args);

    const restoredContext = args[0].map((entry) => {
      if (entry.senderType !== "CUSTOMER") return entry;
      const raw = originalTextForOccurredAt(store, entry.occurredAt);
      return raw === null
        ? entry
        : { ...entry, text: redactAnalyticsMessage(raw).text };
    });
    const occurredAt = store.rawMessages.at(-1)?.occurredAt ?? new Date().toISOString();
    const generated = await model.generate(
      [...restoredContext, bf03Instruction(occurredAt)],
      args[1],
    );
    const proposal = bf03ContainProposal(generated.proposal, decision);
    return proposal === generated.proposal ? generated : { ...generated, proposal };
  };
  const wrapped: RealtimeModelPort = {
    generate,
    groundWithFacts: model.groundWithFacts.bind(model),
  };
  if (model.groundDraftWithFacts) {
    wrapped.groundDraftWithFacts = model.groundDraftWithFacts.bind(model);
  }
  if (model.repairSizeClaimDraft) {
    wrapped.repairSizeClaimDraft = model.repairSizeClaimDraft.bind(model);
  }
  return wrapped;
}

function wrapHistory(
  history: ChatHistoryPort | undefined,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): ChatHistoryPort | undefined {
  if (!history) return undefined;
  return new Proxy(history, {
    get(target, property) {
      if (property === "append") {
        return async (...args: Parameters<ChatHistoryPort["append"]>) => {
          const [conversationId, entry] = args;
          const store = scope.getStore();
          const raw = store?.rawMessages.find((message) =>
            message.eventKey === entry.identityKey
          )?.text;
          return target.append(
            conversationId,
            raw === undefined
              ? entry
              : { ...entry, text: redactAnalyticsMessage(raw).text },
          );
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapCanonicalHistory(
  history: CanonicalChatHistoryPort | undefined,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): CanonicalChatHistoryPort | undefined {
  if (!history) return undefined;
  return new Proxy(history, {
    get(target, property) {
      if (property === "recordInboundCustomerMessage") {
        return async (...args: Parameters<CanonicalChatHistoryPort["recordInboundCustomerMessage"]>) => {
          const [input] = args;
          const store = scope.getStore();
          const raw = store?.rawMessages.find((message) =>
            message.messageId === input.providerMessageId ||
            `event:${message.eventKey}` === input.providerMessageId
          )?.text;
          return target.recordInboundCustomerMessage({
            ...input,
            ...(raw === undefined ? {} : { text: raw }),
          });
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapRuntime(
  runtime: RealtimeRuntimePort,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RealtimeRuntimePort {
  return new Proxy(runtime, {
    get(target, property) {
      if (property === "commit") {
        return async (...args: Parameters<RealtimeRuntimePort["commit"]>) => {
          const [input, now] = args;
          const store = scope.getStore();
          if (!store || !input.decisionEvents) return target.commit(input, now);
          const decision = correctionDecision(store);
          if (!decision.applies) return target.commit(input, now);
          return target.commit({
            ...input,
            decisionEvents: bf03ContainDecisionEvents(
              input.decisionEvents,
              decision,
            ),
          }, now);
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

/**
 * BF-03 is layered on the accepted BF-01/BF-02 runner. Before core processing,
 * an exact page/conversation-scoped policy resolution may substitute a neutral
 * classifier-only view for correction turns. Raw customer wording is restored
 * for model input and both history stores. This prevents the pre-model legacy
 * multi-fact/SIZE regex path from calling Size Engine or repeating facts while
 * leaving facts, ownership, guard, state, dedupe and side-effect authority in
 * the accepted runner.
 */
export class RealtimeRunner extends Bf01RealtimeRunner {
  private readonly bf03Scope: AsyncLocalStorage<Bf03ExecutionContext>;

  constructor(
    inbox: RealtimeInboxPort,
    runtime: RealtimeRuntimePort,
    model: RealtimeModelPort,
    factsReader: BusinessFactsReader,
    productSearch: RealtimeProductSearchPort,
    tags: RealtimeTagObservationProvider,
    options: RealtimeRunnerOptions,
    quota?: RealtimeGenerationQuota,
    history?: ChatHistoryPort,
    canonicalHistory?: CanonicalChatHistoryPort,
    videoFrames?: RealtimeVideoFrameExtractorPort,
    policyResolver?: RuntimePolicyResolverPort,
    mediaRecognition?: RealtimeMediaRecognitionPort,
    behaviorModeResolver?: RuntimeBehaviorModeResolverPort,
  ) {
    const scope = new AsyncLocalStorage<Bf03ExecutionContext>();
    super(
      wrapInbox(inbox, runtime, policyResolver, options, scope),
      wrapRuntime(runtime, scope),
      wrapModel(model, scope),
      factsReader,
      productSearch,
      tags,
      options,
      quota,
      wrapHistory(history, scope),
      wrapCanonicalHistory(canonicalHistory, scope),
      videoFrames,
      wrapPolicyResolver(policyResolver, scope),
      mediaRecognition,
      behaviorModeResolver,
    );
    this.bf03Scope = scope;
  }

  override processOne(): Promise<boolean> {
    return this.bf03Scope.run(
      {
        customerText: "",
        correctionDialoguePolicy: "LEGACY",
        rawMessages: [],
        preResolvedPolicy: undefined,
      },
      () => super.processOne(),
    );
  }
}
