import { AsyncLocalStorage } from "node:async_hooks";
import type {
  AgentProposalV1,
  CorrectionDialoguePolicyV1,
  InboundMessageV1,
} from "@lana/contracts";
import type {
  RuntimePolicyResolution,
  RuntimePolicyResolverPort,
} from "@lana/chat-runtime";
import {
  redactAnalyticsMessage,
  type RealtimeDecisionEventPlan,
} from "@lana/database";
import {
  RealtimeRunner as Bf01RealtimeRunner,
  explicitCustomerBusinessIntents,
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
import { extractAdProductCodes } from "./media-resolution.js";

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
  readonly occurredAt: string;
  readonly text: string;
}

interface Bf03ExecutionContext {
  customerText: string;
  correctionDialoguePolicy: CorrectionDialoguePolicyV1;
  rawMessages: readonly Bf03RawMessage[];
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
    /\b(?:em|chi|minh|toi)\s+(?:da\s+)?(?:noi|bao|nhac)\b.{0,80}\broi\b/u.test(text) ||
    /\b(?:gia|size|sz|kich co|co nao|mac co)\b.{0,60}\broi\b/u.test(text)
  );
}

function hasStandaloneCorrectionLead(text: string): boolean {
  return /\b(?:em|chi|minh|toi)\s+(?:da\s+)?(?:noi|bao|nhac)\b.{0,32}\broi\b/u.test(text);
}

function hasStrongSizeRequestEvidence(value: string, text: string): boolean {
  if (hasCustomerMeasurementSignal(value)) return true;
  const requestText = text.replace(
    /\bkhong\s+can\s+(?:hoi|nhac|noi)\s+lai\b/gu,
    "",
  );
  if (
    /\b(?:chua|khong|chang)\s+(?:duoc\s+)?(?:noi|bao|nhac|co|biet|chac)\b/u.test(requestText) &&
    !/\bkhong\s+can\s+hoi\s+lai\b/u.test(text)
  ) return true;
  if (
    /\b(?:khong biet|khong chac|phan van|do du|chua biet)\b/u.test(requestText)
  ) return true;
  if (/\b(?:(?:chua|khong)\s+dung|sai)\b/u.test(requestText)) return true;
  if (
    /\b(size|sz|kich co|co nao|mac co)\b.{0,48}\b(nao|gi|bao nhieu|may|vua|hop|nen|chon|lay|muon|can|tu van|recommend|hay)\b/u.test(requestText)
  ) return true;
  if (
    /\b(nao|gi|bao nhieu|may|vua|hop|nen|chon|lay|muon|can|tu van|recommend)\b.{0,48}\b(size|sz|kich co|co nao|mac co)\b/u.test(requestText)
  ) return true;
  if (/\bmuon\s+doi\b.{0,32}\b(?:size|sz|kich co)\b/u.test(requestText)) return true;
  if (/\b(?:size|sz)\b.{0,40}\b(?:con|co)\s+(?:hang|du)\b/u.test(requestText)) return true;
  return false;
}

function hasExplicitSizeChoice(text: string): boolean {
  return (
    /\b(?:size|sz)\s*(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\b/u.test(text) ||
    /\b(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\s+(?:hay|or|voi)\s+(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50)\b/u.test(text)
  );
}

const BF03_CLAUSE_SEPARATOR = /([,;.!?\n]+|\s+(?:nhưng|nhung|tuy nhiên|tuy nhien)\s+)/giu;

interface Bf03ClauseAnalysis {
  readonly parts: readonly string[];
  readonly containedPartIndexes: ReadonlySet<number>;
  readonly genuineSizeRequest: boolean;
}

function analyzeCorrectionClauses(value: string): Bf03ClauseAnalysis {
  const parts = value.split(BF03_CLAUSE_SEPARATOR);
  const containedPartIndexes = new Set<number>();
  let genuineSizeRequest = false;
  let pendingCorrectionLead = false;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index] ?? "";
    if (!part.trim()) continue;
    const text = asciiFold(part);
    if (/^[,;.!?\n]+$/u.test(part.trim())) continue;
    if (/^(?:nhung|tuy nhien)$/u.test(text)) {
      pendingCorrectionLead = false;
      continue;
    }
    if (!mentionsLegacySizeTopic(text)) {
      pendingCorrectionLead = hasStandaloneCorrectionLead(text);
      continue;
    }

    const correctionContext = hasClearCorrectionMarker(text) || pendingCorrectionLead;
    if (correctionContext) {
      if (hasStrongSizeRequestEvidence(part, text)) {
        genuineSizeRequest = true;
      } else {
        containedPartIndexes.add(index);
      }
    } else if (hasStrongSizeRequestEvidence(part, text) || hasExplicitSizeChoice(text)) {
      genuineSizeRequest = true;
    }
    pendingCorrectionLead = false;
  }
  return { parts, containedPartIndexes, genuineSizeRequest };
}

function independentRequestIntents(value: string): readonly Exclude<
  ReturnType<typeof explicitCustomerBusinessIntents>[number],
  "SIZE"
>[] {
  const text = asciiFold(value);
  const intents: ("PRICE" | "STOCK" | "ETA")[] = [];
  if (
    /\b(?:xin|hoi|bao|check|kiem tra|cho biet|muon biet|can biet)\b.{0,48}\b(?:gia|price)\b/u.test(text) ||
    /\b(?:gia|price)\b.{0,48}\b(?:bao nhieu|the nao|la bao nhieu|may)\b/u.test(text)
  ) intents.push("PRICE");
  if (
    /\b(?:kiem tra|check)\b.{0,48}\b(?:con|het|ton|co hang|san hang|available)\b/u.test(text) ||
    /\b(?:con hang|het hang|ton kho|co hang|san hang|available)\b.{0,24}\b(?:khong|khong em|giup|nhe|a)?\b/u.test(text)
  ) intents.push("STOCK");
  if (/\b(?:bao lau|khi nao|may ngay|ngay nao|giao den|nhan hang|eta)\b/u.test(text)) {
    intents.push("ETA");
  }
  return intents;
}

function classifierClauseView(value: string): string {
  const independentIntents = independentRequestIntents(value);
  if (independentIntents.length === 0) return "đã có thông tin đó rồi mà";
  return value
    .replace(/\b[A-Za-z]{1,6}\s*[-_.]?\s*\d{1,8}[A-Za-z0-9]*\b/gu, " ")
    .replace(
      /\b(?:size|sz)(?:\s*(?:xxxs|xxs|xs|s|m|l|xl|xxl|xxxl|3[4-9]|4\d|50))?\b|kích\s*cỡ|kich\s*co|cỡ\s*nào|co\s*nao|mặc\s*cỡ|mac\s*co/giu,
      "thông tin đó",
    )
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * BF-03 is a temporary negative gate on the known legacy SIZE keyword path.
 * It never promotes another business intent. Clear size requests and unrelated
 * business-fact requests keep the normal path; only correction-shaped topic
 * mentions are contained.
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
  const analysis = analyzeCorrectionClauses(value);
  if (analysis.containedPartIndexes.size === 0 || analysis.genuineSizeRequest) {
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
  if (!decision.applies) return value;
  const analysis = analyzeCorrectionClauses(value);
  return analysis.parts.map((part, index) =>
    analysis.containedPartIndexes.has(index) ? classifierClauseView(part) : part
  ).join("");
}

export function bf03ContainProposal(
  proposal: AgentProposalV1,
  decision: Bf03CorrectionContainmentDecision,
): AgentProposalV1 {
  if (!decision.applies || proposal.businessFactQuery.intent !== "SIZE") {
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
        readonly occurredAt: string;
        readonly text: string | null;
      };
    };
  }[],
): void {
  const ordered = [...claims].sort((left, right) =>
    left.receiveSequence - right.receiveSequence
  );
  store.rawMessages = ordered.map(({ envelope }) => ({
    occurredAt: envelope.message.occurredAt,
    text: envelope.message.text ?? "",
  }));
  store.customerText = store.rawMessages
    .map(({ text }) => text.trim())
    .filter(Boolean)
    .join("\n");
}

function correctionPolicyFromResolution(
  resolution: Bf03PolicyResolution | null,
): CorrectionDialoguePolicyV1 {
  const livePolicy = resolution?.bundle?.sideEffects === "LIVE_OUTBOUND";
  return livePolicy
    ? resolution?.bundle?.artifacts.closingStrategy?.correctionDialoguePolicy ?? "LEGACY"
    : "LEGACY";
}

function wrapInbox(
  inbox: RealtimeInboxPort,
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
          return claim;
        };
      }
      if (property === "claimNextBatch") {
        if (!target.claimNextBatch) return undefined;
        return async (...args: Parameters<NonNullable<RealtimeInboxPort["claimNextBatch"]>>) => {
          const batch = await target.claimNextBatch!(...args);
          const store = scope.getStore();
          if (!batch || !store) return batch;
          captureRawMessages(store, batch.items);
          return batch;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function restoreRawCustomerModelContext(
  context: Parameters<RealtimeModelPort["generate"]>[0],
  store: Bf03ExecutionContext,
): Parameters<RealtimeModelPort["generate"]>[0] {
  if (store.rawMessages.length === 0) return context;

  const restored = [...context];
  let contextIndex = restored.length - 1;
  for (let rawIndex = store.rawMessages.length - 1; rawIndex >= 0; rawIndex -= 1) {
    const raw = store.rawMessages[rawIndex]!;
    let matchedIndex = contextIndex;
    for (; matchedIndex >= 0; matchedIndex -= 1) {
      const entry = restored[matchedIndex]!;
      if (entry.senderType !== "CUSTOMER" || entry.occurredAt !== raw.occurredAt) {
        continue;
      }
      restored[matchedIndex] = {
        ...entry,
        text: redactAnalyticsMessage(raw.text).text,
      };
      contextIndex = matchedIndex - 1;
      break;
    }
  }
  return restored;
}

function rawProductCode(store: Bf03ExecutionContext): string | null {
  const codes = [...new Set(store.rawMessages.flatMap((message) =>
    extractAdProductCodes(message.text)
  ))];
  return codes.length === 1 ? codes[0] ?? null : null;
}

function wrapProductSearch(
  productSearch: RealtimeProductSearchPort,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RealtimeProductSearchPort {
  return new Proxy(productSearch, {
    get(target, property) {
      if (property === "searchText") {
        return async (...args: Parameters<RealtimeProductSearchPort["searchText"]>) => {
          const store = scope.getStore();
          const decision = store ? correctionDecision(store) : { applies: false, reasonCodes: [] };
          const code = store && decision.applies ? rawProductCode(store) : null;
          const value = args[0];
          if (code && extractAdProductCodes(value).length === 0) {
            return target.searchText(code);
          }
          return target.searchText(...args);
        };
      }
      return bindOrReturn(target, property);
    },
  });
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

    const restoredContext = restoreRawCustomerModelContext(args[0], store);
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
 * for model input and both history stores. Explicit product codes are still
 * resolved through the verified product-search boundary, and native batches
 * only neutralize correction-shaped items rather than unrelated messages.
 */
export class RealtimeRunner extends Bf01RealtimeRunner {
  private readonly bf03Scope: AsyncLocalStorage<Bf03ExecutionContext>;

  protected override transformInboundAfterPolicyResolution(
    message: InboundMessageV1,
    resolution: RuntimePolicyResolution | null,
  ): InboundMessageV1 {
    const store = this.bf03Scope.getStore();
    if (!store) return message;
    store.correctionDialoguePolicy = correctionPolicyFromResolution(resolution);
    const decision = correctionDecision(store);
    if (!decision.applies) return message;
    const text = store.rawMessages
      .map(({ text: rawText }) => {
        const itemDecision = bf03CorrectionContainmentDecision(
          rawText,
          store.correctionDialoguePolicy,
        );
        return bf03LegacyClassifierView(rawText, itemDecision).trim();
      })
      .filter(Boolean)
      .join("\n");
    return { ...message, text: text || null };
  }

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
      wrapInbox(inbox, scope),
      wrapRuntime(runtime, scope),
      wrapModel(model, scope),
      factsReader,
      wrapProductSearch(productSearch, scope),
      tags,
      options,
      quota,
      history,
      canonicalHistory,
      videoFrames,
      policyResolver,
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
      },
      () => super.processOne(),
    );
  }
}
