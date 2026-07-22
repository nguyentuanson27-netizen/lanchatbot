import { randomUUID } from "node:crypto";
import type {
  DurableLease,
  IdempotentInsertResult,
  PancakeTagOutboxRecord,
} from "./types.js";
import { cloneDate } from "./types.js";

export interface InsertPancakeTagOutboxInput {
  readonly id?: string;
  readonly idempotencyKey: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly pancakeConversationId: string;
  readonly desiredTag: "NHAN_VIEN" | "VAN_DON";
  readonly notBefore: Date;
  readonly createdAt: Date;
}

export interface PancakeTagOutboxRepository {
  insert(
    input: InsertPancakeTagOutboxInput,
  ): Promise<IdempotentInsertResult<PancakeTagOutboxRecord>>;
  get(id: string): Promise<PancakeTagOutboxRecord | null>;
  listDue(limit: number, now: Date): Promise<readonly PancakeTagOutboxRecord[]>;
  requeueRetryable(id: string, now: Date): Promise<PancakeTagOutboxRecord>;
  claim(
    id: string,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<PancakeTagOutboxRecord | null>;
  markApplied(
    id: string,
    leaseToken: string,
    providerTagId: string,
    now: Date,
  ): Promise<PancakeTagOutboxRecord>;
  markRetryable(
    id: string,
    leaseToken: string,
    errorCode: string,
    retryAt: Date,
  ): Promise<PancakeTagOutboxRecord>;
  markPermanentFailure(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<PancakeTagOutboxRecord>;
  recoverExpiredApplyingLeases(now: Date): Promise<number>;
}

type MutableTagRecord = {
  -readonly [K in keyof PancakeTagOutboxRecord]: PancakeTagOutboxRecord[K];
};

const cloneLease = (lease: DurableLease | null): DurableLease | null =>
  lease === null ? null : { ...lease, expiresAt: cloneDate(lease.expiresAt) };

const cloneRecord = (record: PancakeTagOutboxRecord): PancakeTagOutboxRecord => ({
  ...record,
  notBefore: cloneDate(record.notBefore),
  lease: cloneLease(record.lease),
  createdAt: cloneDate(record.createdAt),
  updatedAt: cloneDate(record.updatedAt),
});

/**
 * Dedicated desired-state Outbox. It intentionally shares no state or retry
 * path with customer message delivery.
 */
export class InMemoryPancakeTagOutboxRepository
  implements PancakeTagOutboxRepository
{
  private readonly records = new Map<string, MutableTagRecord>();
  private readonly idempotency = new Map<string, string>();

  async insert(
    input: InsertPancakeTagOutboxInput,
  ): Promise<IdempotentInsertResult<PancakeTagOutboxRecord>> {
    const existingId = this.idempotency.get(input.idempotencyKey);
    if (existingId !== undefined) {
      return { record: cloneRecord(this.require(existingId)), created: false };
    }
    const record: MutableTagRecord = {
      id: input.id ?? randomUUID(),
      idempotencyKey: input.idempotencyKey,
      conversationId: input.conversationId,
      pageId: input.pageId,
      pancakeConversationId: input.pancakeConversationId,
      desiredTag: input.desiredTag,
      state: "PENDING",
      attemptCount: 0,
      providerTagId: null,
      notBefore: cloneDate(input.notBefore),
      lease: null,
      lastErrorCode: null,
      createdAt: cloneDate(input.createdAt),
      updatedAt: cloneDate(input.createdAt),
    };
    this.records.set(record.id, record);
    this.idempotency.set(record.idempotencyKey, record.id);
    return { record: cloneRecord(record), created: true };
  }

  async get(id: string): Promise<PancakeTagOutboxRecord | null> {
    const row = this.records.get(id);
    return row === undefined ? null : cloneRecord(row);
  }

  async listDue(limit: number, now: Date): Promise<readonly PancakeTagOutboxRecord[]> {
    return [...this.records.values()]
      .filter((row) => row.state === "PENDING" && row.notBefore.getTime() <= now.getTime())
      .sort((a, b) => a.notBefore.getTime() - b.notBefore.getTime())
      .slice(0, limit)
      .map(cloneRecord);
  }

  async requeueRetryable(id: string, now: Date): Promise<PancakeTagOutboxRecord> {
    const row = this.require(id);
    if (row.state !== "RETRYABLE") throw new Error("PANCAKE_TAG_NOT_RETRYABLE");
    if (row.notBefore.getTime() > now.getTime()) throw new Error("PANCAKE_TAG_BACKOFF_ACTIVE");
    row.state = "PENDING";
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async claim(
    id: string,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<PancakeTagOutboxRecord | null> {
    const row = this.require(id);
    if (row.state !== "PENDING" || row.notBefore.getTime() > now.getTime()) return null;
    row.state = "APPLYING";
    row.attemptCount += 1;
    row.lease = {
      token: randomUUID(),
      ownerId,
      expiresAt: new Date(now.getTime() + leaseMs),
    };
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async markApplied(
    id: string,
    leaseToken: string,
    providerTagId: string,
    now: Date,
  ): Promise<PancakeTagOutboxRecord> {
    if (providerTagId.trim() === "") throw new Error("PANCAKE_TAG_ID_REQUIRED");
    const row = this.requireOwnedApplying(id, leaseToken);
    row.state = "APPLIED";
    row.providerTagId = providerTagId;
    row.lease = null;
    row.lastErrorCode = null;
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async markRetryable(
    id: string,
    leaseToken: string,
    errorCode: string,
    retryAt: Date,
  ): Promise<PancakeTagOutboxRecord> {
    const row = this.requireOwnedApplying(id, leaseToken);
    row.state = "RETRYABLE";
    row.lease = null;
    row.lastErrorCode = errorCode;
    row.notBefore = cloneDate(retryAt);
    row.updatedAt = cloneDate(retryAt);
    return cloneRecord(row);
  }

  async markPermanentFailure(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<PancakeTagOutboxRecord> {
    const row = this.requireOwnedApplying(id, leaseToken);
    row.state = "FAILED_PERMANENT";
    row.lease = null;
    row.lastErrorCode = errorCode;
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async recoverExpiredApplyingLeases(now: Date): Promise<number> {
    let recovered = 0;
    for (const row of this.records.values()) {
      if (
        row.state === "APPLYING" &&
        row.lease !== null &&
        row.lease.expiresAt.getTime() <= now.getTime()
      ) {
        // ADD tag is desired-state idempotent. A later worker must read current
        // tags before applying, so an expired attempt is safely retryable.
        row.state = "RETRYABLE";
        row.lease = null;
        row.lastErrorCode = "PANCAKE_TAG_LEASE_EXPIRED_RECONCILE_REQUIRED";
        row.notBefore = cloneDate(now);
        row.updatedAt = cloneDate(now);
        recovered += 1;
      }
    }
    return recovered;
  }

  private require(id: string): MutableTagRecord {
    const row = this.records.get(id);
    if (row === undefined) throw new Error("PANCAKE_TAG_OUTBOX_NOT_FOUND");
    return row;
  }

  private requireOwnedApplying(id: string, leaseToken: string): MutableTagRecord {
    const row = this.require(id);
    if (row.state !== "APPLYING") throw new Error("PANCAKE_TAG_NOT_APPLYING");
    if (row.lease?.token !== leaseToken) throw new Error("PANCAKE_TAG_LEASE_LOST");
    return row;
  }
}
