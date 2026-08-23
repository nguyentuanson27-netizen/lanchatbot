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
}

export type Df13CommerceFenceDispatchResult =
  | Readonly<{ status: "LEGACY_ADMITTED" }>
  | Readonly<{ status: "BLOCKED"; blockId: string; reasonCode: string }>
  | Readonly<{
    status: "COMMERCE_HELD";
    request: Df13CommerceFenceRequest;
    lease: Df13CommerceFenceLease;
  }>
  | Readonly<{ status: "COMMERCE_ALREADY_COMPLETED"; epoch: number }>
  | Readonly<{ status: "PARKED"; reasonCode: string }>;

/**
 * Source-only, admission-only dispatcher for the future COMMERCE path. A
 * complete immutable request must be held before a future consumer boundary
 * can run, but this function cannot run a consumer or acknowledge completion.
 * That omission is intentional: a free-standing side-effect callback would
 * let a durable effect commit separately from the fence completion transaction.
 */
export async function dispatchDf13CommerceAuthorityFence(input: Readonly<{
  assessment: Df13CommerceAuthorityFenceAssessment;
  provider: Df13CommerceFenceProvider;
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

  return Object.freeze({ status: "COMMERCE_HELD", request, lease: acquired.lease });
}
