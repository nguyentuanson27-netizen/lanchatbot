import { describe, expect, it } from "vitest";
import {
  bulkActionForSelection,
  nextReviewArtifactId,
  policyQuickViewQuery,
  renderPolicyListTable,
  renderReviewDrawer,
  renderSizeChartReview,
} from "./policy-control-ui.js";
import type { PolicyReviewContext } from "./policy-control-review-api.js";
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
  kind: PolicyArtifact["kind"] = "SIZE_CHART",
): PolicyArtifact {
  return {
    id,
    key: `size-chart:${id}`,
    kind,
    version: 3,
    lifecycle,
    revision: 5,
    contentHash: "sha256:test",
    content: { schemaVersion: 1, kind },
    updatedBy: "owner",
    updatedAt: "2026-08-08T00:00:00.000Z",
  };
}

describe("policy review quick views", () => {
  it("maps quick views to visible server-query semantics", () => {
    expect(policyQuickViewQuery("review")).toEqual({
      lifecycle: "VALIDATED",
      active: "any",
      sort: "validated_oldest",
    });
    expect(policyQuickViewQuery("draft")).toEqual({
      lifecycle: "DRAFT",
      active: "any",
      sort: "updated_desc",
    });
    expect(policyQuickViewQuery("running")).toEqual({
      lifecycle: undefined,
      active: "active",
      sort: "updated_desc",
    });
  });
});

describe("policy bulk review", () => {
  it("only enables validate or approve when the whole current-page selection is eligible", () => {
    expect(bulkActionForSelection([artifact("a", "DRAFT"), artifact("b", "DRAFT")])).toBe("VALIDATE");
    expect(bulkActionForSelection([artifact("a", "VALIDATED"), artifact("b", "VALIDATED")])).toBe("APPROVE");
    expect(bulkActionForSelection([artifact("a", "DRAFT"), artifact("b", "VALIDATED")])).toBeNull();
    expect(bulkActionForSelection([artifact("a", "APPROVED")])).toBeNull();
  });

  it("renders current-page checkboxes without risky bulk transitions", () => {
    const html = renderPolicyListTable([
      { ...artifact("a", "DRAFT"), active: false },
      { ...artifact("b", "VALIDATED"), active: true },
    ]);
    expect(html).toContain('data-policy-select="a"');
    expect(html).toContain('data-policy-select="b"');
    expect(html).toContain("Chưa xác nhận");
    expect(html).toContain("Đã qua kiểm tra");
    expect(html).not.toContain("PUBLISH");
    expect(html).not.toContain("START_CANARY");
  });
});

describe("sequential policy review", () => {
  it("renders approve-and-next for a validated artifact", () => {
    const context: PolicyReviewContext = {
      artifact: artifact("b", "VALIDATED"),
      previousVersion: null,
      activePointers: [],
      rollbackCandidates: [],
    };
    const html = renderReviewDrawer(context, identity);
    expect(html).toContain('data-policy-approve-next');
    expect(html).toContain("Duyệt & sang mục tiếp theo");
  });

  it("chooses the next validated row and wraps within the current page", () => {
    const items = [
      artifact("a", "APPROVED"),
      artifact("b", "VALIDATED"),
      artifact("c", "VALIDATED"),
    ];
    expect(nextReviewArtifactId(items, "b")).toBe("c");
    expect(nextReviewArtifactId(items, "c")).toBe("b");
  });
});

describe("SIZE_CHART specialized read-only review", () => {
  it("renders canonical size bands by measurement kind", () => {
    const html = renderSizeChartReview({
      schemaVersion: 1,
      kind: "SIZE_CHART",
      chart: {
        schemaVersion: 1,
        brand: "La.na",
        category: "Dress",
        componentRole: "DRESS",
        boundaryPolicy: "PREFER_SMALLER_SIZE",
        reference: {
          chartId: "SQ603",
          version: "v1",
          source: "STRUCTURED_IMPORT",
          sourceArtifactRef: "sheet:SQ603",
          sourceContentSha256: "a".repeat(64),
          verificationStatus: "VERIFIED",
          verifiedByRef: "owner",
          verifiedAt: "2026-08-08T00:00:00.000Z",
        },
        bands: [{
          size: "M",
          ranges: [
            { kind: "HEIGHT_CM", minInclusive: 155, maxInclusive: 165 },
            { kind: "WEIGHT_KG", minInclusive: 48, maxInclusive: 55 },
            { kind: "BUST_CM", minInclusive: 82, maxInclusive: 88 },
          ],
          note: "Form chuẩn",
        }],
      },
      sourceMetadata: {
        source: "ADMIN",
        sourceReference: "sheet:SQ603",
        sourceVersion: "v1",
        observedAt: "2026-08-08T00:00:00.000Z",
      },
    });
    expect(html).toContain("Chiều cao");
    expect(html).toContain("Cân nặng");
    expect(html).toContain("Vòng ngực");
    expect(html).toContain("155–165");
    expect(html).toContain("48–55");
    expect(html).toContain("Form chuẩn");
  });

  it("falls back instead of inventing columns for malformed or unmapped content", () => {
    const html = renderSizeChartReview({ kind: "SIZE_CHART", chart: { bands: "bad" } });
    expect(html).toContain("Không thể hiển thị bảng size chuyên dụng");
  });
});
