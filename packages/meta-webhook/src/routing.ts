import type { InboundMessageV1, RoutingOwner } from "@lana/contracts";

export type GatewayRoutingMode = "SHADOW" | "N8N" | "APP";

export interface RoutingDecision {
  mode: GatewayRoutingMode;
  routingOwner: RoutingOwner;
  evaluationOnly: boolean;
  reason: "SHADOW" | "N8N_OWNS" | "APP_OWNS";
}

export interface RoutingResolver {
  resolve(message: InboundMessageV1): Promise<RoutingDecision>;
}

export function decisionForMode(mode: GatewayRoutingMode): RoutingDecision {
  if (mode === "APP") {
    return {
      mode,
      routingOwner: "APP",
      evaluationOnly: false,
      reason: "APP_OWNS",
    };
  }
  return {
    mode,
    routingOwner: "N8N",
    evaluationOnly: mode === "SHADOW",
    reason: mode === "SHADOW" ? "SHADOW" : "N8N_OWNS",
  };
}

export class StaticRoutingResolver implements RoutingResolver {
  constructor(private readonly mode: GatewayRoutingMode = "SHADOW") {}

  async resolve(_message: InboundMessageV1): Promise<RoutingDecision> {
    return decisionForMode(this.mode);
  }
}
