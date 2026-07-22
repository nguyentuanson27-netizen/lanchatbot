import { createHash } from "node:crypto";
import type { InboxRecord } from "./types.js";
import type { WebhookInboxRepository } from "./inbox.js";

export interface ConversationJob {
  readonly jobId: string;
  readonly inboxId: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly occurredAt: string;
  readonly receiveSequence: number;
}

export interface EnqueueResult {
  readonly job: ConversationJob;
  readonly created: boolean;
}

export interface ConversationJobQueue {
  enqueue(job: ConversationJob): Promise<EnqueueResult>;
}

export function inboxJobId(pageId: string, eventKey: string, dispatchGeneration: number): string {
  // BullMQ custom job IDs must not contain ':'. A fixed hex digest is stable,
  // does not expose the provider identifier and is safe for Redis keys.
  return `inbox-${createHash("sha256")
    .update(pageId)
    .update("\u0000")
    .update(eventKey)
    .update("\u0000")
    .update(String(dispatchGeneration))
    .digest("hex")}`;
}

export function toConversationJob(record: InboxRecord): ConversationJob {
  return {
    // attemptCount is the durable dispatch generation. A crash before the
    // worker claim reuses the same ID; a retry after a failed attempt gets a
    // new ID and cannot be suppressed by BullMQ completed-job retention.
    jobId: inboxJobId(record.pageId, record.eventKey, record.attemptCount),
    inboxId: record.id,
    conversationId: record.conversationId,
    pageId: record.pageId,
    occurredAt: record.occurredAt.toISOString(),
    receiveSequence: record.receiveSequence,
  };
}

export class InMemoryConversationJobQueue implements ConversationJobQueue {
  private readonly jobs = new Map<string, ConversationJob>();

  async enqueue(job: ConversationJob): Promise<EnqueueResult> {
    const existing = this.jobs.get(job.jobId);
    if (existing !== undefined) return { job: existing, created: false };
    this.jobs.set(job.jobId, { ...job });
    return { job: { ...job }, created: true };
  }

  list(): readonly ConversationJob[] {
    return [...this.jobs.values()]
      .sort(
        (a, b) =>
          Date.parse(a.occurredAt) - Date.parse(b.occurredAt) ||
          a.receiveSequence - b.receiveSequence,
      )
      .map((job) => ({ ...job }));
  }
}

/** Structural subset of BullMQ Queue, allowing production wiring without coupling tests to Redis. */
export interface BullMqQueueLike {
  add(
    name: string,
    data: ConversationJob,
    options: {
      readonly jobId: string;
      readonly attempts: number;
      readonly removeOnComplete: number;
      readonly removeOnFail: number;
    },
  ): Promise<{ readonly id?: string }>;
}

export class BullMqConversationJobQueue implements ConversationJobQueue {
  constructor(private readonly queue: BullMqQueueLike) {}

  async enqueue(job: ConversationJob): Promise<EnqueueResult> {
    const added = await this.queue.add("process-inbox", job, {
      jobId: job.jobId,
      // Durable retry policy lives in Inbox. BullMQ must not independently
      // create an unbounded second retry state machine.
      attempts: 1,
      removeOnComplete: 5_000,
      removeOnFail: 10_000,
    });
    return { job, created: added.id === job.jobId };
  }
}

export class InboxDispatcher {
  constructor(
    private readonly inbox: WebhookInboxRepository,
    private readonly queue: ConversationJobQueue,
  ) {}

  async dispatch(limit: number, now: Date): Promise<number> {
    const rows = await this.inbox.listDispatchable(limit, now);
    let dispatched = 0;
    for (const row of rows) {
      // Enqueue first, then mark QUEUED. If the process crashes between these
      // calls, deterministic jobId makes replay return the existing job.
      await this.queue.enqueue(toConversationJob(row));
      await this.inbox.markQueued(row.id);
      dispatched += 1;
    }
    return dispatched;
  }
}
