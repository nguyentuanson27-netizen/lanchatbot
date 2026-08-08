import { AsyncLocalStorage } from "node:async_hooks";
import type {
  AgentProposalV1,
  CorrectionDialoguePolicyV1,
} from "@lana/contracts";
import type { RuntimePolicyResolverPort } from "@lana/chat-runtime";
import type { RealtimeDecisionEventPlan } from "@lana/database";
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

export * from "./bf01-realtime-runner.js";

export const BF03_CORRECTION_REASON_CODE = "CORRECTION_CONTAINMENT" as const;

export interface Bf03CorrectionContainmentDecision {
  readonly applies: boolean;
  readonly reasonCodes: readonly string[];
}

interface Bf03ExecutionContext {
  customerText: string;
  correctionDialoguePolicy: CorrectionDialoguePolicyV1;
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

function captureInbound(
  store: Bf03ExecutionContext,
  claim: unknown,
): void {
  const claimRecord = asRecord(claim);
  const envelope = asRecord(claimRecord?.envelope);
  const message = asRecord(envelope?.message);
  if (!message) return;
  store.customerText = typeof message.text === "string" ? message.text : "";
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

function wrapPolicyResolver(
  resolver: RuntimePolicyResolverPort | undefined,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RuntimePolicyResolverPort | undefined {
  if (!resolver) return undefined;
  return new Proxy(resolver, {
    get(target, property) {
      if (property === "resolve") {
        return async (...args: Parameters<RuntimePolicyResolverPort["resolve"]>) => {
          const resolution = await target.resolve(...args);
          const store = scope.getStore();
          if (store) {
            const livePolicy = resolution.bundle?.sideEffects === "LIVE_OUTBOUND";
            store.correctionDialoguePolicy = livePolicy
              ? resolution.bundle?.artifacts.closingStrategy?.correctionDialoguePolicy ?? "LEGACY"
              : "LEGACY";
          }
          return resolution;
        };
      }
      return bindOrReturn(target, property);
    },
  });
}

function wrapModel(
  model: RealtimeModelPort,
  scope: AsyncLocalStorage<Bf03ExecutionContext>,
): RealtimeModelPort {
  const generate: RealtimeModelPort["generate"] = async (...args) => {
    const generated = await model.generate(...args);
    const store = scope.getStore();
    if (!store) return generated;
    const decision = bf03CorrectionContainmentDecision(
      store.customerText,
      store.correctionDialoguePolicy,
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
          const decision = bf03CorrectionContainmentDecision(
            store.customerText,
            store.correctionDialoguePolicy,
          );
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
 * BF-03 is layered on the accepted BF-01/BF-02 runner. The adapter only
 * contains correction-shaped topic mentions from becoming a model-requested
 * business fact capability and corrects legacy decision evidence at commit.
 * Facts, ownership, guard, state, dedupe and side-effect authorization remain
 * owned by the existing runner.
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
      wrapInbox(inbox, scope),
      wrapRuntime(runtime, scope),
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
    this.bf03Scope = scope;
  }

  override processOne(): Promise<boolean> {
    return this.bf03Scope.run(
      {
        customerText: "",
        correctionDialoguePolicy: "LEGACY",
      },
      () => super.processOne(),
    );
  }
}
