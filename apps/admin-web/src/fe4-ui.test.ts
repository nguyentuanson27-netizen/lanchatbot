import { describe, expect, it } from "vitest";
import { renderAdsFunnel, renderMediaPipeline } from "./fe4-ui.js";

describe("FE4 views", () => {
  it("shows funnel denominators, period comparison and analytics-only no-response cohorts", () => {
    const html = renderAdsFunnel({
      lookbackHours: 168,
      stages: [{
        key: "qualified", label: "Lead đủ điều kiện", count: 4, denominator: 8,
        rate: 50, previousCount: 2, previousRate: 25,
      }],
      noResponse1h: 3,
      noResponse24h: 2,
      breakdowns: [{
        key: "product", title: "Theo sản phẩm",
        items: [{ label: "CB182", adEntries: 8, qualified: 4, purchaseConfirmed: 1 }],
      }],
      generatedAt: "2026-07-30T06:00:00.000Z",
    });
    expect(html).toContain("Mẫu số");
    expect(html).toContain("+25 điểm % so với kỳ trước");
    expect(html).toContain("Chỉ số analytics, không outbound");
    expect(html).toContain("4 / 8");
  });

  it("escapes media data and only renders retry for backend-approved rows", () => {
    const html = renderMediaPipeline({
      counts: { ERROR: 1 },
      items: [{
        intakeId: "a".repeat(32),
        maSp: "<script>alert(1)</script>",
        brand: "La.na Design",
        imageUrl: "",
        imageHash: "deadbeefcafebabe",
        imageId: null,
        stage: "ERROR",
        reviewStatus: null,
        duplicateChecksum: false,
        retryable: true,
        lastAttemptAt: null,
        error: "timeout <private>",
      }],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Thử lại an toàn");
    expect(html).toContain("Upload không ghi thẳng Qdrant");
  });
});
