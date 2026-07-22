export const CONTROL_TAGS = [
  "NHAN_VIEN",
  "VAN_DON",
  "DA_CHOT_DON",
  "KHONG_UP_SALE",
] as const;

export type ControlTag = (typeof CONTROL_TAGS)[number];

export type AdminCommandType =
  | "HANDOFF_NHAN_VIEN"
  | "HANDOFF_VAN_DON"
  | "PAUSE_BOT"
  | "RESUME_BOT"
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "SYNC_PANCAKE_TAGS";

export interface ClaimedAdminCommand {
  readonly commandId: string;
  readonly leaseToken: string;
  readonly pageId: string;
  readonly conversationId: string;
  readonly pancakeConversationId: string;
  readonly commandType: AdminCommandType;
  readonly tag: ControlTag | null;
  readonly pauseMinutes: 15 | 60 | null;
  readonly expectedStateVersion: number;
  readonly enqueuedStateVersion: number | null;
  readonly requestedBySubject: string;
  readonly attemptCount: number;
}

export interface ControlTagObservation {
  readonly verified: boolean;
  readonly observedTagIds: readonly string[];
  readonly blockingTag: ControlTag | null;
  readonly observedAt: string;
  readonly reasonCode: string | null;
  /** From the same exact Pancake conversation response; never log this PII. */
  readonly customerName?: string | null;
}

export type ProviderMutationResult =
  | { readonly status: "APPLIED"; readonly alreadyInDesiredState: boolean }
  | { readonly status: "FAILED"; readonly errorCode: string };

export type StateMutationResult =
  | { readonly status: "APPLIED"; readonly stateVersion: number }
  | { readonly status: "CONFLICT"; readonly errorCode: string };

export type TagOperationStatus =
  | "MISSING"
  | "PENDING"
  | "APPLYING"
  | "RETRYABLE"
  | "APPLIED"
  | "FAILED_PERMANENT";

export interface ControlCommandStore {
  claim(
    workerId: string,
    leaseMs: number,
    allowedPageIds: readonly string[],
  ): Promise<ClaimedAdminCommand | null>;

  /** Creates a desired-state idempotent durable Pancake tag outbox row. */
  enqueueTagOperation(
    command: ClaimedAdminCommand,
    operation: "ADD" | "REMOVE",
    tag: ControlTag,
    tagId: string,
    now: Date,
    stateVersionOverride?: number,
  ): Promise<StateMutationResult>;
  tagOperationStatuses(
    command: ClaimedAdminCommand,
    operation: "ADD" | "REMOVE",
  ): Promise<ReadonlyMap<ControlTag, TagOperationStatus>>;

  /** Establishes a HUMAN fence before any provider-side add/remove operation. */
  beginFailSafeHuman(
    command: ClaimedAdminCommand,
    now: Date,
  ): Promise<StateMutationResult>;

  /** Reconciles a verified exact Pancake read. BOT is allowed only when explicitly requested and no blocking tag exists. */
  reconcileVerifiedTags(
    command: ClaimedAdminCommand,
    expectedStateVersion: number,
    observation: ControlTagObservation,
    allowBotWhenClear: boolean,
    now: Date,
  ): Promise<StateMutationResult>;

  markApplied(
    command: ClaimedAdminCommand,
    resultCode: string,
    metadata?: Readonly<Record<string, string | number | boolean | null>>,
  ): Promise<boolean>;
  markFailed(command: ClaimedAdminCommand, errorCode: string): Promise<boolean>;
  markConflict(command: ClaimedAdminCommand, errorCode: string): Promise<boolean>;
  markWaiting(
    command: ClaimedAdminCommand,
    reasonCode: string,
    delaySeconds: number,
  ): Promise<boolean>;
}

export interface AdminControlWorkerOptions {
  readonly enabled: boolean;
  readonly allowedPageIds: readonly string[];
}

export interface PancakeControlPort {
  observe(pageId: string, conversationId: string): Promise<ControlTagObservation>;
  tagId(pageId: string, tag: ControlTag): string | null;
}
