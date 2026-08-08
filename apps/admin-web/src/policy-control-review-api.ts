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

type JsonRecord = Record<string, unknown>;

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

async function policyRequest(path: string, signal?: AbortSignal): Promise<JsonRecord> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
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
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function revisionValue(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^(?:0|[1-9]\d*)$/u.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  throw new Error("Invalid policy revision value");
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
    default:
      return "Không thể tải hoặc cập nhật chính sách.";
  }
}
