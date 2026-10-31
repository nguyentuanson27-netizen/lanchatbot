// Pins the entire main reference and its built workspace closure, not current-branch C3 dist.
import {readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {resolve,relative,sep,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const MAIN_C3_SHA='296cdcfbf5759f5bf9cbb24acf3dc63005589361';
const hash=v=>createHash('sha256').update(v).digest('hex');
const inside=(root,path)=>{const r=relative(root,path);return r===''||!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};
const git=(repo,...args)=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
function walk(root,dir){
 return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const path=resolve(dir,e.name);return e.isDirectory()?walk(root,path):e.isFile()?[relative(root,path).replaceAll('\\','/')]:[];
 });
}
export function baselineInventory(repo){
 const root=realpathSync(repo);
 assert.equal(git(root,'rev-parse','HEAD'),MAIN_C3_SHA,'C_BASELINE_MAIN_CHANGED');
 assert.equal(git(root,'status','--porcelain','--untracked-files=all'),'','C_BASELINE_DIRTY');
 const files=git(root,'ls-files','apps/worker/src','apps/worker/package.json','apps/worker/tsconfig.json','packages',
  'package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.base.json').split('\n').filter(Boolean);
 const source=Object.fromEntries(files.map(p=>[p,hash(readFileSync(resolve(root,p)))]));
 const dirs=['apps/worker/dist',...readdirSync(resolve(root,'packages'),{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>'packages/'+e.name+'/dist')];
 const outputs=dirs.flatMap(p=>{try{return walk(root,resolve(root,p));}catch(e){if(e.code==='ENOENT')return [];throw e;}}).sort();
 assert(outputs.includes('apps/worker/dist/track-c-c3-v5-benchmark-runner.js'),'C_BASELINE_BUILD_REQUIRED');
 const packageRoots=['apps/worker',...readdirSync(resolve(root,'packages'),{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>'packages/'+e.name)];
 for(const packageRoot of packageRoots){
  const manifest=JSON.parse(readFileSync(resolve(root,packageRoot,'package.json'),'utf8'));
  for(const name of Object.keys({...manifest.dependencies,...manifest.devDependencies}).filter(n=>n.startsWith('@lana/'))){
   const linked=realpathSync(resolve(root,packageRoot,'node_modules',name));
   assert(inside(root,linked)&&linked===realpathSync(resolve(root,'packages',name.slice('@lana/'.length))),'C_BASELINE_FOREIGN_WORKSPACE_DEPENDENCY');
  }
 }
 const built=Object.fromEntries(outputs.map(p=>[p,hash(readFileSync(resolve(root,p)))]));
 return {version:1,sourceSha:MAIN_C3_SHA,sourceTree:git(root,'rev-parse','HEAD^{tree}'),
  sourceHash:hash(JSON.stringify(source)),buildHash:hash(JSON.stringify(built)),source,built,
  entry:'apps/worker/dist/track-c-c3-v5-benchmark-runner.js',sendEnabled:false};
}
export async function loadPinnedC3(repo,expected){
 const current=baselineInventory(repo);assert.deepEqual(current,expected,'C_BASELINE_SOURCE_OR_BUILD_CHANGED');
 return import(pathToFileURL(resolve(realpathSync(repo),current.entry)).href);
}
export async function loadPinnedC3Transport(repo,expected){
 const current=baselineInventory(repo);assert.deepEqual(current,expected,'C_BASELINE_SOURCE_OR_BUILD_CHANGED');
 return import(pathToFileURL(resolve(realpathSync(repo),'apps/worker/dist/context-v2-candidate.js')).href);
}
export async function loadPinnedC3Context(repo,expected){
 const current=baselineInventory(repo);assert.deepEqual(current,expected,'C_BASELINE_SOURCE_OR_BUILD_CHANGED');
 const load=p=>import(pathToFileURL(resolve(realpathSync(repo),p)).href);
 const [context,business]=await Promise.all([load('apps/worker/dist/context-v2.js'),load('packages/business-tools/dist/index.js')]);
 return {buildContextV2Capture:context.buildContextV2Capture,buildCanonicalDecisionEvidenceV1:business.buildCanonicalDecisionEvidenceV1};
}
if(process.argv[1]?.endsWith('baseline-source.mjs')){
 const [repo,out]=process.argv.slice(2);assert(repo&&out,'C_BASELINE_ARGUMENTS');
 const root=realpathSync(repo),output=resolve(out);assert(!inside(root,output),'C_BASELINE_EVIDENCE_OUTSIDE_REFERENCE');
 const inventory=baselineInventory(root);writeFileSync(output,JSON.stringify(inventory,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:'MAIN_SOURCE_AND_BUILT_CLOSURE_PINNED',sourceSha:inventory.sourceSha,
  sourceFiles:Object.keys(inventory.source).length,builtFiles:Object.keys(inventory.built).length,sourceHash:inventory.sourceHash,buildHash:inventory.buildHash,providerRequests:0}));
}
