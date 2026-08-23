import { describe, expect, it } from "vitest";
import type {
  Df13CommerceFenceAcquireResult,
  Df13CommerceFenceCompletionResult,
  Df13CommerceFenceLease as DatabaseFenceLease,
  Df13CommerceFenceStoreRequest,
} from "@lana/database";
import {
  PostgresDf13CommerceFenceProvider,
  type Df13CommerceFenceStorePort,
} from "./df13-commerce-fence-postgres-provider.js";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1, DF13_COMMERCE_AUTHORITY_CONSUMERS_V1 } from "./df13-commerce-authority-bundle.js";
import type { Df13CommerceFenceRequest } from "./df13-commerce-authority-fence.js";

const request: Df13CommerceFenceRequest = Object.freeze({
  pageId: "1198992073286645",
  channel: "MESSENGER",
  workId: "commerce-batch-1",
  inboxIds: Object.freeze([
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
  ]),
  consumers: DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
  authority: Object.freeze({
    salesAuthorityMode: "COMMERCE",
    stateReadMode: "LEGACY",
    modeVersionId: "10000000-0000-4000-8000-000000000006",
    contentHash: `sha256:${"c".repeat(64)}`,
    pointerRevision: 6,
    authorityBundleHash: DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash,
    source: "DATABASE",
  }),
});

function store(overrides: Partial<Df13CommerceFenceStorePort> = {}): Df13CommerceFenceStorePort {
  return {
    async acquire(): Promise<Df13CommerceFenceAcquireResult> {
      return { status: "HELD", lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 } };
    },
    async complete(): Promise<Df13CommerceFenceCompletionResult> {
      return { status: "COMPLETED" };
    },
    ...overrides,
  };
}

describe("Postgres DF13 Commerce fence provider adapter", () => {
  it("preserves every re-derived fence identity field for the durable store", async () => {
    let received: Df13CommerceFenceStoreRequest | undefined;
    const provider = new PostgresDf13CommerceFenceProvider(store({
      async acquire(value) {
        received = value;
        return { status: "HELD", lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 } };
      },
    }));

    await expect(provider.acquire(request)).resolves.toEqual({
      status: "HELD",
      lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 },
    });
    expect(received).toEqual({
      pageId: request.pageId,
      channel: request.channel,
      workId: request.workId,
      inboxIds: request.inboxIds,
      authority: request.authority,
    });
  });

  it("rejects an incomplete consumer bundle before the store can acquire a lease", async () => {
    let acquired = false;
    const provider = new PostgresDf13CommerceFenceProvider(store({
      async acquire() {
        acquired = true;
        return { status: "PARKED", reasonCode: "unexpected" };
      },
    }));

    await expect(provider.acquire({
      ...request,
      consumers: request.consumers.slice(1),
    })).resolves.toEqual({ status: "PARKED", reasonCode: "DF13_FENCE_BUNDLE_INVALID" });
    expect(acquired).toBe(false);
  });

  it("does not let a direct caller bypass the reviewed pre-production page scope", async () => {
    let acquired = false;
    const provider = new PostgresDf13CommerceFenceProvider(store({
      async acquire() {
        acquired = true;
        return { status: "PARKED", reasonCode: "unexpected" };
      },
    }));

    await expect(provider.acquire({ ...request, pageId: "unreviewed-page" })).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_FENCE_SCOPE_INVALID",
    });
    expect(acquired).toBe(false);
  });

  it("binds completion to the identical canonical request and opaque lease", async () => {
    let completed: { request: Df13CommerceFenceStoreRequest; lease: DatabaseFenceLease } | undefined;
    const provider = new PostgresDf13CommerceFenceProvider(store({
      async complete(value) {
        completed = value;
        return { status: "COMPLETED" };
      },
    }));
    const lease = Object.freeze({ fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 });

    await expect(provider.complete({ request, lease })).resolves.toEqual({ status: "COMPLETED" });
    expect(completed).toEqual({
      request: {
        pageId: request.pageId,
        channel: request.channel,
        workId: request.workId,
        inboxIds: request.inboxIds,
        authority: request.authority,
      },
      lease,
    });
  });
});
