import type {
  InboxStatus,
  MetaOutboxStatus,
  PancakeTagOutboxStatus,
} from "@lana/contracts";

export interface DurableLease {
  readonly token: string;
  readonly ownerId: string;
  readonly expiresAt: Date;
}

export interface InboxRecord {
  readonly id: string;
  readonly pageId: string;
  readonly eventKey: string;
  readonly conversationId: string;
  readonly occurredAt: Date;
  readonly receivedAt: Date;
  readonly receiveSequence: number;
  readonly status: InboxStatus;
  readonly attemptCount: number;
  readonly lease: DurableLease | null;
  readonly lastErrorCode: string | null;
}

export interface MetaOutboxRecord {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly replyPlanId: string;
  readonly sequenceNo: number;
  readonly payloadFingerprint: string;
  readonly state: MetaOutboxStatus;
  readonly attemptCount: number;
  readonly providerMessageId: string | null;
  readonly notBefore: Date;
  readonly lease: DurableLease | null;
  readonly lastErrorCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface PancakeTagOutboxRecord {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly conversationId: string;
  readonly pageId: string;
  readonly pancakeConversationId: string;
  readonly desiredTag: "NHAN_VIEN" | "VAN_DON";
  readonly state: PancakeTagOutboxStatus;
  readonly attemptCount: number;
  readonly providerTagId: string | null;
  readonly notBefore: Date;
  readonly lease: DurableLease | null;
  readonly lastErrorCode: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface IdempotentInsertResult<T> {
  readonly record: T;
  readonly created: boolean;
}

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export function cloneDate(value: Date): Date {
  return new Date(value.getTime());
}
