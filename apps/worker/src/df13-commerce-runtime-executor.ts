import type {
  CommerceAuthorityConsumerPort,
  RuntimeBehaviorModeResolution,
} from "@lana/chat-runtime";
import type {
  Df13CommerceFenceCommitResult,
  RealtimeCommitInput,
} from "@lana/database";
import type {
  Df13CommerceActivationAuthority,
  Df13CommerceFenceBoundCommitter,
} from "./df13-commerce-default-off-consumer.js";
import {
  assessDf13CommerceAuthorityFence,
  type Df13CommerceFenceRequest,
} from "./df13-commerce-authority-fence.js";
import {
  dispatchDf13CommerceAuthorityFence,
  type Df13CommerceFenceLease,
  type Df13CommerceFenceProvider,
} from "./df13-commerce-fence-dispatcher.js";
import { Df13CommerceRuntimeFinalizationAdapter } from "./df13-commerce-runtime-finalization.js";
import { selectDf13RuntimeAuthority } from "./df13-runtime-authority-boundary.js";

export type Df13CommerceRuntimeAcquireResult =
  | Readonly<{
    status: "HELD";
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
  }>
  | Readonly<{ status: "ALREADY_COMPLETED"; epoch: number }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>
  | Readonly<{ status: "BLOCKED"; reasonCode: string }>;

export interface Df13CommerceRuntimeExecutorPort {
  acquire(input: Readonly<{
    pageId: string;
    channel: string;
    workId: string;
    inboxIds: readonly string[];
    resolution: RuntimeBehaviorModeResolution;
  }>): Promise<Df13CommerceRuntimeAcquireResult>;
}

/**
 * The COMMERCE execution boundary. It is constructed only by an explicit
 * activation composition: source-default RealtimeRunner construction omits
 * this object entirely. The boundary verifies the exact DATABASE identity,
 * obtains the full durable fence before authority-dependent work, and permits
 * final state/Outbox completion only through the fence-bound transaction.
 */
export class Df13CommerceRuntimeExecutor<TState, TSalesState = unknown>
implements Df13CommerceRuntimeExecutorPort, CommerceAuthorityConsumerPort {
  readonly #dependencies: Readonly<{
    activationAuthority: Df13CommerceActivationAuthority;
    fenceProvider: Df13CommerceFenceProvider;
    fenceCommitter: Df13CommerceFenceBoundCommitter<TState, TSalesState>;
  }>;

  constructor(dependencies: Readonly<{
    activationAuthority: Df13CommerceActivationAuthority;
    fenceProvider: Df13CommerceFenceProvider;
    fenceCommitter: Df13CommerceFenceBoundCommitter<TState, TSalesState>;
  }>) {
    this.#dependencies = dependencies;
  }

  /**
   * The resolver calls this before it returns a COMMERCE resolution to the
   * runner.  It deliberately performs identity admission only: no fence,
   * state, model, or delivery work may happen while the source is default-off.
   */
  async admitCommerceAuthority(
    input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<{ readonly status: "ADMITTED" | "REJECTED" }> {
    try {
      const decision = await this.#dependencies.activationAuthority
        .authorizeExactCommerceIdentity(input);
      return { status: decision.status === "ADMITTED" ? "ADMITTED" : "REJECTED" };
    } catch {
      return { status: "REJECTED" };
    }
  }

  async acquire(input: Readonly<{
    pageId: string;
    channel: string;
    workId: string;
    inboxIds: readonly string[];
    resolution: RuntimeBehaviorModeResolution;
  }>): Promise<Df13CommerceRuntimeAcquireResult> {
    const selected = selectDf13RuntimeAuthority({
      pageId: input.pageId,
      channel: input.channel,
      resolution: input.resolution,
    });
    if (selected.status !== "COMMERCE_SELECTED") {
      return Object.freeze({
        status: "BLOCKED" as const,
        reasonCode: selected.status === "BLOCKED"
          ? selected.reasonCode
          : "DF13_COMMERCE_AUTHORITY_NOT_SELECTED",
      });
    }
    const assessment = assessDf13CommerceAuthorityFence(input);
    if (assessment.status === "BLOCKED") {
      return Object.freeze({ status: "BLOCKED" as const, reasonCode: assessment.reasonCode });
    }
    if (assessment.status === "LEGACY_ADMITTED") {
      return Object.freeze({ status: "BLOCKED" as const, reasonCode: "DF13_COMMERCE_AUTHORITY_NOT_SELECTED" });
    }
    const identityDecision = await this.#authorizeIdentity(assessment.request);
    if (identityDecision !== null) return identityDecision;
    let requestDecision: Awaited<ReturnType<Df13CommerceActivationAuthority["authorizeExactCommerceRequest"]>>;
    try {
      requestDecision = await this.#dependencies.activationAuthority
        .authorizeExactCommerceRequest(assessment.request);
    } catch {
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_COMMERCE_ACTIVATION_UNAVAILABLE" });
    }
    if (requestDecision.status === "SOURCE_DISABLED") {
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_COMMERCE_SOURCE_DISABLED" });
    }
    if (requestDecision.status === "BLOCKED") {
      return Object.freeze({ status: "BLOCKED" as const, reasonCode: requestDecision.reasonCode });
    }
    const dispatched = await dispatchDf13CommerceAuthorityFence({
      assessment,
      provider: this.#dependencies.fenceProvider,
    });
    if (dispatched.status === "COMMERCE_HELD") {
      return Object.freeze({
        status: "HELD" as const,
        request: dispatched.request,
        lease: dispatched.lease,
      });
    }
    if (dispatched.status === "COMMERCE_ALREADY_COMPLETED") {
      return Object.freeze({ status: "ALREADY_COMPLETED" as const, epoch: dispatched.epoch });
    }
    if (dispatched.status === "PARKED") {
      return Object.freeze({ status: "PARKED" as const, reasonCode: dispatched.reasonCode });
    }
    return Object.freeze({
      status: "BLOCKED" as const,
      reasonCode: dispatched.status === "BLOCKED"
        ? dispatched.reasonCode
        : "DF13_COMMERCE_AUTHORITY_NOT_SELECTED",
    });
  }

  createFinalizingExecutor(): Df13CommerceRuntimeFinalizationAdapter<TState, TSalesState> {
    return new Df13CommerceRuntimeFinalizationAdapter({
      acquire: this.acquire.bind(this),
      commit: this.#commitFenced.bind(this),
    });
  }

  async #commitFenced(input: Readonly<{
    acquired: Extract<Df13CommerceRuntimeAcquireResult, { status: "HELD" }>;
    runtimeCommit: RealtimeCommitInput<TState, TSalesState>;
  }>): Promise<Df13CommerceFenceCommitResult> {
    return this.#dependencies.fenceCommitter.commitAuthorityDependentWork({
      request: input.acquired.request,
      lease: input.acquired.lease,
      runtimeCommit: input.runtimeCommit,
    });
  }

  async #authorizeIdentity(
    request: Df13CommerceFenceRequest,
  ): Promise<Exclude<Df13CommerceRuntimeAcquireResult, { status: "HELD" | "ALREADY_COMPLETED" }> | null> {
    let decision: Awaited<ReturnType<Df13CommerceActivationAuthority["authorizeExactCommerceIdentity"]>>;
    try {
      decision = await this.#dependencies.activationAuthority
        .authorizeExactCommerceIdentity({
          pageId: request.pageId,
          channel: request.channel,
          modeVersionId: request.authority.modeVersionId,
          contentHash: request.authority.contentHash,
          authorityBundleHash: request.authority.authorityBundleHash,
          pointerRevision: request.authority.pointerRevision,
          source: request.authority.source,
        });
    } catch {
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_COMMERCE_ACTIVATION_UNAVAILABLE" });
    }
    if (decision.status === "ADMITTED") return null;
    if (decision.status === "SOURCE_DISABLED") {
      return Object.freeze({ status: "PARKED" as const, reasonCode: "DF13_COMMERCE_SOURCE_DISABLED" });
    }
    return Object.freeze({ status: "BLOCKED" as const, reasonCode: decision.reasonCode });
  }
}
