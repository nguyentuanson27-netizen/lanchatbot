import { describe, expect, it } from "vitest";
import type { RuntimeBehaviorModeResolution } from "@lana/chat-runtime";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE } from "./df13-commerce-authority-bundle.js";
import {
  DF13_AUTHORITY_INDEPENDENT_BYPASS_CLASSES_V1,
  assessDf13CommerceAuthorityFence,
} from "./df13-commerce-authority-fence.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

const pageId = DF13_COMMERCE_PREPROD_SCOPE_V1.pageId;

function resolution(
  authorityProvenance: RuntimeBehaviorModeResolution["authorityProvenance"],
  overrides: Partial<RuntimeBehaviorModeResolution> = {},
): RuntimeBehaviorModeResolution {
  const commerce = authorityProvenance === "COMMERCE_POINTER";
  return {
    confirmationMode: "V2_ACTIVE",
    salesAuthorityMode: commerce ? "COMMERCE" : "LEGACY",
    stateReadMode: "LEGACY",
    authorityBundleHash: commerce
      ? DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash
      : null,
    modeVersionId: commerce
      ? "10000000-0000-4000-8000-000000000006"
      : null,
    contentHash: commerce ? `sha256:${"c".repeat(64)}` : null,
    pointerRevision: commerce ? 6 : null,
    source: commerce ? "DATABASE" : "FAIL_SAFE",
    status: commerce ? "RESOLVED" : "FALLBACK",
    reasonCodes: [],
    pointerUpdatedAt: commerce ? "2026-08-23T00:00:00.000Z" : null,
    resolvedAt: "2026-08-23T00:00:00.000Z",
    propagationMs: 0,
    auditWrite: commerce ? "RECORDED" : "NOT_CONFIGURED",
    authorityProvenance,
    ...overrides,
  };
}

describe("DF13 pure Commerce fence admission", () => {
  it("admits every non-COMMERCE provenance before validating prospective fence scope", () => {
    const provenances = ["LEGACY_POINTER", "STARTUP_DEFAULT", "UNKNOWN"] as const;
    const inboxSets = [
      [],
      ["duplicate", "duplicate"],
      Array.from({ length: 101 }, (_value, index) => `inbox-${index}`),
    ];

    for (const authorityProvenance of provenances) {
      for (const inboxIds of inboxSets) {
        expect(assessDf13CommerceAuthorityFence({
          pageId: "",
          channel: "",
          workId: "",
          inboxIds,
          resolution: resolution(authorityProvenance),
        })).toEqual({ status: "LEGACY_ADMITTED" });
      }
    }
  });

  it("requires a durable fence for the exact canonical COMMERCE identity", () => {
    expect(assessDf13CommerceAuthorityFence({
      pageId,
      channel: "MESSENGER",
      workId: "batch-1",
      inboxIds: ["inbox-b", "inbox-a"],
      resolution: resolution("COMMERCE_POINTER"),
    })).toMatchObject({
      status: "COMMERCE_FENCE_REQUIRED",
      request: {
        pageId,
        channel: "MESSENGER",
        workId: "batch-1",
        inboxIds: ["inbox-a", "inbox-b"],
        consumers: DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.authorityDependentConsumers,
        authority: {
          source: "DATABASE",
          authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_ACTIVE.contractHash,
        },
      },
    });
  });

  it("blocks a positively identified but unusable COMMERCE pointer", () => {
    expect(assessDf13CommerceAuthorityFence({
      pageId,
      channel: "MESSENGER",
      workId: "batch-1",
      inboxIds: ["inbox-1"],
      resolution: resolution("COMMERCE_POINTER", {
        source: "LAST_KNOWN_GOOD",
        status: "FALLBACK",
      }),
    })).toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_COMMERCE_IDENTITY_NOT_FRESH_RESOLVED",
    });
  });

  it("blocks invalid COMMERCE scope with a deterministic durable block id", () => {
    const input = {
      pageId,
      channel: "MESSENGER",
      workId: "batch-1",
      inboxIds: ["inbox-1", "inbox-1"],
      resolution: resolution("COMMERCE_POINTER"),
    } as const;

    const first = assessDf13CommerceAuthorityFence(input);
    const second = assessDf13CommerceAuthorityFence(input);
    expect(first).toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_FENCE_SCOPE_INVALID",
    });
    expect(first).toEqual(second);
    expect(first).toHaveProperty("blockId", expect.stringMatching(/^df13-block-[a-f0-9]{64}$/u));
  });

  it("uses one block identity for the same invalid inbox multiset in any order", () => {
    const first = assessDf13CommerceAuthorityFence({
      pageId,
      channel: "MESSENGER",
      workId: "batch-1",
      inboxIds: ["inbox-b", "inbox-a", "inbox-a"],
      resolution: resolution("COMMERCE_POINTER"),
    });
    const reordered = assessDf13CommerceAuthorityFence({
      pageId,
      channel: "MESSENGER",
      workId: "batch-1",
      inboxIds: ["inbox-a", "inbox-b", "inbox-a"],
      resolution: resolution("COMMERCE_POINTER"),
    });

    expect(first).toMatchObject({ status: "BLOCKED", reasonCode: "DF13_FENCE_SCOPE_INVALID" });
    expect(reordered).toEqual(first);
  });

  it("does not construct a COMMERCE fence request outside the exact PREPROD page", () => {
    expect(DF13_COMMERCE_PREPROD_SCOPE_V1.allowedCommercePageIds).toEqual([pageId]);
    expect(assessDf13CommerceAuthorityFence({
      pageId: "9999999999999999",
      channel: "MESSENGER",
      workId: "batch-1",
      inboxIds: ["inbox-1"],
      resolution: resolution("COMMERCE_POINTER"),
    })).toMatchObject({
      status: "BLOCKED",
      reasonCode: "DF13_FENCE_SCOPE_INVALID",
    });
  });

  it("declares no authority-independent bypass class", () => {
    expect(DF13_AUTHORITY_INDEPENDENT_BYPASS_CLASSES_V1).toEqual([]);
    expect(Object.isFrozen(DF13_AUTHORITY_INDEPENDENT_BYPASS_CLASSES_V1)).toBe(true);
  });
});
