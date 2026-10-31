// Local read-only source inventory. Never loads credentials or starts inference.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {digest,textDigest} from './qualification.mjs';
export const IMPLEMENTATION_BASE_SHA='f160dfa4f7e0c8b3e29232570710d99d4f5ed012';

export function currentCandidate(repo){
 const git=(...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
 const read=p=>readFileSync(resolve(repo,p),'utf8');
 const base='apps/worker/evals/single-agent-commerce-read-only/';
 const m=JSON.parse(read(base+'manifest.json'));
 const files=git('ls-files','apps/worker','packages','pnpm-lock.yaml','package.json','pnpm-workspace.yaml').split('\n').filter(p=>
  p&&!/\.test\.|test-support|\/dist\/|node_modules/.test(p)&&/\.(ts|mjs|txt|json|yaml)$/.test(p)&&
  (!p.includes('/evals/')||p.endsWith('.mjs')||p.includes('/prompts/')||p===base+'manifest.json'));
 const inventory=Object.fromEntries(files.map(p=>[p,textDigest(read(p).replaceAll('\r\n','\n'))]));
 const owner=textDigest(read(base+'prompts/owner.vi.txt')),verifier=textDigest(read(base+'prompts/verifier.vi.txt'));
 assert(owner===m.promptHashes.owner&&verifier===m.promptHashes.verifier,'C_PROMPT_MANIFEST_MISMATCH');
 assert(textDigest(JSON.stringify(m.verdictSchema))===m.schemaHash,'C_SCHEMA_MANIFEST_MISMATCH');
 for(const p of ['apps/worker/src/single-agent-commerce-ingress.ts','apps/worker/src/single-agent-commerce.ts',
  'apps/worker/src/single-agent-commerce-media-delivery.ts','apps/worker/src/single-agent-semantic-verifier-boundary.ts'])
  assert(inventory[p],'C_SOURCE_INVENTORY_INCOMPLETE');
 return {sourceSha:git('rev-parse','HEAD'),model:m.models.conversation,promptHash:owner,
  contextPolicyHash:digest({presentation:'VI_DATA_BLOCKS_COMPACT_V2',bounds:m.requestBounds,source:inventory['apps/worker/src/single-agent-commerce-ingress.ts']}),
  toolContractHash:digest({calls:m.toolCalls,rounds:m.toolRounds,source:inventory['apps/worker/src/single-agent-commerce.ts']}),
  assemblyHash:digest({ingress:inventory['apps/worker/src/single-agent-commerce-ingress.ts'],gate:inventory['apps/worker/src/single-agent-commerce-media-delivery.ts']}),
  runtimeHash:digest(inventory),verifier:{model:m.models.verifier,promptHash:verifier,schemaHash:m.schemaHash,
   serializationHash:textDigest(read(base+'protocol.mjs').replaceAll('\r\n','\n')),
   bindingHash:digest(inventory['apps/worker/src/single-agent-semantic-verifier-boundary.ts']),boundsHash:digest(m.requestBounds)}};
}
export function assertCurrentCandidate(repo,config){
 assert.deepEqual(config.candidate,currentCandidate(repo),'C_EXECUTABLE_OR_CONFIG_CHANGED');
}
export function assertApprovedDecisions(repo,config){
 const d=JSON.parse(readFileSync(resolve(repo,'apps/worker/evals/single-agent-commerce-qualification/owner-decisions.json'),'utf8'));
 assert(d.status==='APPROVED'&&config.ownerDecision?.decisionHash===digest(d)&&digest(config.thresholds)===digest(d.thresholds)&&
  config.repetitions===d.repetitions&&config.baseline?.sourceSha===d.comparisonBaselineSha,'C_OWNER_DECISION_CHANGED');
 if(d.judge)assert(config.judge?.kind===d.judge.kind&&config.judge.identity===d.judge.identity&&digest(config.judge.model)===digest(d.judge.model)&&
  config.judge.promptHash===digest(readFileSync(resolve(repo,'apps/worker/evals/single-agent-commerce-qualification/prompts/judge.vi.txt'),'utf8')),'C_OWNER_JUDGE_CHANGED');
}
