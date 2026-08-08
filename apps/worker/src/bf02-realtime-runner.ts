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

type Bf01ReconciliationReasonCode =
  | "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED"
  | "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED";

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
  readonly reasonCode: Bf01ReconciliationReasonCode;
}

interface Bf01GuardedClarification {
  readonly text: string;
  readonly guardedPlanHash: string;
}

interface Bf01GeneratedClarification {
  readonly text: string;
  readonly guardedPlanHash: string;
  readonly source: "MODEL_REPAIR" | "APPROVED_FALLBACK";
  readonly modelCalled: boolean;
  readonly modelLatencyMs: number | null;
  readonly modelTokenUsage: Readonly<{
    prompt: number | null;
    output: number | null;
    total: number | null;
  }>;
  readonly repairSkippedReason: "BF01_REPAIR_QUOTA_UNAVAILABLE" | null;
}

const BF01_DIRECT_QUESTION_INTENTS = new Set([
  "PRICE",
  "STOCK",
  "SIZE",
  "ETA",
]);

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

function guardedPlanHashFor(
  value: ReturnType<typeof guardAgentProposal>,
): string {
  return sha256(JSON.stringify({
    action: value.action,
    productId: value.productId,
    handoffReason: value.handoffReason,
    blockedReasonCodes: value.blockedReasonCodes,
    textUnitHashes: value.textUnits.map((text) => sha256(text)),
    imageCount: value.imageUrls.length,
  }));
}

function guardedClarification(
  text: string,
  stage: string | null,
  now: Date,
): Bf01GuardedClarification | null {
  if (!text.trim()) return null;
  const guarded = guardAgentProposal({
    proposal: candidateProposal(text, stage),
    facts: null,
    verifiedProductIds: new Set<string>(),
    now,
  });
  if (
    guarded.action !== "REPLY" ||
    guarded.blockedReasonCodes.length > 0 ||
    guarded.imageUrls.length > 0 ||
    guarded.textUnits.length === 0
  ) return null;
  return {
    text: guarded.textUnits.join("\n").trim(),
    guardedPlanHash: guardedPlanHashFor(guarded),
  };
}

function repairInstruction(
  occurredAt: string,
  reasonCode: Bf01ReconciliationReasonCode,
): Parameters<RealtimeModelPort["generate"]>[0][number] {
  return {
    direction: "INBOUND",
    senderType: "SYSTEM",
    messageType: "EVENT",
    text: JSON.stringify({
      type: "BF01_REPLY_RECONCILIATION",
      reasonCode,
      instruction:
        "The final deterministic reconciliation requires a customer response but the prior proposal selected NO_REPLY. Draft exactly one concise customer-facing clarification or direct-answer question in Vietnamese. Do not assert price, stock, size recommendation, ETA, shipping fee, promotion, or product-media facts. Do not request cart/order/state side effects. Return a REPLY with no attachments and no business fact query.",
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

async function reserveRepairQuota(
  quota: RealtimeGenerationQuota | undefined,
  pageId: string,
  now: Date,
): Promise<boolean> {
  if (!quota) return false;
  try {
    return await quota.reserve(pageId, now);
  } catch {
    return false;
  }
}

async function generateClarification(
  store: Bf01ExecutionContext,
  model: RealtimeModelPort,
  quota: RealtimeGenerationQuota | undefined,
  pageId: string,
  stage: string | null,
  now: Date,
  defaultPromptVersion: string,
  reasonCode: Bf01ReconciliationReasonCode,
): Promise<Bf01GeneratedClarification | null> {
  const baseContext = fallbackContext(store);
  let modelCalled = false;
  let repairModelLatencyMs: number | null = null;
  let repairModelTokenUsage: Bf01GeneratedClarification["modelTokenUsage"] = {
    prompt: null,
    output: null,
    total: null,
  };
  let repairSkippedReason: Bf01GeneratedClarification["repairSkippedReason"] = null;
  const repairQuotaReserved = baseContext.length === 0
    ? false
    : await reserveRepairQuota(quota, pageId, now);
  if (baseContext.length > 0 && !repairQuotaReserved) {
    repairSkippedReason = "BF01_REPAIR_QUOTA_UNAVAILABLE";
  }
  if (baseContext.length > 0 && repairQuotaReserved) {
    modelCalled = true;
    try {
      const generated = await model.generate(
        [
          ...baseContext,
          repairInstruction(
            store.customerOccurredAt ?? now.toISOString(),
            reasonCode,
          ),
        ],
        `${store.modelPromptVersion ?? defaultPromptVersion}:bf01-reconcile-v1`,
      );
      repairModelLatencyMs = generated.latencyMs;
      repairModelTokenUsage = tokenUsage(generated.tokenUsage);
      const guarded = generated.proposal.action === "REPLY"
        ? guardedClarification(generated.proposal.reply, stage, now)
        : null;
      if (guarded) {
        return {
          text: guarded.text,
          guardedPlanHash: guarded.guardedPlanHash,
          source: "MODEL_REPAIR",
          modelCalled: true,
          modelLatencyMs: repairModelLatencyMs,
          modelTokenUsage: repairModelTokenUsage,
          repairSkippedReason: null,
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
        text: fallback.text,
        guardedPlanHash: fallback.guardedPlanHash,
        source: "APPROVED_FALLBACK",
        modelCalled,
        modelLatencyMs: repairModelLatencyMs,
        modelTokenUsage: repairModelTokenUsage,
        repairSkippedReason,
      }
    : null;
}

function normalizedDialogueText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[\u0111\u0110]/gu, "d")
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/gu, " ")
    .trim();
}

function terminalDialogueClause(value: string): string {
  return value
    .split(/[,;\n]+/u)
    .map((clause) => clause.trim())
    .filter(Boolean)
    .at(-1) ?? value.trim();
}

function negatedQuestionAct(text: string): boolean {
  return /\b(?:khong|ko|k)\s+(?:(?:can|muon)\s+)?hoi\b/u.test(text);
}

function declarativeKnowledgeFrame(text: string): boolean {
  if (/\b(?:muon|can|chua|khong|ko|k)\s+(?:biet|ro)\b/u.test(text)) {
    return false;
  }
  return /\b(?:biet|ro)\b[^?？]{0,120}\b(?:bao nhieu|khi nao|bao lau|may ngay|o dau|tai sao|vi sao|the nao|lam sao)\b/u.test(text);
}

function customerQuestionEvidence(value: string): boolean {
  const raw = terminalDialogueClause(value);
  if (!raw) return false;

  const text = normalizedDialogueText(raw);
  if (negatedQuestionAct(text)) return false;
  if (/[?？]\s*$/u.test(raw)) return true;
  if (declarativeKnowledgeFrame(text)) return false;

  if (
    /\b(?:bao nhieu|khi nao|bao lau|may ngay|o dau|tai sao|vi sao|the nao|lam sao)\b/u.test(text)
  ) return true;
  if (
    /\b(?:gi|nao)(?:\s+(?:nua|vay|a|ha|nhi|nhe))?\s*[.!]*$/u.test(text)
  ) return true;
  return /\b(?:co|con|duoc|giao|ship|mac|chon|lay|dat|doi)\b[^.!?]{0,80}\b(?:khong|ko|k|chua)\s*[.!?]*$/u.test(text);
}

function directQuestionEvidence(
  event: RealtimeDecisionEventPlan,
  customerText: string,
): boolean {
  return event.intent !== null &&
    BF01_DIRECT_QUESTION_INTENTS.has(event.intent) &&
    customerQuestionEvidence(customerText);
}

function reconciliationEventRank(event: RealtimeDecisionEventPlan): number {
  if (event.eventType === "NO_REPLY_SELECTED") return 0;
  if (event.eventType === "NO_REPLY") return 1;
  return 2;
}

function reconciliationCandidate(
  event: RealtimeDecisionEventPlan,
  customerText: string,
): boolean {
  if (event.action !== "NO_REPLY" || event.mode !== "LIVE") return false;
  const details = event.details;
  if (
    details.guardOutcome !== "ALLOWED" ||
    details.guardReasonCodes.length > 0 ||
    details.outboundMessageCount !== 0
  ) return false;
  return details.wave2Strategy?.recommendedStrategy === "STRATEGY_ASK_CLARIFY" ||
    directQuestionEvidence(event, customerText);
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
    readonly customerText: string;
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

  const event = input.events
    .filter((candidate) => reconciliationCandidate(candidate, input.customerText))
    .sort((left, right) =>
      reconciliationEventRank(left) - reconciliationEventRank(right) ||
      left.eventId.localeCompare(right.eventId)
    )
    .at(0);
  if (!event) return null;
  return {
    event,
    reasonCode:
      event.details.wave2Strategy?.recommendedStrategy === "STRATEGY_ASK_CLARIFY"
        ? "BF01_ASK_CLARIFY_NO_REPLY_RECONCILED"
        : "BF01_DIRECT_QUESTION_NO_REPLY_RECONCILED",
  };
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
  targetEventId: string,
  clarification: Bf01GeneratedClarification,
  reconciliationReasonCode: Bf01ReconciliationReasonCode,
): readonly RealtimeDecisionEventPlan[] {
  const replyHash = renderedReplyHash(clarification.text);
  const sourceCode = clarification.source === "MODEL_REPAIR"
    ? "BF01_MODEL_CLARIFICATION_REPAIR"
    : "BF01_APPROVED_FALLBACK_USED";
  return events
    .filter((event) =>
      event.eventId === targetEventId ||
      event.eventType !== "NO_REPLY" ||
      event.action !== "NO_REPLY"
    )
    .map((event): RealtimeDecisionEventPlan => {
      if (event.eventId !== targetEventId) return event;
      const convertedType: RealtimeDecisionEventPlan["eventType"] =
        event.eventType === "NO_REPLY" || event.eventType === "NO_REPLY_SELECTED"
          ? "CLARIFICATION_REQUESTED"
          : event.eventType;
      return {
        ...event,
        eventType: convertedType,
        action: "REPLY",
        reasonCodes: [
          ...new Set([
            ...event.reasonCodes,
            reconciliationReasonCode,
            sourceCode,
            ...(clarification.repairSkippedReason
              ? [clarification.repairSkippedReason]
              : []),
          ]),
        ],
        details: {
          ...event.details,
          guardedPlanHash: clarification.guardedPlanHash,
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
        },
      };
    });
}

function wrapRuntime(
  runtime: RealtimeRuntimePort,
  model: RealtimeModelPort,
  quota: RealtimeGenerationQuota | undefined,
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
            customerText: store.customerText,
          });
          if (!targetDecision) return target.commit(input, nowArg);

          const now = nowArg ?? new Date();
          const clarification = await generateClarification(
            store,
            model,
            quota,
            input.pageId,
            targetDecision.event.stage,
            now,
            options.promptVersion ?? "lana-realtime-v1",
            targetDecision.reasonCode,
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
            decisionEvents: reconciledEvents(
              events,
              targetDecision.event.eventId,
              clarification,
              targetDecision.reasonCode,
            ),
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
 * commit transaction. This adapter only reconciles an allowed terminal
 * NO_REPLY when existing direct-question evidence or ASK_CLARIFY requires a
 * response; model repair remains quota-bound and guarded before commit.
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
      wrapRuntime(runtime, model, quota, options, scope),
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
