import { describe, expect, it } from "vitest";
import type {
  Df13CommerceFenceAcquireResult,
  Df13CommerceFenceCommitInput,
  Df13CommerceFenceCommitResult,
  Df13CommerceRuntimeCommitPort,
  Df13CommerceFenceStoreRequest,
  RealtimeCommitInput,
  RealtimeCommitResult,
} from "@lana/database";
import {
  PostgresDf13CommerceFenceBoundCommitter,
  PostgresDf13CommerceFenceProvider,
  type Df13CommerceAtomicFenceStorePort,
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
    ...overrides,
  };
}

function runtime(): Df13CommerceRuntimeCommitPort {
  return {
    async commitWithinTransaction(): Promise<RealtimeCommitResult> {
      throw new Error("not reached by worker adapter test");
    },
  };
}

function atomicStore(
  overrides: Partial<Df13CommerceAtomicFenceStorePort> = {},
): Df13CommerceAtomicFenceStorePort {
  return {
    async commitAuthorityDependentWork<TState, TSalesState>(
      _input: Df13CommerceFenceCommitInput<TState, TSalesState>,
      _runtime: Df13CommerceRuntimeCommitPort,
    ): Promise<Df13CommerceFenceCommitResult> {
      return {
        status: "COMPLETED",
        epoch: 4,
        runtime: {
          stateCommitted: true,
          metaOutboxCreated: 1,
          pancakeTagOutboxCreated: false,
          handoffEventCreated: false,
          sendAuthorized: true,
          reasonCodes: [],
          inboxBatchStatus: "COMMITTED",
        },
      };
    },
    ...overrides,
  };
}

const runtimeCommit: RealtimeCommitInput<{ revision: number }> = Object.freeze({
  pageId: request.pageId,
  customerHash: "customer-hash",
  conversationId: "10000000-0000-4000-8000-000000000077",
  expectedStateVersion: 2,
  state: Object.freeze({ revision: 3 }),
  inboxBatchGuard: Object.freeze({
    generation: 2,
    leaseToken: "runtime-inbox-lease",
    inboxIds: request.inboxIds,
  }),
});

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

  it("re-checks the whole consumer bundle and preserves the same immutable request for the atomic completion transaction", async () => {
    let received: unknown;
    const committer = new PostgresDf13CommerceFenceBoundCommitter(atomicStore({
      async commitAuthorityDependentWork(input) {
        received = input;
        return {
          status: "COMPLETED",
          epoch: 4,
          runtime: {
            stateCommitted: true,
            metaOutboxCreated: 1,
            pancakeTagOutboxCreated: false,
            handoffEventCreated: false,
            sendAuthorized: true,
            reasonCodes: [],
            inboxBatchStatus: "COMMITTED",
          },
        };
      },
    }), runtime());

    await expect(committer.commitAuthorityDependentWork({
      request,
      lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 },
      runtimeCommit,
    })).resolves.toMatchObject({ status: "COMPLETED", epoch: 4 });
    expect(received).toEqual({
      request: {
        pageId: request.pageId,
        channel: request.channel,
        workId: request.workId,
        inboxIds: request.inboxIds,
        authority: request.authority,
      },
      lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 },
      runtimeCommit,
    });
  });

  it("cannot send a malformed bundle into the durable completion path", async () => {
    let committed = false;
    const committer = new PostgresDf13CommerceFenceBoundCommitter(atomicStore({
      async commitAuthorityDependentWork() {
        committed = true;
        return { status: "PARKED", reasonCode: "unexpected" };
      },
    }), runtime());

    await expect(committer.commitAuthorityDependentWork({
      request: { ...request, consumers: request.consumers.slice(1) },
      lease: { fenceToken: "10000000-0000-4000-8000-000000000003", epoch: 4 },
      runtimeCommit,
    })).resolves.toEqual({ status: "PARKED", reasonCode: "DF13_FENCE_BUNDLE_INVALID" });
    expect(committed).toBe(false);
  });
});
