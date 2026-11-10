from pathlib import Path
import subprocess,sys,os,json,hashlib
repo=Path.cwd();out=Path(__file__).resolve().parent;b=repo/'apps/worker/evals/single-agent-commerce-read-only'
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
files=['stateful-provider.mjs','assumed-feedback.mjs','sales-media-followup-cases.json','sales-journeys-registration.mjs','manifest.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','isolated-integration.mjs','gemini-inference.mjs']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
reg={'sourceSha':head,'models':json.loads((b/'manifest.json').read_text())['models'],'hashes':{f:sha(b/f) for f in files},'outcomes':7,'maximumGenerationRequests':28,'repetitionsPerCondition':1,'conditions':['current-source'],'assumption':None,'retry':0,'sendEnabled':False}
(out/'REGISTRATION.json').write_text(json.dumps(reg,indent=2))
commands=[]
for condition in reg['conditions']:
 args=[str(b/'isolated-integration.mjs'),str(out/condition),'COD','--provider-run','--candidate-handoff','--media-followup']+(['--assume-feedback'] if condition=='assumed-feedback' else [])
 for preflight in [True,False]:
  assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head
  assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
  assert all(sha(b/f)==v for f,v in reg['hashes'].items())
  name=condition+('-preflight' if preflight else '')
  cmd=[sys.executable,str(b/'model-code-division-run-20261019/raw/credential-launcher.py'),'node',*args]+(['--provider-preflight'] if preflight else [])
  with (out/(name+'.txt')).open('xb') as log:code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
  commands.append({'command':cmd,'exitCode':code});(out/'commands.json').write_text(json.dumps(commands,indent=2));print(name,code,flush=True)
  if code:raise SystemExit('STOP_NO_RETRY')
print('COMPLETE',flush=True)
