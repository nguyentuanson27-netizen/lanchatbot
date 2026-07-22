import type { MetaSendAttemptResultV1 } from "@lana/contracts";
import { redactAnalyticsMessage, type ClaimedMetaOutbox } from "@lana/database";
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
  authorize(
    claim: ClaimedMetaOutbox,
  ): Promise<{ allowed: boolean; reasonCode: string | null }>;
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

/** Performs a fresh Pancake tag read immediately before the Meta request.
 * Confirmed blocking tags stop delivery; unavailable Pancake data is fail-open.
 */
export class PancakeMetaPreSendGate implements MetaPreSendGate {
  constructor(private readonly pancake: PancakeHandoffAdapter) {}

  async authorize(
    claim: ClaimedMetaOutbox,
  ): Promise<{ allowed: boolean; reasonCode: string | null }> {
    if (!claim.pancakeConversationId) {
      return { allowed: true, reasonCode: null };
    }
    const observation = await this.pancake.observeBlockingTags(
      claim.pageId,
      claim.pancakeConversationId,
    );
    if (!observation.verified) {
      return { allowed: true, reasonCode: null };
    }
    if (observation.blockingTag) {
      return {
        allowed: false,
        reasonCode: `PANCAKE_BLOCKING_TAG_${observation.blockingTag}`,
      };
    }
    return { allowed: true, reasonCode: null };
  }
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

    const gate = await this.preSendGate.authorize(claim);
    if (!gate.allowed) {
      const code = gate.reasonCode ?? "META_PRE_SEND_GATE_BLOCKED";
      if (
        claim.attemptCount >= this.maxGateAttempts ||
        code.startsWith("PANCAKE_BLOCKING_TAG_")
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
