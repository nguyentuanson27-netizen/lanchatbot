// Evaluator registration only. Never forwarded to a model or used as a production router.
import assert from 'node:assert/strict';
export function journeyMessages(turn){
 assert(!turn.runtime.privateFixture,'PRIVATE_FIXTURE_NOT_MATERIALIZED');
 assert(Array.isArray(turn.runtime.messages)&&turn.runtime.messages.length,'JOURNEY_MESSAGES');
 return turn.runtime.messages.map(m=>{
  assert(m.attachments.every(a=>!a.fixtureRef),'MEDIA_FIXTURE_NOT_MATERIALIZED');
  return {text:m.text,attachments:m.attachments.map(a=>({type:a.type,...(a.url?{url:a.url}:{}),...(a.providerId?{providerId:a.providerId}:{})})),
   ...(m.adsContext?{adsContext:structuredClone(m.adsContext)}:{})};
 });
}
export function registerJourneyOpenings(corpus,purposes){
 assert(purposes.length&&new Set(purposes).size===purposes.length,'DUPLICATE_OR_EMPTY_SELECTION');
 const supported=new Set(['J02','J03','J05','J08']);
 assert(purposes.every(p=>supported.has(p)),'SETUP_NOT_MATERIALIZED');
 const samples=[],deferred=[];
 for(const j of corpus.journeys)for(const [i,t]of j.turns.entries()){
  if(i===0&&purposes.includes(j.purposeId)){
   assert(t.evaluator.route==='PUBLIC_MODEL'&&!j.evaluator.setup.cartFixture,'SETUP_NOT_MATERIALIZED');
   const messages=journeyMessages(t);
   samples.push({caseId:j.caseId+':'+t.turnId,journeyId:j.caseId,purposeId:j.purposeId,runtime:{messages,
    latest:messages.map(m=>m.text??'').join('\n'),history:[],initialProductCodes:[...j.evaluator.setup.initialProductCodes]},evaluator:structuredClone(t.evaluator)});
  }else deferred.push({caseId:j.caseId,turnId:t.turnId,status:'NOT_REGISTERED',reason:purposes.includes(j.purposeId)?'DEPENDENT_TURN_REQUIRES_ACCEPTED_OUTPUT_REVIEW':'PREREQUISITE_OR_SETUP_NOT_REGISTERED'});
 }
 assert.equal(samples.length,purposes.length,'UNKNOWN_PURPOSE');
 return {samples,deferred};
}
