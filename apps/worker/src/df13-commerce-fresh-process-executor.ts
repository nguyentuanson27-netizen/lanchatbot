import type { CommerceAuthorityConsumerPort } from "@lana/chat-runtime";
import type { Df13CommerceActivationAuthority } from "./df13-commerce-default-off-consumer.js";

export interface Df13CommerceFreshProcessExecutorPort
extends CommerceAuthorityConsumerPort {
  assertExactCommerceAuthority(
    input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<
    | Readonly<{ status: "ADMITTED" }>
    | Readonly<{ status: "BLOCKED"; reasonCode: string }>
  >;
}

/**
 * Fresh-process COMMERCE admission for the first PREPROD exercise. The
 * stopped process boundary already removes legacy/new concurrency, so this
 * executor deliberately has no 0036 fence provider or lease. It remains
 * unusable without the same immutable startup authority that the resolver
 * checks before it exposes a COMMERCE identity.
 */
export class Df13CommerceFreshProcessExecutor
implements Df13CommerceFreshProcessExecutorPort {
  constructor(private readonly dependencies: Readonly<{
    activationAuthority: Df13CommerceActivationAuthority;
  }>) {}

  async admitCommerceAuthority(
    input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<{ readonly status: "ADMITTED" | "REJECTED" }> {
    const decision = await this.assertExactCommerceAuthority(input);
    return { status: decision.status === "ADMITTED" ? "ADMITTED" : "REJECTED" };
  }

  async assertExactCommerceAuthority(
    input: Parameters<CommerceAuthorityConsumerPort["admitCommerceAuthority"]>[0],
  ): Promise<
    | Readonly<{ status: "ADMITTED" }>
    | Readonly<{ status: "BLOCKED"; reasonCode: string }>
  > {
    try {
      const decision = await this.dependencies.activationAuthority
        .authorizeExactCommerceIdentity(input);
      if (decision.status === "ADMITTED") return Object.freeze({ status: "ADMITTED" as const });
      return Object.freeze({
        status: "BLOCKED" as const,
        reasonCode: decision.status === "SOURCE_DISABLED"
          ? "DF13_COMMERCE_SOURCE_DISABLED"
          : decision.reasonCode,
      });
    } catch {
      return Object.freeze({
        status: "BLOCKED" as const,
        reasonCode: "DF13_COMMERCE_ACTIVATION_UNAVAILABLE",
      });
    }
  }
}
