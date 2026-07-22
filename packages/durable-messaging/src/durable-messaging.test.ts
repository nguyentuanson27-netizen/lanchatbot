import { describe, expect, it, vi } from "vitest";
import {
  InboxDispatcher,
  InMemoryConversationJobQueue,
  InMemoryConversationLock,
  InMemoryMetaOutboxRepository,
  InMemoryPancakeTagOutboxRepository,
  InMemoryWebhookInboxRepository,
  SendDisabledConversationWorker,
  classifyProviderFailure,
  toConversationJob,
  type ConversationJobHandler,
} from "./index.js";

const t0 = new Date("2026-07-13T00:00:00.000Z");
const after = (ms: number): Date => new Date(t0.getTime() + ms);

async function insertInbox(
  repository: InMemoryWebhookInboxRepository,
  eventKey: string,
  conversationId = "conversation-1",
) {
  return repository.insertAuthenticated({
    pageId: "page-1",
    eventKey,
    conversationId,
    occurredAt: t0,
    receivedAt: t0,
  });
}

describe("Webhook Inbox and dispatch", () => {
  it("deduplicates the same page and event key durably", async () => {
    const inbox = new InMemoryWebhookInboxRepository();
    const first = await insertInbox(inbox, "meta:page-1:message:mid-1");
    const duplicate = await insertInbox(inbox, "meta:page-1:message:mid-1");

    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.record.id).toBe(first.record.id);
  });

  it("recovers a crash between queue insertion and Inbox QUEUED", async () => {
    const inbox = new InMemoryWebhookInboxRepository();
    const queue = new InMemoryConversationJobQueue();
    const inserted = await insertInbox(inbox, "meta:page-1:message:mid-crash");
    const job = toConversationJob(inserted.record);

    // Simulate process death after BullMQ accepted the job.
    expect((await queue.enqueue(job)).created).toBe(true);
    expect((await inbox.get(inserted.record.id))?.status).toBe("RECEIVED");

    const dispatcher = new InboxDispatcher(inbox, queue);
    await dispatcher.dispatch(10, t0);

    expect(queue.list()).toHaveLength(1);
    expect((await inbox.get(inserted.record.id))?.status).toBe("QUEUED");
  });

  it("does not run a processed Inbox twice", async () => {
    const inbox = new InMemoryWebhookInboxRepository();
    const inserted = await insertInbox(inbox, "meta:page-1:message:mid-replay");
    await inbox.markQueued(inserted.record.id);
    const handle = vi.fn<ConversationJobHandler["handle"]>(async () => undefined);
    const handler: ConversationJobHandler = { handle };
    const worker = new SendDisabledConversationWorker(
      inbox,
      new InMemoryConversationLock(),
      handler,
      { workerId: "worker-1", inboxLeaseMs: 30_000, conversationLockMs: 30_000 },
      { now: () => after(1) },
    );
    const job = toConversationJob(inserted.record);

    expect(await worker.process(job, t0)).toBe("PROCESSED");
    expect(await worker.process(job, after(1))).toBe("ALREADY_TERMINAL");
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0]?.[1].sendEnabled).toBe(false);
  });

  it("serializes two messages for the same conversation", async () => {
    const inbox = new InMemoryWebhookInboxRepository();
    const first = await insertInbox(inbox, "meta:page-1:message:mid-a", "conversation-shared");
    const second = await insertInbox(inbox, "meta:page-1:message:mid-b", "conversation-shared");
    await inbox.markQueued(first.record.id);
    await inbox.markQueued(second.record.id);

    let signalStarted!: () => void;
    let releaseFirst!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      signalStarted = resolve;
    });
    const blocker = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const handler: ConversationJobHandler = {
      handle: async (job) => {
        if (job.inboxId === first.record.id) {
          signalStarted();
          await blocker;
        }
      },
    };

    const lock = new InMemoryConversationLock();
    const workerA = new SendDisabledConversationWorker(inbox, lock, handler, {
      workerId: "worker-a",
      inboxLeaseMs: 30_000,
      conversationLockMs: 30_000,
    }, { now: () => after(2) });
    const workerB = new SendDisabledConversationWorker(inbox, lock, handler, {
      workerId: "worker-b",
      inboxLeaseMs: 30_000,
      conversationLockMs: 30_000,
    }, { now: () => after(2) });

    const runningFirst = workerA.process(toConversationJob(first.record), t0);
    await firstStarted;
    expect(await workerB.process(toConversationJob(second.record), after(1))).toBe("LOCK_BUSY");
    expect((await inbox.get(second.record.id))?.status).toBe("FAILED_RETRYABLE");
    releaseFirst();
    expect(await runningFirst).toBe("PROCESSED");
  });
});

describe("Meta Outbox", () => {
  const create = (repository: InMemoryMetaOutboxRepository, overrides = {}) =>
    repository.insert({
      idempotencyKey: "send-key-1",
      conversationId: "conversation-1",
      pageId: "page-1",
      replyPlanId: "plan-1",
      sequenceNo: 0,
      payloadFingerprint: "fingerprint-1",
      notBefore: t0,
      createdAt: t0,
      ...overrides,
    });

  it("creates one send intent and accepts only with provider message id", async () => {
    const outbox = new InMemoryMetaOutboxRepository();
    const first = await create(outbox);
    const duplicate = await create(outbox);
    expect(duplicate.created).toBe(false);
    expect(duplicate.record.id).toBe(first.record.id);

    const claimed = await outbox.claim(first.record.id, "sender-1", t0, 30_000);
    expect(claimed?.state).toBe("SENDING");
    await expect(outbox.recordAccepted(first.record.id, claimed!.lease!.token, "", after(1))).rejects.toThrow(
      "META_MESSAGE_ID_REQUIRED",
    );
    const accepted = await outbox.recordAccepted(
      first.record.id,
      claimed!.lease!.token,
      "meta-message-1",
      after(1),
    );
    expect(accepted.state).toBe("SENT_ACCEPTED");
    expect(await outbox.claim(first.record.id, "sender-2", after(2), 30_000)).toBeNull();
  });

  it("turns a crashed SENDING lease into AMBIGUOUS and never blind retries", async () => {
    const outbox = new InMemoryMetaOutboxRepository();
    const inserted = await create(outbox);
    await outbox.claim(inserted.record.id, "sender-crashed", t0, 100);

    expect(await outbox.recoverExpiredSendingLeases(after(101))).toBe(1);
    expect((await outbox.get(inserted.record.id))?.state).toBe("AMBIGUOUS");
    await expect(outbox.requeueRetryable(inserted.record.id, after(102))).rejects.toThrow(
      "META_OUTBOX_NOT_RETRYABLE",
    );
    await expect(
      outbox.reconcileProviderConfirmedNotSent(inserted.record.id, "TIMEOUT_ONLY", after(1_000)),
    ).rejects.toThrow("META_NOT_SENT_EVIDENCE_REQUIRED");
  });

  it("requires strong matching echo evidence to resolve ambiguity", async () => {
    const outbox = new InMemoryMetaOutboxRepository();
    const inserted = await create(outbox);
    const claimed = await outbox.claim(inserted.record.id, "sender", t0, 100);
    await outbox.recordAmbiguous(
      inserted.record.id,
      claimed!.lease!.token,
      "META_TIMEOUT_AMBIGUOUS",
      after(10),
    );
    const baseEvidence = {
      pageId: "page-1",
      conversationId: "conversation-1",
      providerMessageId: "meta-message-echo",
      payloadFingerprint: "fingerprint-1",
      appIdMatches: true,
      recipientMatches: true,
      occurredAt: after(20),
      maxWindowMs: 60_000,
    };

    await expect(
      outbox.reconcileEcho(inserted.record.id, { ...baseEvidence, appIdMatches: false }),
    ).rejects.toThrow("META_ECHO_EVIDENCE_INSUFFICIENT");
    expect((await outbox.reconcileEcho(inserted.record.id, baseEvidence)).state).toBe("SENT_ACCEPTED");
  });

  it("allows retry only after explicit not-sent evidence, otherwise uses manual review", async () => {
    const outbox = new InMemoryMetaOutboxRepository();
    const retryCandidate = await create(outbox);
    const retryClaim = await outbox.claim(retryCandidate.record.id, "sender", t0, 100);
    await outbox.recordAmbiguous(
      retryCandidate.record.id,
      retryClaim!.lease!.token,
      "META_TIMEOUT_AMBIGUOUS",
      after(1),
    );
    const retryable = await outbox.reconcileProviderConfirmedNotSent(
      retryCandidate.record.id,
      "PROVIDER_CONFIRMED_NOT_SENT:LOOKUP_EMPTY",
      after(1_000),
    );
    expect(retryable.state).toBe("RETRYABLE");

    const manualCandidate = await create(outbox, {
      idempotencyKey: "send-key-manual",
      replyPlanId: "plan-manual",
    });
    const manualClaim = await outbox.claim(manualCandidate.record.id, "sender", t0, 100);
    await outbox.recordAmbiguous(
      manualCandidate.record.id,
      manualClaim!.lease!.token,
      "META_TIMEOUT_AMBIGUOUS",
      after(1),
    );
    expect((await outbox.moveAmbiguousToManualReview(manualCandidate.record.id, after(60_001))).state).toBe(
      "MANUAL_REVIEW",
    );
  });

  it("gates later send units until the previous unit is accepted", async () => {
    const outbox = new InMemoryMetaOutboxRepository();
    const first = await create(outbox);
    const second = await create(outbox, {
      idempotencyKey: "send-key-2",
      sequenceNo: 1,
      payloadFingerprint: "fingerprint-2",
    });
    expect((await outbox.listDue(10, t0)).map((row) => row.id)).toEqual([first.record.id]);

    const claimed = await outbox.claim(first.record.id, "sender", t0, 1_000);
    await outbox.recordAccepted(first.record.id, claimed!.lease!.token, "mid-first", after(1));
    expect((await outbox.listDue(10, after(2))).map((row) => row.id)).toEqual([second.record.id]);
  });
});

describe("Pancake Tag Outbox, lock fencing and retry taxonomy", () => {
  it("keeps tag desired state separately idempotent", async () => {
    const tags = new InMemoryPancakeTagOutboxRepository();
    const input = {
      idempotencyKey: "tag:conversation-1:NHAN_VIEN:generation-1",
      conversationId: "conversation-1",
      pageId: "page-1",
      pancakeConversationId: "verified-pancake-conversation",
      desiredTag: "NHAN_VIEN" as const,
      notBefore: t0,
      createdAt: t0,
    };
    const first = await tags.insert(input);
    expect((await tags.insert(input)).created).toBe(false);
    const claimed = await tags.claim(first.record.id, "tagger", t0, 1_000);
    const applied = await tags.markApplied(first.record.id, claimed!.lease!.token, "tag-id", after(1));
    expect(applied.state).toBe("APPLIED");
  });

  it("uses monotonic fencing and rejects stale release", async () => {
    const lock = new InMemoryConversationLock();
    const first = await lock.acquire("conversation", "worker-a", t0, 100);
    const second = await lock.acquire("conversation", "worker-b", after(101), 100);
    expect(second!.fence).toBeGreaterThan(first!.fence);
    expect(await lock.release(first!)).toBe(false);
    expect(await lock.isCurrent(second!, after(102))).toBe(true);
  });

  it("classifies transmitted Meta timeouts as ambiguous", () => {
    expect(
      classifyProviderFailure({
        provider: "META",
        code: "META_TIMEOUT",
        httpStatus: null,
        requestMayHaveBeenTransmitted: true,
      }).disposition,
    ).toBe("AMBIGUOUS");
    expect(
      classifyProviderFailure({
        provider: "META",
        code: "META_RATE_LIMITED",
        httpStatus: 429,
        requestMayHaveBeenTransmitted: false,
      }).disposition,
    ).toBe("RETRYABLE");
  });
});
