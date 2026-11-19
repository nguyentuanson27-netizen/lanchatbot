import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digest,runtimeProjection} from './qualification.mjs';
import {diagnosticScope,diagnosticSlots,diagnosticControl} from './diagnostic.mjs';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url)));
const parent=read('./B_PRESERVING_PREFIX_SCOPE_20261104.json'),stages=['R1','R2'].map(n=>read(`./TARGET_REPAIR_${n}_SCOPE_20261105.json`));
const corpus=s=>({provenance:{diagnosticScope:s.name},scenarios:s.cases.map(c=>({id:c.sourceCase,mode:c.mode,turns:Array.from({length:c.turns},()=>({latest:'Chị lấy bộ này nhé.',history:[],initialProductCodes:['SM613']})),evaluator:{unsafe:true,requiredCustomerOutcomes:['EVALUATOR_ONLY']},judgeContext:{score:'EVALUATOR_ONLY'}}))});
test('priority stages are exact disjoint subsets of the existing prefix, retaining all case order, turns and caps',()=>{
 const [a,b]=stages;assert.deepEqual([a.maximumCases,a.maximumNativeCustomerTurns,a.maximumGenerationRequests],[4,7,28]);assert.deepEqual([b.maximumCases,b.maximumNativeCustomerTurns,b.maximumGenerationRequests],[9,17,68]);
 assert.deepEqual(a.cases.map(c=>c.sourceCase),['c-po-20261031-p06','c-po-20261031-p07','c-po-20261031-p08','c-20261028-j1']);
 const ids=new Set(a.cases.map(c=>c.sourceCase));assert.deepEqual(a.cases,parent.cases.filter(c=>ids.has(c.sourceCase)));assert.deepEqual(b.cases,parent.cases.filter(c=>!ids.has(c.sourceCase)));
 assert.equal(new Set([...a.cases,...b.cases].map(c=>c.sourceCase)).size,13);
 for(const s of stages){assert.equal(s.parentScopeHash,digest(parent));assert.equal(s.repetitions,1);assert.equal(s.generationRetry,0);assert.equal(s.maximumOwnerGenerationsPerNativeTurn,3);assert.equal(s.maximumVerifierGenerationsPerTurn,1);assert.match(s.customerScriptsHash,/^[a-f0-9]{64}$/);
  const c=corpus(s);assert.equal(diagnosticScope(c).name,s.name);const slots=diagnosticSlots(c);assert.equal(slots.reduce((n,x)=>n+x.maximumGenerations,0),s.maximumGenerationRequests);
  for(const change of [c=>c.scenarios.reverse(),c=>c.scenarios.pop(),c=>c.scenarios[0].id='UNREGISTERED',c=>c.scenarios[0].turns.push({})]){const bad=corpus(s);change(bad);assert.throws(()=>diagnosticSlots(bad));}
 }
});
test('stage caps account for every generation and runtime projection excludes all evaluator labels',()=>{
 for(const s of stages){const c=corpus(s),reg={corpus:c,slots:diagnosticSlots(c)},control=diagnosticControl(reg,{checkSource:()=>{}}),rows=[];
  for(const slot of reg.slots)for(let turnIndex=0;turnIndex<slot.maximumGenerations/4;turnIndex++)for(const role of ['OWNER','OWNER','OWNER','VERIFIER']){control.beforeGeneration({generations:rows,active:{slotId:slot.slotId,turnIndex},role});rows.push({slotId:slot.slotId,turnIndex,role,status:'OK',providerRequests:0});}
  assert.equal(rows.length,s.maximumGenerationRequests);assert.throws(()=>control.beforeGeneration({generations:rows,active:{slotId:reg.slots[0].slotId,turnIndex:0},role:'OWNER'}),/BATCH_CAP/);
  for(const x of c.scenarios){const wire=JSON.stringify(runtimeProjection(x,0,{acceptedHistory:[]}));for(const label of [x.id,s.name,'EVALUATOR_ONLY','requiredCustomerOutcomes','judgeContext'])assert(!wire.includes(label));}
 }
});
