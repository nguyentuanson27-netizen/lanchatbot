import type { MetaSendAttemptResultV1 } from "@lana/contracts";
import {
  redactAnalyticsMessage,
  type ClaimedMetaOutbox,
  type MetaResponseGroupGateObservation,
  type MetaResponseGroupGateSnapshot,
} from "@lana/database";
import type {
  MetaMessageUnit,
  MetaSendCommand,
} from "@lana/meta-delivery";
import type { PancakeHandoffAdapter } from "@lana/pancake-handoff";
import type { ChatHistoryPort } from "./redis-chat-history.js";

export interface MetaOutboxDispatchStore {
  claimMetaOutbox(
    workerId: string,
    leaseMs: number,
  ): Promise<ClaimedMetaOutbox | null>;
  readMetaResponseGroupGate(
    responseGroupId: string,
  ): Promise<MetaResponseGroupGateSnapshot | null>;
  recordMetaResponseGroupGate(input: {
    readonly responseGroupId: string;
    readonly replyPlanId: string;
    readonly conversationId: string;
    readonly pageId: string;
    readonly observation: MetaResponseGroupGateObservation;
  }): Promise<MetaResponseGroupGateSnapshot>;
  markMetaAccepted(
    outboxId: string,
    leaseToken: string,
    providerMessageId: string,
  ): Promise<boolean>;
  markMetaRetryable(
    outboxId: string,
    leaseToken: string,
    errorCode: string,
    delaySeconds: number,
  ): Promise<boolean>;
  markMetaTerminal(
    outboxId: string,
    leaseToken: string,
    status: "AMBIGUOUS" | "FAILED_PERMANENT",
    errorCode: string,
  ): Promise<boolean>;
  markMetaManualReview(
    outboxId: string,
    leaseToken: string,
    errorCode: string,
  ): Promise<boolean>;
  quarantineExpiredMetaSending(): Promise<number>;
}

export interface MetaDeliveryPort {
  send(command: MetaSendCommand): Promise<MetaSendAttemptResultV1>;
}

export interface AcceptedBotHistoryPort {
  recordAcceptedOutboundBotMessage(input: {
    outboxId: string;
    text: string | null;
    attachmentCount: number;
  }): Promise<unknown>;
}

export interface MetaPageTokenRegistry {
  get(pageId: string): string | null;
}

export interface MetaPreSendGate {
  readonly supportsCommerceMediaBinding?: true;
  readonly supportsCommerceHandoffBinding?: true;
  authorize(
    claim: ClaimedMetaOutbox,
  ): Promise<MetaResponseGroupGateObservation>;
}

export class SinglePageMetaTokenRegistry
  implements MetaPageTokenRegistry
{
  constructor(
    private readonly pageId: string,
    private readonly token: string,
  ) {}

  get(pageId: string): string | null {
    return pageId === this.pageId && this.token.trim()
      ? this.token
      : null;
  }
}

/** Performs the Pancake tag read used to decide one complete response group.
 * Missing links, transport errors, and unverified data all fail closed.
 */
export class PancakeMetaPreSendGate implements MetaPreSendGate {
  constructor(
    private readonly pancake: PancakeHandoffAdapter,
    private readonly now: () => Date = () => new Date(),
    private readonly maxObservationAgeMs = 30_000,
  ) {}

  async authorize(
    claim: ClaimedMetaOutbox,
  ): Promise<MetaResponseGroupGateObservation> {
    if (!claim.pancakeConversationId) {
      return {
        status: "UNVERIFIED",
        reasonCode: "PANCAKE_CONVERSATION_LINK_UNAVAILABLE",
        blockingTag: null,
        observedAt: null,
      };
    }
    try {
      const observation = await this.pancake.observeBlockingTags(
        claim.pageId,
        claim.pancakeConversationId,
      );
      const observedAt = new Date(observation.observedAt);
      const observedAtMs = observedAt.getTime();
      const ageMs = this.now().getTime() - observedAtMs;
      if (
        !Number.isFinite(observedAtMs)
        || ageMs > this.maxObservationAgeMs
        || ageMs < -5_000
      ) {
        return {
          status: "UNVERIFIED",
          reasonCode: "PANCAKE_TAG_OBSERVATION_STALE",
          blockingTag: null,
          observedAt: Number.isFinite(observedAtMs) ? observedAt : null,
        };
      }
      if (!observation.verified) {
        return {
          status: "UNVERIFIED",
          reasonCode: observation.reasonCode ?? "PANCAKE_TAG_UNVERIFIED",
          blockingTag: null,
          observedAt,
        };
      }
      if (observation.blockingTag) {
        return {
          status: "BLOCKED",
          reasonCode: `PANCAKE_BLOCKING_TAG_${observation.blockingTag}`,
          blockingTag: observation.blockingTag,
          observedAt,
        };
      }
      return {
        status: "ALLOWED",
        reasonCode: null,
        blockingTag: null,
        observedAt,
      };
    } catch {
      return {
        status: "UNVERIFIED",
        reasonCode: "PANCAKE_TAG_READ_ERROR",
        blockingTag: null,
        observedAt: null,
      };
    }
  }
}

export async function resolveMetaResponseGroupGate(
  claim: ClaimedMetaOutbox,
  store: Pick<
    MetaOutboxDispatchStore,
    "readMetaResponseGroupGate" | "recordMetaResponseGroupGate"
  >,
  gate: MetaPreSendGate,
  now: Date = new Date(),
): Promise<MetaResponseGroupGateSnapshot | (Omit<MetaResponseGroupGateSnapshot, "source"> & { source: "C3_COMMERCE" })> {
  if (claim.mediaBinding !== undefined && gate.supportsCommerceMediaBinding !== true) return {
    responseGroupId: claim.responseGroupId, source: "C3_COMMERCE", status: "BLOCKED", reasonCode: "C3_MEDIA_GATE_REQUIRED",
    blockingTag: null, observedAt: now, attemptCount: 0, expiresAt: new Date(now.getTime() + 30_000),
  };
  if (claim.handoffBinding !== undefined && gate.supportsCommerceHandoffBinding !== true) return {
    responseGroupId: claim.responseGroupId, source: "C3_COMMERCE", status: "BLOCKED", reasonCode: "C3_HANDOFF_GATE_REQUIRED",
    blockingTag: null, observedAt: now, attemptCount: 0, expiresAt: new Date(now.getTime() + 30_000),
  };
  const existing = await store.readMetaResponseGroupGate(
    claim.responseGroupId,
  );
  if (existing && existing.status !== "UNVERIFIED") {
    if (existing.expiresAt.getTime() <= now.getTime()) {
      return {
        ...existing,
        status: "UNVERIFIED",
        reasonCode: "PANCAKE_RESPONSE_GROUP_GATE_EXPIRED",
        blockingTag: null,
      };
    }
    // Sequence zero has not been accepted yet. A retry/restart cannot reuse an
    // old media/world check to start sending after source or authority changed.
    if ((claim.mediaBinding !== undefined || claim.handoffBinding !== undefined) && claim.sequenceNo === 0 && existing.status === "ALLOWED") {
      const current = await gate.authorize(claim);
      if (current.status !== "ALLOWED") return { ...existing, ...current,
        ...(current.status === "BLOCKED" && current.blockingTag === null ? { source: "C3_COMMERCE" as const } : {}) };
    }
    return existing;
  }
  const observation = await gate.authorize(claim);
  // This is a code refusal, not a Pancake tag observation. The dispatcher
  // durably marks the entire unsent group MANUAL_REVIEW in the existing Outbox.
  // Do not invent a tag or insert a row violating Pancake's gate contract.
  if ((claim.mediaBinding !== undefined || claim.handoffBinding !== undefined) && observation.status === "BLOCKED" && observation.blockingTag === null) return {
    responseGroupId: claim.responseGroupId, source: "C3_COMMERCE", ...observation,
    attemptCount: 0, expiresAt: new Date(now.getTime() + 30_000),
  };
  return store.recordMetaResponseGroupGate({
    responseGroupId: claim.responseGroupId,
    replyPlanId: claim.replyPlanId,
    conversationId: claim.conversationId,
    pageId: claim.pageId,
    observation,
  });
}

export interface MetaOutboxDispatcherOptions {
  readonly workerId: string;
  readonly leaseMs?: number;
  readonly maxGateAttempts?: number;
}

export class MetaOutboxDispatcher {
  private readonly leaseMs: number;
  private readonly maxGateAttempts: number;

  constructor(
    private readonly store: MetaOutboxDispatchStore,
    private readonly delivery: MetaDeliveryPort,
    private readonly tokens: MetaPageTokenRegistry,
    private readonly preSendGate: MetaPreSendGate,
    private readonly options: MetaOutboxDispatcherOptions,
    private readonly history?: ChatHistoryPort,
    private readonly canonicalHistory?: AcceptedBotHistoryPort,
  ) {
    this.leaseMs = options.leaseMs ?? 30_000;
    this.maxGateAttempts = options.maxGateAttempts ?? 10;
  }

  async processOne(): Promise<boolean> {
    await this.store.quarantineExpiredMetaSending();
    const claim = await this.store.claimMetaOutbox(
      this.options.workerId,
      this.leaseMs,
    );
    if (!claim) return false;

    const gate = await resolveMetaResponseGroupGate(
      claim, this.store, this.preSendGate,
    );
    if (gate.status !== "ALLOWED") {
      const code = gate.reasonCode ?? "META_PRE_SEND_GATE_BLOCKED";
      if (
        claim.attemptCount >= this.maxGateAttempts ||
        gate.status === "BLOCKED"
      ) {
        await this.store.markMetaManualReview(
          claim.outboxId,
          claim.leaseToken,
          code,
        );
      } else {
        await this.store.markMetaRetryable(
          claim.outboxId,
          claim.leaseToken,
          code,
          Math.min(300, 2 ** claim.attemptCount),
        );
      }
      return true;
    }

    const token = this.tokens.get(claim.pageId);
    if (!token) {
      await this.store.markMetaTerminal(
        claim.outboxId,
        claim.leaseToken,
        "FAILED_PERMANENT",
        "META_PAGE_TOKEN_MISSING",
      );
      return true;
    }

    const result = await this.delivery.send({
      pageId: claim.pageId,
      recipientId: claim.recipientId,
      pageAccessToken: token,
      message: this.message(claim),
    });
    if (result.result === "ACCEPTED") {
      const accepted = await this.store.markMetaAccepted(
        claim.outboxId,
        claim.leaseToken,
        result.providerMessageId,
      );
      if (accepted && this.history) {
        const text = claim.message.kind === "TEXT"
          ? redactAnalyticsMessage(claim.message.text).text
          : "";
        await this.history.append(claim.conversationId, {
          identityKey: `meta-outbox:${claim.outboxId}`,
          direction: "OUTBOUND",
          senderType: "BOT",
          messageType: claim.message.kind === "TEXT" ? "TEXT" : "IMAGE",
          text,
          attachmentCount: claim.message.kind === "IMAGE" ? 1 : 0,
          occurredAt: new Date().toISOString(),
        }).catch(() => false);
      }
      if (accepted && this.canonicalHistory) {
        await this.canonicalHistory.recordAcceptedOutboundBotMessage({
          outboxId: claim.outboxId,
          text: claim.message.kind === "TEXT" ? claim.message.text : null,
          attachmentCount: claim.message.kind === "IMAGE" ? 1 : 0,
        });
      }
    } else if (result.result === "RETRYABLE") {
      await this.store.markMetaRetryable(
        claim.outboxId,
        claim.leaseToken,
        result.reasonCode,
        Math.min(300, 2 ** claim.attemptCount),
      );
    } else if (result.result === "AMBIGUOUS") {
      await this.store.markMetaTerminal(
        claim.outboxId,
        claim.leaseToken,
        "AMBIGUOUS",
        result.reasonCode,
      );
    } else {
      await this.store.markMetaTerminal(
        claim.outboxId,
        claim.leaseToken,
        "FAILED_PERMANENT",
        result.reasonCode,
      );
    }
    return true;
  }

  private message(claim: ClaimedMetaOutbox): MetaMessageUnit {
    return claim.message.kind === "TEXT"
      ? { kind: "TEXT", text: claim.message.text }
      : { kind: "IMAGE", imageUrl: claim.message.imageUrl };
  }
}
