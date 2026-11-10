from pathlib import Path
import subprocess,sys,os,json,hashlib,datetime
repo=Path.cwd();out=Path(__file__).resolve().parent;b=repo/'apps/worker/evals/single-agent-commerce-read-only'
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=['apps/worker/src/single-agent-commerce-media.ts','apps/worker/dist/single-agent-commerce-media.js']+[str(p.relative_to(repo)).replace('\\','/') for p in (b/'sales-media-followup-preparation-20261023').iterdir()]+[str((b/p).relative_to(repo)).replace('\\','/') for p in ['manifest.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','gemini-inference.mjs','isolated-integration.mjs','protocol.mjs','advice-diagnostic.mjs','sales-media-cases.json']]
hashes={p:sha(repo/p) for p in paths}
registration={'runSourceSha':head,'hashes':hashes,'maximumGenerationRequests':39,'maximumOutcomes':19,'retry':0,'sendEnabled':False,'models':json.loads((b/'manifest.json').read_text())['models'],'registeredAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
(out/'REGISTRATION.json').write_text(json.dumps(registration,indent=2)+'\n')
commands=[]
def run(name,args):
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip()
 assert all(sha(repo/p)==v for p,v in hashes.items())
 cmd=[sys.executable,str(b/'model-code-division-run-20261019/raw/credential-launcher.py'),'node',*map(str,args)]
 with (out/(name+'.txt')).open('xb') as f:code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=f,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 commands.append({'name':name,'command':cmd,'exitCode':code});(out/'commands.json').write_text(json.dumps(commands,indent=2))
 print(json.dumps({'job':name,'exitCode':code}),flush=True)
 if code:raise SystemExit('STOP_JOB_FAILED_NO_RETRY')
run('source-audit',[out/'source-audit.mjs'])
run('controls',[b/'sales-media-followup-preparation-20261023/controls.mjs',out/'controls'])
if json.loads((out/'controls/summary.json').read_text())['controlsPass']:
 media=[b/'isolated-integration.mjs',out/'media','COD','--provider-run','--candidate-handoff','--media-probe']
 run('preflight-media',media+['--provider-preflight'])
 run('media',media)
else:print('NATIVE_MEDIA_NOT_RUN_CONTROLS_FAILED',flush=True)
run('advice',[b/'advice-diagnostic.mjs',b/'sales-media-followup-preparation-20261023/advice-paired-inputs.json',out/'advice'])
print('COMPLETE',flush=True)
