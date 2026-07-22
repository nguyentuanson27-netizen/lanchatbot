export type AdminRole = "OWNER";

export interface AdminIdentity {
  readonly email: string;
  readonly role: AdminRole;
  readonly pageScope: "ALL" | readonly string[];
  readonly subject: string;
}

export interface AdminAuthenticator {
  authenticate(assertion: string | undefined): Promise<AdminIdentity>;
  ready(): Promise<boolean>;
}

export interface PageCursorQuery {
  readonly limit: number;
  readonly cursor?: string | undefined;
  readonly pageId?: string | undefined;
}

export interface ConversationQuery extends PageCursorQuery {
  readonly conversationOwner?: "BOT" | "HUMAN" | undefined;
  readonly routingOwner?: "N8N" | "APP" | undefined;
  readonly blockingTag?:
    | "NHAN_VIEN"
    | "VAN_DON"
    | "DA_CHOT_DON"
    | "KHONG_UP_SALE"
    | "NONE"
    | undefined;
}

export interface TimelineQuery extends PageCursorQuery {
  readonly conversationId?: string | undefined;
  readonly since?: Date | undefined;
  readonly until?: Date | undefined;
}

export interface OutreachQuery extends PageCursorQuery {
  readonly templateId?: string | undefined;
  readonly status?: string | undefined;
  readonly since?: Date | undefined;
  readonly until?: Date | undefined;
}

export interface OutreachMetricsQuery {
  readonly pageId?: string | undefined;
  readonly since?: Date | undefined;
  readonly until?: Date | undefined;
}

export interface EvaluationQuery extends PageCursorQuery {
  readonly status?: string | undefined;
}

export interface OperationQuery extends PageCursorQuery {
  readonly status?: string | undefined;
}

export interface HandoffQuery extends PageCursorQuery {
  readonly status?: "OPEN" | "NEW" | "IN_PROGRESS" | "RESOLVED" | undefined;
  readonly reasonCode?: string | undefined;
  readonly conversationId?: string | undefined;
  readonly source?: "BOT_POLICY" | "CUSTOMER_REQUEST" | "POST_SALE" | "ADMIN" | "ALL" | undefined;
  readonly desiredTag?: "NHAN_VIEN" | "VAN_DON" | "ALL" | undefined;
}

export interface AuditQuery extends PageCursorQuery {
  readonly action?: string | undefined;
  readonly resourceType?: string | undefined;
}

export type AdminCommandType =
  | "HANDOFF_NHAN_VIEN"
  | "HANDOFF_VAN_DON"
  | "PAUSE_BOT"
  | "RESUME_BOT"
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "SYNC_PANCAKE_TAGS";

export type AdminCommandTag =
  | "NHAN_VIEN"
  | "VAN_DON"
  | "DA_CHOT_DON"
  | "KHONG_UP_SALE";

export type AdminCommandReason =
  | "ADMIN_HANDOFF"
  | "CUSTOMER_REQUESTED_HUMAN"
  | "POST_SALE_SUPPORT"
  | "TEMPORARY_PAUSE"
  | "RESUME_AFTER_REVIEW"
  | "TAG_CORRECTION"
  | "MANUAL_TAG_SYNC"
  | "ADMIN_TEST";

export interface CreateAdminCommandInput {
  readonly idempotencyKey: string;
  readonly command: AdminCommandType;
  readonly tag: AdminCommandTag | null;
  readonly pauseMinutes: 15 | 60 | null;
  readonly expectedStateVersion: number;
  readonly reason: AdminCommandReason;
  readonly correlationId: string;
}

export interface CreateAdminCommandResult {
  readonly command: Record<string, unknown>;
  readonly created: boolean;
  readonly conflicted: boolean;
}

export interface AdminStore {
  ready(): Promise<boolean>;
  controlReady(): Promise<boolean>;
  dashboard(identity: AdminIdentity): Promise<Record<string, unknown>>;
  listPages(identity: AdminIdentity): Promise<readonly Record<string, unknown>[]>;
  pageHealth(identity: AdminIdentity, pageId: string): Promise<Record<string, unknown> | null>;
  listConversations(
    identity: AdminIdentity,
    query: ConversationQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  getConversation(
    identity: AdminIdentity,
    conversationId: string,
  ): Promise<Record<string, unknown> | null>;
  listMessages(
    identity: AdminIdentity,
    query: TimelineQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  listEvents(
    identity: AdminIdentity,
    query: TimelineQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  listOutreachMessages(
    identity: AdminIdentity,
    query: OutreachQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  outreachMetrics(
    identity: AdminIdentity,
    query: OutreachMetricsQuery,
  ): Promise<Record<string, unknown>>;
  evaluationSummary(
    identity: AdminIdentity,
    pageId?: string,
  ): Promise<Record<string, unknown>>;
  listEvaluations(
    identity: AdminIdentity,
    query: EvaluationQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  businessFactSummary(
    identity: AdminIdentity,
    pageId?: string,
  ): Promise<Record<string, unknown>>;
  listWorkers(identity: AdminIdentity): Promise<readonly Record<string, unknown>[]>;
  catalogSummary(identity: AdminIdentity): Promise<Record<string, unknown>>;
  listInbox(
    identity: AdminIdentity,
    query: OperationQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  listMetaOutbox(
    identity: AdminIdentity,
    query: OperationQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  listPancakeOutbox(
    identity: AdminIdentity,
    query: OperationQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  handoffSummary(
    identity: AdminIdentity,
    pageId?: string,
  ): Promise<Record<string, unknown>>;
  listHandoffs(
    identity: AdminIdentity,
    query: HandoffQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  getHandoff(
    identity: AdminIdentity,
    handoffId: string,
  ): Promise<Record<string, unknown> | null>;
  listAudit(
    identity: AdminIdentity,
    query: AuditQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null }>;
  createConversationCommand(
    identity: AdminIdentity,
    conversationId: string,
    input: CreateAdminCommandInput,
  ): Promise<CreateAdminCommandResult | null>;
  getCommand(
    identity: AdminIdentity,
    commandId: string,
  ): Promise<Record<string, unknown> | null>;
  listConversationCommands(
    identity: AdminIdentity,
    conversationId: string,
    query: PageCursorQuery,
  ): Promise<{ items: readonly Record<string, unknown>[]; nextCursor: string | null } | null>;
  close(): Promise<void>;
}

export class AdminAuthError extends Error {
  constructor(
    readonly code:
      | "ADMIN_AUTH_REQUIRED"
      | "ADMIN_TOKEN_INVALID"
      | "ADMIN_ACCESS_DENIED"
      | "ADMIN_AUTH_UNAVAILABLE",
  ) {
    super(code);
  }
}

export class AdminQueryError extends Error {
  constructor(readonly code:
    | "ADMIN_QUERY_INVALID"
    | "ADMIN_PAGE_NOT_ALLOWED"
    | "ADMIN_COMMAND_INVALID"
    | "ADMIN_IDEMPOTENCY_CONFLICT"
    | "ADMIN_CONTROL_UNAVAILABLE") {
    super(code);
  }
}
