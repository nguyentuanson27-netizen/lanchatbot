import { describe, expect, it } from "vitest";
import {
  nextReviewArtifactId,
  policyQuickViewQuery,
  renderPolicyListTable,
  renderReviewDrawer,
} from "./policy-control-ui.js";
import type { PolicyArtifactRow, PolicyReviewContext } from "./policy-control-review-api.js";
import type { Identity, PolicyArtifact } from "./types.js";

const identity: Identity = {
  email: "owner@example.com",
  name: "Owner",
  role: "OWNER",
  pageScope: ["page-1"],
  canControl: true,
  historyEnabled: true,
  controlPageIds: ["page-1"],
  policyControl: true,
  policyPageIds: ["page-1"],
  policyCanaryShadowEnabled: true,
  policyCanaryLiveEnabled: false,
  policyPublishEnabled: false,
  productMediaUpload: false,
};

function artifact(
  id: string,
  lifecycle: PolicyArtifact["lifecycle"],
  kind: PolicyArtifact["kind"] = "SHOP_POLICY",
): PolicyArtifact {
  return {
    id,
    key: `${kind.toLowerCase()}:${id}`,
    kind,
    version: 1,
    lifecycle,
    revision: 3,
    contentHash: "sha256:test",
    content: kind === "SIZE_CHART"
      ? { kind: "SIZE_CHART", chart: { bands: [{ size: "M", ranges: [] }] } }
      : { kind: "SHOP_POLICY", shipping: { eta: "2-3 ngày" } },
    updatedBy: "owner",
    updatedAt: "2026-08-08T08:00:00.000Z",
  };
}

function context(item: PolicyArtifact): PolicyReviewContext {
  return {
    artifact: item,
    previousVersion: null,
    activePointers: [],
    rollbackCandidates: [],
  };
}

describe("policy phase1 table", () => {
  it("renders a compact table without phase2 bulk-selection controls", () => {
    const rows: PolicyArtifactRow[] = [{ ...artifact("a", "DRAFT"), active: false }];
    const html = renderPolicyListTable(rows);
    expect(html).toContain("policy-list-table");
    expect(html).toContain("Revision");
    expect(html).not.toContain("checkbox");
    expect(html).not.toContain("data-policy-bulk");
  });

  it("keeps quick-view semantics deterministic", () => {
    expect(policyQuickViewQuery("review")).toEqual({
      lifecycle: "VALIDATED",
      active: "any",
      sort: "validated_oldest",
    });
    expect(policyQuickViewQuery("running")).toEqual({
      lifecycle: undefined,
      active: "active",
      sort: "updated_desc",
    });
  });

  it("moves approve-and-next only among validated rows", () => {
    const items = [
      artifact("draft", "DRAFT"),
      artifact("one", "VALIDATED"),
      artifact("approved", "APPROVED"),
      artifact("two", "VALIDATED"),
    ];
    expect(nextReviewArtifactId(items, "one")).toBe("two");
    expect(nextReviewArtifactId(items, "two")).toBe("one");
  });
});

describe("policy phase1 drawer", () => {
  it("disables page-scoped actions until a concrete page is selected", () => {
    const html = renderReviewDrawer(context(artifact("approved", "APPROVED")), {
      ...identity,
      policyCanaryLiveEnabled: true,
      policyPublishEnabled: true,
    }, null);
    expect(html).toContain("Chưa chọn");
    expect(html).toMatch(/data-policy-drawer-action="START_CANARY"[^>]*disabled/u);
  });

  it("keeps SIZE_CHART on generic read-only content in phase1", () => {
    const html = renderReviewDrawer(context(artifact("size", "VALIDATED", "SIZE_CHART")), identity, "page-1");
    expect(html).toContain("SIZE_CHART");
    expect(html).not.toContain("policy-size-chart");
  });
});