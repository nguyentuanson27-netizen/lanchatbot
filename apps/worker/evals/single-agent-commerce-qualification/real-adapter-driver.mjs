// Runs the existing real-PostgreSQL invariant harness. Synthetic domain inputs; no provider/live send.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {digest} from './qualification.mjs';
import {assertCurrentCandidate,assertApprovedDecisions} from './source-identity.mjs';
export const REAL_CHECKS=Object.freeze({
 stale_revision:'B composed newer inbound between final readback and commit cancels eligibility without an Outbox',
 duplicate_source:'B3 native cart commits once; duplicate does not repeat database transaction',
 crash_after_commit:'B composed recovery accounting commit-response-lost',
 ambiguous_reconciliation:'B3 native quantity change persists, unknown commit reconciles without replay',
 operation_idempotency:'B composed ingress commits an open cart, authorizes the exact reply and captures delivery once',
 history_outbox_recovery:'B composed two native mutations retain one source and next owner receives accepted history and current cart',
 no_duplicate_effect:'B composed N4 sends exact text and selected image in one response group without replay duplicates'});
export function validateRealAdapterReport(report,registration){
 assert(report.sourceSha===registration.runSourceSha&&report.sourceDirty===false&&report.testDatabaseDropped===true&&report.status==='PASS'&&
  report.providerGenerations===0&&report.sendEnabled===false&&report.mode==='REAL_POSTGRES_SYNTHETIC_DOMAIN_INPUTS_CURRENT_POLICY_CAPTURE','C_REAL_ADAPTER_REPORT');
 assert(Array.isArray(report.cases)&&new Set(report.cases.map(c=>c.name)).size===report.cases.length,'C_REAL_ADAPTER_CASES');
 return Object.entries(REAL_CHECKS).map(([name,exact])=>{
  const rows=report.cases.filter(c=>c.name===exact);assert(rows.length===1&&rows[0].status==='PASS','C_REAL_ADAPTER_INVARIANT_MISSING');
  return {name,status:'PASS',artifactHash:digest(report),caseName:exact};
 });
}
if(process.argv[1]?.endsWith('real-adapter-driver.mjs')){
 const [regPath,out]=process.argv.slice(2);assert(regPath&&out,'C_REAL_ADAPTER_ARGUMENTS');
 const repo=process.cwd(),reg=JSON.parse(readFileSync(regPath,'utf8')),r=relative(repo,resolve(out));
 assert(r&&(r==='..'||r.startsWith('..'+sep)||isAbsolute(r)),'C_RAW_OUTPUT_OUTSIDE_SOURCE');
 const checkSource=()=>{assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),reg.runSourceSha,'C_RUN_SOURCE_CHANGED');
  assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','C_DIRTY_SOURCE');
  assertCurrentCandidate(repo,reg.config);assertApprovedDecisions(repo,reg.config);};
 checkSource();mkdirSync(out);
 const base='apps/worker/evals/single-agent-commerce-read-only',command=[resolve(base,'source-session.py'),'node',resolve(base,'isolated-integration.mjs'),resolve(out,'postgres'),'COD'],
  record={command:['python',...command],startedAt:new Date().toISOString(),sourceSha:reg.runSourceSha,sendEnabled:false,providerRequests:0};
 writeFileSync(resolve(out,'COMMAND.json'),JSON.stringify(record,null,2),{flag:'wx'});
 const {openSync,closeSync}=await import('node:fs'),fd=openSync(resolve(out,'COMMAND.log'),'wx');
 const child=spawn('python',command,{cwd:repo,windowsHide:true,stdio:['ignore',fd,fd]});
 const exitCode=await new Promise(resolve=>{child.on('error',()=>resolve(-1));child.on('exit',code=>resolve(code??-1));});closeSync(fd);
 record.exitCode=exitCode;record.completedAt=new Date().toISOString();writeFileSync(resolve(out,'COMMAND.json'),JSON.stringify(record,null,2));
 const result={status:'BLOCKED',kind:'REAL_ADAPTER_SEND_DISABLED',candidateIdentity:reg.identity.candidate,sendEnabled:false,checks:[],providerRequests:0};
 try{assert.equal(exitCode,0,'C_REAL_ADAPTER_COMMAND_FAILED');checkSource();const report=JSON.parse(readFileSync(resolve(out,'postgres/integration.json'),'utf8'));
  result.checks=validateRealAdapterReport(report,reg);result.status='PASS';result.domainInputs='SYNTHETIC_ACTUAL_PERSISTENCE_AND_CAPTURE';
 }catch(error){result.errorCode=/^[A-Z0-9_]+$/.test(error.message)?error.message:'C_REAL_ADAPTER_VALIDATION_FAILED';process.exitCode=2;}
 writeFileSync(resolve(out,'REAL_ADAPTER.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
}
