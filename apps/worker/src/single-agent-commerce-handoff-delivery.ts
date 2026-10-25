import { createHash } from "node:crypto";
import { CommerceHandoffDeliveryBindingV1Schema as schema, type CommerceHandoffDeliveryBindingV1 as Binding,
  type HandoffDecisionV2, type CommerceHandoffSourceCheckV1 } from "@lana/contracts";
import type { RuntimePolicyBundle } from "@lana/chat-runtime";
import type { RealtimeMetaMessageUnit } from "@lana/database";
import type { MetaPreSendGate } from "./meta-outbox-dispatcher.js";
import type { CommerceScope } from "./single-agent-commerce-read-only-tools.js";
import { commerceHash } from "./single-agent-commerce-read-only-context.js";
import { commerceDeliveryPolicyHash } from "./single-agent-commerce-media-delivery.js";
import { hardPrecheck, type TrustedContext } from "./single-agent-semantic-verifier-boundary.js";

export type { Binding as CommerceHandoffDeliveryBinding };
export function makeCommerceHandoffDeliveryBinding(input: {
  scope: Pick<CommerceScope, "pageId" | "shopId" | "conversationId" | "customerHash" | "recipient">;
  generation: number; responseGroupId: string; nextState: object & { revision: number }; policy: RuntimePolicyBundle;
  decision: HandoffDecisionV2; messages: readonly RealtimeMetaMessageUnit[]; now: Date;
  reply?: Binding["reply"];
}): Binding {
  return schema.parse({ kind: "C3_HANDOFF_GROUP_V1", pageId: input.scope.pageId, shopId: input.scope.shopId,
    conversationId: input.scope.conversationId, customerHash: input.scope.customerHash, recipientHash: input.scope.recipient,
    responseGroupId: input.responseGroupId, generation: input.generation, revision: input.nextState.revision,
    stateHash: commerceHash(input.nextState), policyHash: commerceDeliveryPolicyHash(input.policy, input.scope.pageId, input.scope.shopId, input.now),
    reason: input.decision.reason, rulesetVersion: input.decision.provenance.rulesetVersion, messageHashes: input.messages.map(commerceHash),
    ...(input.reply?{reply:input.reply}:{}) });
}

/** Reconstitutable guard for a committed HUMAN transition's exact reply group. */
export function createCommerceHandoffPreSendGate(input: {
  base: MetaPreSendGate; clock: () => Date;
  readAuthority: (binding: Binding) => Promise<{ state: unknown; stateVersion: number; routingOwner: string;
    appSendEnabled: boolean; killSwitch: boolean; generation: number }>;
  policy: (binding: Binding) => Promise<RuntimePolicyBundle>;
  hasCommittedHandoff: (binding: Binding) => Promise<boolean>;
  /** Re-read scoped authority sources after restart; never a captured turn closure or model-provided reader. */
  readReplySource?: (source: CommerceHandoffSourceCheckV1, binding: Binding) => Promise<string>;
}): MetaPreSendGate {
  return { supportsCommerceHandoffBinding: true,
    ...(input.base.supportsCommerceMediaBinding ? { supportsCommerceMediaBinding: true as const } : {}),
    async authorize(claim) {
      if (claim.handoffBinding === undefined) return input.base.authorize(claim);
      const blocked = (reasonCode="C3_HANDOFF_DELIVERY_BINDING_CHANGED") => ({ status: "BLOCKED" as const, reasonCode, blockingTag: null, observedAt: input.clock() });
      try {
        const parsed = schema.safeParse(claim.handoffBinding); if (!parsed.success) return blocked();
        const b = parsed.data;
        if (claim.sequenceNo !== 0 || b.pageId !== claim.pageId || b.conversationId !== claim.conversationId ||
          b.responseGroupId !== claim.responseGroupId || b.recipientHash !== createHash("sha256").update(claim.recipientId).digest("hex") ||
          b.messageHashes[0] !== commerceHash(claim.message)) return blocked("C3_HANDOFF_MESSAGE_BINDING_CHANGED");
        const authority = await input.readAuthority(b);
        const state = authority.state as { conversationId?: string; conversationOwner?: string; routingOwner?: string };
        const policyHash = async () => commerceDeliveryPolicyHash(await input.policy(b), b.pageId, b.shopId, input.clock());
        if (authority.stateVersion !== b.revision || authority.generation !== b.generation || !authority.appSendEnabled || authority.killSwitch ||
          authority.routingOwner !== "APP" || state.routingOwner !== "APP" || state.conversationId !== b.conversationId || state.conversationOwner !== "HUMAN" ||
          commerceHash(state) !== b.stateHash || await policyHash() !== b.policyHash || !await input.hasCommittedHandoff(b)) return blocked("C3_HANDOFF_AUTHORITY_OR_EVENT_CHANGED");
        if(b.reply){
          const proof=b.reply, trusted=JSON.parse(proof.trustedJson) as TrustedContext;
          if(commerceHash(trusted)!==proof.trustedHash||trusted.state.recipient!==b.recipientHash||
            (trusted.state.conversationRevision??trusted.state.revision)!==proof.beforeRevision||
            hardPrecheck(trusted,claim.message.kind==="TEXT"?claim.message.text:"",input.clock()))return blocked("C3_HANDOFF_REPLY_CONTEXT_INVALID");
          // Exact predecessor context is checked unchanged: receipts retain their original revision.
          if(!input.readReplySource)return blocked("C3_HANDOFF_REPLY_READER_REQUIRED");
          for(const p of trusted.runtimeProducts??[])if(!proof.sources.some(s=>s.kind==="PRODUCT"&&JSON.parse(s.queryJson).productId===p.subjectRef))return blocked("C3_HANDOFF_PRODUCT_PROOF_REQUIRED");
          if(trusted.state.customerProfileId&&!proof.sources.some(s=>s.kind==="PROFILE"))return blocked("C3_HANDOFF_PROFILE_PROOF_REQUIRED");
          if((trusted.cartBinding||trusted.state.cartQuote)&&!proof.sources.some(s=>s.kind==="SALES_STATE"))return blocked("C3_HANDOFF_SALES_STATE_PROOF_REQUIRED");
          for(const receipt of trusted.effectReceipts)if(receipt.effect!=="CUSTOMER_STATE_UPDATED"&&!proof.sources.some(s=>s.kind==="RECEIPT"&&JSON.parse(s.queryJson).operationId===receipt.operationId&&s.sourceHash===commerceHash(receipt)))return blocked("C3_HANDOFF_RECEIPT_PROOF_REQUIRED");
          for(const source of proof.sources){
            try{if(await input.readReplySource(source,b)!==source.sourceHash)return blocked(`C3_HANDOFF_SOURCE_${source.kind}_CHANGED`);}
            catch{return blocked(`C3_HANDOFF_SOURCE_${source.kind}_UNAVAILABLE`);}
          }
        }
        if (commerceHash(await input.readAuthority(b)) !== commerceHash(authority) || await policyHash() !== b.policyHash) return blocked();
        return input.base.authorize(claim);
      } catch { return blocked(); }
    } };
}
