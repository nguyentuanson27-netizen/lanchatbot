import type {
  PolicyListPage,
  PolicyListQuery,
  PolicyReviewContext,
} from "./policy-control-review-api.js";
import type { Identity, PolicyControlData } from "./types.js";

export interface LatestPolicyReviewLoader {
  load(versionId: string): Promise<PolicyReviewContext | null>;
  cancel(): void;
}

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

export function createLatestPolicyReviewLoader(
  load: (versionId: string, signal?: AbortSignal) => Promise<PolicyReviewContext>,
): LatestPolicyReviewLoader {
  let generation = 0;
  let controller: AbortController | null = null;
  const cancel = () => {
    generation += 1;
    controller?.abort();
    controller = null;
  };
  return {
    async load(versionId) {
      controller?.abort();
      const requestGeneration = ++generation;
      const requestController = new AbortController();
      controller = requestController;
      try {
        const context = await load(versionId, requestController.signal);
        if (requestGeneration !== generation || requestController.signal.aborted) return null;
        return context;
      } catch (error) {
        if (requestGeneration !== generation || requestController.signal.aborted) return null;
        throw error;
      } finally {
        if (requestGeneration === generation) controller = null;
      }
    },
    cancel,
  };
}

function concretePageIds(values: readonly string[]): string[] {
  return [...new Set(values.filter(isConcretePageId))];
}

function isConcretePageId(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0 && value !== "ALL";
}
