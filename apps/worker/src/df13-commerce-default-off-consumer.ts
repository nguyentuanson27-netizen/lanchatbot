import { createHash } from "node:crypto";
import type {
  Df13CommerceFenceCommitResult,
  RealtimeCommitInput,
  RealtimeCommitResult,
} from "@lana/database";
import type { CommerceAuthorityConsumerPort } from "@lana/chat-runtime";
import { canonicalJsonV1 } from "@lana/contracts";
import { DF13_COMMERCE_AUTHORITY_BUNDLE_V1 } from "./df13-commerce-authority-bundle.js";
import type {
  Df13CommerceAuthorityFenceAssessment,
  Df13CommerceFenceRequest,
} from "./df13-commerce-authority-fence.js";
import {
  dispatchDf13CommerceAuthorityFence,
  type Df13CommerceFenceLease,
  type Df13CommerceFenceProvider,
} from "./df13-commerce-fence-dispatcher.js";
import { DF13_COMMERCE_PREPROD_SCOPE_V1 } from "./df13-commerce-scope.js";

/** The unchanged current consumer path; it is the default and only live path. */
export interface Df13LegacyConsumer<TInput, TResult> {
  consume(input: TInput): Promise<TResult>;
}

/**
 * This authority must be supplied by a future, separately approved composition
 * root. No current runtime constructs this adapter; omitting it is default-off.
 */
export interface Df13CommerceActivationAuthority {
  authorizeExactCommerceIdentity(
    input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<
    | Readonly<{ status: "ADMITTED" }>
    | Readonly<{ status: "SOURCE_DISABLED" }>
    | Readonly<{ status: "BLOCKED"; reasonCode: string }>
  >;
  authorizeExactCommerceRequest(request: Df13CommerceFenceRequest): Promise<
    | Readonly<{ status: "ADMITTED" }>
    | Readonly<{ status: "SOURCE_DISABLED" }>
    | Readonly<{ status: "BLOCKED"; reasonCode: string }>
  >;
}

export const DF13_COMMERCE_SOURCE_ONLY_DISABLED: Df13CommerceActivationAuthority = Object.freeze({
  async authorizeExactCommerceIdentity() { return { status: "SOURCE_DISABLED" as const }; },
  async authorizeExactCommerceRequest() { return { status: "SOURCE_DISABLED" as const }; },
});

/**
 * A plan is a durable state/outbox input only. Its derivation must not send,
 * publish, retry, dead-letter, or otherwise cause an external side effect.
 */
export interface Df13CommerceAuthorityDependentPlanBuilder<TLegacyInput, TState, TSalesState = unknown> {
  deriveDurableRuntimeCommit(input: Readonly<{
    legacyInput: TLegacyInput;
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
  }>): Promise<RealtimeCommitInput<TState, TSalesState>>;
}

/**
 * The sole Commerce completion boundary. Implementations must bind the durable
 * runtime write, exact lease release, and fence completion to one transaction.
 */
export interface Df13CommerceFenceBoundCommitter<TState, TSalesState = unknown> {
  commitAuthorityDependentWork(input: Readonly<{
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
    runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
  }>): Promise<Df13CommerceFenceCommitResult>;
}

export type Df13CommerceDefaultOffConsumerResult<TResult> =
  | Readonly<{ status: "LEGACY_DELEGATED"; result: TResult }>
  | Readonly<{ status: "COMMERCE_COMMITTED"; epoch: number; runtime: RealtimeCommitResult }>
  | Readonly<{ status: "COMMERCE_ALREADY_COMPLETED"; epoch: number }>
  | Readonly<{ status: "BLOCKED"; blockId: string; reasonCode: string }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

function activationBlockId(request: Df13CommerceFenceRequest, reasonCode: string): string {
  return "df13-block-" + createHash("sha256")
    .update(canonicalJsonV1({ request, reasonCode }), "utf8")
    .digest("hex");
}

function validResolverIdentity(
  input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
): boolean {
  return input.pageId === DF13_COMMERCE_PREPROD_SCOPE_V1.pageId
    && input.channel === DF13_COMMERCE_PREPROD_SCOPE_V1.channel
    && input.authorityBundleHash === DF13_COMMERCE_AUTHORITY_BUNDLE_V1.contractHash
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.modeVersionId)
    && /^sha256:[a-f0-9]{64}$/u.test(input.contentHash)
    && Number.isSafeInteger(input.pointerRevision)
    && input.pointerRevision >= 1
    && (input.source === "DATABASE" || input.source === "CACHE");
}

/**
 * Dedicated consumer boundary for the future Commerce path. It is default-off
 * and delegates directly to the supplied LEGACY consumer only for a positively
 * identified LEGACY assessment. A COMMERCE assessment stays parked until a
 * separately approved runtime composition supplies an activation authority. Once enabled,
 * every authority-dependent derivation follows a held full-bundle fence and
 * reaches durable state/outbox only through the atomic committer.
 */
export class Df13CommerceDefaultOffConsumerAdapter<TLegacyInput, TResult, TState, TSalesState = unknown>
implements CommerceAuthorityConsumerPort {
  constructor(private readonly dependencies: Readonly<{
    legacyConsumer: Df13LegacyConsumer<TLegacyInput, TResult>;
    fenceProvider: Df13CommerceFenceProvider;
    planBuilder: Df13CommerceAuthorityDependentPlanBuilder<TLegacyInput, TState, TSalesState>;
    fenceCommitter: Df13CommerceFenceBoundCommitter<TState, TSalesState>;
    activationAuthority?: Df13CommerceActivationAuthority;
  }>) {}

  async admitCommerceAuthority(
    input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<{ readonly status: "ADMITTED" | "REJECTED" }> {
    if (!validResolverIdentity(input)) return { status: "REJECTED" };
    const activationAuthority = this.dependencies.activationAuthority
      ?? DF13_COMMERCE_SOURCE_ONLY_DISABLED;
    try {
      const decision = await activationAuthority.authorizeExactCommerceIdentity(input);
      return { status: decision.status === "ADMITTED" ? "ADMITTED" : "REJECTED" };
    } catch {
      return { status: "REJECTED" };
    }
  }

  async consume(input: Readonly<{
    legacyInput: TLegacyInput;
    assessment: Df13CommerceAuthorityFenceAssessment;
  }>): Promise<Df13CommerceDefaultOffConsumerResult<TResult>> {
    if (input.assessment.status === "LEGACY_ADMITTED") {
      return Object.freeze({
        status: "LEGACY_DELEGATED" as const,
        result: await this.dependencies.legacyConsumer.consume(input.legacyInput),
      });
    }
    if (input.assessment.status === "BLOCKED") {
      return Object.freeze({
        status: "BLOCKED" as const,
        blockId: input.assessment.blockId,
        reasonCode: input.assessment.reasonCode,
      });
    }

    const activationAuthority = this.dependencies.activationAuthority
      ?? DF13_COMMERCE_SOURCE_ONLY_DISABLED;
    let authorization: Awaited<ReturnType<Df13CommerceActivationAuthority["authorizeExactCommerceRequest"]>>;
    try {
      authorization = await activationAuthority.authorizeExactCommerceRequest(input.assessment.request);
    } catch {
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_FENCE_ACTIVATION_UNAVAILABLE" });
    }
    if (authorization.status === "SOURCE_DISABLED") {
      return Object.freeze({
        status: "PARKED" as const,
        reasonCode: "DF13_COMMERCE_SOURCE_DISABLED",
      });
    }
    if (authorization.status === "BLOCKED") {
      return Object.freeze({
        status: "BLOCKED" as const,
        blockId: activationBlockId(input.assessment.request, authorization.reasonCode),
        reasonCode: authorization.reasonCode,
      });
    }

    const dispatched = await dispatchDf13CommerceAuthorityFence({
      assessment: input.assessment,
      provider: this.dependencies.fenceProvider,
    });
    if (dispatched.status === "LEGACY_ADMITTED") {
      return Object.freeze({
        status: "LEGACY_DELEGATED" as const,
        result: await this.dependencies.legacyConsumer.consume(input.legacyInput),
      });
    }
    if (dispatched.status === "BLOCKED") {
      return Object.freeze({
        status: "BLOCKED" as const,
        blockId: dispatched.blockId,
        reasonCode: dispatched.reasonCode,
      });
    }
    if (dispatched.status === "PARKED") {
      return Object.freeze({ status: "PARKED" as const, reasonCode: dispatched.reasonCode });
    }
    if (dispatched.status === "COMMERCE_ALREADY_COMPLETED") {
      return Object.freeze({ status: "COMMERCE_ALREADY_COMPLETED" as const, epoch: dispatched.epoch });
    }

    let runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
    try {
      runtimeCommit = await this.dependencies.planBuilder.deriveDurableRuntimeCommit({
        legacyInput: input.legacyInput,
        request: dispatched.request,
        lease: dispatched.lease,
      });
    } catch {
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_FENCE_PLAN_DERIVATION_FAILED" });
    }

    let committed: Df13CommerceFenceCommitResult;
    try {
      committed = await this.dependencies.fenceCommitter.commitAuthorityDependentWork({
        request: dispatched.request,
        lease: dispatched.lease,
        runtimeCommit,
      });
    } catch {
      // The transaction outcome is ambiguous to this caller. Retain/fence by
      // parking; a later acquire observes completed work before any re-derive.
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_FENCE_ATOMIC_COMMIT_UNAVAILABLE" });
    }
    if (committed.status === "PARKED") {
      return Object.freeze({ status: "PARKED" as const, reasonCode: committed.reasonCode });
    }
    if (committed.status === "ALREADY_COMPLETED") {
      return Object.freeze({ status: "COMMERCE_ALREADY_COMPLETED" as const, epoch: committed.epoch });
    }
    return Object.freeze({
      status: "COMMERCE_COMMITTED" as const,
      epoch: committed.epoch,
      runtime: committed.runtime,
    });
  }
}
