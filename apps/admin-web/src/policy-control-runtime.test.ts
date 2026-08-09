import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api.js";
import {
  batchTransitionPolicyArtifacts,
  type PolicyListPage,
  type PolicyListQuery,
  type PolicyReviewContext,
} from "./policy-control-review-api.js";
import {
  createLatestPolicyListLoader,
  createLatestPolicyReviewLoader,
  executePolicyBatchWithRecovery,
  policyPageChoices,
  resolvePolicyPageContext,
} from "./policy-control-runtime.js";
import type { Identity, PolicyArtifact, PolicyControlData } from "./types.js";

const identity: Identity = {
  email: "owner@example.com",
  name: "Owner",
  role: "OWNER",
  pageScope: ["page-1", "page-2"],
  canControl: true,
  historyEnabled: true,
  controlPageIds: ["page-1", "page-2"],
  policyControl: true,
  policyPageIds: ["page-1", "page-2"],
  policyCanaryShadowEnabled: true,
  policyCanaryLiveEnabled: true,
  policyPublishEnabled: true,
  productMediaUpload: false,
};

const emptyData: PolicyControlData = { artifacts: [], pointers: [], simulations: [] };

function artifact(
  id: string,
  lifecycle: PolicyArtifact["lifecycle"] = "VALIDATED",
  revision = 1,
): PolicyArtifact {
  return {
    id,
    key: `policy:${id}`,
    kind: "SHOP_POLICY",
    version: 1,
    lifecycle,
    revision,
    contentHash: "sha256:test",
    content: { kind: "SHOP_POLICY" },
    updatedBy: "owner",
    updatedAt: "2026-08-08T00:00:00.000Z",
  };
}

function reviewContext(id: string): PolicyReviewContext {
  return {
    artifact: artifact(id),
    previousVersion: null,
    activePointers: [],
    rollbackCandidates: [],
    deletionEligible: true,
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("policy list latest-query loader", () => {
  it("drops a delayed stale response after a newer filter request starts", async () => {
    const pending: Array<{
      query: PolicyListQuery;
      signal?: AbortSignal;
      resolve: (page: PolicyListPage) => void;
    }> = [];
    const load = (query: PolicyListQuery, signal?: AbortSignal) => new Promise<PolicyListPage>((resolve) => {
      pending.push({ query, ...(signal ? { signal } : {}), resolve });
    });
    const latest = createLatestPolicyListLoader(load);

    const first = latest({ search: "old" });
    const second = latest({ search: "new" });

    expect(pending[0]?.signal?.aborted).toBe(true);
    pending[0]!.resolve({ items: [{ ...artifact("old"), active: false }], nextCursor: null });
    await expect(first).resolves.toBeNull();

    pending[1]!.resolve({ items: [{ ...artifact("new"), active: false }], nextCursor: null });
    await expect(second).resolves.toEqual({
      items: [{ ...artifact("new"), active: false }],
      nextCursor: null,
    });
  });
});

describe("policy review latest-detail loader", () => {
  it("aborts stale drawer requests so a late A response cannot replace B", async () => {
    const pending: Array<{
      id: string;
      signal?: AbortSignal;
      resolve: (context: PolicyReviewContext) => void;
    }> = [];
    const load = (id: string, signal?: AbortSignal) => new Promise<PolicyReviewContext>((resolve) => {
      pending.push({ id, ...(signal ? { signal } : {}), resolve });
    });
    const latest = createLatestPolicyReviewLoader(load);

    const first = latest.load("A");
    const second = latest.load("B");
    expect(pending[0]?.signal?.aborted).toBe(true);

    pending[1]!.resolve(reviewContext("B"));
    await expect(second).resolves.toEqual(reviewContext("B"));
    pending[0]!.resolve(reviewContext("A"));
    await expect(first).resolves.toBeNull();
  });

  it("invalidates the active request when the drawer closes", async () => {
    const pending: Array<{
      signal?: AbortSignal;
      resolve: (context: PolicyReviewContext) => void;
    }> = [];
    const latest = createLatestPolicyReviewLoader((_id, signal) => new Promise<PolicyReviewContext>((resolve) => {
      pending.push({ ...(signal ? { signal } : {}), resolve });
    }));

    const request = latest.load("A");
    latest.cancel();
    expect(pending[0]?.signal?.aborted).toBe(true);
    pending[0]!.resolve(reviewContext("A"));
    await expect(request).resolves.toBeNull();
  });
});

describe("policy page action context", () => {
  it("requires explicit choice when multiple concrete policy pages are available", () => {
    const choices = policyPageChoices(identity, emptyData);
    expect(choices).toEqual(["page-1", "page-2"]);
    expect(resolvePolicyPageContext(choices, null)).toBeNull();
    expect(resolvePolicyPageContext(choices, "page-2")).toBe("page-2");
  });

  it("intersects configured pages with identity page scope", () => {
    expect(policyPageChoices({ ...identity, pageScope: ["page-2"] }, emptyData)).toEqual(["page-2"]);
  });

  it("never exposes ALL and hydrates ALL/ALL from the concrete page directory", () => {
    const choices = policyPageChoices({
      ...identity,
      policyPageIds: ["ALL"],
      pageScope: ["ALL"],
    }, emptyData, ["page-a", "page-b", "ALL", "page-a"]);
    expect(choices).toEqual(["page-a", "page-b"]);
    expect(choices).not.toContain("ALL");
  });

  it("auto-selects exactly one concrete page", () => {
    expect(resolvePolicyPageContext(["page-only"], null)).toBe("page-only");
  });
});

describe("phase2 ambiguous batch recovery", () => {
  it("reconciles after a transport failure and never replays the full batch", async () => {
    const snapshot = [
      { versionId: "done", expectedRevision: 1, lifecycle: "DRAFT" as const },
      { versionId: "retry", expectedRevision: 1, lifecycle: "DRAFT" as const },
      { versionId: "manual", expectedRevision: 1, lifecycle: "DRAFT" as const },
    ];
    let transitionCalls = 0;
    const outcome = await executePolicyBatchWithRecovery(
      "VALIDATE",
      snapshot,
      async () => {
        transitionCalls += 1;
        throw new TypeError("connection lost after server processing");
      },
      async (id) => {
        if (id === "done") return artifact("done", "VALIDATED", 2);
        if (id === "retry") return artifact("retry", "DRAFT", 1);
        return artifact("manual", "DRAFT", 2);
      },
    );
    expect(transitionCalls).toBe(1);
    expect(outcome.kind).toBe("recovery");
    if (outcome.kind !== "recovery") throw new Error("expected recovery");
    expect(outcome.recovery.recoveredIds).toEqual(["done"]);
    expect(outcome.recovery.retryableIds).toEqual(["retry"]);
    expect(outcome.recovery.manualIds).toEqual(["manual"]);
  });

  it("treats 5xx as ambiguous but does not auto-retry a revision conflict", async () => {
    let transitionCalls = 0;
    const outcome = await executePolicyBatchWithRecovery(
      "APPROVE",
      [{ versionId: "retry", expectedRevision: 1, lifecycle: "VALIDATED" as const }],
      async () => {
        transitionCalls += 1;
        throw new ApiError("temporary", 503);
      },
      async () => artifact("retry", "VALIDATED", 1),
    );
    expect(transitionCalls).toBe(1);
    expect(outcome.kind).toBe("recovery");
  });

  it("reconciles a malformed success 200 instead of surfacing a generic parser error", async () => {
    const versionId = "018f1b72-0000-7000-8000-000000000301";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      request_id: "request-malformed-success",
      action: "APPROVE",
      results: [{
        version_id: versionId,
        ok: true,
        artifact: {
          version_id: versionId,
          artifact_key: `policy:${versionId}`,
          artifact_kind: "SHOP_POLICY",
          version_number: 1,
          lifecycle: "APPROVED",
          revision: "not-a-revision",
          content_hash: "sha256:test",
          content: { kind: "SHOP_POLICY" },
          updated_by_subject: "owner",
          updated_at: "2026-08-08T00:00:00.000Z",
        },
      }],
      summary: { total: 1, succeeded: 1, failed: 0 },
    })));

    const outcome = await executePolicyBatchWithRecovery(
      "APPROVE",
      [{ versionId, expectedRevision: 3, lifecycle: "VALIDATED" }],
      batchTransitionPolicyArtifacts,
      async () => artifact(versionId, "APPROVED", 4),
    );

    expect(outcome.kind).toBe("recovery");
    if (outcome.kind !== "recovery") throw new Error("expected recovery");
    expect(outcome.recovery.recoveredIds).toEqual([versionId]);
  });
});
