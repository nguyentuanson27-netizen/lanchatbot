import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { guardAgentProposal } from "@lana/business-tools";
import type { AgentProposalV1 } from "@lana/contracts";
import type { RuntimePolicyResolverPort } from "@lana/chat-runtime";
import type {
  RealtimeCommitInput,
  RealtimeDecisionEventPlan,
} from "@lana/database";
import type { ConversationState } from "@lana/conversation-engine";
import {
  RealtimeRunner as Bf02RealtimeRunner,
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
} from "./bf02-core-realtime-runner.js";
import type { BusinessFactsReader } from "./redis-business-facts.js";
import type { RealtimeGenerationQuota } from "./realtime-quota.js";
import type { ChatHistoryPort } from "./redis-chat-history.js";
import type { SalesCycleRuntimeState } from "@lana/chat-runtime";

export * from "./bf02-core-realtime-runner.js";

export type Bf01ReplyReconciliationPolicy =
  | "LEGACY"
  | "CLARIFY_RECONCILED_V1";

interface Bf01RuntimeSnapshot {
  readonly routingOwner: "N8N" | "APP";
  readonly appSendEnabled: boolean;
  readonly killSwitch: boolean;
}

interface Bf01ExecutionContext {
  recipientId: string | null;
  customerText: string;
  customerOccurredAt: string | null;
  modelContext: Parameters<RealtimeModelPort["generate"]>[0] | null;
  modelPromptVersion: string | null;
  runtime: Bf01RuntimeSnapshot | null;
  replyReconciliationPolicy: Bf01ReplyReconciliationPolicy;
  approvedFallbackText: string | null;
}

interface Bf01ReconciliationTarget {
  readonly event: RealtimeDecisionEventPlan;
  readonly reasonCode: "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED";
}

interface Bf01GeneratedClarification {
  readonly text: string;
  readonly source: "MODEL_REPAIR" | "APPROVED_FALLBACK";
  readonly modelCalled: boolean;
  readonly modelLatencyMs: number | null;
  readonly modelTokenUsage: Readonly<{
    prompt: number | null;
    output: number | null;
    total: number | null;
  }>;
}

function bindOrReturn<T extends object>(
  target: T,
  property: string | symbol,
): unknown {
  const value = Reflect.get(target, property, target);
  return typeof value === "function" ? value.bind(target) : value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown>
    : null;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function deterministicUuid(seed: string): string {
  const raw = sha256(seed).slice(0, 32).split("");
  raw[12] = "4";
  const variant = Number.parseInt(raw[16] ?? "0", 16);
  raw[16] = ((variant & 0x3) | 0x8).toString(16);
  const hex = raw.join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function captureInbound(
  store: Bf01ExecutionContext,
  claim: unknown,
): void {
  const claimRecord = asRecord(claim);
  const envelope = asRecord(claimRecord?.envelope);
  const message = asRecord(envelope?.message);
  if (!message) return;
  if (typeof message.senderId === "string" && message.senderId.trim()) {
    store.recipientId = message.senderId.trim();
  }
  store.customerText =
    typeof message.text === "string" ? message.text : "";
  store.customerOccurredAt =
    typeof message.occurredAt === "string" ? message.occurredAt : null;
}

function wrapInbox(
  inbox: RealtimeInboxPort,
  scope: AsyncLocalStorage<Bf01ExecutionContext>,
): RealtimeInboxPort {
  return new Proxy(inbox, {
    get(target, property) {
      if (property === "claimNext") {
        return async (...args: Parameters<RealtimeInboxPort["claimNext"]>) => {
          const claim = await target.claimNext(...args);
          const store = scope.getStore();
          if (claim && store) captureInbound(store, claim);
          return claim;
        };
      }
      if (property === "claimNextBatch") {
        if (!target.claimNextBatch) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeInboxPort["claimNextBatch"]>>) => {
          const batch = await target.claimNextBatch!(...args);
          const store = scope.getStore();
          if (batch && store) {
            const latest = [...batch.items]
              .sort((left, right) => left.receiveSequence - right.receiveSequence)
              .at(-1);
            if (latest) captureInbound(store, latest);
          }
          return batch;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapModel(
  model: RealtimeModelPort,
  scope: AsyncLocalStorage<Bf01ExecutionContext>,
): RealtimeModelPort {
  const generate: RealtimeModelPort["generate"] = async (...args) => {
    const store = scope.getStore();
    if (store) {
      store.modelContext = args[0];
      store.modelPromptVersion = args[1];
    }
    return model.generate(...args);
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

function wrapPolicyResolver(
  resolver: RuntimePolicyResolverPort | undefined,
  scope: AsyncLocalStorage<Bf01ExecutionContext>,
): RuntimePolicyResolverPort | undefined {
  if (!resolver) return undefined;
  return new Proxy(resolver, {
    get(target, property) {
      if (property === "resolve") {
        return async (...args: Parameters<RuntimePolicyResolverPort["resolve"]>) => {
          const resolution = await target.resolve(...args);
          const store = scope.getStore();
          if (store) {
            const closing = resolution.bundle?.artifacts.closingStrategy;
            const livePolicy = resolution.bundle?.sideEffects === "LIVE_OUTBOUND";
            store.replyReconciliationPolicy = livePolicy
              ? closing?.replyReconciliationPolicy ?? "LEGACY"
              : "LEGACY";
            store.approvedFallbackText =
              livePolicy && closing?.replyReconciliationFallbackText
                ? closing.replyReconciliationFallbackText.trim()
                : null;
          }
          return resolution;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function candidateProposal(
  text: string,
  stage: string | null,
): AgentProposalV1 {
  return {
    schemaVersion: 1,
    intent: "clarification",
    conversationStage: stage?.trim() || "DISCOVERY",
    productId: null,
    action: "REPLY",
    reply: text.trim(),
    attachments: [],
    handoffReason: null,
    businessFactQuery: {
      intent: "NONE",
      offerType: null,
      color: null,
      size: null,
      deliveryRegion: null,
    },
  };
}

function guardedClarification(
  text: string,
  stage: string | null,
  now: Date,
): string | null {
  if (!text.trim()) return null;
  const guarded = guardAgentProposal({
    proposal: candidateProposal(text, stage),
    facts: null,
    verifiedProductIds: new Set<string>(),
    now,
  });
  return guarded.action === "REPLY" &&
      guarded.sendAuthorized &&
      guarded.blockedReasonCodes.length === 0 &&
      guarded.imageUrls.length === 0 &&
      guarded.textUnits.length > 0
    ? guarded.textUnits.join("\n").trim()
    : null;
}

function repairInstruction(occurredAt: string): Parameters<RealtimeModelPort["generate"]>[0][number] {
  return {
    direction: "INBOUND",
    senderType: "SYSTEM",
    messageType: "EVENT",
    text: JSON.stringify({
      type: "BF01_REPLY_RECONCILIATION",
      reasonCode: "ASK_CLARIFY_NO_REPLY",
      instruction:
        "The final deterministic strategy requires clarification but the prior proposal selected NO_REPLY. Draft exactly one concise customer-facing clarification question in Vietnamese. Do not assert price, stock, size recommendation, ETA, shipping fee, promotion, or product-media facts. Do not request cart/order/state side effects. Return a REPLY with no attachments and no business fact query.",
    }),
    attachmentCount: 0,
    occurredAt,
  };
}

function fallbackContext(
  store: Bf01ExecutionContext,
): Parameters<RealtimeModelPort["generate"]>[0] {
  if (store.modelContext) return store.modelContext;
  if (!store.customerText.trim()) return [];
  return [{
    direction: "INBOUND",
    senderType: "CUSTOMER",
    messageType: "TEXT",
    text: store.customerText,
    attachmentCount: 0,
    occurredAt: store.customerOccurredAt ?? new Date(0).toISOString(),
  }];
}

function tokenUsage(
  value: Awaited<ReturnType<RealtimeModelPort["generate"]>>["tokenUsage"],
): Bf01GeneratedClarification["modelTokenUsage"] {
  const prompt = value.promptTokenCount ?? null;
  const output = value.candidatesTokenCount ?? null;
  const total = value.totalTokenCount ??
    (prompt !== null && output !== null ? prompt + output : null);
  return { prompt, output, total };
}

async function generateClarification(
  store: Bf01ExecutionContext,
  model: RealtimeModelPort,
  stage: string | null,
  now: Date,
  defaultPromptVersion: string,
): Promise<Bf01GeneratedClarification | null> {
  const baseContext = fallbackContext(store);
  if (baseContext.length > 0) {
    try {
      const generated = await model.generate(
        [
          ...baseContext,
          repairInstruction(store.customerOccurredAt ?? now.toISOString()),
        ],
        `${store.modelPromptVersion ?? defaultPromptVersion}:bf01-reconcile-v1`,
      );
      const text = generated.proposal.action === "REPLY"
        ? guardedClarification(generated.proposal.reply, stage, now)
        : null;
      if (text) {
        return {
          text,
          source: "MODEL_REPAIR",
          modelCalled: true,
          modelLatencyMs: generated.latencyMs,
          modelTokenUsage: tokenUsage(generated.tokenUsage),
        };
      }
    } catch {
      // Fall through to the approved policy text. Raw model errors are never exposed.
    }
  }

  const fallback = store.approvedFallbackText
    ? guardedClarification(store.approvedFallbackText, stage, now)
    : null;
  return fallback
    ? {
        text: fallback,
        source: "APPROVED_FALLBACK",
        modelCalled: baseContext.length > 0,
        modelLatencyMs: null,
        modelTokenUsage: { prompt: null, output: null, total: null },
      }
    : null;
}

export function bf01ReconciliationTarget(
  input: {
    readonly policy: Bf01ReplyReconciliationPolicy;
    readonly runtime: Bf01RuntimeSnapshot | null;
    readonly state: ConversationState;
    readonly metaPlanPresent: boolean;
    readonly handoffPlanPresent: boolean;
    readonly events: readonly RealtimeDecisionEventPlan[];
    readonly mode: RealtimeRunnerOptions["mode"];
    readonly sendEnabled: boolean;
    readonly recipientId: string | null;
  },
): Bf01ReconciliationTarget | null {
  if (input.policy !== "CLARIFY_RECONCILED_V1") return null;
  if (input.mode !== "LIVE" || !input.sendEnabled || !input.recipientId) return null;
  if (input.metaPlanPresent || input.handoffPlanPresent) return null;
  if (
    !input.runtime ||
    input.runtime.routingOwner !== "APP" ||
    !input.runtime.appSendEnabled ||
    input.runtime.killSwitch
  ) return null;
  if (
    input.state.routingOwner !== "APP" ||
    input.state.conversationOwner !== "BOT" ||
    input.state.blockingTag !== null ||
    input.state.tagGateStatus === "BLOCKING"
  ) return null;

  const event = input.events.find((candidate) => {
    if (candidate.eventType !== "WAVE2_STRATEGY_SELECTED") return false;
    if (candidate.action !== "NO_REPLY" || candidate.mode !== "LIVE") return false;
    const details = candidate.details;
    return details.guardOutcome === "ALLOWED" &&
      details.outboundMessageCount === 0 &&
      details.wave2Strategy?.recommendedStrategy === "STRATEGY_ASK_CLARIFY";
  });
  return event
    ? { event, reasonCode: "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED" }
    : null;
}

function renderedReplyHash(text: string): string {
  return sha256(JSON.stringify([{
    kind: "TEXT",
    valueHash: sha256(text),
  }]));
}

function mergedTokenUsage(
  existing: RealtimeDecisionEventPlan["details"]["modelTokenUsage"],
  added: Bf01GeneratedClarification["modelTokenUsage"],
): RealtimeDecisionEventPlan["details"]["modelTokenUsage"] {
  const sum = (left: number | null, right: number | null): number | null =>
    left === null && right === null ? null : (left ?? 0) + (right ?? 0);
  return {
    prompt: sum(existing.prompt, added.prompt),
    output: sum(existing.output, added.output),
    total: sum(existing.total, added.total),
  };
}

function reconciledEvents(
  events: readonly RealtimeDecisionEventPlan[],
  clarification: Bf01GeneratedClarification,
): readonly RealtimeDecisionEventPlan[] {
  const replyHash = renderedReplyHash(clarification.text);
  const sourceCode = clarification.source === "MODEL_REPAIR"
    ? "BF01_MODEL_CLARIFICATION_REPAIR"
    : "BF01_APPROVED_FALLBACK_USED";
  return events.map((event) => {
    if (event.action !== "NO_REPLY") return event;
    const convertedType =
      event.eventType === "NO_REPLY" || event.eventType === "NO_REPLY_SELECTED"
        ? "CLARIFICATION_REQUESTED" as const
        : event.eventType;
    return {
      ...event,
      eventType: convertedType,
      action: "REPLY",
      reasonCodes: [
        ...new Set([
          ...event.reasonCodes,
          "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED",
          sourceCode,
        ]),
      ],
      details: {
        ...event.details,
        renderedReplyHash: replyHash,
        outboundMessageCount: 1,
        modelCalled: event.details.modelCalled || clarification.modelCalled,
        modelLatencyMs:
          clarification.modelLatencyMs === null
            ? event.details.modelLatencyMs
            : (event.details.modelLatencyMs ?? 0) + clarification.modelLatencyMs,
        modelTokenUsage: mergedTokenUsage(
          event.details.modelTokenUsage,
          clarification.modelTokenUsage,
        ),
        modelUsageSource:
          clarification.source === "MODEL_REPAIR"
            ? "provider"
            : event.details.modelUsageSource,
        modelPath:
          clarification.source === "MODEL_REPAIR"
            ? "model"
            : event.details.modelPath,
      },
    };
  });
}

function wrapRuntime(
  runtime: RealtimeRuntimePort,
  model: RealtimeModelPort,
  options: RealtimeRunnerOptions,
  scope: AsyncLocalStorage<Bf01ExecutionContext>,
): RealtimeRuntimePort {
  return new Proxy(runtime, {
    get(target, property) {
      if (property === "loadOrCreate") {
        return async (...args: Parameters<RealtimeRuntimePort["loadOrCreate"]>) => {
          const record = await target.loadOrCreate(...args);
          const store = scope.getStore();
          if (store) {
            store.runtime = {
              routingOwner: record.routingOwner,
              appSendEnabled: record.appSendEnabled,
              killSwitch: record.killSwitch,
            };
          }
          return record;
        };
      }
      if (property === "commit") {
        return async (...args: Parameters<RealtimeRuntimePort["commit"]>) => {
          const [input, nowArg] = args;
          const store = scope.getStore();
          if (!store) return target.commit(input, nowArg);
          const events = input.decisionEvents ?? [];
          const targetDecision = bf01ReconciliationTarget({
            policy: store.replyReconciliationPolicy,
            runtime: store.runtime,
            state: input.state,
            metaPlanPresent: input.metaPlan !== undefined,
            handoffPlanPresent:
              input.handoffEventPlan !== undefined ||
              input.handoffAcknowledgementPlan !== undefined,
            events,
            mode: options.mode,
            sendEnabled: options.sendEnabled,
            recipientId: store.recipientId,
          });
          if (!targetDecision) return target.commit(input, nowArg);

          const now = nowArg ?? new Date();
          const clarification = await generateClarification(
            store,
            model,
            targetDecision.event.stage,
            now,
            options.promptVersion ?? "lana-realtime-v1",
          );
          if (!clarification || !store.recipientId) {
            return target.commit(input, nowArg);
          }

          const seed = `${targetDecision.event.eventId}:bf01`;
          const nextInput: RealtimeCommitInput<ConversationState, SalesCycleRuntimeState> = {
            ...input,
            metaPlan: {
              replyPlanId: deterministicUuid(`${seed}:plan`),
              responseGroupId: deterministicUuid(`${seed}:response`),
              recipientId: store.recipientId,
              messages: [{ kind: "TEXT", text: clarification.text }],
              sendAfterOwnerHandoff: false,
            },
            decisionEvents: reconciledEvents(events, clarification),
          };
          return target.commit(nextInput, nowArg);
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

/**
 * BF-01 adapter layered on top of the accepted BF-02 runner. The core runner
 * still owns strategy calculation, guard evaluation, ownership, dedupe and the
 * commit transaction. This adapter only reconciles the terminal contradiction
 * ASK_CLARIFY + NO_REPLY after core has recorded guardOutcome=ALLOWED.
 */
export class RealtimeRunner extends Bf02RealtimeRunner {
  private readonly bf01Scope: AsyncLocalStorage<Bf01ExecutionContext>;

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
    const scope = new AsyncLocalStorage<Bf01ExecutionContext>();
    super(
      wrapInbox(inbox, scope),
      wrapRuntime(runtime, model, options, scope),
      wrapModel(model, scope),
      factsReader,
      productSearch,
      tags,
      options,
      quota,
      history,
      canonicalHistory,
      videoFrames,
      wrapPolicyResolver(policyResolver, scope),
      mediaRecognition,
      behaviorModeResolver,
    );
    this.bf01Scope = scope;
  }

  override processOne(): Promise<boolean> {
    return this.bf01Scope.run(
      {
        recipientId: null,
        customerText: "",
        customerOccurredAt: null,
        modelContext: null,
        modelPromptVersion: null,
        runtime: null,
        replyReconciliationPolicy: "LEGACY",
        approvedFallbackText: null,
      },
      () => super.processOne(),
    );
  }
}
