import { describe, expect, it } from "vitest";
import { renderPolicyControl } from "./policy-control-ui.js";
import type { Identity, PolicyArtifact, PolicyControlData } from "./types.js";

const identity: Identity = {
  email: "owner@example.com",
  name: "Owner",
  role: "OWNER",
  pageScope: ["1198992073286645"],
  canControl: true,
  historyEnabled: true,
  controlPageIds: ["1198992073286645"],
  policyControl: true,
  policyPageIds: ["1198992073286645"],
  policyCanaryShadowEnabled: true,
  policyCanaryLiveEnabled: false,
  policyPublishEnabled: false,
  productMediaUpload: false,
};

function artifact(lifecycle: PolicyArtifact["lifecycle"], version: number): PolicyArtifact {
  return {
    id: `version-${version}`,
    key: `lana.policy.${lifecycle.toLowerCase()}`,
    kind: "SHOP_POLICY",
    version,
    lifecycle,
    revision: 1,
    contentHash: "sha256:test",
    content: { kind: "SHOP_POLICY" },
    updatedBy: "owner",
    updatedAt: "2026-07-22T08:00:00.000Z",
  };
}

const data: PolicyControlData = {
  artifacts: [artifact("APPROVED", 1), artifact("CANARY", 2)],
  pointers: [],
  simulations: [],
};

describe("policy lifecycle safety UI", () => {
  it("keeps the existing canary/publish gate state visible while list actions stay review-oriented", () => {
    const html = renderPolicyControl(data, identity);
    expect(html).toContain("Shadow canary: bật");
    expect(html).toContain("Canary gửi thật: khóa");
    expect(html).toContain("Phát hành: khóa");
    expect(html).toContain('data-policy-view="review"');
    expect(html).toContain('data-policy-view="draft"');
    expect(html).toContain('data-policy-bulk-action="VALIDATE"');
    expect(html).toContain('data-policy-bulk-action="APPROVE"');
    expect(html).not.toContain('data-policy-bulk-action="PUBLISH"');
    expect(html).not.toContain('data-policy-bulk-action="START_CANARY"');
  });

  it("reflects server-advertised lifecycle gates without enabling risky bulk actions", () => {
    const html = renderPolicyControl(data, {
      ...identity,
      policyCanaryLiveEnabled: true,
      policyPublishEnabled: true,
    });
    expect(html).toContain("Canary gửi thật: bật");
    expect(html).toContain("Phát hành: bật");
    expect(html).not.toContain('data-policy-bulk-action="PUBLISH"');
    expect(html).not.toContain('data-policy-bulk-action="START_CANARY"');
  });

  it("keeps the active-pointer table for existing rollback/simulation context", () => {
    const current = { ...artifact("PUBLISHED", 2), key: "lana.policy.published" };
    const html = renderPolicyControl({
      artifacts: [current],
      pointers: [{
        id: "pointer-1",
        key: current.key,
        kind: current.kind,
        pageId: "1198992073286645",
        channel: "PUBLISHED",
        versionId: current.id,
        version: current.version,
        revision: 4,
        updatedAt: "2026-07-22T08:00:00.000Z",
      }],
      simulations: [],
    }, identity);
    expect(html).toContain("Con trỏ đang hoạt động");
    expect(html).toContain("1198992073286645");
    expect(html).toContain("PUBLISHED");
  });
});
