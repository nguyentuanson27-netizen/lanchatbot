import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRepetitions,compareRuns,REPETITION_POLICY} from './repetition-summary.mjs';
import {diagnosticSlots,diagnosticScope} from './diagnostic.mjs';
import {readFileSync} from 'node:fs';

const run=spec=>Object.entries(spec).flatMap(([caseId,results])=>[...results].map((r,i)=>({caseId,repetition:i+1,status:r==='x'?'NOT_RUN':'EXECUTED',
 terminal:{disposition:r==='p'?'SEND_ELIGIBLE':'HANDOFF',reason:r==='p'?'PASS':'RESPONSE_UNAVAILABLE'},ok:r==='p'?true:r==='?'?null:false})));
const graded=a=>a.ok;
test('classifies each case by its pass count over at least five repetitions',()=>{
 const s=summarizeRepetitions(run({a:'ppppp',b:'ppppf',c:'ppfff',d:'pffff',e:'fffff',f:'ppp',g:'pppp?',h:'ppppx'}),graded);
 assert.deepEqual(Object.fromEntries(s.cases.map(c=>[c.caseId,c.classification])),
  {a:'STABLE_PASS',b:'STABLE_PASS',c:'FLAKY',d:'STABLE_FAIL',e:'STABLE_FAIL',f:'UNDER_SAMPLED',g:'UNGRADED',h:'STABLE_PASS'});
 assert.deepEqual(s.totals,{cases:8,stablePass:3,flaky:1,stableFail:2,underSampled:1,ungraded:1});
 // A repetition that did not run is a failure, never dropped from the denominator.
 assert.deepEqual([s.cases[7].passed,s.cases[7].failed,s.cases[7].notRun,s.cases[7].graded],[4,1,1,5]);
 assert.deepEqual(s.cases[2].terminals,{'SEND_ELIGIBLE/PASS':2,'HANDOFF/RESPONSE_UNAVAILABLE':3});
 assert.throws(()=>summarizeRepetitions([...run({a:'p'}),...run({a:'p'})],graded),/REPETITION_DUPLICATE/);
});
test('a fix is accepted only when its targets pass and no other case drops by two or more',()=>{
 const before=summarizeRepetitions(run({j4:'pffff',s04:'ppfff',j1:'ppppp',p08:'ppppp'}),graded);
 const good=summarizeRepetitions(run({j4:'ppppp',s04:'ppppf',j1:'ppppf',p08:'ppppp'}),graded);
 assert.deepEqual(compareRuns(before,good,['j4','s04']),{decision:'ACCEPT',targetsMissed:[],regressions:[],incomparable:[]});
 const trade=summarizeRepetitions(run({j4:'ppppp',s04:'ppppp',j1:'pppff',p08:'ppppp'}),graded);
 assert.deepEqual(compareRuns(before,trade,['j4','s04']),{decision:'REVERT',targetsMissed:[],regressions:[{caseId:'j1',before:5,after:3}],incomparable:[]});
 const partial=summarizeRepetitions(run({j4:'ppppp',s04:'pppff',j1:'ppppp',p08:'ppppp'}),graded);
 assert.equal(compareRuns(before,partial,['j4','s04']).decision,'REVERT');assert.deepEqual(compareRuns(before,partial,['j4','s04']).targetsMissed,['s04']);
 // One sample per case cannot decide anything, and the population must be the same on both sides.
 const single=summarizeRepetitions(run({j4:'p',s04:'p',j1:'p',p08:'p'}),graded);
 assert.equal(compareRuns(before,single,['j4']).decision,'NOT_COMPARABLE');
 assert.throws(()=>compareRuns(before,summarizeRepetitions(run({j4:'ppppp'}),graded),['j4']),/POPULATION_CHANGED/);
 assert.equal(REPETITION_POLICY.passAtLeast,4);
});
test('a diagnostic registration can hold every case several times without changing single-run identities',()=>{
 const scope=JSON.parse(readFileSync(new URL('./TOOL_CONTRACT_SCREEN_SCOPE_20261109.json',import.meta.url)));
 const corpus={provenance:{developmentOnly:true,diagnosticScope:scope.name},scenarios:scope.cases.map(c=>({id:c.sourceCase,mode:c.mode??(c.turns===3?'JOURNEY':'SINGLE'),turns:Array.from({length:c.turns},()=>({}))}))};
 assert.equal(diagnosticScope(corpus).name,scope.name);
 const one=diagnosticSlots(corpus),five=diagnosticSlots(corpus,5);
 assert.equal(five.length,one.length*5);assert.equal(new Set(five.map(s=>s.slotId)).size,five.length);
 assert.deepEqual(five.filter(s=>s.repetition===1),one);
 for(const s of one)assert.deepEqual(five.filter(x=>x.caseId===s.caseId).map(x=>[x.repetition,x.maximumGenerations]),[1,2,3,4,5].map(k=>[k,s.maximumGenerations]));
 for(const bad of [0,11,1.5])assert.throws(()=>diagnosticSlots(corpus,bad),/D_REPETITIONS/);
});
