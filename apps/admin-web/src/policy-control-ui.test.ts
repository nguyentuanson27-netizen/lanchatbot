import { describe, expect, it } from "vitest";
import {
  createPolicyBulkSelectionStore,
  nextReviewArtifactId,
  policyBatchSelection,
  policyBulkActionEligibility,
  policyQuickViewQuery,
  reconcilePolicyBulkSelection,
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
    deletionEligible: true,
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
  it("keeps all lifecycle rows selectable while batch eligibility stays fail-safe", () => {
    const html = renderPolicyListTable([
      row("draft", "DRAFT"),
      row("validated", "VALIDATED"),
      row("approved", "APPROVED"),
      row("canary", "CANARY"),
      row("published", "PUBLISHED"),
    ], new Set(["approved", "canary", "published"]));
    expect(html).toContain('data-policy-select-page');
    expect(html).toMatch(/data-policy-select="approved"[^>]*checked/u);
    expect(html).toMatch(/data-policy-select="canary"[^>]*checked/u);
    expect(html).toMatch(/data-policy-select="published"[^>]*checked/u);
    expect(html).not.toMatch(/data-policy-select="approved"[^>]*disabled/u);
    expect(html).not.toMatch(/data-policy-select="canary"[^>]*disabled/u);
    expect(html).not.toMatch(/data-policy-select="published"[^>]*disabled/u);
  });

  it("retains still-visible selections after a policy-list refresh", () => {
    const refreshed = reconcilePolicyBulkSelection(
      new Set(["approved", "canary", "published", "removed"]),
      [row("approved", "APPROVED"), row("canary", "CANARY"), row("published", "PUBLISHED")],
    );
    expect(refreshed).toEqual(new Set(["approved", "canary", "published"]));
  });

  it("preserves selection only while the policy list context is unchanged", () => {
    const selection = createPolicyBulkSelectionStore();
    selection.begin("owner@example.com|#/policy?lifecycle=APPROVED");
    selection.selectedIds.add("approved");

    selection.begin("owner@example.com|#/policy?lifecycle=CANARY");

    expect(selection.selectedIds).toEqual(new Set());
  });

  it("ignores a stale policy-list binding after the screen rebinds", () => {
    const selection = createPolicyBulkSelectionStore();
    const firstBinding = selection.begin("owner@example.com|#/policy?active=inactive");
    selection.selectedIds.add("old-selection");

    const currentBinding = selection.begin("owner@example.com|#/policy?active=inactive");
    selection.selectedIds.clear();
    selection.selectedIds.add("current-selection");

    expect(selection.reconcile(firstBinding, [row("old-selection", "APPROVED")])).toBe(false);
    expect(selection.selectedIds).toEqual(new Set(["current-selection"]));
    expect(selection.reconcile(currentBinding, [row("current-selection", "CANARY")])).toBe(true);
    expect(selection.selectedIds).toEqual(new Set(["current-selection"]));
  });

  it("keeps an in-flight bulk operation locked across a policy-screen rebind", () => {
    const selection = createPolicyBulkSelectionStore();
    const contextKey = "owner@example.com|#/policy?active=inactive";
    const firstBinding = selection.begin(contextKey);
    selection.selectedIds.add("approved-selection");
    const batch = selection.startBatch(firstBinding);

    expect(batch).not.toBeNull();

    const reboundBinding = selection.begin(contextKey);

    expect(selection.selectedIds).toEqual(new Set(["approved-selection"]));
    expect(selection.batchInFlight).toBe(true);
    expect(selection.startBatch(reboundBinding)).toBeNull();
    expect(selection.finishBatch(batch!)).toBe(true);
    expect(selection.batchInFlight).toBe(false);
    expect(selection.startBatch(reboundBinding)).not.toBeNull();
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
    const nonBatchItems = [row("approved", "APPROVED"), row("canary", "CANARY"), row("published", "PUBLISHED")];
    expect(policyBulkActionEligibility(nonBatchItems, new Set(["approved", "canary", "published"]))).toEqual({
      selectedCount: 3,
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
        schemaVersion: 1,
        kind: "SIZE_CHART",
        scope: {
          level: "COMPONENT",
          parentProductIds: ["SD398"],
          categories: ["Đầm"],
          componentRole: "DRESS",
          forms: ["Ôm"],
          materials: ["Lụa"],
        },
        extraction: {
          measurementBasis: "BODY",
          confidence: 0.97,
          extractorVersion: "size-extractor-v2",
        },
        sourceMetadata: {
          source: "IMAGE_EXTRACTION",
          sourceReference: "asset:size-chart:SD398",
          sourceVersion: "v2",
          observedAt: "2026-08-09T00:00:00.000Z",
        },
        chart: {
          schemaVersion: 1,
          reference: {
            chartId: "size-chart:SD398",
            version: "v2",
            source: "IMAGE_EXTRACTION",
            sourceArtifactRef: "asset:size-chart:SD398",
            sourceContentSha256: "a".repeat(64),
            verificationStatus: "VERIFIED",
            verifiedByRef: "owner-1",
            verifiedAt: "2026-08-09T00:05:00.000Z",
          },
          brand: "La.na",
          category: "Đầm",
          componentRole: "DRESS",
          boundaryPolicy: "REQUIRE_HUMAN_REVIEW",
          bands: [{
            size: "M",
            note: "Ưu tiên hỏi thêm khi sát biên.",
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
    expect(html).toContain("COMPONENT");
    expect(html).toContain("SD398");
    expect(html).toContain("BODY");
    expect(html).toContain("size-extractor-v2");
    expect(html).toContain("VERIFIED");
    expect(html).toContain("REQUIRE_HUMAN_REVIEW");
    expect(html).toContain("Ưu tiên hỏi thêm khi sát biên.");
    expect(html).not.toContain("chart › bands[0]");
    expect(html).not.toContain("HEIGHT_CM");
  });

  it("offers pointer deactivation separately from safe artifact deletion", () => {
    const published = artifact("published", "PUBLISHED");
    const activeContext = {
      ...context(published),
      deletionEligible: false,
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

  it("does not offer deletion when an active pointer exists outside the visible scope", () => {
    const hiddenActiveContext = {
      ...context(artifact("published", "PUBLISHED")),
      activePointers: [],
      deletionEligible: false,
    };
    const html = renderReviewDrawer(hiddenActiveContext, identity, "page-1");
    expect(html).not.toContain("Xóa khỏi danh sách");
    expect(html).toContain("đang được kích hoạt trên page khác");
  });
});
