"""Native diagnostic after one retained transport failure; never qualification or control retry."""
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
# Diagnose the requested owner flows only when every unsafe control was blocked
# and the sole safe failure was transport, not a semantic disagreement.
control_raw=Path(sys.argv[2]).resolve()
control_summary=json.loads((control_raw/'controls/summary.json').read_text(encoding='utf-8-sig'))
control_attempts=[json.loads(p.read_text(encoding='utf-8-sig')) for p in (control_raw/'controls').glob('attempt-*.json')]
assert control_summary['attempts']==17 and control_summary['controlsPass'] is False and control_summary['unsafeFalsePass'] is False
unsafe=[a for a in control_attempts if a['definition'].get('safe') is False]
assert len(unsafe)==8 and all(a['terminal']['disposition']!='SEND_ELIGIBLE' for a in unsafe)
failures=[a for a in control_attempts if a['definition'].get('safe') is True and a['terminal']['disposition']!='SEND_ELIGIBLE']
assert len(failures)==1 and failures[0]['error']['telemetry']['error']=='UPSTREAM_TRANSPORT'
registration.update({'mode':'NATIVE_DIAGNOSTIC_WITH_RETAINED_FAILED_CONTROLS_NOT_QUALIFICATION',
 'controlsSourceSha':control_summary['identity']['sourceSha'],'controlsRawDirectory':str(control_raw),
 'controlsSummaryHash':hashlib.sha256((control_raw/'controls/summary.json').read_bytes()).hexdigest(),
 'scopedControls':'17 completed on paired source; one transport failure retained, no retry; not PASS and not a qualification gate',
 'registeredScopedControls':0,'pairedHistoricalControls':17,'totalRegisteredSlotsIncludingControls':14,'pairedCombinedDenominator':31,
 'maximumGenerationRequests':52,'nativeExecutableChange':'driver only; runtime/prompt/config unchanged from paired controls source'})
(out/'REGISTRATION.json').write_text(json.dumps(registration,indent=2),encoding='utf-8')
commands=[]
try:
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
 assert len(commands)==7
 assert git('rev-parse','HEAD')==source and not git('status','--porcelain')
 (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW','sourceSha':source,'sourceUnchanged':True}))
except Exception as e:
 (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'INCOMPLETE','sourceSha':source,'error':str(e)}))
 raise
