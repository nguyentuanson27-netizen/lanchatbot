import {it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {PendingNegotiationV1Schema,pendingNegotiationIdPreimageV1} from '@lana/contracts';
import {validateLockedPendingNegotiationTransitionV1,type RealtimeSalesCyclePlan} from './realtime-runtime.js';
const now=new Date('2026-11-15T00:00:00.000Z');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const p=PendingNegotiationV1Schema.parse({schemaVersion:1,pendingId:'0'.repeat(64),sourceMessageId:'message-1',sourceTextHash:'b'.repeat(64),
  sourceObservedAt:now.toISOString(),productId:'SM613',offerId:'DIRECT',salesEpisodeId:'10000000-0000-4000-8000-000000000001',
  customerProfileId:'20000000-0000-4000-8000-000000000001',
  policyRef:{id:'policy',version:'1',contentHash:'sha256:'+ 'c'.repeat(64)},recordedAt:now.toISOString(),
  expiresAt:new Date(now.getTime()+600000).toISOString(),status:'PENDING',cartOpeningCommandId:null,activatedByCartId:null});
 p.pendingId=hash(pendingNegotiationIdPreimageV1(p));
 const t={schemaVersion:1 as const,action:'RECORDED' as const,sourceMessageIdHash:hash(p.sourceMessageId),commandIdHash:hash('record'),
  before:null,after:p,appliedAt:now.toISOString()};
 const event={commandId:'record',commandKind:'PENDING_NEGOTIATION_RECORDED' as const,outcome:'APPLIED' as const,
  stateRevisionBefore:0,stateRevisionAfter:1,stageBefore:'DISCOVERY',stageAfter:'DISCOVERY',cartId:null,cartVersion:null,
  reasonCode:null,occurredAt:now,pendingNegotiationTransition:t};
 const plan:RealtimeSalesCyclePlan<unknown>={expectedRevision:0,state:{pendingNegotiation:p},events:[event],sourceMessageIdHash:hash(p.sourceMessageId),
  cartExpiresAt:null,expiresAt:new Date(p.expiresAt),readinessContractVersion:"DF06_EFFECT_READINESS_V1"};
 const client={query:vi.fn(async()=>({rows:[]}))};
 return {p,plan,event,t,client,run:(s:RealtimeSalesCyclePlan<unknown>=plan,locked:unknown={})=>
  validateLockedPendingNegotiationTransitionV1(client as never,'page','conversation',s,locked,hash('message-1'),now)};
}
it('replays only bound record evidence and leaves older records with no field compatible',async()=>{
 const f=fixture();await expect(f.run()).resolves.toBeUndefined();expect(f.client.query).not.toHaveBeenCalled();
 await expect(f.run({...f.plan,state:{},events:[]})).resolves.toBeUndefined();
});
it.each(['source','id','future','expired','evidence','unowned'] as const)('rejects pending record with %s tampering',async fault=>{
 const f=fixture();
 if(fault==='source')f.t.sourceMessageIdHash=hash('other');
 if(fault==='id')f.p.pendingId='f'.repeat(64);
 if(fault==='future')f.t.appliedAt=new Date(now.getTime()+300001).toISOString();
 if(fault==='expired')f.p.expiresAt=now.toISOString();
 if(fault==='evidence')delete (f.event as {pendingNegotiationTransition?:unknown}).pendingNegotiationTransition;
 if(fault==='unowned')f.event.commandKind='FACTS_PRESENTED' as never;
 await expect(f.run()).rejects.toThrow(/PENDING_NEGOTIATION/);
});
it('refuses a pending state change with no corresponding event',async()=>{
 const f=fixture();await expect(f.run({...f.plan,events:[]})).rejects.toThrow('PENDING_NEGOTIATION_REPLAY_MISMATCH');
});
