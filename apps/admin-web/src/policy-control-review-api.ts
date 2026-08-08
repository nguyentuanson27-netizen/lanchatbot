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
  readonly lifecycle?: PolicyLifecycle;
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

type JsonRecord = Record<string, unknown>;

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
  const payload = await policyRequest(`/policy/artifacts?${params.toString()}`, signal);
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
    `/policy/artifacts/${encodeURIComponent(versionId)}/review-context`,
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
  const payload = await policyRequest("/policy/artifacts/batch-transitions", signal, {
    method: "POST",
    body: {
      action,
      items: items.map((item) => ({
        version_id: item.versionId,
        expected_revision: item.expectedRevision,
      })),
    },
  });
  const summary = record(payload.summary);
  return {
    requestId: stringValue(payload.request_id),
    action: payload.action === "APPROVE" ? "APPROVE" : "VALIDATE",
    results: arrayValue(payload.results).map((value): PolicyBatchResultItem => {
      const result = record(value);
      return {
        versionId: stringValue(result.version_id),
        ok: result.ok === true,
        ...(result.artifact ? { artifact: normalizeArtifact(record(result.artifact)) } : {}),
        ...(typeof result.error_code === "string" ? { errorCode: result.error_code } : {}),
        ...(typeof result.current_revision === "number"
          ? { currentRevision: result.current_revision }
          : {}),
      };
    }),
    summary: {
      total: numberValue(summary.total),
      succeeded: numberValue(summary.succeeded),
      failed: numberValue(summary.failed),
    },
  };
}

async function policyRequest(
  path: string,
  signal?: AbortSignal,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
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

function normalizeArtifact(item: JsonRecord): PolicyArtifact {
  return {
    id: stringValue(item.version_id),
    key: stringValue(item.artifact_key),
    kind: stringValue(item.artifact_kind) as PolicyArtifactKind,
    version: numberValue(item.version_number),
    lifecycle: stringValue(item.lifecycle) as PolicyLifecycle,
    revision: numberValue(item.revision),
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
    revision: numberValue(item.revision),
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
