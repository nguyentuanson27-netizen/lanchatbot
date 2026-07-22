import type {
  AdminCommand,
  AuditLog,
  Conversation,
  ConversationDetail,
  ConversationMessage,
  CreateAdminCommandInput,
  Identity,
  HandoffEvent,
  HandoffQueue,
  HandoffSummary,
  ListResponse,
  OperationsSummary,
  Overview,
  OutreachMessage,
  OutreachSummary,
  PancakeTag,
  ProductDataSummary,
  PolicyArtifact,
  PolicyArtifactKind,
  PolicyControlData,
  PolicyLifecycle,
  QualitySummary,
} from "./types.js";

const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined) ?? "/admin/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

const PANCAKE_TAGS = new Set(["NHAN_VIEN", "VAN_DON", "DA_CHOT_DON", "KHONG_UP_SALE"]);

function pancakeTagValue(value: unknown): ConversationDetail["observedTags"][number] | null {
  const item = record(value);
  const candidate = stringValue(
    item.key,
    stringValue(item.tag, stringValue(item.text, typeof value === "string" ? value : "")),
  );
  return PANCAKE_TAGS.has(candidate)
    ? (candidate as ConversationDetail["observedTags"][number])
    : null;
}

async function request<T>(
  path: string,
  signal?: AbortSignal,
  options: { method?: "GET" | "POST" | "PUT"; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(signal ? { signal } : {}),
  };
  const response = await fetch(`${API_BASE}${path}`, init);
  const payload = (await response.json().catch(() => ({}))) as JsonRecord;
  if (!response.ok) {
    const code = stringValue(payload.code);
    throw new ApiError(
      stringValue(payload.message, policyErrorMessage(code)),
      response.status,
      stringValue(payload.request_id) || response.headers.get("x-request-id") || undefined,
      code || undefined,
    );
  }
  return payload as T;
}

function policyErrorMessage(code: string): string {
  if (code === "ADMIN_POLICY_CANARY_LIVE_DISABLED") {
    return "Canary gửi thật đang bị khóa bởi cổng an toàn.";
  }
  if (code === "ADMIN_POLICY_PUBLISH_DISABLED") {
    return "Phát hành đang bị khóa bởi cổng an toàn.";
  }
  return "Không thể tải dữ liệu quản trị.";
}

function normalizeMetrics(source: unknown): Overview["metrics"] {
  if (Array.isArray(source)) {
    return source.map((entry) => {
      const item = record(entry);
      return {
        label: stringValue(item.label, "Chỉ số"),
        value:
          typeof item.value === "number" || typeof item.value === "string"
            ? item.value
            : "—",
        ...(typeof item.change === "string" ? { change: item.change } : {}),
        ...(typeof item.hint === "string" ? { hint: item.hint } : {}),
      };
    });
  }
  return Object.entries(record(source)).map(([label, value]) => ({
    label: label.replaceAll("_", " "),
    value:
      typeof value === "number" || typeof value === "string"
        ? value
        : Array.isArray(value)
          ? value.length
          : "—",
  }));
}

const WORKER_LABELS: Readonly<Record<string, string>> = {
  REALTIME: "Trả lời tin nhắn",
  SHADOW: "Đánh giá song song",
  POS_SNAPSHOT: "Đồng bộ giá và tồn",
  P23A_REGISTRY_SYNC: "Đồng bộ hồ sơ sản phẩm",
  P23B_METADATA_STAGING: "Gắn nhãn ảnh",
  P23C_QDRANT_PUBLISHER: "Xuất bản lên Qdrant",
};

/** Worker batch chạy 24 giờ một lần, nên chỉ coi là mất kết nối khi im lặng
 *  quá một chu kỳ đầy đủ cộng biên an toàn. */
const WORKER_SILENCE_LIMIT_MS = 26 * 60 * 60 * 1_000;

const HEALTHY_WORKER_STATUSES = new Set(["healthy", "ok", "running", "idle", "processing"]);
const DEGRADED_WORKER_STATUSES = new Set(["degraded", "warning", "starting", "stopping"]);
const DOWN_WORKER_STATUSES = new Set(["down", "failed", "error"]);

function normalizeServices(source: unknown): Overview["services"] {
  return arrayValue(source).map((entry) => {
    const item = record(entry);
    const rawStatus = stringValue(item.status, "unknown").toLowerCase();
    const lastSeenAt = stringValue(item.last_seen_at, stringValue(item.checked_at));
    const silent = lastSeenAt
      ? Date.now() - new Date(lastSeenAt).getTime() > WORKER_SILENCE_LIMIT_MS
      : false;
    const status = DOWN_WORKER_STATUSES.has(rawStatus)
      ? "down"
      : silent
        ? "degraded"
        : HEALTHY_WORKER_STATUSES.has(rawStatus)
          ? "healthy"
          : DEGRADED_WORKER_STATUSES.has(rawStatus)
            ? "degraded"
            : "unknown";
    const workerType = stringValue(item.worker_type);
    const name = stringValue(
      item.name,
      stringValue(item.worker_name, WORKER_LABELS[workerType] ?? workerType ?? "Dịch vụ"),
    );
    const detail = [
      typeof item.detail === "string" ? item.detail : "",
      stringValue(item.worker_id),
      stringValue(item.mode),
      item.last_error_code ? `Lỗi gần nhất: ${stringValue(item.last_error_code)}` : "",
      silent ? "Chưa báo cáo quá 26 giờ" : "",
    ].filter(Boolean).join(" · ");
    return {
      name,
      status,
      ...(detail ? { detail } : {}),
      ...(lastSeenAt ? { checkedAt: lastSeenAt } : {}),
    };
  });
}

export async function getIdentity(signal?: AbortSignal): Promise<Identity> {
  const payload = await request<JsonRecord>("/me", signal);
  const user = record(payload.user ?? payload);
  const capabilities = record(user.capabilities);
  const policyLifecycle = record(capabilities.policy_lifecycle);
  const email = stringValue(user.email, "Tài khoản được bảo vệ");
  return {
    email,
    name: stringValue(user.name, email.split("@")[0] ?? "Quản trị viên"),
    role: stringValue(user.role, "VIEWER"),
    pageScope:
      typeof (user.page_scope ?? user.pageScope) === "string"
        ? [String(user.page_scope ?? user.pageScope)]
        : arrayValue(user.page_scope ?? user.pageScope).map(String),
    canControl: capabilities.conversation_control === true,
    historyEnabled: capabilities.history === true,
    controlPageIds:
      typeof capabilities.control_page_ids === "string"
        ? [capabilities.control_page_ids]
        : arrayValue(capabilities.control_page_ids).map(String),
    policyControl: capabilities.policy_control === true,
    policyPageIds:
      typeof capabilities.policy_page_ids === "string"
        ? [capabilities.policy_page_ids]
        : arrayValue(capabilities.policy_page_ids).map(String),
    policyCanaryShadowEnabled: policyLifecycle.canary_shadow === true,
    policyCanaryLiveEnabled: policyLifecycle.canary_live === true,
    policyPublishEnabled: policyLifecycle.publish === true,
  };
}

const POLICY_KINDS = new Set<PolicyArtifactKind>([
  "SHOP_POLICY", "OFFER_POLICY", "CLOSING_STRATEGY", "SIZE_CHART",
  "HANDOFF_MATRIX", "PAYMENT_POLICY",
]);
const POLICY_LIFECYCLES = new Set<PolicyLifecycle>([
  "DRAFT", "VALIDATED", "APPROVED", "CANARY", "PUBLISHED", "RETIRED",
]);

function normalizePolicyArtifact(value: unknown): PolicyArtifact {
  const item = record(value);
  const kind = stringValue(item.artifact_kind) as PolicyArtifactKind;
  const lifecycle = stringValue(item.lifecycle) as PolicyLifecycle;
  if (!POLICY_KINDS.has(kind) || !POLICY_LIFECYCLES.has(lifecycle)) {
    throw new ApiError("Phiên bản cấu hình không hợp lệ.", 500);
  }
  return {
    id: stringValue(item.version_id),
    key: stringValue(item.artifact_key),
    kind,
    version: numberValue(item.version_number),
    lifecycle,
    revision: numberValue(item.revision),
    contentHash: stringValue(item.content_hash),
    content: record(item.content),
    updatedBy: stringValue(item.updated_by_subject),
    updatedAt: stringValue(item.updated_at),
  };
}

export async function getPolicyControl(signal?: AbortSignal): Promise<PolicyControlData> {
  const [artifacts, pointers, simulations] = await Promise.all([
    request<JsonRecord>("/policy/artifacts?limit=100", signal),
    request<JsonRecord>("/policy/pointers", signal),
    request<JsonRecord>("/policy/simulations?limit=30", signal),
  ]);
  return {
    artifacts: arrayValue(artifacts.items).map(normalizePolicyArtifact),
    pointers: arrayValue(pointers.items).map((entry) => {
      const item = record(entry);
      return {
        id: stringValue(item.pointer_id),
        key: stringValue(item.artifact_key),
        kind: stringValue(item.artifact_kind) as PolicyArtifactKind,
        pageId: typeof item.page_id === "string" ? item.page_id : null,
        channel: stringValue(item.channel) as "CANARY_SHADOW" | "CANARY_LIVE" | "PUBLISHED",
        versionId: stringValue(item.version_id),
        version: numberValue(item.version_number),
        revision: numberValue(item.revision),
        updatedAt: stringValue(item.updated_at),
      };
    }),
    simulations: arrayValue(simulations.items).map((entry) => {
      const item = record(entry);
      return {
        id: stringValue(item.simulation_id),
        pageId: stringValue(item.page_id),
        versionIds: arrayValue(item.version_ids).map(String),
        status: stringValue(item.status),
        lookbackDays: numberValue(item.lookback_days),
        maxConversations: numberValue(item.max_conversations),
        metrics: record(item.aggregate_metrics),
        createdAt: stringValue(item.created_at),
      };
    }),
  };
}

export async function createPolicyArtifact(
  artifactKey: string,
  content: Record<string, unknown>,
): Promise<PolicyArtifact> {
  const payload = await request<JsonRecord>("/policy/artifacts", undefined, {
    method: "POST",
    body: { artifact_key: artifactKey, content },
  });
  return normalizePolicyArtifact(record(payload.artifact));
}

export async function transitionPolicyArtifact(
  artifact: PolicyArtifact,
  action: "VALIDATE" | "APPROVE" | "START_CANARY" | "PUBLISH" | "RETIRE",
  pageId: string | null,
  canaryMode: "SHADOW" | "LIVE_OUTBOUND" | null,
): Promise<PolicyArtifact> {
  const payload = await request<JsonRecord>(`/policy/artifacts/${encodeURIComponent(artifact.id)}/transitions`, undefined, {
    method: "POST",
    body: {
      expected_revision: artifact.revision,
      action,
      page_id: pageId,
      canary_mode: canaryMode,
    },
  });
  return normalizePolicyArtifact(record(payload.artifact));
}

export async function updatePolicyArtifactDraft(
  artifact: PolicyArtifact,
  content: Record<string, unknown>,
): Promise<PolicyArtifact> {
  const payload = await request<JsonRecord>(`/policy/artifacts/${encodeURIComponent(artifact.id)}/draft`, undefined, {
    method: "PUT",
    body: { expected_revision: artifact.revision, content },
  });
  return normalizePolicyArtifact(record(payload.artifact));
}

export async function startPolicySimulation(versionIds: string[], pageId: string): Promise<void> {
  await request<JsonRecord>("/policy/simulations", undefined, {
    method: "POST",
    body: {
      schemaVersion: 1,
      versionIds,
      pageId,
      lookbackDays: 180,
      maxConversations: 500,
      sideEffects: "DISABLED",
    },
  });
}

export async function rollbackPolicyPointer(
  pointer: PolicyControlData["pointers"][number],
  targetVersionId: string,
): Promise<void> {
  if (!pointer.pageId) throw new ApiError("Con trỏ chưa gắn với page.", 400);
  await request<JsonRecord>("/policy/pointers/rollback", undefined, {
    method: "POST",
    body: {
      artifact_key: pointer.key,
      artifact_kind: pointer.kind,
      page_id: pointer.pageId,
      channel: pointer.channel,
      target_version_id: targetVersionId,
      expected_pointer_revision: pointer.revision,
    },
  });
}

export async function getOverview(signal?: AbortSignal): Promise<Overview> {
  const [payload, pagesPayload] = await Promise.all([
    request<JsonRecord>("/dashboard", signal),
    request<JsonRecord>("/pages", signal),
  ]);
  const pages = arrayValue(pagesPayload.items);
  const firstPage = record(pages[0]);
  const conversations = record(payload.conversations);
  const evaluations = record(payload.evaluations);
  const queues = record(payload.queues);
  const facts = record(payload.business_facts);
  const control = record(payload.admin_control);
  const workers = arrayValue(payload.workers);
  const failedQueues = Object.values(queues).reduce<number>((total, value) => {
    const statuses = record(value);
    return total + Object.entries(statuses).reduce(
      (sum, [status, count]) =>
        sum + (status.includes("FAILED") ? numberValue(count) : 0),
      0,
    );
  }, 0);
  const alerts: Overview["alerts"] = [];
  if (failedQueues > 0) {
    alerts.push({
      id: "queue-failures",
      title: `${failedQueues} tác vụ đang lỗi`,
      detail: "Kiểm tra trang Vận hành để xem hàng đợi liên quan.",
      severity: "warning",
      createdAt: stringValue(payload.generated_at, new Date().toISOString()),
    });
  }
  if (numberValue(facts.error) + numberValue(facts.not_found) > 0) {
    alerts.push({
      id: "business-facts",
      title: "Có dữ liệu giá, tồn kho, size hoặc ETA chưa sẵn sàng",
      severity: "warning",
      createdAt: stringValue(payload.generated_at, new Date().toISOString()),
    });
  }
  return {
    pageId: pages.length === 1 ? stringValue(firstPage.page_id, "ALL") : "ALL",
    pageName: pages.length === 1
      ? stringValue(firstPage.page_alias, "La.na Design")
      : `Tất cả ${pages.length} page`,
    mode: control.enabled === true ? "CONTROLLED" : "READ_ONLY",
    metrics: [
      { label: "Hội thoại", value: numberValue(conversations.total) },
      { label: "Hoạt động 24 giờ", value: numberValue(conversations.active_24h) },
      { label: "Nhân viên đang giữ", value: numberValue(conversations.human) },
      { label: "Đánh giá hoàn tất", value: numberValue(evaluations.completed) },
    ],
    services: normalizeServices(workers),
    alerts,
    updatedAt: stringValue(payload.generated_at, new Date().toISOString()),
  };
}

function normalizeConversation(value: unknown): Conversation {
  const item = record(value);
  return {
    id: stringValue(item.id, stringValue(item.conversation_id)),
    pageId: stringValue(item.page_id),
    customerLabel: stringValue(
      item.customer_label,
      stringValue(item.customer_ref, "Khách hàng ẩn danh"),
    ),
    pancakeConversationId:
      typeof item.pancake_conversation_id === "string"
        ? item.pancake_conversation_id
        : null,
    owner: stringValue(item.owner, stringValue(item.conversation_owner, "BOT")),
    stage: stringValue(item.stage, stringValue(item.sales_stage, "Chưa phân loại")),
    lastMessage: stringValue(
      item.unresolved_question,
      item.blocking_tag
        ? `Đang chặn bởi tag ${String(item.blocking_tag)}`
        : "Không có câu hỏi tồn đọng",
    ),
    lastMessageAt: stringValue(item.last_message_at, stringValue(item.updated_at)),
    blockingTag:
      typeof item.blocking_tag === "string" ? item.blocking_tag : null,
    tagStatus: stringValue(item.tag_gate_status, "Chưa xác minh"),
    currentProductId:
      typeof item.product_id === "string" ? item.product_id : null,
    consideredSize:
      typeof item.considered_size === "string" ? item.considered_size : null,
    handoffReason:
      typeof item.handoff_reason === "string" ? item.handoff_reason : null,
    unresolvedQuestions:
      typeof item.unresolved_question === "string" ? [item.unresolved_question] : [],
    stateVersion: numberValue(item.state_version, numberValue(item.stateVersion)),
  };
}

function normalizeCommand(value: unknown): AdminCommand {
  const item = record(value);
  return {
    id: stringValue(item.command_id, stringValue(item.id)),
    conversationId: stringValue(item.conversation_id),
    command: stringValue(item.command, stringValue(item.command_type)),
    status: stringValue(item.status, "PENDING"),
    tag: typeof item.tag === "string" ? (item.tag as PancakeTag) : null,
    pauseMinutes:
      item.pause_minutes === 15 || item.pause_minutes === 60
        ? item.pause_minutes
        : null,
    reason: stringValue(item.reason),
    actor: typeof item.actor === "string"
      ? item.actor
      : typeof item.actor_email === "string"
        ? item.actor_email
        : typeof item.requested_by_ref === "string"
          ? item.requested_by_ref
          : null,
    error: typeof item.error === "string"
      ? item.error
      : typeof item.error_message === "string"
        ? item.error_message
        : typeof item.error_code === "string"
          ? item.error_code
          : null,
    createdAt: stringValue(item.occurred_at, stringValue(item.created_at)),
    updatedAt: typeof item.updated_at === "string" ? item.updated_at : null,
  };
}

export async function getConversations(
  filters: { search?: string; owner?: string; stage?: string } = {},
  signal?: AbortSignal,
): Promise<ListResponse<Conversation>> {
  const search = new URLSearchParams();
  if (filters.owner) search.set("conversation_owner", filters.owner);
  search.set("limit", "50");
  const payload = await request<JsonRecord>(`/conversations?${search.toString()}`, signal);
  let items = arrayValue(payload.items).map(normalizeConversation);
  const safeSearch = filters.search?.trim().toLowerCase();
  if (safeSearch) {
    items = items.filter((item) =>
      [item.customerLabel, item.currentProductId, item.stage]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(safeSearch)));
  }
  if (filters.stage) {
    items = items.filter((item) => item.stage === filters.stage);
  }
  return {
    items,
    total: numberValue(payload.total, items.length),
    nextCursor: typeof payload.next_cursor === "string" ? payload.next_cursor : null,
  };
}

function normalizeHandoff(value: unknown): HandoffEvent {
  const item = record(value);
  const detail = record(item.reason_detail_safe);
  return {
    id: stringValue(item.handoff_id, stringValue(item.id)),
    conversationId: stringValue(item.conversation_id),
    pageId: stringValue(item.page_id),
    customerLabel: stringValue(item.customer_label, stringValue(item.customer_ref, "Khách hàng")),
    pancakeConversationId: typeof item.pancake_conversation_id === "string"
      ? item.pancake_conversation_id
      : null,
    source: stringValue(item.source, "BOT_POLICY"),
    reasonCode: stringValue(item.reason_code, "UNKNOWN"),
    reasonDetail: detail,
    triggerMessage: stringValue(
      item.trigger_message_text_redacted_safe,
      stringValue(item.trigger_text_redacted_safe, "Không có tin nhắn nguồn"),
    ),
    productId: typeof item.product_id === "string" ? item.product_id : null,
    factsStatus: typeof item.facts_status === "string" ? item.facts_status : null,
    factsReasonCode: typeof item.facts_reason_code === "string"
      ? item.facts_reason_code
      : null,
    desiredTag: stringValue(item.desired_tag, "NHAN_VIEN"),
    ownerBefore: stringValue(item.owner_before, "BOT"),
    ownerAfter: stringValue(item.owner_after, "HUMAN"),
    status: stringValue(item.status, "NEW"),
    createdAt: stringValue(item.created_at),
    acknowledgedAt: typeof item.acknowledged_at === "string" ? item.acknowledged_at : null,
    resolvedAt: typeof item.resolved_at === "string" ? item.resolved_at : null,
    history: arrayValue(item.history).map((value) => {
      const history = record(value);
      return {
        id: stringValue(history.handoff_id),
        direction: stringValue(history.direction),
        source: stringValue(history.source),
        reasonCode: stringValue(history.reason_code, "UNKNOWN"),
        ownerBefore: stringValue(history.owner_before),
        ownerAfter: stringValue(history.owner_after),
        desiredTag: typeof history.desired_tag === "string" ? history.desired_tag : null,
        productId: typeof history.product_id === "string" ? history.product_id : null,
        triggerMessage: stringValue(
          history.trigger_message_text_redacted_safe,
          stringValue(history.trigger_text_redacted_safe, "Không có tin nhắn nguồn"),
        ),
        occurredAt: stringValue(history.occurred_at, stringValue(history.created_at)),
      };
    }),
  };
}

function normalizeHandoffSummary(value: unknown): HandoffSummary {
  const item = record(value);
  const newCount = numberValue(item.new);
  const acknowledged = numberValue(item.in_progress, numberValue(item.acknowledged));
  return {
    total: numberValue(item.total),
    open: newCount + acknowledged,
    newCount,
    acknowledged,
    resolved: numberValue(item.resolved),
    resolved24h: numberValue(item.resolved_24h),
    oldestOpenAt: typeof item.oldest_open_at === "string" ? item.oldest_open_at : null,
    reasons: arrayValue(item.reasons).map((value) => {
      const reason = record(value);
      return {
        reasonCode: stringValue(reason.reason_code, "UNKNOWN"),
        count: numberValue(reason.count),
      };
    }),
    updatedAt: stringValue(item.generated_at, new Date().toISOString()),
  };
}

export async function getHandoffSummary(signal?: AbortSignal): Promise<HandoffSummary> {
  const payload = await request<JsonRecord>("/handoffs/summary", signal);
  return normalizeHandoffSummary(payload.summary ?? payload);
}

export async function getHandoffs(
  filters: {
    status?: string;
    reasonCode?: string;
    source?: string;
    cursor?: string;
  } = {},
  signal?: AbortSignal,
): Promise<HandoffQueue> {
  const search = new URLSearchParams({
    limit: "50",
    status: filters.status || "OPEN",
  });
  if (filters.reasonCode) search.set("reason_code", filters.reasonCode);
  if (filters.source) search.set("source", filters.source);
  if (filters.cursor) search.set("cursor", filters.cursor);
  const [summaryPayload, queuePayload] = await Promise.all([
    request<JsonRecord>("/handoffs/summary", signal),
    request<JsonRecord>(`/handoffs?${search.toString()}`, signal),
  ]);
  return {
    summary: normalizeHandoffSummary(summaryPayload.summary ?? summaryPayload),
    items: arrayValue(queuePayload.items).map(normalizeHandoff),
    nextCursor: typeof queuePayload.next_cursor === "string" ? queuePayload.next_cursor : null,
  };
}

export async function getHandoff(id: string, signal?: AbortSignal): Promise<HandoffEvent> {
  const payload = await request<JsonRecord>(`/handoffs/${encodeURIComponent(id)}`, signal);
  return normalizeHandoff(payload.handoff ?? payload);
}

export async function getConversation(
  id: string,
  signal?: AbortSignal,
  loadHistory = true,
): Promise<ConversationDetail> {
  const [detailPayload, messagePage] = await Promise.all([
    request<JsonRecord>(`/conversations/${encodeURIComponent(id)}`, signal),
    loadHistory
      ? getConversationMessages(id, undefined, signal)
      : Promise.resolve({ items: [], total: 0, nextCursor: null }),
  ]);
  const rawConversation = record(detailPayload.conversation ?? detailPayload);
  const base = normalizeConversation(rawConversation);
  return {
    ...base,
    messages: messagePage.items,
    messagesNextCursor: messagePage.nextCursor ?? null,
    pancakeUrl:
      typeof rawConversation.pancake_url === "string" ? rawConversation.pancake_url : null,
    tagVerifiedAt:
      typeof rawConversation.blocking_tag_verified_at === "string"
        ? rawConversation.blocking_tag_verified_at
        : null,
    observedTags: Array.from(new Set(arrayValue(
      rawConversation.observed_tags ??
        rawConversation.pancake_tags ??
        rawConversation.tags,
    )
      .map(pancakeTagValue)
      .filter((tag): tag is ConversationDetail["observedTags"][number] => tag !== null)
      .concat(base.blockingTag && PANCAKE_TAGS.has(base.blockingTag)
        ? [base.blockingTag as ConversationDetail["observedTags"][number]]
        : []))),
    businessFacts: arrayValue(rawConversation.business_facts).map((entry) => {
      const item = record(entry);
      return {
        label: stringValue(item.label),
        value: stringValue(item.value),
        source: stringValue(item.source, "Chưa rõ"),
        ...(typeof item.observed_at === "string" ? { observedAt: item.observed_at } : {}),
        ...(typeof item.status === "string" ? { status: item.status } : {}),
      };
    }),
  };
}

function normalizeConversationMessage(value: unknown): ConversationMessage {
  const item = record(value);
  return {
    id: stringValue(item.message_pk),
    sender: stringValue(item.sender, stringValue(item.sender_type, "SYSTEM")),
    text: stringValue(
      item.text_redacted_safe,
      "Nội dung đã được ẩn để bảo vệ khách hàng",
    ),
    sentAt: stringValue(item.sent_at, stringValue(item.occurred_at, stringValue(item.created_at))),
    direction: stringValue(item.direction),
    messageType: stringValue(item.message_type),
    status: typeof item.outcome === "string" ? item.outcome : null,
    dlpStatus: typeof item.dlp_status === "string" ? item.dlp_status : null,
    productId: typeof item.product_id === "string" ? item.product_id : null,
    stage: typeof item.sales_stage === "string" ? item.sales_stage : null,
    intent: typeof item.intent === "string" ? item.intent : null,
    promptVersion: typeof item.prompt_version === "string" ? item.prompt_version : null,
    modelVersion: typeof item.model_version === "string" ? item.model_version : null,
  };
}

export async function getConversationMessages(
  conversationId: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<ListResponse<ConversationMessage>> {
  const search = new URLSearchParams({
    conversation_id: conversationId,
    limit: "50",
  });
  if (cursor) search.set("cursor", cursor);
  const payload = await request<JsonRecord>(`/messages?${search.toString()}`, signal);
  const rawItems = arrayValue(payload.items);
  return {
    // API uses newest-first keyset paging; bubbles read oldest-first.
    items: rawItems.map(normalizeConversationMessage).reverse(),
    total: rawItems.length,
    nextCursor: typeof payload.next_cursor === "string" ? payload.next_cursor : null,
  };
}

function normalizeOutreachMessage(value: unknown): OutreachMessage {
  const item = record(value);
  return {
    id: stringValue(item.outreach_id),
    conversationId: typeof item.conversation_id === "string" ? item.conversation_id : null,
    pageId: stringValue(item.page_id),
    templateId: stringValue(item.template_id, "UPSALE_FOLLOWUP"),
    templateVersion: stringValue(item.template_version, "v1"),
    status: stringValue(item.status, "RECORDED"),
    responseStatus: typeof item.response_status === "string" ? item.response_status : null,
    responseIntent: typeof item.response_intent === "string" ? item.response_intent : null,
    sentAt: typeof item.sent_at === "string" ? item.sent_at : null,
    deliveredAt: typeof item.delivered_at === "string" ? item.delivered_at : null,
    readAt: typeof item.read_at === "string" ? item.read_at : null,
    respondedAt: typeof item.responded_at === "string" ? item.responded_at : null,
    orderConfirmedAt: typeof item.order_confirmed_at === "string"
      ? item.order_confirmed_at
      : null,
    orderValue: item.order_value === null || item.order_value === undefined
      ? null
      : numberValue(item.order_value),
    createdAt: stringValue(item.created_at),
  };
}

export async function getOutreach(
  cursor?: string,
  signal?: AbortSignal,
): Promise<OutreachSummary> {
  const search = new URLSearchParams({ limit: "50" });
  if (cursor) search.set("cursor", cursor);
  const [metricsPayload, messagesPayload] = await Promise.all([
    request<JsonRecord>("/outreach/metrics", signal),
    request<JsonRecord>(`/outreach/messages?${search.toString()}`, signal),
  ]);
  const metrics = record(metricsPayload.metrics);
  const sent = numberValue(metrics.sent);
  const responded = numberValue(metrics.responded_24h);
  const converted = numberValue(metrics.converted_7d);
  return {
    metrics: [
      { label: "Đã gửi", value: sent },
      { label: "Đã đọc", value: numberValue(metrics.read) },
      {
        label: "Phản hồi trong 24h",
        value: responded,
        hint: sent > 0 ? `${Math.round((responded / sent) * 1000) / 10}% số tin gửi` : "Chưa có dữ liệu",
      },
      {
        label: "Chốt trong 7 ngày",
        value: converted,
        hint: sent > 0 ? `${Math.round((converted / sent) * 1000) / 10}% số tin gửi` : "Chưa có dữ liệu",
      },
      { label: "Từ chối nhận tin", value: numberValue(metrics.opt_outs) },
      { label: "Doanh thu ghi nhận", value: numberValue(metrics.revenue) },
    ],
    items: arrayValue(messagesPayload.items).map(normalizeOutreachMessage),
    nextCursor: typeof messagesPayload.next_cursor === "string"
      ? messagesPayload.next_cursor
      : null,
    updatedAt: stringValue(metrics.updated_at, new Date().toISOString()),
  };
}

export async function getConversationCommands(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ListResponse<AdminCommand>> {
  const payload = await request<JsonRecord>(
    `/conversations/${encodeURIComponent(conversationId)}/commands`,
    signal,
  );
  const items = arrayValue(payload.items ?? payload.commands).map(normalizeCommand);
  return {
    items,
    total: numberValue(payload.total, items.length),
    nextCursor: typeof payload.next_cursor === "string" ? payload.next_cursor : null,
  };
}

export async function getAdminCommand(
  commandId: string,
  signal?: AbortSignal,
): Promise<AdminCommand> {
  const payload = await request<JsonRecord>(
    `/commands/${encodeURIComponent(commandId)}`,
    signal,
  );
  return normalizeCommand(payload.command ?? payload);
}

export async function createConversationCommand(
  conversationId: string,
  input: CreateAdminCommandInput,
  idempotencyKey: string,
  signal?: AbortSignal,
): Promise<AdminCommand> {
  const payload = await request<JsonRecord>(
    `/conversations/${encodeURIComponent(conversationId)}/commands`,
    signal,
    {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: {
        command: input.command,
        ...(input.tag ? { tag: input.tag } : {}),
        ...(input.pauseMinutes ? { pause_minutes: input.pauseMinutes } : {}),
        reason: input.reason,
        expected_state_version: input.expectedStateVersion,
      },
    },
  );
  return normalizeCommand(payload.command ?? payload);
}

export async function getQuality(signal?: AbortSignal): Promise<QualitySummary> {
  const [summaryPayload, itemsPayload] = await Promise.all([
    request<JsonRecord>("/evaluations/summary", signal),
    request<JsonRecord>("/evaluations?limit=30", signal),
  ]);
  const summary = summaryPayload.summary ?? {};
  return {
    metrics: normalizeMetrics(summary),
    samples: arrayValue(itemsPayload.items).map((entry) => {
      const item = record(entry);
      return {
        id: stringValue(item.evaluation_id),
        intent: stringValue(item.intent, "Chưa phân loại"),
        productId:
          typeof item.business_fact_product_id === "string"
            ? item.business_fact_product_id
            : null,
        proposedReply: stringValue(
          item.proposed_action,
          "Không lưu nội dung trả lời thô trong trang quản trị",
        ),
        actualReply:
          typeof item.guarded_action === "string" ? item.guarded_action : null,
        outcome: stringValue(item.status, "Chưa đánh giá"),
        ...(typeof item.model_version === "string" ? { modelVersion: item.model_version } : {}),
        ...(typeof item.prompt_version === "string" ? { promptVersion: item.prompt_version } : {}),
        createdAt: stringValue(item.created_at),
      };
    }),
    issues: arrayValue(record(summaryPayload.summary).issues).map((entry) => {
      const item = record(entry);
      return {
        label: stringValue(item.label, stringValue(item.issue, "Khác")),
        value: numberValue(item.value, numberValue(item.count)),
        ...(typeof item.total === "number" ? { total: item.total } : {}),
      };
    }),
    updatedAt: stringValue(summaryPayload.generated_at, new Date().toISOString()),
  };
}

const SNAPSHOT_LABELS: Readonly<Record<string, string>> = {
  POS_CATALOG: "Giá và tồn kho (POS)",
  PRODUCT_REGISTRY: "Hồ sơ sản phẩm",
  IMAGE_REGISTRY: "Nhãn ảnh chờ duyệt",
  QDRANT_COLLECTION: "Bộ nhớ tìm kiếm ảnh",
};

const ISSUE_LABELS: Readonly<Record<string, string>> = {
  SHOP_ERROR: "Không gọi được POS",
  CONFIG_NOT_FOUND: "Thiếu cấu hình shop",
  PRODUCT_NOT_FOUND: "Không tìm thấy trên POS",
  SNAPSHOT_VALIDATION_FAILED: "Dữ liệu không hợp lệ",
  DUPLICATE_MA_SP: "Mã sản phẩm bị trùng",
  REGISTRY_ROW_INVALID: "Dòng hồ sơ không hợp lệ",
};

const SNAPSHOT_STATUS_TONE: Readonly<Record<string, string>> = {
  OK: "healthy",
  WARNING: "warning",
  ERROR: "critical",
  STALE: "warning",
};

export async function getProductData(signal?: AbortSignal): Promise<ProductDataSummary> {
  const payload = await request<JsonRecord>("/catalog/summary", signal);
  const summary = record(payload.summary);
  const totals = record(summary.totals);
  const sources = arrayValue(summary.sources).map((entry) => {
    const item = record(entry);
    const key = stringValue(item.snapshot_key);
    return {
      name: SNAPSHOT_LABELS[key] ?? key ?? "Nguồn dữ liệu",
      status: SNAPSHOT_STATUS_TONE[stringValue(item.status)] ?? "warning",
      recordCount: numberValue(item.record_count),
      ...(typeof item.detail === "string" && item.detail
        ? { detail: item.detail }
        : { detail: stringValue(item.source, "Nguồn dữ liệu nghiệp vụ") }),
      ...(typeof item.observed_at === "string" ? { lastSyncedAt: item.observed_at } : {}),
    };
  });
  return {
    metrics: [
      { label: "Mã có giá và tồn", value: numberValue(record(sourceByKey(summary, "POS_CATALOG")).record_count) },
      { label: "Hồ sơ sản phẩm", value: numberValue(record(sourceByKey(summary, "PRODUCT_REGISTRY")).record_count) },
      { label: "Điểm trên Qdrant", value: numberValue(record(sourceByKey(summary, "QDRANT_COLLECTION")).record_count) },
      { label: "Mã cần bổ sung", value: numberValue(totals.issues) },
    ],
    sources,
    problems: arrayValue(summary.problems).map((entry) => {
      const item = record(entry);
      const code = stringValue(item.issue_code, "UNKNOWN");
      return {
        productId: stringValue(item.product_id, "Không rõ mã"),
        issue: ISSUE_LABELS[code] ?? code,
        source: stringValue(item.source, "Chưa rõ"),
        ...(typeof item.detected_at === "string" ? { detectedAt: item.detected_at } : {}),
        ...(item.severity === "critical" || item.severity === "warning"
          ? { severity: item.severity }
          : {}),
      };
    }),
    updatedAt: latestObservedAt(sources),
  };
}

function sourceByKey(summary: JsonRecord, key: string): unknown {
  return arrayValue(summary.sources).find((entry) => record(entry).snapshot_key === key) ?? {};
}

/** Trang hiển thị "cập nhật lúc" theo nguồn mới nhất, không theo giờ máy chủ:
 *  nếu mọi worker đều đứng thì con số phải cũ dần chứ không tự làm mới. */
function latestObservedAt(sources: readonly { lastSyncedAt?: string }[]): string {
  const stamps = sources
    .map((source) => source.lastSyncedAt)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .sort();
  return stamps.at(-1) ?? new Date().toISOString();
}

export async function getOperations(signal?: AbortSignal): Promise<OperationsSummary> {
  const [workersPayload, inboxPayload, metaPayload, pancakePayload] = await Promise.all([
    request<JsonRecord>("/operations/workers", signal),
    request<JsonRecord>("/operations/inbox?limit=20", signal),
    request<JsonRecord>("/operations/meta-outbox?limit=20", signal),
    request<JsonRecord>("/operations/pancake-outbox?limit=20", signal),
  ]);
  const queueFrom = (name: string, payload: JsonRecord) => {
    const items = arrayValue(payload.items);
    const count = (status: string) =>
      items.filter((entry) => stringValue(record(entry).status).toUpperCase().includes(status)).length;
    return {
      name,
      pending: count("PENDING") + count("RECEIVED") + count("QUEUED"),
      retrying: count("RETRY"),
      failed: count("FAILED"),
      ...(typeof payload.oldest_age_seconds === "number"
        ? { oldestAgeSeconds: payload.oldest_age_seconds }
        : {}),
    };
  };
  const queues = [
    queueFrom("Tin nhắn nhận vào", inboxPayload),
    queueFrom("Tin gửi Meta", metaPayload),
    queueFrom("Gắn tag Pancake", pancakePayload),
  ];
  return {
    metrics: [
      { label: "Đang chờ", value: queues.reduce((sum, item) => sum + item.pending, 0) },
      { label: "Đang thử lại", value: queues.reduce((sum, item) => sum + item.retrying, 0) },
      { label: "Thất bại", value: queues.reduce((sum, item) => sum + item.failed, 0) },
      { label: "Worker", value: arrayValue(workersPayload.items).length },
    ],
    services: normalizeServices(workersPayload.items),
    queues,
    incidents: arrayValue(workersPayload.incidents).map((entry, index) => {
      const item = record(entry);
      return {
        id: stringValue(item.id, `incident-${index}`),
        title: stringValue(item.title, "Sự cố vận hành"),
        ...(typeof item.detail === "string" ? { detail: item.detail } : {}),
        severity:
          item.severity === "critical" || item.severity === "warning"
            ? item.severity
            : ("info" as const),
        createdAt: stringValue(item.created_at, new Date().toISOString()),
      };
    }),
    updatedAt: stringValue(workersPayload.generated_at, new Date().toISOString()),
  };
}

export async function getAuditLogs(signal?: AbortSignal): Promise<ListResponse<AuditLog>> {
  const payload = await request<JsonRecord>("/audit?limit=100", signal);
  const items = arrayValue(payload.items).map((entry) => {
    const item = record(entry);
    return {
      id: stringValue(item.audit_id),
      actor: stringValue(item.actor_id_safe, stringValue(item.actor_type, "Hệ thống")),
      action: stringValue(item.action, "Đọc dữ liệu"),
      resource: [
        stringValue(item.resource_type, "Hệ thống"),
        stringValue(item.resource_id_hash),
      ].filter(Boolean).join(" · "),
      ...(item.metadata_safe ? { detail: JSON.stringify(item.metadata_safe) } : {}),
      createdAt: stringValue(item.occurred_at, stringValue(item.created_at)),
      ...(typeof item.result === "string" ? { result: item.result } : {}),
    };
  });
  return {
    items,
    total: numberValue(payload.total, items.length),
    nextCursor: typeof payload.next_cursor === "string" ? payload.next_cursor : null,
  };
}
