import type {
  Df13CommerceFenceCommitResult,
  RealtimeCommitInput,
} from "@lana/database";
import type { CommerceAuthorityConsumerPort } from "@lana/chat-runtime";
import type {
  Df13CommerceAuthorityFenceAssessment,
  Df13CommerceFenceRequest,
} from "./df13-commerce-authority-fence.js";
import type { Df13CommerceFenceLease } from "./df13-commerce-fence-dispatcher.js";

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
 * The sole Commerce completion primitive. Operational COMMERCE source obtains
 * this only through Df13CommerceRuntimeExecutor's private finalizer factory.
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
  | Readonly<{ status: "BLOCKED"; blockId: string; reasonCode: string }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

/**
 * Dedicated consumer boundary for the future Commerce path. It is default-off
 * and delegates directly to the supplied LEGACY consumer only for a positively
 * identified LEGACY assessment. A COMMERCE assessment stays parked until a
 * separately approved runtime composition supplies the distinct, runner-bound
 * finalization port. This adapter itself is permanently non-activatable.
 */
export class Df13CommerceDefaultOffConsumerAdapter<TLegacyInput, TResult>
implements CommerceAuthorityConsumerPort {
  constructor(private readonly dependencies: Readonly<{
    legacyConsumer: Df13LegacyConsumer<TLegacyInput, TResult>;
  }>) {}

  async admitCommerceAuthority(
    _input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<{ readonly status: "ADMITTED" | "REJECTED" }> {
    return { status: "REJECTED" };
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

    return Object.freeze({
      status: "PARKED" as const,
      reasonCode: "DF13_COMMERCE_DEFAULT_OFF_ONLY",
    });
  }
}
