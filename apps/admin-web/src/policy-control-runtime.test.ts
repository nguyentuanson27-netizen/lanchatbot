import { describe, expect, it } from "vitest";
import {
  createLatestPolicyListLoader,
  createLatestPolicyReviewLoader,
  policyPageChoices,
  resolvePolicyPageContext,
} from "./policy-control-runtime.js";
import type {
  PolicyListPage,
  PolicyListQuery,
  PolicyReviewContext,
} from "./policy-control-review-api.js";
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

function artifact(id: string): PolicyArtifact {
  return {
    id,
    key: `policy:${id}`,
    kind: "SHOP_POLICY",
    version: 1,
    lifecycle: "VALIDATED",
    revision: 1,
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
  };
}

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