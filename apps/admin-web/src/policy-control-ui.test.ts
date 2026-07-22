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
  it("keeps shadow available and clearly disables live canary and publish by default", () => {
    const html = renderPolicyControl(data, identity);
    expect(html).toContain('data-canary-mode="SHADOW"');
    expect(html).toContain('data-policy-feature-disabled="CANARY_LIVE" disabled');
    expect(html).toContain('data-policy-feature-disabled="PUBLISHED" disabled');
    expect(html).toContain("Canary gửi thật: khóa");
    expect(html).toContain("Phát hành: khóa");
    expect(html).not.toContain('data-canary-mode="LIVE_OUTBOUND"');
    expect(html).not.toContain('data-policy-action="PUBLISH"');
  });

  it("renders live canary and publish actions only when the server advertises both flags", () => {
    const html = renderPolicyControl(data, {
      ...identity,
      policyCanaryLiveEnabled: true,
      policyPublishEnabled: true,
    });
    expect(html).toContain('data-canary-mode="LIVE_OUTBOUND"');
    expect(html).toContain('data-policy-action="PUBLISH"');
    expect(html).not.toContain("data-policy-feature-disabled");
  });

  it("keeps guarded retire and rollback recovery controls available", () => {
    const previous = { ...artifact("PUBLISHED", 1), key: "lana.policy.published" };
    const current = { ...artifact("PUBLISHED", 2), key: "lana.policy.published" };
    const html = renderPolicyControl({
      artifacts: [previous, current],
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
    expect(html).toContain(`data-policy-rollback="${previous.id}"`);
    expect(html).toContain('data-policy-action="RETIRE"');
  });

  it("offers pre-publish rollback only between canary versions", () => {
    const previous = { ...artifact("CANARY", 1), key: "lana.policy.canary" };
    const current = { ...artifact("CANARY", 2), key: "lana.policy.canary" };
    const published = { ...artifact("PUBLISHED", 3), key: "lana.policy.canary" };
    const html = renderPolicyControl({
      artifacts: [previous, current, published],
      pointers: [{
        id: "pointer-shadow",
        key: current.key,
        kind: current.kind,
        pageId: "1198992073286645",
        channel: "CANARY_SHADOW",
        versionId: current.id,
        version: current.version,
        revision: 2,
        updatedAt: "2026-07-22T08:00:00.000Z",
      }],
      simulations: [],
    }, identity);
    expect(html).toContain(`data-policy-rollback="${previous.id}"`);
    expect(html).not.toContain(`data-policy-rollback="${published.id}"`);
    expect(html).toContain('data-policy-feature-disabled="CANARY_LIVE" disabled');

    const enabledHtml = renderPolicyControl({
      artifacts: [previous, current, published],
      pointers: [{
        id: "pointer-shadow",
        key: current.key,
        kind: current.kind,
        pageId: "1198992073286645",
        channel: "CANARY_SHADOW",
        versionId: current.id,
        version: current.version,
        revision: 2,
        updatedAt: "2026-07-22T08:00:00.000Z",
      }],
      simulations: [],
    }, { ...identity, policyCanaryLiveEnabled: true });
    expect(enabledHtml).toContain("Chuyển sang canary gửi thật");
    expect(enabledHtml).toContain('data-canary-mode="LIVE_OUTBOUND"');
  });
});
