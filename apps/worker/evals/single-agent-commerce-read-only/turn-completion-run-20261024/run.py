"""One frozen Phase B campaign. Existing capture runners, N1, no retries."""
from pathlib import Path
import concurrent.futures, hashlib, json, subprocess, sys, threading

repo=Path(__file__).resolve().parents[5]
base=repo/'apps/worker/evals/single-agent-commerce-read-only'
out=repo.parent/'c3-turn-completion-model-20261024'
checks=repo.parent/'c3-turn-completion-checks-20261024'
capture=repo.parent/'c3-turn-completion-source-final-20261024/capture.json'
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
stage=sys.argv[1]
assert stage in ['prefix','remaining']
lock=threading.Lock()
def git(*args):return subprocess.check_output(['git',*args],cwd=repo,text=True).strip()
assert not git('status','--porcelain'), 'CLEAN_SOURCE_REQUIRED'
source=git('rev-parse','HEAD')
names=['manifest.json','source-config.b1.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json',
 'sales-media-followup-cases.json','opening-quote-cases.json','handoff-matrix.candidate.json','prompts/owner.vi.txt','prompts/verifier.vi.txt']
hashes={name:hashlib.sha256((base/name).read_bytes()).hexdigest() for name in names}
slots=json.loads((base/'cases.b1.json').read_text(encoding='utf-8'))
assert isinstance(slots,list)
prefix_ids=['b1-changed-occasion','b1-changed-occasion-v2','b1-buying-concern-v2','b1-buying-concern-v3']
prefix_indices=[i+1 for i,c in enumerate(slots) if c['caseId'] in prefix_ids]
assert len(prefix_indices)==4
remaining_indices=[i for i in range(1,25) if i not in prefix_indices]
if stage=='prefix':
 out.mkdir()
 for payment in ['cod','bank']:
  candidates=[json.loads(p.read_text()) for p in checks.glob(payment+'-integration*/integration.json')]
  matching=[r for r in candidates if r.get('status')=='PASS' and r.get('sourceSha')==source]
  assert len(matching)==1,'EXACT_SOURCE_DETERMINISTIC_REPORT_REQUIRED'
  result=matching[0]
  assert result['status']=='PASS' and result['testDatabaseDropped'] and result['providerGenerations']==0
  assert result['sourceSha']==source and not result['sourceDirty']
  assert all(c['status']=='PASS' for c in result['cases'])
  assert sum(c['name'].startswith('B composed dependency holding delivery ') for c in result['cases'])==7
  assert sum(c['name'].startswith('B composed snapshot invalidation ') for c in result['cases'])==3
 registration={'sourceSha':source,'driverHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
  'models':json.loads((base/'manifest.json').read_text())['models'],'hashes':hashes,
  'captureHash':json.loads(capture.read_text())['hash'],'nativeOutcomes':51,'controls':17,'totalRegisteredOutcomes':68,
  'repetitions':1,'retry':0,'maximumGenerationRequests':221,'sendEnabled':False,
  'prefix':{'native':31,'openingWithControls':9,'b1Indices':prefix_indices},'remaining':{'native':20,'b1Indices':remaining_indices},
  'T2':{c:'T2_NO_INTERVENTION' for c in ['b1-changed-occasion','sales-discovery-advice:need']},
  'gate':'T1 deterministic and captured authority/receipt regressions absent; T3 deadline and all five opening controls usable; both discovery cases actually complete within budget. NO_INTERVENTION complete is observation only. Stop full on missing target evidence; no patch/rerun.',
  'review':'Whole actual terminal/history/attachments/receipt before rejected-draft diagnosis; no keyword score. Polish alone does not fail.',
  'population':'Same frozen 51 native + 17 controls. Prefix is part of native, never repeated.'}
 (out/'REGISTRATION.json').write_text(json.dumps(registration,indent=2),encoding='utf-8')
 commands=[]
else:
 registration=json.loads((out/'REGISTRATION.json').read_text())
 assert registration['sourceSha']==source and registration['hashes']==hashes
 assert registration['driverHash']==hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
 review=json.loads((out/'PREFIX_REVIEW.json').read_text())
 assert review['verdict']=='PASS' and review['sourceSha']==source
 commands=json.loads((out/'COMMANDS.json').read_text())

def run(name,args):
 assert git('rev-parse','HEAD')==source and not git('status','--porcelain')
 with (out/(name+'.log')).open('xb') as log:
  code=subprocess.run(list(map(str,args)),cwd=repo,stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 with lock:
  commands.append({'name':name,'command':list(map(str,args)),'exitCode':code})
  (out/'COMMANDS.json').write_text(json.dumps(commands,indent=2))
 print(name+' exit='+str(code),flush=True)
 assert code==0,name

def persisted(name,flags):
 common=[sys.executable,launcher,'node',base/'isolated-integration.mjs']
 args=['COD','--provider-run','--candidate-handoff',*flags]
 run(name+'-preflight',common+[out/(name+'-preflight'),*args,'--provider-preflight'])
 run(name,common+[out/name,*args])

def b1_indices(indices):
 # Group contiguous registered indices, without changing corpus or reusing any slot.
 ranges=[]
 for i in indices:
  if ranges and ranges[-1][1]+1==i:ranges[-1][1]=i
  else:ranges.append([i,i])
 for first,last in ranges:
  name='b1-'+str(first)+'-'+str(last)
  common=[sys.executable,launcher,'node',base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json','--range',str(first)+':'+str(last)]
  run(name+'-preflight',common+['--out',out/(name+'-preflight'),'--preflight'])
  run(name,common+['--out',out/name,'--run'])

def lanes(*jobs):
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for task in [pool.submit(job) for job in jobs]:task.result()

try:
 if stage=='prefix':
  run('controls-preflight',['node',base/'feedback-controls-20261023.mjs',out/'controls-preflight','--capture',capture,'--preflight'])
  run('controls',['node',base/'feedback-controls-20261023.mjs',out/'controls','--capture',capture,'--prepared',out/'controls-preflight/prepared.json'])
  assert json.loads((out/'controls/summary.json').read_text())['status']=='PASS'
  lanes(lambda:persisted('journey-openings',['--journey-openings']),lambda:persisted('opening-quotes',['--opening-quotes']))
  def transactions():
   persisted('stateful',[])
   persisted('negotiation',['--negotiation-probe'])
  lanes(lambda:persisted('media-followup',['--media-followup']),transactions)
  b1_indices(prefix_indices)
  status='PREFIX_COLLECTED_AWAITING_WHOLE_TERMINAL_REVIEW'
 else:
  b1_indices(remaining_indices)
  status='COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW'
 assert git('rev-parse','HEAD')==source and not git('status','--porcelain')
 (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':status,'stage':stage,'sourceSha':source,'sourceUnchanged':True}))
except Exception as error:
 (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'BLOCKED_OR_INCOMPLETE','stage':stage,'sourceSha':source,'error':str(error)}))
 raise
