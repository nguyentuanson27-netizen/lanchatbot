import { ApiError } from "./api.js";
import type {
  PolicyBatchItem,
  PolicyBatchResult,
  PolicyListPage,
  PolicyListQuery,
} from "./policy-control-review-api.js";
import type {
  Identity,
  PolicyArtifact,
  PolicyControlData,
  PolicyLifecycle,
} from "./types.js";

export interface PolicyBatchSnapshotItem extends PolicyBatchItem {
  readonly lifecycle: PolicyLifecycle;
}

export interface PolicyBatchRecovery {
  readonly recoveredIds: readonly string[];
  readonly retryableIds: readonly string[];
  readonly manualIds: readonly string[];
  readonly currentArtifacts: readonly PolicyArtifact[];
  readonly details: readonly string[];
}

export type PolicyBatchExecution =
  | { readonly kind: "result"; readonly result: PolicyBatchResult }
  | { readonly kind: "recovery"; readonly recovery: PolicyBatchRecovery };

export function policyPageChoices(
  identity: Identity,
  data: PolicyControlData,
  directoryPageIds: readonly string[] = [],
): string[] {
  const configured = concretePageIds(identity.policyPageIds);
  const scoped = concretePageIds(identity.pageScope);
  const scopeAll = identity.pageScope.includes("ALL");
  if (configured.length > 0) {
    return scopeAll ? configured : configured.filter((pageId) => scoped.includes(pageId));
  }
  if (!identity.policyPageIds.includes("ALL")) return [];
  const pointerPages = data.pointers
    .map((pointer) => pointer.pageId)
    .filter((pageId): pageId is string => isConcretePageId(pageId))
    .filter((pageId) => scopeAll || scoped.includes(pageId));
  if (scopeAll) {
    return [...new Set([...concretePageIds(directoryPageIds), ...pointerPages])];
  }
  return [...new Set([...scoped, ...pointerPages])];
}

export function resolvePolicyPageContext(
  choices: readonly string[],
  requested: string | null | undefined,
): string | null {
  if (requested && choices.includes(requested)) return requested;
  return choices.length === 1 ? choices[0]! : null;
}

export function createLatestPolicyListLoader(
  load: (query: PolicyListQuery, signal?: AbortSignal) => Promise<PolicyListPage>,
): (query: PolicyListQuery) => Promise<PolicyListPage | null> {
  let generation = 0;
  let controller: AbortController | null = null;
  return async (query) => {
    controller?.abort();
    const requestGeneration = ++generation;
    const requestController = new AbortController();
    controller = requestController;
    try {
      const page = await load(query, requestController.signal);
      if (requestGeneration !== generation || requestController.signal.aborted) return null;
      return page;
    } catch (error) {
      if (requestGeneration !== generation || requestController.signal.aborted) return null;
      throw error;
    } finally {
      if (requestGeneration === generation) controller = null;
    }
  };
}

export async function executePolicyBatchWithRecovery(
  action: "VALIDATE" | "APPROVE",
  snapshot: readonly PolicyBatchSnapshotItem[],
  transition: (
    action: "VALIDATE" | "APPROVE",
    items: readonly PolicyBatchItem[],
  ) => Promise<PolicyBatchResult>,
  getArtifact: (versionId: string) => Promise<PolicyArtifact>,
): Promise<PolicyBatchExecution> {
  try {
    return { kind: "result", result: await transition(action, snapshot) };
  } catch (error) {
    if (!isAmbiguousTransportFailure(error)) throw error;
    return {
      kind: "recovery",
      recovery: await reconcilePolicyBatchSnapshot(action, snapshot, getArtifact),
    };
  }
}

export async function reconcilePolicyBatchSnapshot(
  action: "VALIDATE" | "APPROVE",
  snapshot: readonly PolicyBatchSnapshotItem[],
  getArtifact: (versionId: string) => Promise<PolicyArtifact>,
): Promise<PolicyBatchRecovery> {
  const targetLifecycle: PolicyLifecycle = action === "VALIDATE" ? "VALIDATED" : "APPROVED";
  const recoveredIds: string[] = [];
  const retryableIds: string[] = [];
  const manualIds: string[] = [];
  const currentArtifacts: PolicyArtifact[] = [];
  const details: string[] = [];
  const reconciled = await Promise.all(snapshot.map(async (item) => {
    try {
      return { item, current: await getArtifact(item.versionId) };
    } catch {
      return { item, current: null };
    }
  }));

  for (const entry of reconciled) {
    if (entry.current) currentArtifacts.push(entry.current);
    if (
      entry.current?.lifecycle === targetLifecycle &&
      entry.current.revision > entry.item.expectedRevision
    ) {
      recoveredIds.push(entry.item.versionId);
      details.push(`${entry.item.versionId}: đã hoàn tất trước khi mất phản hồi`);
    } else if (
      entry.current?.lifecycle === entry.item.lifecycle &&
      entry.current.revision === entry.item.expectedRevision
    ) {
      retryableIds.push(entry.item.versionId);
      details.push(`${entry.item.versionId}: chưa thay đổi, có thể chọn gửi lại`);
    } else {
      manualIds.push(entry.item.versionId);
      details.push(`${entry.item.versionId}: trạng thái đã đổi hoặc không đọc được, cần xem lại thủ công`);
    }
  }

  return { recoveredIds, retryableIds, manualIds, currentArtifacts, details };
}

function concretePageIds(values: readonly string[]): string[] {
  return [...new Set(values.filter(isConcretePageId))];
}

function isConcretePageId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value !== "ALL";
}

function isAmbiguousTransportFailure(error: unknown): boolean {
  return error instanceof TypeError || error instanceof ApiError && error.status >= 500;
}
