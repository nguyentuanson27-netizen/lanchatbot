// Read back actual disposable native stores. Public state excludes random identities and timestamps.
import {randomUUID,createHash} from 'node:crypto';
import {CustomerProfileV1Schema} from '@lana/contracts';
import {createSalesCycleRuntimeState} from '@lana/chat-runtime';
import {readNativeHistory} from './native-history.mjs';
export async function readSessionSnapshot({runtime,pool,historyStore,session}){
 const at=new Date(),b=session.bound,authority=await runtime.loadOrCreate(b.pageId,b.customerHash,'APP',()=>{throw Error('C_CONVERSATION_REQUIRED');},at),
  sales=await runtime.loadOrCreateSalesCycle(b.pageId,b.conversationId,()=>createSalesCycleRuntimeState(b.conversationId,{pageId:b.pageId,conversationId:b.conversationId},at),at),
  profile=await runtime.loadOrCreateCustomerProfile(b.pageId,b.customerHash,()=>({profile:CustomerProfileV1Schema.parse({schemaVersion:1,
   profileId:randomUUID(),customerKey:{namespace:'meta',algorithm:'HMAC_SHA256',digest:b.customerHash},revision:1,measurements:[],fitPreference:null,
   preferences:{colors:[],styles:[],materials:[]},sizeHistory:[],createdAt:at.toISOString(),updatedAt:at.toISOString()}),fieldEvidence:{}}),at);
 return {publicState:{owner:authority.state.conversationOwner,revision:authority.stateVersion,salesRevision:sales.state.revision,stage:sales.state.stage,
   cart:sales.state.cart?.value??null,preview:sales.state.preview?.value??null,confirmation:sales.state.confirmation?.value??null,
   profile:{revision:profile.profile.revision,measurements:profile.profile.measurements,fitPreference:profile.profile.fitPreference,preferences:profile.profile.preferences},
   negotiation:sales.state.negotiation??null},
  events:(await pool.query('SELECT command_id_hash,command_kind,outcome,state_revision_after FROM sales_cycle_events WHERE conversation_id=$1 ORDER BY occurred_at',[b.conversationId])).rows,
  receipts:(await Promise.all(sales.state.processedCommandIds.map(async id=>{const event=await runtime.readCommittedSalesCycleEvent(b.pageId,b.conversationId,id);
   return event?{operation_id:id,kind:'COMMITTED_SALES_EVENT',commandKind:event.commandKind,stateRevisionAfter:event.stateRevisionAfter,occurredAt:event.occurredAt.toISOString()}:null;}))).filter(Boolean),
  outbox:(await pool.query('SELECT outbox_id,response_group_id,sequence_no,status FROM meta_outbox WHERE conversation_id=$1 ORDER BY created_at,sequence_no',[b.conversationId])).rows,
  publicHistory:await readNativeHistory({store:runtime,history:historyStore,scope:{pageId:b.pageId,conversationId:b.conversationId,customerHash:b.customerHash,
   recipientHash:createHash('sha256').update('synthetic-recipient-'+b.customerHash).digest('hex')}})};
}
