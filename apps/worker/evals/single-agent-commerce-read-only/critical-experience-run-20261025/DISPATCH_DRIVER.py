"""Critical-experience verification: frozen N1 targets and fresh scoped safety controls."""
import concurrent.futures, hashlib, json, subprocess, sys
from pathlib import Path

repo=Path(__file__).resolve().parents[5]
out=Path(sys.argv[1]).resolve()
assert not out.is_relative_to(repo), "RAW_OUTPUT_MUST_BE_OUTSIDE_SOURCE"
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
def git(*args):return subprocess.check_output(['git',*args],cwd=repo,text=True).strip()
assert not git('status','--porcelain'),'DIRTY_SOURCE'
source=git('rev-parse','HEAD')
assert git("merge-base","--is-ancestor","e7e0fbf855fc1e167cacee8186e96ea84739886e","HEAD")==""
out.mkdir()
targets=['b1-partial-source-v2','b1-price-v2','b1-component-stock-v2','b1-changed-occasion-v3',
 'sales-discovery-advice:need','sales-product-gallery:overview','stateful-correction',
 'stateful-request-checkout','stateful-private-checkout','stateful-confirm','stateful-human-request']
setup=['stateful-open','stateful-variant-quantity','stateful-quote']
files=['manifest.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','source-config.b1.json',
 'prompts/owner.vi.txt','prompts/verifier.vi.txt','handoff-matrix.candidate.json','run.mjs','isolated-integration.mjs','stateful-provider.mjs',
 'gemini-inference.mjs','protocol.mjs','feedback-controls-20261023.mjs','source-session.py']
prior=json.loads((base/'input-context-full-20261025/REGISTRATION.json').read_text())
hashes={f:hashlib.sha256((base/f).read_bytes()).hexdigest() for f in files}
assert all(hashes[f]==prior['hashes'][f] for f in files if f in prior['hashes'] and f!='manifest.json'),'FROZEN_INPUT_CHANGED'
manifest=json.loads((base/'manifest.json').read_text())
assert manifest['models']==json.loads((base/'input-context-targeted-rerun-20261025/REGISTRATION.json').read_text())['models'], 'MODEL_CHANGED'
assert manifest['ownerFinalRequest']=='TEXT_WITH_COMPLETED_TOOL_DATA'
assert manifest['toolResultAccounting']=='BATCH_EXCLUDING_EXACT_CURRENT_PRODUCT_DUPLICATES'
registration={'sourceSha':source,'previousRunSourceSha':prior['sourceSha'],'mode':'CRITICAL_EXPERIENCE_FIX_VERIFICATION_NOT_FULL_QUALIFICATION','implementationBaseSha':'e7e0fbf855fc1e167cacee8186e96ea84739886e',
 'targets':targets,'prerequisites':setup,'registeredTargets':11,'registeredPrerequisites':3,'registeredOutcomes':14,
 'registeredScopedControls':17,'totalRegisteredSlotsIncludingControls':31,'maximumGenerationRequests':69,'repetitions':1,'generationRetry':0,'sendEnabled':False,
 'models':json.loads((base/'manifest.json').read_text())['models'],'hashes':hashes,
 'driverSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'scopedControls':'17 fresh controls from existing corpus before native dispatch; fail stops native dispatch',
 'changedExecutionConfig':{key:manifest[key] for key in ['ownerFinalRequest','toolResultAccounting']},
 'selection':'B1 ranges11:13,17:17; journey-openings through gallery; full eight-slot stateful journey for three real setup turns and five targets'}
(out/'REGISTRATION.json').write_text(json.dumps(registration,indent=2),encoding='utf-8')
def run(name,args):
 print('START '+name,flush=True)
 with (out/(name+'.log')).open('xb') as f:
  p=subprocess.run(list(map(str,args)),cwd=repo,stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
 row={'name':name,'command':list(map(str,args)),'exitCode':p.returncode}
 (out/(name+'-command.json')).write_text(json.dumps(row,indent=2),encoding='utf-8')
 print('DONE '+name+' exit='+str(p.returncode),flush=True)
 assert p.returncode==0,'COMMAND_FAILED_'+name
 assert git('rev-parse','HEAD')==source and not git('status','--porcelain'),'SOURCE_CHANGED'
 return row
def persisted(name,flags):
 args=[sys.executable,launcher,'node',base/'isolated-integration.mjs']
 shared=['COD','--provider-run','--candidate-handoff',*flags]
 pre=run(name+'-preflight',args+[out/(name+'-preflight'),*shared,'--provider-preflight'])
 result=run(name,args+[out/name,*shared])
 assert json.loads((out/name/'integration.json').read_text(encoding='utf-8-sig'))['testDatabaseDropped'] is True
 return [pre,result]
commands=[]
try:
 session=base/'source-session.py'
 commands.append(run('source-capture',[sys.executable,session,'node',base/'feedback-source-capture.mjs',out/'source']))
 commands.append(run('controls-preflight',['node',base/'feedback-controls-20261023.mjs',out/'controls-preflight','--capture',out/'source/capture.json','--preflight']))
 commands.append(run('controls',['node',base/'feedback-controls-20261023.mjs',out/'controls','--capture',out/'source/capture.json','--prepared',out/'controls-preflight/prepared.json']))
 bootstrap="import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs'; import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs';const i=readFeedbackRunIdentity();assertCleanFeedbackSource(i);console.log(JSON.stringify({identity:i,controlsHash:requirePassingControls(process.argv[1],i)}));"
 commands.append(run('controls-readiness',['node','--input-type=module','-e',bootstrap,out/'controls']))
 # Run the interrupted discovery and dependent checkout journey first; no build race.
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  fs=[pool.submit(persisted,'journey-openings',['--journey-openings','--through-case','sales-product-gallery:overview']),
      pool.submit(persisted,'stateful',[])]
  for f in fs:commands.extend(f.result())
 args=[sys.executable,launcher,'node',base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json']
 commands.append(run('b1-preflight',args+['--out',out/'b1-preflight','--preflight']))
 for name,rng in [('b1-errors-11-13','11:13'),('b1-error-17','17:17')]:
  commands.append(run(name,args+['--out',out/name,'--range',rng,'--run']))
 (out/'COMMANDS.json').write_text(json.dumps(commands,indent=2),encoding='utf-8')
 assert len(commands)==11
 assert git('rev-parse','HEAD')==source and not git('status','--porcelain')
 (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW','sourceSha':source,'sourceUnchanged':True}))
except Exception as e:
 (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'INCOMPLETE','sourceSha':source,'error':str(e)}))
 raise
