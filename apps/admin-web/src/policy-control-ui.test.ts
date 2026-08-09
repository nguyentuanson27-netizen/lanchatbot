import { describe, expect, it } from "vitest";
import {
  nextReviewArtifactId,
  policyBatchSelection,
  policyBulkActionEligibility,
  policyQuickViewQuery,
  policyRowNavigationIndex,
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

function row(id: string, lifecycle: PolicyArtifact["lifecycle"]): PolicyArtifactRow {
  return { ...artifact(id, lifecycle), active: false };
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

  it("focuses the first row on the first J press when no row is focused", () => {
    expect(policyRowNavigationIndex(3, -1, "j")).toBe(0);
    expect(policyRowNavigationIndex(3, 0, "j")).toBe(1);
    expect(policyRowNavigationIndex(3, 2, "j")).toBe(2);
  });
});

describe("policy phase2 bulk review", () => {
  it("renders current-page selection only for DRAFT and VALIDATED rows", () => {
    const html = renderPolicyListTable([
      row("draft", "DRAFT"),
      row("validated", "VALIDATED"),
      row("approved", "APPROVED"),
    ], new Set(["draft"]));
    expect(html).toContain('data-policy-select-page');
    expect(html).toMatch(/data-policy-select="draft"[^>]*checked/u);
    expect(html).toContain('data-policy-select="validated"');
    expect(html).toMatch(/data-policy-select="approved"[^>]*disabled/u);
  });

  it("enables exactly one safe bulk transition for a homogeneous selection", () => {
    const items = [row("draft-a", "DRAFT"), row("draft-b", "DRAFT"), row("validated", "VALIDATED")];
    expect(policyBulkActionEligibility(items, new Set(["draft-a", "draft-b"]))).toEqual({
      selectedCount: 2,
      canValidate: true,
      canApprove: false,
    });
    expect(policyBulkActionEligibility(items, new Set(["validated"]))).toEqual({
      selectedCount: 1,
      canValidate: false,
      canApprove: true,
    });
    expect(policyBulkActionEligibility(items, new Set(["draft-a", "validated"]))).toEqual({
      selectedCount: 2,
      canValidate: false,
      canApprove: false,
    });
  });

  it("builds a request snapshot in current-page order with revision guards", () => {
    const items = [row("a", "DRAFT"), row("b", "DRAFT"), row("c", "VALIDATED")];
    expect(policyBatchSelection(items, new Set(["b", "a"]), "VALIDATE")).toEqual([
      { versionId: "a", expectedRevision: 3, lifecycle: "DRAFT" },
      { versionId: "b", expectedRevision: 3, lifecycle: "DRAFT" },
    ]);
    expect(() => policyBatchSelection(items, new Set(["a", "c"]), "VALIDATE")).toThrow(
      "Selection is not eligible for VALIDATE",
    );
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

  it("renders SIZE_CHART as a concise Vietnamese measurement table", () => {
    const item: PolicyArtifact = {
      ...artifact("size", "VALIDATED", "SIZE_CHART"),
      content: {
        kind: "SIZE_CHART",
        chart: {
          bands: [{
            size: "M",
            ranges: [
              { kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 165 },
              { kind: "WEIGHT_KG", minInclusive: 48, maxInclusive: 54 },
              { kind: "BUST_CM", minInclusive: 84, maxInclusive: 88 },
            ],
          }],
        },
      },
    };
    const html = renderReviewDrawer(context(item), identity, "page-1");
    expect(html).toContain("Chiều cao");
    expect(html).toContain("Cân nặng");
    expect(html).toContain("Vòng ngực");
    expect(html).toContain("155–165 cm");
    expect(html).not.toContain("chart › bands[0]");
    expect(html).not.toContain("HEIGHT_CM");
  });

  it("offers pointer deactivation separately from safe artifact deletion", () => {
    const published = artifact("published", "PUBLISHED");
    const activeContext = {
      ...context(published),
      activePointers: [{
        id: "pointer-1",
        key: published.key,
        kind: published.kind,
        pageId: "page-1",
        channel: "PUBLISHED" as const,
        versionId: published.id,
        version: published.version,
        revision: 8,
        updatedAt: published.updatedAt,
      }],
    };
    const activeHtml = renderReviewDrawer(activeContext, identity, "page-1");
    expect(activeHtml).toContain("Ngừng kích hoạt");
    expect(activeHtml).not.toContain("Xóa khỏi danh sách");

    const inactiveHtml = renderReviewDrawer(context(published), identity, "page-1");
    expect(inactiveHtml).toContain("Xóa khỏi danh sách");
  });
});
