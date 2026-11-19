// Diagnostic only: seed copies of two accepted public turns, measure only the
// five previously blocked final turns through the existing native PG fixture.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {digest,write} from './bc-control.mjs';
export async function runJ4PreparationRecheck({input,out,ports,sessionFactory,snapshot}){
 assert.equal(input.mode,'J4_RECHECK');assert.equal(input.slots?.length,5);
 assert.deepEqual(input.slots.map(s=>s.repetition),[1,2,3,4,5]);
 assert.equal(input.maximumGenerationRequests,20);assert.equal(digest(input.slots),input.slotsHash);
 const prefix=JSON.parse(readFileSync(input.prefixFile,'utf8'));
 assert.equal(digest(prefix),input.prefixHash);assert.equal(prefix.conversations.length,5);
 const rows=[];
 for(const slot of input.slots){
  ports.source();
  assert(Date.parse(input.minimumProofExpiresAt)>Date.now()+input.safetyMarginMs+360000,'J4_SOURCE_HEADROOM');
  const prior=prefix.conversations.find(c=>c.repetition===slot.repetition);assert(prior&&prior.turns.length===3);
  assert.equal(prior.turns[2].customer,slot.latest);assert(prior.turns.slice(0,2).every(t=>t.terminal.disposition==='SEND_ELIGIBLE'&&t.terminal.messages.length===1));
  ports.preparation();const session=await sessionFactory({live:true,initialProductCodes:['SV2447']});
  const seeded=[];
  for(let index=0;index<2;index++){
   const calls=index===0?[{name:'add_to_cart',args:{subjectRef:'SV2447',offerType:'AO',size:'M',color:null,quantity:1}}]:[
    {name:'record_negotiation',args:{intent:'PRICE_OBJECTION',sourceQuote:prior.turns[1].customer,subjectRef:'SV2447',offerType:'AO'}},
    {name:'quote_product',args:{subjectRef:'SV2447',offerTypes:['AO'],quantity:1}}];
   let step=0;
   ports.preparation({owner:()=>++step===1?{kind:'TOOLS',calls,content:{role:'model',parts:calls.map(functionCall=>({functionCall}))}}:
    {kind:'FINAL',text:prior.turns[index].terminal.messages[0]}});
   const observed=await session.turn(prior.turns[index].customer,[]);
   assert.equal(observed.result?.terminal.disposition,'SEND_ELIGIBLE','J4_SEED_NOT_ACCEPTED');
   if(index===1){const quote=observed.toolResponses?.find(t=>t.name==='quote_product')?.response.data?.preCartQuote;
    assert.equal(quote?.supportEvaluation?.status,'QUOTED');assert.equal(quote.grandTotalVnd,499000,'J4_SEED_PRICE_CHANGED');}
   await session.drain();seeded.push({customer:prior.turns[index].customer,observed});
  }
  write(resolve(out,`J4_${slot.repetition}_PREFIX.json`),{kind:'SCRIPTED_FIXTURE_NOT_PROVIDER_OUTCOMES',
   source:input.runSourceSha,prefixHash:input.prefixHash,scriptedVerifierForPrefixOnly:true,providerRequests:0,turns:seeded});
  const before=await snapshot(session),captureStart=session.capturePayloads.length;
  ports.setStage('J4_RECHECK',slot.repetition,'A');
  const observed=await session.turn(slot.latest,[]);ports.checkOutcome(observed);
  if(observed.qualification?.status==='VALID')await session.drain();
  const row={repetition:slot.repetition,customer:slot.latest,before,observed,after:await snapshot(session),
   acceptedMessages:session.capturePayloads.slice(captureStart)};
  write(resolve(out,`J4_${slot.repetition}_RESULT.json`),row);rows.push(row);
 }
 const accounting=ports.accounting();assert(Number.isSafeInteger(accounting.providerRequests)&&accounting.providerRequests<=20);
 const result={kind:'FIVE_TARGETED_J4_FINAL_TURNS_NOT_WHOLE_JOURNEY_REPETITIONS',source:input.runSourceSha,worldHash:input.worldHash,
  prefixHash:input.prefixHash,attempts:5,measuredTurns:5,scriptedSetupTurns:10,maximumGenerationRequests:20,
  providerRequests:accounting.providerRequests,rows,liveSends:0,sourceWrites:0,qualification:false};
 write(resolve(out,'J4_RECHECK_RESULT.json'),result);return {kind:result.kind,attempts:5,providerRequests:result.providerRequests};
}
