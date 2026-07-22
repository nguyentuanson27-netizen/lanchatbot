import { randomUUID } from "node:crypto";
import type { InboxStatus } from "@lana/contracts";
import type {
  DurableLease,
  IdempotentInsertResult,
  InboxRecord,
} from "./types.js";
import { cloneDate } from "./types.js";

export interface InsertInboxInput {
  readonly id?: string;
  readonly pageId: string;
  readonly eventKey: string;
  readonly conversationId: string;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
}

export interface WebhookInboxRepository {
  insertAuthenticated(
    input: InsertInboxInput,
  ): Promise<IdempotentInsertResult<InboxRecord>>;
  get(id: string): Promise<InboxRecord | null>;
  listDispatchable(limit: number, now: Date): Promise<readonly InboxRecord[]>;
  markQueued(id: string): Promise<InboxRecord>;
  claimForProcessing(
    id: string,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<InboxRecord | null>;
  renewProcessingLease(
    id: string,
    leaseToken: string,
    now: Date,
    leaseMs: number,
  ): Promise<InboxRecord | null>;
  markProcessed(id: string, leaseToken: string, now: Date): Promise<InboxRecord>;
  markRetryable(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<InboxRecord>;
  markPermanentFailure(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<InboxRecord>;
  recoverExpiredLeases(now: Date): Promise<number>;
}

type MutableInboxRecord = {
  -readonly [K in keyof InboxRecord]: InboxRecord[K];
};

const cloneLease = (lease: DurableLease | null): DurableLease | null =>
  lease === null
    ? null
    : { ...lease, expiresAt: cloneDate(lease.expiresAt) };

const cloneRecord = (record: InboxRecord): InboxRecord => ({
  ...record,
  occurredAt: cloneDate(record.occurredAt),
  receivedAt: cloneDate(record.receivedAt),
  lease: cloneLease(record.lease),
});

/**
 * Deterministic fake of the PostgreSQL Inbox contract. It models the database
 * unique constraint on (page_id, event_key) and lease-guarded updates.
 */
export class InMemoryWebhookInboxRepository implements WebhookInboxRepository {
  private readonly records = new Map<string, MutableInboxRecord>();
  private readonly uniqueKeys = new Map<string, string>();
  private sequence = 0;

  async insertAuthenticated(
    input: InsertInboxInput,
  ): Promise<IdempotentInsertResult<InboxRecord>> {
    const uniqueKey = `${input.pageId}\u0000${input.eventKey}`;
    const existingId = this.uniqueKeys.get(uniqueKey);
    if (existingId !== undefined) {
      const existing = this.records.get(existingId);
      if (existing === undefined) throw new Error("INBOX_INDEX_CORRUPTED");
      return { record: cloneRecord(existing), created: false };
    }

    this.sequence += 1;
    const record: MutableInboxRecord = {
      id: input.id ?? randomUUID(),
      pageId: input.pageId,
      eventKey: input.eventKey,
      conversationId: input.conversationId,
      occurredAt: cloneDate(input.occurredAt),
      receivedAt: cloneDate(input.receivedAt),
      receiveSequence: this.sequence,
      status: "RECEIVED",
      attemptCount: 0,
      lease: null,
      lastErrorCode: null,
    };
    this.records.set(record.id, record);
    this.uniqueKeys.set(uniqueKey, record.id);
    return { record: cloneRecord(record), created: true };
  }

  async get(id: string): Promise<InboxRecord | null> {
    const record = this.records.get(id);
    return record === undefined ? null : cloneRecord(record);
  }

  async listDispatchable(limit: number, now: Date): Promise<readonly InboxRecord[]> {
    return [...this.records.values()]
      .filter(
        (row) =>
          row.status === "RECEIVED" ||
          row.status === "VERIFIED" ||
          row.status === "FAILED_RETRYABLE",
      )
      .sort(
        (a, b) =>
          a.occurredAt.getTime() - b.occurredAt.getTime() ||
          a.receiveSequence - b.receiveSequence,
      )
      .slice(0, limit)
      .map(cloneRecord);
  }

  async markQueued(id: string): Promise<InboxRecord> {
    const row = this.require(id);
    if (
      row.status !== "RECEIVED" &&
      row.status !== "VERIFIED" &&
      row.status !== "FAILED_RETRYABLE" &&
      row.status !== "QUEUED"
    ) {
      throw new Error(`INBOX_CANNOT_QUEUE_FROM_${row.status}`);
    }
    row.status = "QUEUED";
    row.lease = null;
    return cloneRecord(row);
  }

  async claimForProcessing(
    id: string,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<InboxRecord | null> {
    const row = this.require(id);
    if (row.status === "PROCESSED" || row.status === "FAILED_PERMANENT") return null;
    const activeLease =
      row.lease !== null && row.lease.expiresAt.getTime() > now.getTime();
    if (activeLease) return null;
    if (row.status !== "QUEUED" && row.status !== "PROCESSING") return null;

    row.status = "PROCESSING";
    row.attemptCount += 1;
    row.lease = {
      token: randomUUID(),
      ownerId,
      expiresAt: new Date(now.getTime() + leaseMs),
    };
    return cloneRecord(row);
  }

  async markProcessed(
    id: string,
    leaseToken: string,
    _now: Date,
  ): Promise<InboxRecord> {
    const row = this.requireOwnedProcessing(id, leaseToken);
    row.status = "PROCESSED";
    row.lease = null;
    row.lastErrorCode = null;
    return cloneRecord(row);
  }

  async renewProcessingLease(
    id: string,
    leaseToken: string,
    now: Date,
    leaseMs: number,
  ): Promise<InboxRecord | null> {
    const row = this.require(id);
    if (
      row.status !== "PROCESSING" ||
      row.lease?.token !== leaseToken ||
      row.lease.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    row.lease = {
      ...row.lease,
      expiresAt: new Date(now.getTime() + leaseMs),
    };
    return cloneRecord(row);
  }

  async markRetryable(
    id: string,
    leaseToken: string,
    errorCode: string,
    _now: Date,
  ): Promise<InboxRecord> {
    const row = this.requireOwnedProcessing(id, leaseToken);
    row.status = "FAILED_RETRYABLE";
    row.lease = null;
    row.lastErrorCode = errorCode;
    return cloneRecord(row);
  }

  async markPermanentFailure(
    id: string,
    leaseToken: string,
    errorCode: string,
    _now: Date,
  ): Promise<InboxRecord> {
    const row = this.requireOwnedProcessing(id, leaseToken);
    row.status = "FAILED_PERMANENT";
    row.lease = null;
    row.lastErrorCode = errorCode;
    return cloneRecord(row);
  }

  async recoverExpiredLeases(now: Date): Promise<number> {
    let recovered = 0;
    for (const row of this.records.values()) {
      if (
        row.status === "PROCESSING" &&
        row.lease !== null &&
        row.lease.expiresAt.getTime() <= now.getTime()
      ) {
        row.status = "FAILED_RETRYABLE";
        row.lease = null;
        row.lastErrorCode = "INBOX_LEASE_EXPIRED";
        recovered += 1;
      }
    }
    return recovered;
  }

  private require(id: string): MutableInboxRecord {
    const row = this.records.get(id);
    if (row === undefined) throw new Error("INBOX_NOT_FOUND");
    return row;
  }

  private requireOwnedProcessing(
    id: string,
    leaseToken: string,
  ): MutableInboxRecord {
    const row = this.require(id);
    if (row.status !== "PROCESSING") throw new Error("INBOX_NOT_PROCESSING");
    if (row.lease?.token !== leaseToken) throw new Error("INBOX_LEASE_LOST");
    return row;
  }
}

export function isTerminalInboxStatus(status: InboxStatus): boolean {
  return status === "PROCESSED" || status === "REJECTED" || status === "FAILED_PERMANENT";
}
