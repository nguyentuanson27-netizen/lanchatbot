import { describe, expect, it, vi } from "vitest";
import type { RealtimeCommitInput, RealtimeCommitResult } from "@lana/database";
import type { Df13CommerceAuthorityFenceAssessment } from "./df13-commerce-authority-fence.js";
import {
  Df13CommerceDefaultOffConsumerAdapter,
  type Df13CommerceActivationAuthority,
  type Df13CommerceAuthorityDependentPlanBuilder,
  type Df13CommerceFenceBoundCommitter,
  type Df13LegacyConsumer,
} from "./df13-commerce-default-off-consumer.js";
import type { Df13CommerceFenceProvider } from "./df13-commerce-fence-dispatcher.js";
import {
  DF13_COMMERCE_AUTHORITY_BUNDLE_V1,
  DF13_COMMERCE_AUTHORITY_CONSUMERS_V1,
} from "./df13-commerce-authority-bundle.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

type LegacyInput = Readonly<{ message: string }>;
type DurableState = Readonly<{ revision: number }>;

const request = Object.freeze({
  pageId: DF13_COMMERCE_PREPROD_SCOPE_V1.pageId,
  channel: DF13_COMMERCE_PREPROD_SCOPE_V1.channel,
  workId: "commerce-batch-1",
  inboxIds: Object.freeze(["10000000-0000-4000-8000-000000000001"]),
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

const runtimeCommit: RealtimeCommitInput<DurableState> = Object.freeze({
  pageId: request.pageId,
  customerHash: "customer-hash",
  conversationId: "10000000-0000-4000-8000-000000000077",
  expectedStateVersion: 3,
  state: Object.freeze({ revision: 4 }),
  inboxBatchGuard: Object.freeze({
    generation: 2,
    leaseToken: "runtime-inbox-lease",
    inboxIds: request.inboxIds,
  }),
});

function legacy(): Df13LegacyConsumer<LegacyInput, "LEGACY_RESULT"> {
  return { consume: vi.fn(async () => "LEGACY_RESULT" as const) };
}

function activation(enabled: boolean): Df13CommerceActivationAuthority {
  return {
    async authorizeExactCommerceIdentity(received) {
      expect(received).toEqual({
        pageId: request.pageId,
        channel: request.channel,
        modeVersionId: request.authority.modeVersionId,
        contentHash: request.authority.contentHash,
        authorityBundleHash: request.authority.authorityBundleHash,
        pointerRevision: request.authority.pointerRevision,
        source: request.authority.source,
      });
      return enabled ? { status: "ADMITTED" as const } : { status: "SOURCE_DISABLED" as const };
    },
    async authorizeExactCommerceRequest(received) {
      expect(received).toBe(request);
      return enabled ? { status: "ADMITTED" as const } : { status: "SOURCE_DISABLED" as const };
    },
  };
}

function provider(overrides: Partial<Df13CommerceFenceProvider> = {}): Df13CommerceFenceProvider {
  return {
    acquire: vi.fn(async () => ({
      status: "HELD" as const,
      lease: Object.freeze({ fenceToken: "10000000-0000-4000-8000-000000000099", epoch: 2 }),
    })),
    ...overrides,
  };
}

function planBuilder(
  overrides: Partial<Df13CommerceAuthorityDependentPlanBuilder<LegacyInput, DurableState>> = {},
): Df13CommerceAuthorityDependentPlanBuilder<LegacyInput, DurableState> {
  return {
    deriveDurableRuntimeCommit: vi.fn(async () => runtimeCommit),
    ...overrides,
  };
}

function committedRuntime(): RealtimeCommitResult {
  return {
    stateCommitted: true,
    metaOutboxCreated: 1,
    pancakeTagOutboxCreated: false,
    handoffEventCreated: false,
    sendAuthorized: true,
    reasonCodes: [],
    inboxBatchStatus: "COMMITTED",
  };
}

function committer(
  overrides: Partial<Df13CommerceFenceBoundCommitter<DurableState>> = {},
): Df13CommerceFenceBoundCommitter<DurableState> {
  return {
    commitAuthorityDependentWork: vi.fn(async () => ({
      status: "COMPLETED" as const,
      epoch: 2,
      runtime: committedRuntime(),
    })),
    ...overrides,
  };
}

describe("DF13 default-off fence-bound consumer adapter", () => {
  it("is the resolver's concrete default-off Commerce consumer and rejects it until exact authority is separately admitted", async () => {
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer: legacy(),
      fenceProvider: provider(),
      planBuilder: planBuilder(),
      fenceCommitter: committer(),
    });

    await expect(adapter.admitCommerceAuthority({
      pageId: request.pageId,
      channel: request.channel,
      modeVersionId: request.authority.modeVersionId,
      contentHash: request.authority.contentHash,
      authorityBundleHash: request.authority.authorityBundleHash,
      pointerRevision: request.authority.pointerRevision,
      source: request.authority.source,
    })).resolves.toEqual({ status: "REJECTED" });
  });

  it("only admits resolver identity when the exact immutable identity is separately authorized", async () => {
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer: legacy(),
      activationAuthority: activation(true),
      fenceProvider: provider(),
      planBuilder: planBuilder(),
      fenceCommitter: committer(),
    });

    await expect(adapter.admitCommerceAuthority({
      pageId: request.pageId,
      channel: request.channel,
      modeVersionId: request.authority.modeVersionId,
      contentHash: request.authority.contentHash,
      authorityBundleHash: request.authority.authorityBundleHash,
      pointerRevision: request.authority.pointerRevision,
      source: request.authority.source,
    })).resolves.toEqual({ status: "ADMITTED" });
    await expect(adapter.admitCommerceAuthority({
      pageId: "unreviewed-page",
      channel: request.channel,
      modeVersionId: request.authority.modeVersionId,
      contentHash: request.authority.contentHash,
      authorityBundleHash: request.authority.authorityBundleHash,
      pointerRevision: request.authority.pointerRevision,
      source: request.authority.source,
    })).resolves.toEqual({ status: "REJECTED" });
  });

  it("parks an identified COMMERCE request while source activation is disabled instead of delegating it to LEGACY", async () => {
    const legacyConsumer = legacy();
    const fenceProvider = provider();
    const builder = planBuilder();
    const fenceCommitter = committer();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer,
      fenceProvider,
      planBuilder: builder,
      fenceCommitter,
    });

    await expect(adapter.consume({
      legacyInput: { message: "hello" },
      assessment: commerceAssessment,
    })).resolves.toEqual({
      status: "PARKED",
      reasonCode: "DF13_COMMERCE_SOURCE_DISABLED",
    });

    expect(legacyConsumer.consume).not.toHaveBeenCalled();
    expect(fenceProvider.acquire).not.toHaveBeenCalled();
    expect(builder.deriveDurableRuntimeCommit).not.toHaveBeenCalled();
    expect(fenceCommitter.commitAuthorityDependentWork).not.toHaveBeenCalled();
  });

  it("derives all authority-dependent durable work only after holding the immutable fence and commits it atomically", async () => {
    const calls: string[] = [];
    const fenceProvider = provider({
      acquire: vi.fn(async (value) => {
        calls.push("acquire");
        expect(value).toBe(request);
        return {
          status: "HELD" as const,
          lease: { fenceToken: "10000000-0000-4000-8000-000000000099", epoch: 2 },
        };
      }),
    });
    const builder = planBuilder({
      deriveDurableRuntimeCommit: vi.fn(async (input) => {
        calls.push("derive");
        expect(input.request).toBe(request);
        expect(input.lease).toEqual({ fenceToken: "10000000-0000-4000-8000-000000000099", epoch: 2 });
        return runtimeCommit;
      }),
    });
    const fenceCommitter = committer({
      commitAuthorityDependentWork: vi.fn(async (input) => {
        calls.push("commit");
        expect(input.request).toBe(request);
        expect(input.runtimeCommit).toBe(runtimeCommit);
        return { status: "COMPLETED" as const, epoch: 2, runtime: committedRuntime() };
      }),
    });
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer: legacy(),
      activationAuthority: activation(true),
      fenceProvider,
      planBuilder: builder,
      fenceCommitter,
    });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: commerceAssessment,
    })).resolves.toMatchObject({ status: "COMMERCE_COMMITTED", epoch: 2 });

    expect(calls).toEqual(["acquire", "derive", "commit"]);
  });

  it("fails closed without durable commit when the post-fence derivation fails", async () => {
    const builder = planBuilder({
      async deriveDurableRuntimeCommit() { throw new Error("DERIVATION_FAILED"); },
    });
    const fenceCommitter = committer();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer: legacy(),
      activationAuthority: activation(true),
      fenceProvider: provider(),
      planBuilder: builder,
      fenceCommitter,
    });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: commerceAssessment,
    })).resolves.toEqual({ status: "PARKED", reasonCode: "DF13_FENCE_PLAN_DERIVATION_FAILED" });
    expect(fenceCommitter.commitAuthorityDependentWork).not.toHaveBeenCalled();
  });

  it("does not build or repeat durable work after a completed replay", async () => {
    const builder = planBuilder();
    const fenceCommitter = committer();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer: legacy(),
      activationAuthority: activation(true),
      fenceProvider: provider({
        async acquire() { return { status: "ALREADY_COMPLETED", epoch: 2 }; },
      }),
      planBuilder: builder,
      fenceCommitter,
    });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: commerceAssessment,
    })).resolves.toEqual({ status: "COMMERCE_ALREADY_COMPLETED", epoch: 2 });
    expect(builder.deriveDurableRuntimeCommit).not.toHaveBeenCalled();
    expect(fenceCommitter.commitAuthorityDependentWork).not.toHaveBeenCalled();
  });

  it("blocks a positively identified invalid Commerce authority instead of falling back to LEGACY", async () => {
    const legacyConsumer = legacy();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer,
      activationAuthority: activation(true),
      fenceProvider: provider(),
      planBuilder: planBuilder(),
      fenceCommitter: committer(),
    });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: {
        status: "BLOCKED",
        blockId: "df13-block-test",
        reasonCode: "DF13_COMMERCE_IDENTITY_INVALID",
      },
    })).resolves.toEqual({
      status: "BLOCKED",
      blockId: "df13-block-test",
      reasonCode: "DF13_COMMERCE_IDENTITY_INVALID",
    });
    expect(legacyConsumer.consume).not.toHaveBeenCalled();
  });

  it("fails closed when a future activation authority rejects the exact held-request identity", async () => {
    const legacyConsumer = legacy();
    const fenceProvider = provider();
    const adapter = new Df13CommerceDefaultOffConsumerAdapter({
      legacyConsumer,
      activationAuthority: {
        async authorizeExactCommerceIdentity() { return { status: "BLOCKED", reasonCode: "unexpected" }; },
        async authorizeExactCommerceRequest(received) {
          expect(received).toBe(request);
          return { status: "BLOCKED", reasonCode: "DF13_RELEASE_IDENTITY_MISMATCH" };
        },
      },
      fenceProvider,
      planBuilder: planBuilder(),
      fenceCommitter: committer(),
    });

    await expect(adapter.consume({
      legacyInput: { message: "commerce" },
      assessment: commerceAssessment,
    })).resolves.toEqual({
      status: "BLOCKED",
      blockId: expect.stringMatching(/^df13-block-[a-f0-9]{64}$/u),
      reasonCode: "DF13_RELEASE_IDENTITY_MISMATCH",
    });
    expect(legacyConsumer.consume).not.toHaveBeenCalled();
    expect(fenceProvider.acquire).not.toHaveBeenCalled();
  });
});
