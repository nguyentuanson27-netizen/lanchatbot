// Evaluator registration only. Never forwarded to a model or used as a production router.
import assert from 'node:assert/strict';
export function selectStatefulThrough(cases,through){
 if(through===undefined)return cases;
 const index=cases.findIndex(c=>c.caseId===through);
 assert(index>=0,'UNKNOWN_THROUGH_CASE');
 return cases.slice(0,index+1);
}
export function registerMediaProbe(rows){
 assert(Array.isArray(rows)&&rows.length===4,'FOUR_MEDIA_CASES');
 assert.equal(new Set(rows.map(c=>c.caseId)).size,4,'DUPLICATE_MEDIA_CASE');
 return rows.map(c=>{
  assert(typeof c.caseId==='string'&&c.caseId.trim(),'MEDIA_CASE_ID');
  assert(c.runtime.initialProductCodes.length===1&&typeof c.runtime.initialProductCodes[0]==='string','MEDIA_PRODUCT_SETUP');
  const messages=journeyMessages(c);
  assert(messages.length===1&&typeof messages[0].text==='string'&&messages[0].text.trim(),'MEDIA_ONE_TURN');
  return {caseId:c.caseId,journeyId:c.caseId,runtime:{messages,latest:messages[0].text,history:[],initialProductCodes:[...c.runtime.initialProductCodes]},
   evaluator:structuredClone(c.evaluator)};
 });
}
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
export function registerNegotiationProbe(corpus,baseline){
 const opening=baseline.find(c=>c.caseId==='stateful-open'),objection=corpus.journeys.find(j=>j.purposeId==='J07')?.turns[0];
 assert(opening&&objection,'NEGOTIATION_SOURCE_CASES');
 const journeyId='negotiation-companion';
 return [{...structuredClone(opening),caseId:'negotiation-cart-setup',journeyId},
  {caseId:'negotiation-price-objection',journeyId,runtime:{latest:journeyMessages(objection).map(m=>m.text??'').join('\n'),initialProductCodes:['SV2447']},evaluator:{requiresCurrentCart:true,purpose:'One source-bound PRICE_OBJECTION; only current code quote is authorized.'}},
  {caseId:'negotiation-total-control',journeyId,runtime:{latest:'Thế một áo cả ship là bao nhiêu em?',initialProductCodes:['SV2447']},evaluator:{requiresCurrentCart:true,purpose:'Ordinary total question must not add objection evidence or a concession.'}}];
}
