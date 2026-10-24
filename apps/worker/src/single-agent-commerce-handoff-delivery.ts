import { createHash } from "node:crypto";
import { CommerceHandoffDeliveryBindingV1Schema as schema, type CommerceHandoffDeliveryBindingV1 as Binding,
  type HandoffDecisionV2 } from "@lana/contracts";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import type { RealtimeMetaMessageUnit } from "@lana/database";
import type { MetaPreSendGate } from "./meta-outbox-dispatcher.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { commerceDeliveryPolicyHash } from "./single-agent-commerce-media-delivery.js";

export type { Binding as CommerceHandoffDeliveryBinding };
export function makeCommerceHandoffDeliveryBinding(input: {
  scope: Pick<CommerceScope, "pageId" | "shopId" | "conversationId" | "customerHash" | "recipient">;
  generation: number; responseGroupId: string; nextState: object & { revision: number }; policy: RuntimePolicyBundle;
  decision: HandoffDecisionV2; messages: readonly RealtimeMetaMessageUnit[]; now: Date;
}): Binding {
  return schema.parse({ kind: "C3_HANDOFF_GROUP_V1", pageId: input.scope.pageId, shopId: input.scope.shopId,
    conversationId: input.scope.conversationId, customerHash: input.scope.customerHash, recipientHash: input.scope.recipient,
    responseGroupId: input.responseGroupId, generation: input.generation, revision: input.nextState.revision,
    stateHash: commerceHash(input.nextState), policyHash: commerceDeliveryPolicyHash(input.policy, input.scope.pageId, input.scope.shopId, input.now),
    reason: input.decision.reason, rulesetVersion: input.decision.provenance.rulesetVersion, messageHashes: input.messages.map(commerceHash) });
}

/** Reconstitutable guard for a committed HUMAN transition's exact reply group. */
export function createCommerceHandoffPreSendGate(input: {
  base: MetaPreSendGate; clock: () => Date;
  readAuthority: (binding: Binding) => Promise<{ state: unknown; stateVersion: number; routingOwner: string;
    appSendEnabled: boolean; killSwitch: boolean; generation: number }>;
  policy: (binding: Binding) => Promise<RuntimePolicyBundle>;
  hasCommittedHandoff: (binding: Binding) => Promise<boolean>;
}): MetaPreSendGate {
  return { supportsCommerceHandoffBinding: true,
    ...(input.base.supportsCommerceMediaBinding ? { supportsCommerceMediaBinding: true as const } : {}),
    async authorize(claim) {
      if (claim.handoffBinding === undefined) return input.base.authorize(claim);
      const blocked = () => ({ status: "BLOCKED" as const, reasonCode: "C3_HANDOFF_DELIVERY_BINDING_CHANGED", blockingTag: null, observedAt: input.clock() });
      try {
        const parsed = schema.safeParse(claim.handoffBinding); if (!parsed.success) return blocked();
        const b = parsed.data;
        if (claim.sequenceNo !== 0 || b.pageId !== claim.pageId || b.conversationId !== claim.conversationId ||
          b.responseGroupId !== claim.responseGroupId || b.recipientHash !== createHash("sha256").update(claim.recipientId).digest("hex") ||
          b.messageHashes[0] !== commerceHash(claim.message)) return blocked();
        const authority = await input.readAuthority(b);
        const state = authority.state as { conversationId?: string; conversationOwner?: string; routingOwner?: string };
        const policyHash = async () => commerceDeliveryPolicyHash(await input.policy(b), b.pageId, b.shopId, input.clock());
        if (authority.stateVersion !== b.revision || authority.generation !== b.generation || !authority.appSendEnabled || authority.killSwitch ||
          authority.routingOwner !== "APP" || state.routingOwner !== "APP" || state.conversationId !== b.conversationId || state.conversationOwner !== "HUMAN" ||
          commerceHash(state) !== b.stateHash || await policyHash() !== b.policyHash || !await input.hasCommittedHandoff(b)) return blocked();
        if (commerceHash(await input.readAuthority(b)) !== commerceHash(authority) || await policyHash() !== b.policyHash) return blocked();
        return input.base.authorize(claim);
      } catch { return blocked(); }
    } };
}
