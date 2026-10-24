// Evaluator registration only. Never forwarded to a model or used as a production router.
import assert from 'node:assert/strict';
export function selectStatefulThrough(cases,through){
 if(through===undefined)return cases;
 const index=cases.findIndex(c=>c.caseId===through);
 assert(index>=0,'UNKNOWN_THROUGH_CASE');
 return cases.slice(0,index+1);
}
export function registerMediaFollowup(rows){
 assert(Array.isArray(rows)&&rows.length===5,'FIVE_MEDIA_JOURNEYS');
 assert.equal(new Set(rows.map(j=>j.caseId)).size,rows.length,'DUPLICATE_MEDIA_JOURNEY');
 const samples=rows.flatMap(j=>{
  assert(Array.isArray(j.initialProductCodes)&&j.initialProductCodes.length===1&&typeof j.initialProductCodes[0]==='string','MEDIA_PRODUCT_SETUP');
  assert(Array.isArray(j.turns)&&j.turns.length>=1&&j.turns.length<=2,'MEDIA_TURN_BOUND');
  return j.turns.map(t=>{
   assert(typeof t.turnId==='string'&&t.turnId.trim(),'MEDIA_TURN_ID');
   const messages=journeyMessages(t);
   assert(messages.length===1&&typeof messages[0].text==='string'&&messages[0].text.trim(),'MEDIA_ONE_TURN');
   // No synthetic shop history. The existing runner reuses the actual journey/capture.
   return {caseId:j.caseId+':'+t.turnId,journeyId:j.caseId,runtime:{messages,latest:messages[0].text,
    initialProductCodes:[...j.initialProductCodes]},evaluator:structuredClone(t.evaluator)};
  });
 });
 assert.equal(samples.length,7,'SEVEN_MEDIA_TURNS');
 assert.equal(new Set(samples.map(c=>c.caseId)).size,samples.length,'DUPLICATE_MEDIA_TURN');
 return samples;
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

export function registerOpeningQuotes(rows){
 assert(Array.isArray(rows)&&rows.length===5,'FIVE_OPENING_QUOTE_TURNS');
 assert.equal(new Set(rows.map(r=>r.caseId)).size,5,'DUPLICATE_OPENING_QUOTE');
 assert.equal(rows[0].journeyId,rows[1].journeyId,'REPEAT_USES_ACTUAL_HISTORY');
 assert.equal(new Set(rows.map(r=>r.journeyId)).size,4,'FOUR_OPENING_JOURNEYS');
 return rows.map(r=>{
  assert(!Object.hasOwn(r.runtime,'history'),'NO_SYNTHETIC_SHOP_HISTORY');
  const messages=journeyMessages(r);assert.equal(messages.length,1);
  assert.equal(messages[0].text,r.runtime.latest,'LATEST_MATCHES_MESSAGE');
  assert(Array.isArray(r.runtime.initialProductCodes)&&r.runtime.initialProductCodes.length<=3);
  return {caseId:r.caseId,journeyId:r.journeyId,runtime:{messages,latest:messages[0].text,initialProductCodes:[...r.runtime.initialProductCodes]},evaluator:structuredClone(r.evaluator)};
 });
}
