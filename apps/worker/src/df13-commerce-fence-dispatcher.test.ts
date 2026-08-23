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
    async complete() {
      return { status: "COMPLETED" };
    },
    ...overrides,
  };
}

describe("DF13 all-or-nothing Commerce fence dispatcher", () => {
  it("leaves the current LEGACY path untouched without contacting the fence provider", async () => {
    let acquired = false;
    let executed = false;
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: { status: "LEGACY_ADMITTED" },
      provider: provider({
        async acquire() {
          acquired = true;
          return { status: "PARKED", reasonCode: "unexpected" };
        },
      }),
      async execute() {
        executed = true;
        return { status: "COMMITTED" };
      },
    });

    expect(result).toEqual({ status: "LEGACY_ADMITTED" });
    expect(acquired).toBe(false);
    expect(executed).toBe(false);
  });

  it("does not invoke a consumer when Commerce admission is deterministically blocked", async () => {
    let acquired = false;
    let executed = false;
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
      async execute() {
        executed = true;
        return { status: "COMMITTED" };
      },
    });

    expect(result).toEqual({
      status: "BLOCKED",
      blockId: "df13-block-test",
      reasonCode: "DF13_FENCE_SCOPE_INVALID",
    });
    expect(acquired).toBe(false);
    expect(executed).toBe(false);
  });

  it("dispatches only after one lease atomically covers the full immutable request", async () => {
    let acquiredRequest: unknown = null;
    let executedContext: unknown = null;
    let completedLease: unknown = null;
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
        async complete(value) {
          completedLease = value;
          return { status: "COMPLETED" };
        },
      }),
      async execute(context) {
        executedContext = context;
        return { status: "COMMITTED" };
      },
    });

    expect(result).toEqual({ status: "COMMERCE_COMPLETED", epoch: 3 });
    expect(acquiredRequest).toBe(request);
    expect(executedContext).toEqual({ request, lease: { fenceToken: "fresh-token", epoch: 3 } });
    expect(completedLease).toEqual({ request, lease: { fenceToken: "fresh-token", epoch: 3 } });
  });

  it("parks the full request without consuming work when any Inbox ID overlaps a live lease", async () => {
    let executed = false;
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async acquire() {
          return { status: "PARKED", reasonCode: "DF13_FENCE_OVERLAPPING_LEASE" };
        },
      }),
      async execute() {
        executed = true;
        return { status: "COMMITTED" };
      },
    });

    expect(result).toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_OVERLAPPING_LEASE",
    });
    expect(executed).toBe(false);
  });

  it("parks an interrupted consumer without completing, retrying, dead-lettering, or publishing", async () => {
    let completed = false;
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async complete() {
          completed = true;
          return { status: "COMPLETED" };
        },
      }),
      async execute() {
        throw new Error("consumer crashed");
      },
    });

    expect(result).toEqual({ status: "PARKED", reasonCode: "DF13_CONSUMER_EXECUTION_UNAVAILABLE" });
    expect(completed).toBe(false);
  });

  it("does not replay a consumer after a lost completion acknowledgement", async () => {
    let executions = 0;
    const lostAcknowledgement = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async complete() {
          return { status: "ACK_LOST" };
        },
      }),
      async execute() {
        executions += 1;
        return { status: "COMMITTED" };
      },
    });
    const replay = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async acquire() {
          return { status: "ALREADY_COMPLETED", epoch: 3 };
        },
      }),
      async execute() {
        executions += 1;
        return { status: "COMMITTED" };
      },
    });

    expect(lostAcknowledgement).toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_COMPLETION_ACK_LOST",
    });
    expect(replay).toEqual({ status: "COMMERCE_ALREADY_COMPLETED", epoch: 3 });
    expect(executions).toBe(1);
  });

  it("rejects a stale completion acknowledgement without resuming authority-dependent work", async () => {
    const result = await dispatchDf13CommerceAuthorityFence({
      assessment: commerceAssessment,
      provider: provider({
        async complete() {
          return { status: "STALE" };
        },
      }),
      async execute() {
        return { status: "COMMITTED" };
      },
    });

    expect(result).toEqual({ status: "PARKED", reasonCode: "DF13_FENCE_COMPLETION_STALE" });
  });
});
