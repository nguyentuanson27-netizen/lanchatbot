import { describe, expect, it } from "vitest";
import type { Df13CommerceAuthorityFenceAssessment } from "./df13-commerce-authority-fence.js";
import {
  dispatchDf13CommerceAuthorityFence,
  type Df13CommerceFenceProvider,
} from "./df13-commerce-fence-dispatcher.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

const request = Object.freeze({
  pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
  channel: DF13_COMMERCE_PREPROD_SCOPE_V1.channel,
  workId: "commerce-batch-1",
  inboxIds: Object.freeze([
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
  ]),
  consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  authority: Object.freeze({
    salesAuthorityMode: "COMMERCE" as const,
    stateReadMode: "LEGACY" as const,
    modeVersionId: "10000000-0000-4000-8000-000000000006",
    contentHash: `sha256:${"c".repeat(64)}`,
    pointerRevision: 6,
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    source: "DATABASE" as const,
  }),
});

const commerceAssessment: Df13CommerceAuthorityFenceAssessment = Object.freeze({
  status: "COMMERCE_FENCE_REQUIRED",
  request,
});

function provider(overrides: Partial<Df13CommerceFenceProvider> = {}): Df13CommerceFenceProvider {
  return {
    async acquire() {
      return {
        status: "HELD",
        lease: Object.freeze({ fenceToken: "fresh-token", epoch: 3 }),
      };
    },
    ...overrides,
  };
}

describe("DF13 Commerce fence admission dispatcher", () => {
  it("leaves the current LEGACY path untouched without contacting the fence provider", async () => {
    let acquired = false;
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: { status: "LEGACY_ADMITTED" },
      provider: provider({
        async acquire() {
          acquired = true;
          return { status: "PARKED", reasonCode: "unexpected" };
        },
      }),
    });

    expect(result).toEqual({ status: "LEGACY_ADMITTED" });
    expect(acquired).toBe(false);
  });

  it("does not acquire a consumer lease when Commerce admission is deterministically blocked", async () => {
    let acquired = false;
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: {
        status: "BLOCKED",
        blockId: "df13-block-test",
        reasonCode: "DF13_FENCE_SCOPE_INVALID",
      },
      provider: provider({
        async acquire() {
          acquired = true;
          return { status: "PARKED", reasonCode: "unexpected" };
        },
      }),
    });

    expect(result).toEqual({
      status: "BLOCKED",
      blockId: "df13-block-test",
      reasonCode: "DF13_FENCE_SCOPE_INVALID",
    });
    expect(acquired).toBe(false);
  });

  it("returns a held immutable request without exposing a side-effect callback or completion ACK", async () => {
    let acquiredRequest: unknown = null;
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async acquire(value) {
          acquiredRequest = value;
          return {
            status: "HELD",
            lease: Object.freeze({ fenceToken: "fresh-token", epoch: 3 }),
          };
        },
      }),
    });

    expect(result).toEqual({
      status: "COMMERCE_HELD",
      request,
      lease: { fenceToken: "fresh-token", epoch: 3 },
    });
    expect(acquiredRequest).toBe(request);
  });

  it("parks the full request without consuming work when any Inbox ID overlaps a live lease", async () => {
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async acquire() {
          return { status: "PARKED", reasonCode: "DF13_FENCE_OVERLAPPING_LEASE" };
        },
      }),
    });

    expect(result).toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_OVERLAPPING_LEASE",
    });
  });

  it("parks an unavailable provider without retrying, dead-lettering, or publishing", async () => {
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async acquire() { throw new Error("provider unavailable"); },
      }),
    });

    expect(result).toEqual({ status: "PARKED", reasonCode: "DF13_FENCE_PROVIDER_UNAVAILABLE" });
  });

  it("recognizes a completed replay without attempting authority-dependent work", async () => {
    const replay = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async acquire() {
          return { status: "ALREADY_COMPLETED", epoch: 3 };
        },
      }),
    });

    expect(replay).toEqual({ status: "COMMERCE_ALREADY_COMPLETED", epoch: 3 });
  });
});
