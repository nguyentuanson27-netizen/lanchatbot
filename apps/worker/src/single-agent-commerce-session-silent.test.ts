import {expect,it,vi} from "vitest";
import {createSalesCycleRuntimeState} from "@lana/chat-runtime";
import {createConversationState} from "@lana/conversation-engine";
import {HandoffReasonV2Schema} from "@lana/contracts";
import {evaluateDeterministicEffectReadinessV1} from "@lana/business-tools";
import {commerceNow,commerceScope,fixturePolicy} from "./single-agent-commerce.test-support.js";
import {commerceHash} from "./single-agent-commerce-read-only-context.js";
import type {RealtimeCommitInput} from "@lana/database";
const {planner}=vi.hoisted(()=>({planner:vi.fn()}));
vi.mock("./realtime-sales-cycle.js",async original=>({...await original<typeof import("./realtime-sales-cycle.js")>(),evaluateRealtimeSalesCycle:planner}));
import {createPersistedCommerceExecutor} from "./single-agent-commerce-session.js";

it.each(["COD","BANK_TRANSFER","legacy","mixed","partial","nontransfer","conflict"])("candidate checkout message group follows resolved transfer policy (%s)",async mode=>{
 const scope=commerceScope(),resolution=await fixturePolicy(),policy=resolution.bundle!;
 Object.assign(policy,{channel:"PUBLISHED",sideEffects:"LIVE_OUTBOUND"});
 if(mode!=="legacy")Object.assign(policy.artifacts,{handoffMatrix:{schemaVersion:1,kind:"HANDOFF_MATRIX",sourceMetadata:policy.artifacts.shopPolicy.sourceMetadata,
  rules:HandoffReasonV2Schema.options.map(reason=>({reason,customerMessagePolicy:"SILENT_HANDOFF",holdingReply:null,
   tag:["EXCHANGE","RETURN","REFUND","DEFECT","WARRANTY","AFTER_SALES_REQUEST","ORDER_STATUS","DELIVERY_TRACKING","DELIVERY_DELAY","CHANGE_DELIVERY_INFO","CANCEL_ORDER","PAYMENT_AFTER_ORDER","WRONG_OR_MISSING_ITEM"].includes(reason)?"VAN_DON":"NHAN_VIEN"}))}});
 if(mode==="mixed")Object.assign(policy.artifacts.handoffMatrix!.rules[0]!,{customerMessagePolicy:"HOLDING_REPLY_THEN_HANDOFF",holdingReply:"Legacy holding"});
 if(mode==="partial")Object.assign(policy.artifacts.handoffMatrix!,{rules:policy.artifacts.handoffMatrix!.rules.slice(0,1)});
 const state=createSalesCycleRuntimeState(scope.conversationId,{pageId:scope.pageId,conversationId:scope.conversationId},commerceNow);
 const messages=[{kind:"TEXT" as const,text:"Code confirmation"},...(mode==="BANK_TRANSFER"?[{kind:"TEXT" as const,text:"Synthetic payment instruction"},{kind:"IMAGE" as const,imageUrl:"https://content.pancake.vn/synthetic-qr.jpg"}]:[])];
 const plan={expectedRevision:state.revision,state:{...state,revision:state.revision+1},sourceMessageIdHash:"a".repeat(64)};
 const readiness=evaluateDeterministicEffectReadinessV1({effect:"PROTECTED_OUTBOUND",pageId:scope.pageId,conversationId:scope.conversationId,
  sourceMessageIdHash:"a".repeat(64),conversationRevision:scope.revision,salesCycleRevision:state.revision,productIds:[],
  cartId:null,cartVersion:null,cartStateHash:null,orderPreviewId:null,orderPreviewHash:null,buyingIntent:null,
  claims:[],protectedClaimTypes:[],deterministicEvidenceHash:commerceHash(messages),payloadHash:commerceHash(messages),checkedAt:commerceNow});
 planner.mockResolvedValue({handled:true,plan,transferToHuman:mode!=="nontransfer",desiredTag:"DA_CHOT_DON",reasonCode:"PURCHASE_CONFIRMED",messages,
  protectedOutbound:{claims:[],claimTypes:[],readiness}});
 const commit=vi.fn(async(_client:unknown,prepared:RealtimeCommitInput<unknown>)=>({stateCommitted:mode!=="conflict",metaOutboxCreated:mode==="conflict"?0:prepared.metaPlan?.messages.length??0,
  handoffEventCreated:mode!=="conflict",pancakeTagOutboxCreated:mode!=="conflict"}));
 const session=createPersistedCommerceExecutor({scope,clock:()=>commerceNow,latest:"Chốt đơn",facts:{} as never,
  policy:async()=>resolution,readAuthority:async()=>({...scope,stateVersion:scope.revision,fence:1,state:{...createConversationState({conversationId:scope.conversationId,routingOwner:"APP",now:commerceNow}),revision:scope.revision}}),
  store:{loadOrCreateSalesCycle:async()=>({state,stateRevision:state.revision}),commitWithinTransaction:commit} as never,
  transaction:work=>work({} as never),inboxBatchGuard:{generation:1,leaseToken:"lease",inboxIds:["inbox"]},resolveTagId:()=>"synthetic-tag",deliveryRecipient:"synthetic-recipient"});
 const actual=await session.advancePrivateCheckout(),prepared=commit.mock.calls[0]![1];
 const silent=["COD","BANK_TRANSFER","conflict"].includes(mode);
 expect(prepared.salesCyclePlan).toBe(plan);
 if(silent){expect(prepared.metaPlan).toBeUndefined();expect(session.outboxCount()).toBe(0);expect(actual.messages).toBe(0);}
 else {expect(prepared.metaPlan?.messages).toEqual(messages);expect(actual.messages).toBe(messages.length);}
 if(mode!=="nontransfer"){expect(prepared.state).toMatchObject({conversationOwner:"HUMAN"});expect(prepared.pancakeTagPlan?.desiredTag).toBe("DA_CHOT_DON");expect(prepared.handoffEventPlan?.reasonCode).toBe("PURCHASE_CONFIRMED");}
 expect(actual.committed).toBe(mode!=="conflict");
});
