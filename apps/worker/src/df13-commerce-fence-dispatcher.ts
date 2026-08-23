import type {
  Df13CommerceAuthorityFenceAssessment,
  Df13CommerceFenceRequest,
} from "./df13-commerce-authority-fence.js";

export type Df13CommerceFenceLease = Readonly<{
  fenceToken: string;
  epoch: number;
}>;

export interface Df13CommerceFenceProvider {
  acquire(request: Df13CommerceFenceRequest): Promise<
    | Readonly<{ status: "HELD"; lease: Df13CommerceFenceLease }>
    | Readonly<{ status: "ALREADY_COMPLETED"; epoch: number }>
    | Readonly<{ status: "PARKED"; reasonCode: string }>
  >;
  complete(input: Readonly<{
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
  }>): Promise<
    | Readonly<{ status: "COMPLETED" }>
    | Readonly<{ status: "ACK_LOST" }>
    | Readonly<{ status: "STALE" }>
  >;
}

export type Df13CommerceFenceDispatchResult =
  | Readonly<{ status: "LEGACY_ADMITTED" }>
  | Readonly<{ status: "BLOCKED"; blockId: string; reasonCode: string }>
  | Readonly<{ status: "COMMERCE_COMPLETED"; epoch: number }>
  | Readonly<{ status: "COMMERCE_ALREADY_COMPLETED"; epoch: number }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

/**
 * Source-only dispatcher for the future COMMERCE path. A complete immutable
 * request must be held before a consumer can run; the dispatcher has no live
 * runner, Inbox retry, dead-letter, or outbound-provider integration.
 */
export async function dispatchDf13CommerceAuthorityFence(input: Readonly<{
  assessment: Df13CommerceAuthorityFenceAssessment;
  provider: Df13CommerceFenceProvider;
  execute: (context: Readonly<{
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
  }>) => Promise<Readonly<{ status: "COMMITTED" }>>;
}>): Promise<Df13CommerceFenceDispatchResult> {
  if (input.assessment.status === "LEGACY_ADMITTED") {
    return { status: "LEGACY_ADMITTED" };
  }
  if (input.assessment.status === "BLOCKED") {
    return {
      status: "BLOCKED",
      blockId: input.assessment.blockId,
      reasonCode: input.assessment.reasonCode,
    };
  }

  const request = input.assessment.request;
  let acquired: Awaited<ReturnType<Df13CommerceFenceProvider["acquire"]>>;
  try {
    acquired = await input.provider.acquire(request);
  } catch {
    return { status: "PARKED", reasonCode: "DF13_FENCE_PROVIDER_UNAVAILABLE" };
  }
  if (acquired.status === "PARKED") {
    return { status: "PARKED", reasonCode: acquired.reasonCode };
  }
  if (acquired.status === "ALREADY_COMPLETED") {
    return { status: "COMMERCE_ALREADY_COMPLETED", epoch: acquired.epoch };
  }

  const context = Object.freeze({ request, lease: acquired.lease });
  try {
    await input.execute(context);
  } catch {
    return { status: "PARKED", reasonCode: "DF13_CONSUMER_EXECUTION_UNAVAILABLE" };
  }

  let completion: Awaited<ReturnType<Df13CommerceFenceProvider["complete"]>>;
  try {
    completion = await input.provider.complete(context);
  } catch {
    return { status: "PARKED", reasonCode: "DF13_FENCE_COMPLETION_ACK_LOST" };
  }
  if (completion.status === "COMPLETED") {
    return { status: "COMMERCE_COMPLETED", epoch: acquired.lease.epoch };
  }
  return {
    status: "PARKED",
    reasonCode: completion.status === "STALE"
      ? "DF13_FENCE_COMPLETION_STALE"
      : "DF13_FENCE_COMPLETION_ACK_LOST",
  };
}
