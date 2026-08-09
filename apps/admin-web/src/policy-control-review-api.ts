import "./policy-control-route-sync.js";
import { ApiError } from "./api.js";
import type {
  PolicyArtifact,
  PolicyArtifactKind,
  PolicyLifecycle,
  PolicyPointer,
} from "./types.js";

const API_BASE = (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined) ?? "/admin/v1";

export type PolicyListSort = "updated_desc" | "validated_oldest" | "artifact_key_asc";
export type PolicyActiveFilter = "any" | "active" | "inactive";

export interface PolicyListQuery {
  readonly limit?: number;
  readonly cursor?: string;
  readonly search?: string;
  readonly artifactKind?: PolicyArtifactKind;
  readonly lifecycle?: PolicyLifecycle | undefined;
  readonly version?: number | undefined;
  readonly revision?: number | undefined;
  readonly active?: PolicyActiveFilter;
  readonly sort?: PolicyListSort;
}

export interface PolicyArtifactRow extends PolicyArtifact {
  readonly active: boolean;
}

export interface PolicyListPage {
  readonly items: PolicyArtifactRow[];
  readonly nextCursor: string | null;
}

export interface PolicyRollbackCandidate {
  readonly pointer: PolicyPointer;
  readonly targetVersion: PolicyArtifact;
}

export interface PolicyReviewContext {
  readonly artifact: PolicyArtifact;
  readonly previousVersion: PolicyArtifact | null;
  readonly activePointers: PolicyPointer[];
  readonly rollbackCandidates: PolicyRollbackCandidate[];
}

export interface PolicyBatchItem {
  readonly versionId: string;
  readonly expectedRevision: number;
}

export interface PolicyBatchResultItem {
  readonly versionId: string;
  readonly ok: boolean;
  readonly artifact?: PolicyArtifact;
  readonly errorCode?: string;
  readonly currentRevision?: number;
}

export interface PolicyBatchResult {
  readonly requestId: string;
  readonly action: "VALIDATE" | "APPROVE";
  readonly results: PolicyBatchResultItem[];
  readonly summary: { total: number; succeeded: number; failed: number };
}

export class PolicyBatchResponseError extends TypeError {
  constructor() {
    super("Invalid policy batch response");
    this.name = "PolicyBatchResponseError";
  }
}

type JsonRecord = Record<string, unknown>;

const POLICY_ARTIFACT_KINDS = new Set<PolicyArtifactKind>([
  "SHOP_POLICY",
  "OFFER_POLICY",
  "CLOSING_STRATEGY",
  "SIZE_CHART",
  "HANDOFF_MATRIX",
  "PAYMENT_POLICY",
]);

export async function listPolicyPageIds(signal?: AbortSignal): Promise<string[]> {
  const payload = await policyRequest("/pages", signal);
  return [...new Set(
    arrayValue(payload.items)
      .map((value) => stringValue(record(value).page_id))
      .filter((pageId) => pageId.length > 0 && pageId !== "ALL"),
  )];
}

export async function listPolicyArtifacts(
  query: PolicyListQuery,
  signal?: AbortSignal,
): Promise<PolicyListPage> {
  const params = new URLSearchParams({ limit: String(query.limit ?? 50) });
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.search) params.set("search", query.search);
  if (query.artifactKind) params.set("artifact_kind", query.artifactKind);
  if (query.lifecycle) params.set("lifecycle", query.lifecycle);
  if (query.version !== undefined) params.set("version", String(query.version));
  if (query.revision !== undefined) params.set("revision", String(query.revision));
  if (query.active && query.active !== "any") params.set("active", query.active);
  if (query.sort) params.set("sort", query.sort);
  const payload = await policyRequest(`/policy/review-artifacts?${params.toString()}`, signal);
  return {
    items: arrayValue(payload.items).map((value) => {
      const item = record(value);
      return { ...normalizeArtifact(item), active: item.is_active === true };
    }),
    nextCursor: typeof payload.next_cursor === "string" ? payload.next_cursor : null,
  };
}

export async function getPolicyArtifact(
  versionId: string,
  signal?: AbortSignal,
): Promise<PolicyArtifact> {
  const payload = await policyRequest(`/policy/artifacts/${encodeURIComponent(versionId)}`, signal);
  return normalizeArtifact(record(payload.artifact));
}

export async function getPolicyReviewContext(
  versionId: string,
  signal?: AbortSignal,
): Promise<PolicyReviewContext> {
  const payload = await policyRequest(
    `/policy/review-artifacts/${encodeURIComponent(versionId)}/context`,
    signal,
  );
  const context = record(payload.review_context);
  return {
    artifact: normalizeArtifact(record(context.artifact)),
    previousVersion: context.previous_version == null
      ? null
      : normalizeArtifact(record(context.previous_version)),
    activePointers: arrayValue(context.active_pointers).map(normalizePointer),
    rollbackCandidates: arrayValue(context.rollback_candidates).map((value) => {
      const candidate = record(value);
      return {
        pointer: normalizePointer(record(candidate.pointer)),
        targetVersion: normalizeArtifact(record(candidate.target_version)),
      };
    }),
  };
}

export async function batchTransitionPolicyArtifacts(
  action: "VALIDATE" | "APPROVE",
  items: readonly PolicyBatchItem[],
  signal?: AbortSignal,
): Promise<PolicyBatchResult> {
  const payload = await policyRequest("/policy/review-artifacts/batch-transitions", signal, {
    method: "POST",
    body: {
      action,
      items: items.map((item) => ({
        version_id: item.versionId,
        expected_revision: item.expectedRevision,
      })),
    },
  });
  return parsePolicyBatchResult(payload, action, items);
}

export async function deactivatePolicyPointer(
  pointerId: string,
  expectedRevision: number,
  signal?: AbortSignal,
): Promise<JsonRecord> {
  const payload = await policyRequest(`/policy/pointers/${encodeURIComponent(pointerId)}`, signal, {
    method: "DELETE",
    body: { expected_revision: expectedRevision },
  });
  return record(payload.pointer);
}

export async function deletePolicyArtifact(
  versionId: string,
  expectedRevision: number,
  signal?: AbortSignal,
): Promise<JsonRecord> {
  const payload = await policyRequest(`/policy/review-artifacts/${encodeURIComponent(versionId)}`, signal, {
    method: "DELETE",
    body: { expected_revision: expectedRevision },
  });
  return record(payload.deletion);
}

async function policyRequest(
  path: string,
  signal?: AbortSignal,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<JsonRecord> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    ...(signal ? { signal } : {}),
  });
  const payload = record(await response.json().catch(() => ({})));
  if (!response.ok) {
    const code = stringValue(payload.code);
    throw new ApiError(
      policyErrorMessage(code),
      response.status,
      stringValue(payload.request_id) || response.headers.get("x-request-id") || undefined,
      code || undefined,
    );
  }
  return payload;
}

function parsePolicyBatchResult(
  payload: JsonRecord,
  expectedAction: "VALIDATE" | "APPROVE",
  expectedItems: readonly PolicyBatchItem[],
): PolicyBatchResult {
  try {
    return parsePolicyBatchResultShape(payload, expectedAction, expectedItems);
  } catch (error) {
    if (error instanceof PolicyBatchResponseError) throw error;
    throw new PolicyBatchResponseError();
  }
}

function parsePolicyBatchResultShape(
  payload: JsonRecord,
  expectedAction: "VALIDATE" | "APPROVE",
  expectedItems: readonly PolicyBatchItem[],
): PolicyBatchResult {
  const requestId = nonEmptyString(payload.request_id);
  if (!requestId || payload.action !== expectedAction || !Array.isArray(payload.results)) {
    throw new PolicyBatchResponseError();
  }
  if (payload.results.length !== expectedItems.length) throw new PolicyBatchResponseError();

  const targetLifecycle: PolicyLifecycle = expectedAction === "VALIDATE" ? "VALIDATED" : "APPROVED";
  const results = payload.results.map((value, index): PolicyBatchResultItem => {
    const result = strictRecord(value);
    const expected = expectedItems[index];
    if (!result || !expected || result.version_id !== expected.versionId || typeof result.ok !== "boolean") {
      throw new PolicyBatchResponseError();
    }

    if (result.ok) {
      if (hasOwn(result, "error_code") || hasOwn(result, "current_revision")) {
        throw new PolicyBatchResponseError();
      }
      return {
        versionId: expected.versionId,
        ok: true,
        artifact: parseBatchSuccessArtifact(
          result.artifact,
          expected.versionId,
          targetLifecycle,
          expected.expectedRevision,
        ),
      };
    }

    if (hasOwn(result, "artifact")) throw new PolicyBatchResponseError();
    const errorCode = nonEmptyString(result.error_code);
    if (!errorCode) throw new PolicyBatchResponseError();
    const hasCurrentRevision = hasOwn(result, "current_revision");
    const currentRevision = hasCurrentRevision
      ? requiredBatchRevision(result.current_revision)
      : null;
    if (errorCode === "ADMIN_ARTIFACT_VERSION_CONFLICT" && currentRevision === null) {
      throw new PolicyBatchResponseError();
    }
    return {
      versionId: expected.versionId,
      ok: false,
      errorCode,
      ...(currentRevision === null ? {} : { currentRevision }),
    };
  });

  const summary = strictRecord(payload.summary);
  if (!summary) throw new PolicyBatchResponseError();
  const total = requiredCount(summary.total);
  const succeeded = requiredCount(summary.succeeded);
  const failed = requiredCount(summary.failed);
  const actualSucceeded = results.filter((result) => result.ok).length;
  if (
    total !== expectedItems.length ||
    succeeded !== actualSucceeded ||
    failed !== results.length - actualSucceeded ||
    total !== succeeded + failed
  ) {
    throw new PolicyBatchResponseError();
  }

  return {
    requestId,
    action: expectedAction,
    results,
    summary: { total, succeeded, failed },
  };
}

function parseBatchSuccessArtifact(
  value: unknown,
  expectedVersionId: string,
  targetLifecycle: PolicyLifecycle,
  expectedRevision: number,
): PolicyArtifact {
  const item = strictRecord(value);
  const id = item ? nonEmptyString(item.version_id) : null;
  const key = item ? nonEmptyString(item.artifact_key) : null;
  const kind = item ? policyArtifactKindValue(item.artifact_kind) : null;
  const version = item ? positiveSafeInteger(item.version_number) : null;
  const revision = item ? requiredBatchRevision(item.revision) : null;
  const expectedNextRevision = expectedRevision + 1;
  const contentHash = item ? nonEmptyString(item.content_hash) : null;
  const content = item ? strictRecord(item.content) : null;
  const updatedBy = item && typeof item.updated_by_subject === "string"
    ? item.updated_by_subject
    : null;
  const updatedAt = item ? validTimestampString(item.updated_at) : null;
  if (
    !item ||
    id !== expectedVersionId ||
    !key ||
    !kind ||
    version === null ||
    item.lifecycle !== targetLifecycle ||
    revision === null ||
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    !Number.isSafeInteger(expectedNextRevision) ||
    revision !== expectedNextRevision ||
    !contentHash ||
    !content ||
    updatedBy === null ||
    !updatedAt
  ) {
    throw new PolicyBatchResponseError();
  }
  return {
    id,
    key,
    kind,
    version,
    lifecycle: targetLifecycle,
    revision,
    contentHash,
    content,
    updatedBy,
    updatedAt,
  };
}

function normalizeArtifact(item: JsonRecord): PolicyArtifact {
  return {
    id: stringValue(item.version_id),
    key: stringValue(item.artifact_key),
    kind: stringValue(item.artifact_kind) as PolicyArtifactKind,
    version: numberValue(item.version_number),
    lifecycle: stringValue(item.lifecycle) as PolicyLifecycle,
    revision: revisionValue(item.revision),
    contentHash: stringValue(item.content_hash),
    content: record(item.content),
    updatedBy: stringValue(item.updated_by_subject),
    updatedAt: stringValue(item.updated_at),
  };
}

function normalizePointer(value: unknown): PolicyPointer {
  const item = record(value);
  return {
    id: stringValue(item.pointer_id),
    key: stringValue(item.artifact_key),
    kind: stringValue(item.artifact_kind) as PolicyArtifactKind,
    pageId: typeof item.page_id === "string" ? item.page_id : null,
    channel: stringValue(item.channel) as PolicyPointer["channel"],
    versionId: stringValue(item.version_id),
    version: numberValue(item.version_number),
    revision: revisionValue(item.revision),
    updatedAt: stringValue(item.updated_at),
  };
}

function record(value: unknown): JsonRecord {
  return strictRecord(value) ?? {};
}

function strictRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function positiveSafeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function policyArtifactKindValue(value: unknown): PolicyArtifactKind | null {
  return typeof value === "string" && POLICY_ARTIFACT_KINDS.has(value as PolicyArtifactKind)
    ? value as PolicyArtifactKind
    : null;
}

function validTimestampString(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function hasOwn(recordValue: JsonRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(recordValue, key);
}

function requiredCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new PolicyBatchResponseError();
  }
  return value;
}

function requiredBatchRevision(value: unknown): number {
  const revision = optionalRevisionValue(value);
  if (revision === null) throw new PolicyBatchResponseError();
  return revision;
}

function optionalRevisionValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function revisionValue(value: unknown): number {
  const revision = optionalRevisionValue(value);
  if (revision === null) throw new Error("Invalid policy revision value");
  return revision;
}

function policyErrorMessage(code: string): string {
  switch (code) {
    case "ADMIN_ARTIFACT_VERSION_CONFLICT":
      return "Phiên bản đã thay đổi. Hãy tải lại trước khi thử lại.";
    case "ADMIN_POLICY_FORBIDDEN":
      return "Bạn không có quyền thực hiện thao tác chính sách này.";
    case "ADMIN_POLICY_CURSOR_INVALID":
      return "Trang dữ liệu đã hết hiệu lực. Hãy tải lại danh sách.";
    case "ADMIN_POLICY_SORT_INVALID":
      return "Kiểu sắp xếp không hợp lệ với bộ lọc hiện tại.";
    case "ADMIN_ARTIFACT_DELETE_ACTIVE":
      return "Phiên bản vẫn đang được kích hoạt. Hãy ngừng kích hoạt trước khi xóa khỏi danh sách.";
    default:
      return "Không thể tải hoặc cập nhật chính sách.";
  }
}
