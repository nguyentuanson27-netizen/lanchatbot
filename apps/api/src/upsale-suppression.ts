export interface UpsaleSuppressionInput {
  eventKey: string;
  providerMessageId: string | null;
  pageId: string;
  conversationHash: string;
  occurredAt: Date;
  receivedAt: Date;
  templateId: string;
  templateVersion: string;
  contentHash: string;
}

/**
 * Persistence + deduplication boundary for suppressed outreach messages.
 * Implementations must be idempotent by eventKey (and provider message id when present).
 * Raw message text must not be persisted.
 */
export interface UpsaleSuppressionStore {
  record(input: UpsaleSuppressionInput): Promise<{ inserted: boolean }>;
}
