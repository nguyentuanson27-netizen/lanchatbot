import type { WebhookInboxRepository } from "./inbox.js";
import type { ConversationJob } from "./queue.js";
import type { ConversationLease, ConversationLock } from "./lock.js";
import { systemClock, type Clock } from "./types.js";

export interface SendDisabledProcessingContext {
  readonly sendEnabled: false;
  readonly conversationLease: ConversationLease;
  readonly expectedFence: number;
}

export interface ConversationJobHandler {
  handle(job: ConversationJob, context: SendDisabledProcessingContext): Promise<void>;
}

export type ProcessJobResult =
  | "PROCESSED"
  | "ALREADY_TERMINAL"
  | "LEASE_BUSY"
  | "LOCK_BUSY"
  | "RETRYABLE_FAILURE";

export interface ConversationWorkerOptions {
  readonly workerId: string;
  readonly inboxLeaseMs: number;
  readonly conversationLockMs: number;
  readonly leaseRenewIntervalMs?: number;
}

/**
 * Phase-1 conversation worker. It deliberately has no Meta/Pancake adapter and
 * exposes sendEnabled as the literal false to its handler.
 */
export class SendDisabledConversationWorker {
  constructor(
    private readonly inbox: WebhookInboxRepository,
    private readonly lock: ConversationLock,
    private readonly handler: ConversationJobHandler,
    private readonly options: ConversationWorkerOptions,
    private readonly clock: Clock = systemClock,
  ) {}

  async process(job: ConversationJob, now: Date): Promise<ProcessJobResult> {
    const inboxLease = await this.inbox.claimForProcessing(
      job.inboxId,
      this.options.workerId,
      now,
      this.options.inboxLeaseMs,
    );
    if (inboxLease === null) {
      const current = await this.inbox.get(job.inboxId);
      return current?.status === "PROCESSED" || current?.status === "FAILED_PERMANENT"
        ? "ALREADY_TERMINAL"
        : "LEASE_BUSY";
    }
    const inboxLeaseToken = inboxLease.lease?.token;
    if (inboxLeaseToken === undefined) throw new Error("INBOX_CLAIM_WITHOUT_LEASE");

    const conversationLease = await this.lock.acquire(
      job.conversationId,
      this.options.workerId,
      now,
      this.options.conversationLockMs,
    );
    if (conversationLease === null) {
      await this.inbox.markRetryable(
        job.inboxId,
        inboxLeaseToken,
        "CONVERSATION_LOCK_BUSY",
        now,
      );
      return "LOCK_BUSY";
    }

    let activeConversationLease = conversationLease;
    let renewalFailed = false;
    let renewalInFlight: Promise<void> = Promise.resolve();
    const renewEveryMs =
      this.options.leaseRenewIntervalMs ??
      Math.max(100, Math.min(10_000, Math.floor(this.options.conversationLockMs / 3)));
    const heartbeat = setInterval(() => {
      renewalInFlight = renewalInFlight.then(async () => {
        const renewalTime = this.clock.now();
        const [renewedConversation, renewedInbox] = await Promise.all([
          this.lock.renew(
            activeConversationLease,
            renewalTime,
            this.options.conversationLockMs,
          ),
          this.inbox.renewProcessingLease(
            job.inboxId,
            inboxLeaseToken,
            renewalTime,
            this.options.inboxLeaseMs,
          ),
        ]);
        if (renewedConversation === null || renewedInbox === null) {
          renewalFailed = true;
          return;
        }
        activeConversationLease = renewedConversation;
      }).catch(() => {
        renewalFailed = true;
      });
    }, renewEveryMs);
    heartbeat.unref();

    try {
      await this.handler.handle(job, {
        sendEnabled: false,
        conversationLease,
        expectedFence: conversationLease.fence,
      });
      clearInterval(heartbeat);
      await renewalInFlight;
      const completionTime = this.clock.now();
      if (
        renewalFailed ||
        !(await this.lock.isCurrent(activeConversationLease, completionTime))
      ) {
        await this.inbox.markRetryable(
          job.inboxId,
          inboxLeaseToken,
          "CONVERSATION_LEASE_LOST",
          completionTime,
        );
        return "RETRYABLE_FAILURE";
      }
      await this.inbox.markProcessed(job.inboxId, inboxLeaseToken, completionTime);
      return "PROCESSED";
    } catch (error) {
      clearInterval(heartbeat);
      await renewalInFlight;
      const code = error instanceof Error && error.message !== "" ? error.message : "WORKER_UNKNOWN_ERROR";
      await this.inbox.markRetryable(job.inboxId, inboxLeaseToken, code, this.clock.now());
      return "RETRYABLE_FAILURE";
    } finally {
      clearInterval(heartbeat);
      await this.lock.release(activeConversationLease);
    }
  }
}
