export type Tone = "good" | "warning" | "danger" | "neutral" | "info";

export interface Identity {
  email: string;
  name: string;
  role: string;
  pageScope: string[];
  canControl: boolean;
  historyEnabled: boolean;
  controlPageIds: string[];
  policyControl: boolean;
  policyPageIds: string[];
  policyCanaryShadowEnabled: boolean;
  policyCanaryLiveEnabled: boolean;
  policyPublishEnabled: boolean;
  productMediaUpload: boolean;
  datasetReview?: DatasetReviewCapability;
}

export interface DatasetReviewCapability {
  enabled: boolean;
  role: string;
  canAnnotate: boolean;
  canAdjudicate: boolean;
  canAdmin: boolean;
  aiPrelabel: boolean;
  blindReview: boolean;
  export: boolean;
}

export interface ProductMediaCatalog {
  brands: string[];
  products: Array<{ maSp: string; brand: string; active: boolean }>;
}

export interface ProductMediaUpload {
  intakeId: string;
  maSp: string;
  brand: string;
  imageUrl: string;
  classificationStatus: "PENDING_AI";
  status: "PENDING_AI";
  uploadedAt: string;
  duplicate: boolean;
}

export type PolicyArtifactKind =
  | "SHOP_POLICY"
  | "OFFER_POLICY"
  | "CLOSING_STRATEGY"
  | "SIZE_CHART"
  | "HANDOFF_MATRIX"
  | "PAYMENT_POLICY";

export type PolicyLifecycle =
  | "DRAFT"
  | "VALIDATED"
  | "APPROVED"
  | "CANARY"
  | "PUBLISHED"
  | "RETIRED";

export interface PolicyArtifact {
  id: string;
  key: string;
  kind: PolicyArtifactKind;
  version: number;
  lifecycle: PolicyLifecycle;
  revision: number;
  contentHash: string;
  content: Record<string, unknown>;
  updatedBy: string;
  updatedAt: string;
}

export interface PolicyPointer {
  id: string;
  key: string;
  kind: PolicyArtifactKind;
  pageId: string | null;
  channel: "CANARY_SHADOW" | "CANARY_LIVE" | "PUBLISHED";
  versionId: string;
  version: number;
  revision: number;
  updatedAt: string;
}

export interface PolicySimulation {
  id: string;
  pageId: string;
  versionIds: string[];
  status: string;
  lookbackDays: number;
  maxConversations: number;
  metrics: Record<string, unknown>;
  createdAt: string;
}

export interface PolicyControlData {
  artifacts: PolicyArtifact[];
  pointers: PolicyPointer[];
  simulations: PolicySimulation[];
}

export interface Metric {
  label: string;
  value: string | number;
  change?: string;
  tone?: Tone;
  hint?: string;
}

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  detail?: string;
  checkedAt?: string;
}

export interface AcquisitionBreakdownItem {
  label: string;
  adEntries: number;
  qualified: number;
  purchaseConfirmed: number;
}

export interface AcquisitionBreakdownGroup {
  key: string;
  title: string;
  items: AcquisitionBreakdownItem[];
}

export interface AcquisitionOverview {
  metrics: Metric[];
  breakdowns: AcquisitionBreakdownGroup[];
}
export interface Overview {
  pageId: string;
  pageName?: string;
  mode: string;
  metrics: Metric[];
  acquisition?: AcquisitionOverview;
  services: ServiceHealth[];
  alerts: AlertItem[];
  updatedAt: string;
}

export interface AlertItem {
  id: string;
  title: string;
  detail?: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
}

export interface Conversation {
  id: string;
  pageId: string;
  customerLabel: string;
  pancakeConversationId?: string | null;
  owner: "BOT" | "HUMAN" | string;
  stage: string;
  lastMessage: string;
  lastMessageAt: string;
  blockingTag?: string | null;
  tagStatus?: string;
  currentProductId?: string | null;
  consideredSize?: string | null;
  handoffReason?: string | null;
  unresolvedQuestions?: string[];
  stateVersion: number;
}

export interface ConversationMessage {
  id: string;
  sender: "CUSTOMER" | "BOT" | "HUMAN" | "SYSTEM" | string;
  text: string;
  sentAt: string;
  direction?: string;
  messageType?: string;
  status?: string | null;
  dlpStatus?: string | null;
  productId?: string | null;
  stage?: string | null;
  intent?: string | null;
  promptVersion?: string | null;
  modelVersion?: string | null;
}

export interface ConversationDetail extends Conversation {
  messages: ConversationMessage[];
  messagesNextCursor?: string | null;
  pancakeUrl?: string | null;
  tagVerifiedAt?: string | null;
  observedTags: PancakeTag[];
  businessFacts?: BusinessFact[];
}

export type HandoffStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | string;

export interface HandoffEvent {
  id: string;
  conversationId: string;
  pageId: string;
  customerLabel: string;
  pancakeConversationId?: string | null;
  source: string;
  reasonCode: string;
  reasonDetail: Record<string, unknown>;
  triggerMessage: string;
  productId?: string | null;
  factsStatus?: string | null;
  factsReasonCode?: string | null;
  desiredTag: string;
  ownerBefore: string;
  ownerAfter: string;
  status: HandoffStatus;
  createdAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  assigneeRef?: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | string;
  slaDueAt?: string | null;
  revision: number;
  lastActorRef?: string | null;
  history?: HandoffHistoryEntry[];
  caseHistory?: HandoffCaseHistoryEntry[];
}

export interface HandoffCaseHistoryEntry {
  id: string;
  action: string;
  actorRef: string;
  actorRole: string;
  fromStatus: string;
  toStatus: string;
  fromAssigneeRef?: string | null;
  toAssigneeRef?: string | null;
  fromPriority: string;
  toPriority: string;
  revision: number;
  occurredAt: string;
}

export interface HandoffHistoryEntry {
  id: string;
  direction: string;
  source: string;
  reasonCode: string;
  ownerBefore: string;
  ownerAfter: string;
  desiredTag?: string | null;
  productId?: string | null;
  triggerMessage: string;
  occurredAt: string;
}

export interface HandoffSummary {
  total: number;
  open: number;
  newCount: number;
  acknowledged: number;
  resolved: number;
  resolved24h: number;
  breached: number;
  dueSoon: number;
  oldestOpenAt?: string | null;
  reasons: Array<{ reasonCode: string; count: number }>;
  updatedAt: string;
}

export interface HandoffQueue {
  summary: HandoffSummary;
  items: HandoffEvent[];
  nextCursor?: string | null;
}

export interface OutreachMessage {
  id: string;
  conversationId?: string | null;
  pageId: string;
  templateId: string;
  templateVersion: string;
  status: string;
  responseStatus?: string | null;
  responseIntent?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  respondedAt?: string | null;
  orderConfirmedAt?: string | null;
  orderValue?: number | null;
  createdAt: string;
}

export interface OutreachSummary {
  metrics: Metric[];
  items: OutreachMessage[];
  nextCursor?: string | null;
  updatedAt: string;
}

export type PancakeTag =
  | "NHAN_VIEN"
  | "VAN_DON"
  | "DA_CHOT_DON"
  | "KHONG_UP_SALE";

export type AdminCommandName =
  | "HANDOFF_NHAN_VIEN"
  | "HANDOFF_VAN_DON"
  | "PAUSE_BOT"
  | "RESUME_BOT"
  | "SYNC_PANCAKE_TAGS"
  | "ADD_TAG"
  | "REMOVE_TAG";

export type AdminCommandStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPLIED"
  | "FAILED"
  | "CANCELLED"
  | string;

export interface AdminCommand {
  id: string;
  conversationId: string;
  command: AdminCommandName | string;
  status: AdminCommandStatus;
  tag?: PancakeTag | null;
  pauseMinutes?: 15 | 60 | null;
  reason: string;
  actor?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateAdminCommandInput {
  command: AdminCommandName;
  tag?: PancakeTag;
  pauseMinutes?: 15 | 60;
  reason: string;
  expectedStateVersion: number;
}

export interface BusinessFact {
  label: string;
  value: string;
  source: string;
  observedAt?: string;
  status?: string;
}

export interface QualitySummary {
  metrics: Metric[];
  samples: QualitySample[];
  issues: BreakdownItem[];
  updatedAt: string;
}

export interface QualitySample {
  id: string;
  intent: string;
  productId?: string | null;
  proposedReply: string;
  actualReply?: string | null;
  outcome: string;
  modelVersion?: string;
  promptVersion?: string;
  createdAt: string;
}

export interface BreakdownItem {
  label: string;
  value: number;
  total?: number;
  tone?: Tone;
}

export interface ProductDataSummary {
  metrics: Metric[];
  sources: DataSource[];
  problems: ProductProblem[];
  updatedAt: string;
}

export interface DataSource {
  name: string;
  status: string;
  recordCount?: number;
  lastSyncedAt?: string;
  detail?: string;
}

export interface ProductProblem {
  productId: string;
  issue: string;
  source: string;
  detectedAt?: string;
  severity?: "warning" | "critical";
}

export interface OperationsSummary {
  metrics: Metric[];
  services: ServiceHealth[];
  queues: QueueItem[];
  incidents: AlertItem[];
  updatedAt: string;
}

export interface QueueItem {
  name: string;
  pending: number;
  retrying: number;
  failed: number;
  oldestAgeSeconds?: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  resource: string;
  detail?: string;
  createdAt: string;
  result?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  nextCursor?: string | null;
}

export interface HandoffTransitionInput {
  action: "CLAIM" | "REASSIGN" | "RESOLVE" | "REOPEN" | "SET_PRIORITY";
  expectedRevision: number;
  assigneeRef?: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
}

export interface ConversationInspector {
  conversation: Conversation;
  timeline: {
    messages: Record<string, unknown>[];
    events: Record<string, unknown>[];
    evaluations: Record<string, unknown>[];
    handoffs: Record<string, unknown>[];
  };
  delivery: {
    metaOutbox: Record<string, unknown>[];
    pancakeOutbox: Record<string, unknown>[];
  };
  cursors: Record<string, string | null>;
  dataBoundary: {
    piiSafe: boolean;
    messageSource: string;
    eventSource: string;
    rawPayloadsIncluded: boolean;
  };
  generatedAt: string;
}
