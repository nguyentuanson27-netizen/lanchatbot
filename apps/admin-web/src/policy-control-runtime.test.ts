import { describe, expect, it } from "vitest";
import {
  createLatestPolicyListLoader,
  executePolicyBatchWithRecovery,
  policyPageChoices,
  resolvePolicyPageContext,
} from "./policy-control-runtime.js";
import { renderReviewDrawer } from "./policy-control-ui.js";
import type { PolicyListPage, PolicyListQuery } from "./policy-control-review-api.js";
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
  lifecycle: PolicyArtifact["lifecycle"],
  revision = 1,
): PolicyArtifact {
  return {
    id,
    key: `size-chart:${id}`,
    kind: "SIZE_CHART",
    version: 1,
    lifecycle,
    revision,
    contentHash: "sha256:test",
    content: { kind: "SIZE_CHART" },
    updatedBy: "owner",
    updatedAt: "2026-08-08T00:00:00.000Z",
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
    pending[0]!.resolve({ items: [{ ...artifact("old", "DRAFT"), active: false }], nextCursor: null });
    await expect(first).resolves.toBeNull();

    pending[1]!.resolve({ items: [{ ...artifact("new", "DRAFT"), active: false }], nextCursor: null });
    await expect(second).resolves.toEqual({
      items: [{ ...artifact("new", "DRAFT"), active: false }],
      nextCursor: null,
    });
  });
});

describe("policy page action context", () => {
  it("requires an explicit page when multiple policy pages are available", () => {
    const choices = policyPageChoices(identity, emptyData);
    expect(choices).toEqual(["page-1", "page-2"]);
    expect(resolvePolicyPageContext(choices, null)).toBeNull();
    expect(resolvePolicyPageContext(choices, "page-2")).toBe("page-2");
    expect(resolvePolicyPageContext(choices, "ALL")).toBeNull();
  });

  it("never exposes ALL as a concrete page id and can use scoped pages when policy capability is ALL", () => {
    const choices = policyPageChoices({
      ...identity,
      policyPageIds: ["ALL"],
      pageScope: ["page-a", "page-b"],
    }, emptyData);
    expect(choices).toEqual(["page-a", "page-b"]);
    expect(choices).not.toContain("ALL");
  });

  it("disables page-scoped drawer actions until a concrete page is selected", () => {
    const html = renderReviewDrawer({
      artifact: artifact("approved", "APPROVED"),
      previousVersion: null,
      activePointers: [],
      rollbackCandidates: [],
    }, identity, null);
    expect(html).toContain("Page thao tác");
    expect(html).toContain("Chưa chọn");
    expect(html).toMatch(/data-policy-drawer-action="START_CANARY"[^>]*disabled/u);
  });
});

describe("ambiguous batch recovery", () => {
  it("reconciles before retry and never replays the full batch automatically", async () => {
    const snapshot = [
      { versionId: "done", expectedRevision: 1, lifecycle: "DRAFT" as const },
      { versionId: "retry", expectedRevision: 1, lifecycle: "DRAFT" as const },
      { versionId: "manual", expectedRevision: 1, lifecycle: "DRAFT" as const },
      { versionId: "missing", expectedRevision: 1, lifecycle: "DRAFT" as const },
    ];
    let transitionCalls = 0;
    const transition = async () => {
      transitionCalls += 1;
      throw new TypeError("transport lost after server processing");
    };
    const getArtifact = async (versionId: string): Promise<PolicyArtifact> => {
      if (versionId === "done") return artifact("done", "VALIDATED", 2);
      if (versionId === "retry") return artifact("retry", "DRAFT", 1);
      if (versionId === "manual") return artifact("manual", "DRAFT", 2);
      throw new Error("not readable");
    };

    const outcome = await executePolicyBatchWithRecovery(
      "VALIDATE",
      snapshot,
      transition,
      getArtifact,
    );

    expect(transitionCalls).toBe(1);
    expect(outcome.kind).toBe("recovery");
    if (outcome.kind !== "recovery") throw new Error("expected recovery");
    expect(outcome.recovery.recoveredIds).toEqual(["done"]);
    expect(outcome.recovery.retryableIds).toEqual(["retry"]);
    expect(outcome.recovery.manualIds).toEqual(["manual", "missing"]);
    expect(outcome.recovery.currentArtifacts.map((item) => item.id)).toEqual([
      "done",
      "retry",
      "manual",
    ]);
  });
});
