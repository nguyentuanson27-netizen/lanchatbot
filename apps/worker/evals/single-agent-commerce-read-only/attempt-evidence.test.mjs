import test from 'node:test';
import assert from 'node:assert/strict';
import {createAttemptQueue,retainObservedAttempt,unobservedAttempt,summarizeAttemptQualification} from './attempt-evidence.mjs';
import {validateToolWorkAccounting} from './protocol.mjs';

const observed=()=>({result:{terminal:{disposition:'HANDOFF',reason:'DEPENDENCY_FAILURE',text:null},
 toolWorkAccounting:'PRIMITIVE_WORK_V2',normalToolCalls:1,terminalHandoffCalls:1,toolCalls:2,
 executedNormalToolInvocations:1,executedToolInvocations:1,quoteTaskWork:[],generations:[{id:'g1',role:'owner',status:'PROVIDER_ERROR',telemetry:{providerRequests:1,httpStatus:200,inputTokens:100,outputTokens:20}}]},owners:1,verifiers:0});

test('validation before fixture return and at consumer retains one observed terminal and usage',()=>{
 for(const stage of ['FIXTURE_RETURN','CONSUMER']){
  const queue=createAttemptQueue(),envelope=observed(),before=structuredClone(envelope);
  const attempt=retainObservedAttempt(envelope,{queue,slot:'registered-slot',stage,validate:validateToolWorkAccounting});
  assert.equal(attempt.result,envelope.result);assert.deepEqual(envelope,before);
  assert.equal(attempt.errorCode,'TOOL_WORK_COUNTER');assert.equal(attempt.qualification.status,'INVALID');
  assert.equal(queue.blocked().slot,'registered-slot');
  assert.deepEqual(summarizeAttemptQualification([attempt]),{registered:1,executed:1,notRun:0,observedTerminals:{HANDOFF:1},unknownTerminals:0,qualificationErrors:1});
  assert.equal(attempt.result.generations[0].telemetry.providerRequests,1);
 }
});

test('shared queue latches all later journeys and dispatch entrypoints; independent queue continues',async()=>{
 const queue=createAttemptQueue(),other=createAttemptQueue();let sends=0,writes=0,generations=0;
 const rows=[{status:'PENDING',group:'observed-before-validation'}],before=structuredClone(rows);
 retainObservedAttempt(observed(),{queue,slot:'first',validate:validateToolWorkAccounting});
 const blocked=await queue.run('next-journey',async()=>{writes++;generations++;return {result:{terminal:{disposition:'SEND_ELIGIBLE'}}};});
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.executionStatus,'NOT_RUN_BY_QUALIFICATION');assert.equal(blocked.result,undefined);
 assert.equal(await queue.dispatch(async()=>{sends++;return true;}),false);
 assert.equal(await queue.dispatch(async()=>{sends++;return true;}),false);
 assert.equal(await other.dispatch(async()=>{sends++;return true;}),true);
 assert.equal(sends,1);assert.equal(writes,0);assert.equal(generations,0);assert.deepEqual(rows,before);
 assert.equal(summarizeAttemptQualification([blocked]).notRun,1);
});

test('exception without observed result stays unknown, sanitizes error and latches queue',()=>{
 const queue=createAttemptQueue();const attempt=unobservedAttempt(new Error('PRIVATE_CUSTOMER_TEXT'),{queue,slot:'first'});
 assert.equal(attempt.result,undefined);assert.equal(attempt.errorCode,'ATTEMPT_UNAVAILABLE');
 assert(!JSON.stringify(attempt).includes('PRIVATE_CUSTOMER_TEXT'));
 assert.deepEqual(summarizeAttemptQualification([attempt]),{registered:1,executed:1,notRun:0,observedTerminals:{},unknownTerminals:1,qualificationErrors:1});
});

test('valid and historical shapes stay valid, failed qualification cannot be reset by revalidation',()=>{
 const queue=createAttemptQueue(),input=observed();input.result.executedToolInvocations=2;
 const valid=retainObservedAttempt(input,{queue,slot:'valid',validate:validateToolWorkAccounting});assert.equal(valid.qualification.status,'VALID');assert.equal(queue.blocked(),null);
 const legacy=retainObservedAttempt({result:{terminal:{disposition:'NO_SEND'}}},{queue,slot:'legacy',validate:validateToolWorkAccounting});assert.equal(legacy.qualification.status,'VALID');
 const invalid=retainObservedAttempt(observed(),{queue,slot:'invalid',validate:validateToolWorkAccounting});
 assert.equal(retainObservedAttempt(invalid,{queue,slot:'again',validate:()=>{}}).qualification.status,'INVALID');
});
