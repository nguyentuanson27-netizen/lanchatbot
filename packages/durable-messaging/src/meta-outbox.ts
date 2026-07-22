import { randomUUID } from "node:crypto";
import type { MetaOutboxStatus } from "@lana/contracts";
import type {
  DurableLease,
  IdempotentInsertResult,
  MetaOutboxRecord,
} from "./types.js";
import { cloneDate } from "./types.js";

export interface InsertMetaOutboxInput {
  readonly id?: string;
  readonly idempotencyKey: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly replyPlanId: string;
  readonly sequenceNo: number;
  readonly payloadFingerprint: string;
  readonly notBefore: Date;
  readonly createdAt: Date;
}

export interface MetaEchoEvidence {
  readonly pageId: string;
  readonly conversationId: string;
  readonly providerMessageId: string;
  readonly payloadFingerprint: string;
  readonly appIdMatches: boolean;
  readonly recipientMatches: boolean;
  readonly occurredAt: Date;
  readonly maxWindowMs: number;
}

export interface MetaOutboxRepository {
  insert(input: InsertMetaOutboxInput): Promise<IdempotentInsertResult<MetaOutboxRecord>>;
  get(id: string): Promise<MetaOutboxRecord | null>;
  listDue(limit: number, now: Date): Promise<readonly MetaOutboxRecord[]>;
  requeueRetryable(id: string, now: Date): Promise<MetaOutboxRecord>;
  claim(id: string, ownerId: string, now: Date, leaseMs: number): Promise<MetaOutboxRecord | null>;
  recordAccepted(
    id: string,
    leaseToken: string,
    providerMessageId: string,
    now: Date,
  ): Promise<MetaOutboxRecord>;
  recordAmbiguous(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<MetaOutboxRecord>;
  recordKnownNotTransmitted(
    id: string,
    leaseToken: string,
    errorCode: string,
    retryAt: Date,
  ): Promise<MetaOutboxRecord>;
  recordPermanentFailure(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<MetaOutboxRecord>;
  reconcileEcho(id: string, evidence: MetaEchoEvidence): Promise<MetaOutboxRecord>;
  reconcileProviderConfirmedNotSent(
    id: string,
    evidenceCode: string,
    retryAt: Date,
  ): Promise<MetaOutboxRecord>;
  moveAmbiguousToManualReview(id: string, now: Date): Promise<MetaOutboxRecord>;
  markDelivered(id: string, providerMessageId: string, now: Date): Promise<MetaOutboxRecord>;
  markRead(id: string, providerMessageId: string, now: Date): Promise<MetaOutboxRecord>;
  recoverExpiredSendingLeases(now: Date): Promise<number>;
}

type MutableMetaOutboxRecord = {
  -readonly [K in keyof MetaOutboxRecord]: MetaOutboxRecord[K];
};

const cloneLease = (lease: DurableLease | null): DurableLease | null =>
  lease === null ? null : { ...lease, expiresAt: cloneDate(lease.expiresAt) };

const cloneRecord = (record: MetaOutboxRecord): MetaOutboxRecord => ({
  ...record,
  notBefore: cloneDate(record.notBefore),
  lease: cloneLease(record.lease),
  createdAt: cloneDate(record.createdAt),
  updatedAt: cloneDate(record.updatedAt),
});

/** Fake PostgreSQL Meta Outbox with the same safety invariants as production. */
export class InMemoryMetaOutboxRepository implements MetaOutboxRepository {
  private readonly records = new Map<string, MutableMetaOutboxRecord>();
  private readonly idempotency = new Map<string, string>();
  private readonly planSequence = new Map<string, string>();

  async insert(
    input: InsertMetaOutboxInput,
  ): Promise<IdempotentInsertResult<MetaOutboxRecord>> {
    const existingId = this.idempotency.get(input.idempotencyKey);
    if (existingId !== undefined) {
      return { record: cloneRecord(this.require(existingId)), created: false };
    }
    const sequenceKey = `${input.replyPlanId}\u0000${input.sequenceNo}`;
    const existingSequence = this.planSequence.get(sequenceKey);
    if (existingSequence !== undefined) {
      throw new Error("META_OUTBOX_PLAN_SEQUENCE_CONFLICT");
    }
    const record: MutableMetaOutboxRecord = {
      id: input.id ?? randomUUID(),
      idempotencyKey: input.idempotencyKey,
      conversationId: input.conversationId,
      pageId: input.pageId,
      replyPlanId: input.replyPlanId,
      sequenceNo: input.sequenceNo,
      payloadFingerprint: input.payloadFingerprint,
      state: "PENDING",
      attemptCount: 0,
      providerMessageId: null,
      notBefore: cloneDate(input.notBefore),
      lease: null,
      lastErrorCode: null,
      createdAt: cloneDate(input.createdAt),
      updatedAt: cloneDate(input.createdAt),
    };
    this.records.set(record.id, record);
    this.idempotency.set(record.idempotencyKey, record.id);
    this.planSequence.set(sequenceKey, record.id);
    return { record: cloneRecord(record), created: true };
  }

  async get(id: string): Promise<MetaOutboxRecord | null> {
    const row = this.records.get(id);
    return row === undefined ? null : cloneRecord(row);
  }

  async listDue(limit: number, now: Date): Promise<readonly MetaOutboxRecord[]> {
    return [...this.records.values()]
      .filter(
        (row) =>
          row.state === "PENDING" &&
          row.notBefore.getTime() <= now.getTime() &&
          this.isPriorSequenceAccepted(row),
      )
      .sort(
        (a, b) =>
          a.notBefore.getTime() - b.notBefore.getTime() ||
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.sequenceNo - b.sequenceNo,
      )
      .slice(0, limit)
      .map(cloneRecord);
  }

  async requeueRetryable(id: string, now: Date): Promise<MetaOutboxRecord> {
    const row = this.require(id);
    if (row.state !== "RETRYABLE") throw new Error("META_OUTBOX_NOT_RETRYABLE");
    if (row.notBefore.getTime() > now.getTime()) throw new Error("META_OUTBOX_BACKOFF_ACTIVE");
    row.state = "PENDING";
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async claim(
    id: string,
    ownerId: string,
    now: Date,
    leaseMs: number,
  ): Promise<MetaOutboxRecord | null> {
    const row = this.require(id);
    if (row.state !== "PENDING" || row.notBefore.getTime() > now.getTime()) return null;
    if (!this.isPriorSequenceAccepted(row)) return null;
    row.state = "SENDING";
    row.attemptCount += 1;
    row.lease = {
      token: randomUUID(),
      ownerId,
      expiresAt: new Date(now.getTime() + leaseMs),
    };
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async recordAccepted(
    id: string,
    leaseToken: string,
    providerMessageId: string,
    now: Date,
  ): Promise<MetaOutboxRecord> {
    if (providerMessageId.trim() === "") throw new Error("META_MESSAGE_ID_REQUIRED");
    const row = this.requireOwnedSending(id, leaseToken);
    row.state = "SENT_ACCEPTED";
    row.providerMessageId = providerMessageId;
    row.lease = null;
    row.lastErrorCode = null;
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async recordAmbiguous(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.requireOwnedSending(id, leaseToken);
    row.state = "AMBIGUOUS";
    row.lease = null;
    row.lastErrorCode = errorCode;
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async recordKnownNotTransmitted(
    id: string,
    leaseToken: string,
    errorCode: string,
    retryAt: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.requireOwnedSending(id, leaseToken);
    row.state = "RETRYABLE";
    row.lease = null;
    row.lastErrorCode = errorCode;
    row.notBefore = cloneDate(retryAt);
    row.updatedAt = cloneDate(retryAt);
    return cloneRecord(row);
  }

  async recordPermanentFailure(
    id: string,
    leaseToken: string,
    errorCode: string,
    now: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.requireOwnedSending(id, leaseToken);
    row.state = "FAILED_PERMANENT";
    row.lease = null;
    row.lastErrorCode = errorCode;
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async reconcileEcho(
    id: string,
    evidence: MetaEchoEvidence,
  ): Promise<MetaOutboxRecord> {
    const row = this.require(id);
    if (row.state !== "AMBIGUOUS") throw new Error("META_OUTBOX_NOT_AMBIGUOUS");
    const withinWindow =
      Math.abs(evidence.occurredAt.getTime() - row.updatedAt.getTime()) <=
      evidence.maxWindowMs;
    const matches =
      evidence.pageId === row.pageId &&
      evidence.conversationId === row.conversationId &&
      evidence.payloadFingerprint === row.payloadFingerprint &&
      evidence.appIdMatches &&
      evidence.recipientMatches &&
      withinWindow &&
      evidence.providerMessageId.trim() !== "";
    if (!matches) throw new Error("META_ECHO_EVIDENCE_INSUFFICIENT");
    row.state = "SENT_ACCEPTED";
    row.providerMessageId = evidence.providerMessageId;
    row.lastErrorCode = null;
    row.updatedAt = cloneDate(evidence.occurredAt);
    return cloneRecord(row);
  }

  async reconcileProviderConfirmedNotSent(
    id: string,
    evidenceCode: string,
    retryAt: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.require(id);
    if (row.state !== "AMBIGUOUS") throw new Error("META_OUTBOX_NOT_AMBIGUOUS");
    if (!evidenceCode.startsWith("PROVIDER_CONFIRMED_NOT_SENT")) {
      throw new Error("META_NOT_SENT_EVIDENCE_REQUIRED");
    }
    row.state = "RETRYABLE";
    row.lastErrorCode = evidenceCode;
    row.notBefore = cloneDate(retryAt);
    row.updatedAt = cloneDate(retryAt);
    return cloneRecord(row);
  }

  async moveAmbiguousToManualReview(
    id: string,
    now: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.require(id);
    if (row.state !== "AMBIGUOUS") throw new Error("META_OUTBOX_NOT_AMBIGUOUS");
    row.state = "MANUAL_REVIEW";
    row.lastErrorCode = "META_AMBIGUOUS_RECONCILIATION_TIMEOUT";
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async markDelivered(
    id: string,
    providerMessageId: string,
    now: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.requireProviderAccepted(id, providerMessageId);
    if (row.state !== "SENT_ACCEPTED" && row.state !== "DELIVERED") {
      throw new Error(`META_CANNOT_DELIVER_FROM_${row.state}`);
    }
    row.state = "DELIVERED";
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async markRead(
    id: string,
    providerMessageId: string,
    now: Date,
  ): Promise<MetaOutboxRecord> {
    const row = this.requireProviderAccepted(id, providerMessageId);
    if (row.state !== "DELIVERED" && row.state !== "READ") {
      throw new Error(`META_CANNOT_READ_FROM_${row.state}`);
    }
    row.state = "READ";
    row.updatedAt = cloneDate(now);
    return cloneRecord(row);
  }

  async recoverExpiredSendingLeases(now: Date): Promise<number> {
    let recovered = 0;
    for (const row of this.records.values()) {
      if (
        row.state === "SENDING" &&
        row.lease !== null &&
        row.lease.expiresAt.getTime() <= now.getTime()
      ) {
        // The process died while provider outcome was unknown. Re-sending here
        // would be a blind retry, so recovery must enter AMBIGUOUS.
        row.state = "AMBIGUOUS";
        row.lease = null;
        row.lastErrorCode = "META_SENDING_LEASE_EXPIRED_AMBIGUOUS";
        row.updatedAt = cloneDate(now);
        recovered += 1;
      }
    }
    return recovered;
  }

  private isPriorSequenceAccepted(row: MetaOutboxRecord): boolean {
    for (const candidate of this.records.values()) {
      if (
        candidate.replyPlanId === row.replyPlanId &&
        candidate.sequenceNo < row.sequenceNo &&
        candidate.state !== "SENT_ACCEPTED" &&
        candidate.state !== "DELIVERED" &&
        candidate.state !== "READ"
      ) {
        return false;
      }
    }
    return true;
  }

  private require(id: string): MutableMetaOutboxRecord {
    const row = this.records.get(id);
    if (row === undefined) throw new Error("META_OUTBOX_NOT_FOUND");
    return row;
  }

  private requireOwnedSending(id: string, leaseToken: string): MutableMetaOutboxRecord {
    const row = this.require(id);
    if (row.state !== "SENDING") throw new Error("META_OUTBOX_NOT_SENDING");
    if (row.lease?.token !== leaseToken) throw new Error("META_OUTBOX_LEASE_LOST");
    return row;
  }

  private requireProviderAccepted(
    id: string,
    providerMessageId: string,
  ): MutableMetaOutboxRecord {
    const row = this.require(id);
    if (row.providerMessageId !== providerMessageId) {
      throw new Error("META_PROVIDER_MESSAGE_ID_MISMATCH");
    }
    return row;
  }
}

export function canBlindlyRetryMetaState(_state: MetaOutboxStatus): false {
  // A caller must always provide outcome evidence; state alone is insufficient.
  return false;
}
