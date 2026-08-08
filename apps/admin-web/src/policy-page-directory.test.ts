import { afterEach, describe, expect, it, vi } from "vitest";
import { listPolicyPageIds } from "./policy-control-review-api.js";
import { renderPolicyControl } from "./policy-control-ui.js";
import type { Identity, PolicyControlData } from "./types.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const allPagesIdentity: Identity = {
  email: "owner@example.com",
  name: "Owner",
  role: "OWNER",
  pageScope: ["ALL"],
  canControl: true,
  historyEnabled: true,
  controlPageIds: ["ALL"],
  policyControl: true,
  policyPageIds: ["ALL"],
  policyCanaryShadowEnabled: true,
  policyCanaryLiveEnabled: true,
  policyPublishEnabled: true,
  productMediaUpload: false,
};

const data: PolicyControlData = {
  artifacts: [{
    id: "version-1",
    key: "size-chart:SQ603",
    kind: "SIZE_CHART",
    version: 1,
    lifecycle: "APPROVED",
    revision: 1,
    contentHash: "sha256:test",
    content: { kind: "SIZE_CHART" },
    updatedBy: "owner",
    updatedAt: "2026-08-08T00:00:00.000Z",
  }],
  pointers: [],
  simulations: [],
};

describe("policy page directory", () => {
  it("loads concrete identity-scoped page ids and drops sentinel or duplicate values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      items: [
        { page_id: "page-a" },
        { page_id: "page-b" },
        { page_id: "page-a" },
        { page_id: "ALL" },
        { page_id: null },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPolicyPageIds()).resolves.toEqual(["page-a", "page-b"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/admin/v1/pages");
  });

  it("fails closed while ALL/ALL page context waits for the concrete directory", () => {
    const html = renderPolicyControl(data, allPagesIdentity);
    expect(html).toContain("Đang tải page…");
    expect(html).toMatch(/data-policy-page-select[^>]*disabled/u);
    expect(html).toMatch(/data-policy-simulate[^>]*disabled/u);
    expect(html).not.toContain('<option value="ALL"');
  });
});
