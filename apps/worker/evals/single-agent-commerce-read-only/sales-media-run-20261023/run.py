from pathlib import Path
import json,hashlib,subprocess,sys,os,datetime
repo=Path.cwd();out=Path(__file__).resolve().parent;base=repo/'apps/worker/evals/single-agent-commerce-read-only'
head='6cd998c0c0003a0e6f30068cb2941bb8d2dd7b73'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
stamp=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
frozen=['manifest.json','source-config.b1.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','sales-media-cases.json','sales-journeys-registration.mjs','delivery-capture.mjs','stateful-provider.mjs','isolated-integration.mjs','gemini-inference.mjs','protocol.mjs','advice-diagnostic.mjs','handoff-matrix.candidate.json','sales-media-preparation-20261023/advice-paired-inputs.json','sales-media-preparation-20261023/owner-advice.candidate.vi.txt']
manifest=json.loads((base/'manifest.json').read_text(encoding='utf-8'))
registration={'registeredAt':stamp(),'runSourceSha':head,'sourceBaseSha':'a402e94b','models':manifest['models'],'promptHashes':manifest['promptHashes'],'schemaHash':manifest['schemaHash'],'inputAndRunnerHashes':{f:sha(base/f) for f in frozen},'sharedSelectorHash':sha(repo/'packages/business-tools/src/image-selection.ts'),'sharedSelectorBuiltHash':sha(repo/'packages/business-tools/dist/image-selection.js'),'orchestratorHash':sha(Path(__file__)),'sourceAuditHash':sha(out/'SOURCE_AUDIT.json'),'adviceDiagnosticOutcomes':8,'nativeMediaOutcomes':4,'repetitions':1,'maximumGenerationRequests':32,'adviceMaxRequests':16,'mediaMaxRequests':16,'generationRetry':0,'sendEnabled':False,'scope':'Owner requested fix and model rerun; advice text pairs and four independent media ingress cases only. No full39, automatic repeats or promotion.'}
commands=[]
def clean():
 assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==head,'HEAD_CHANGED'
 assert not subprocess.check_output(['git','status','--porcelain'],text=True).strip(),'DIRTY_WORKTREE'
 for f,h in registration['inputAndRunnerHashes'].items():assert sha(base/f)==h,'INPUT_CHANGED'
 assert sha(repo/'packages/business-tools/dist/image-selection.js')==registration['sharedSelectorBuiltHash'],'BUILT_SELECTOR_CHANGED'
def execute(name,args):
 clean();cmd=[sys.executable,str(base/'model-code-division-run-20261019/raw/credential-launcher.py'),'node',*map(str,args)]
 row={'name':name,'command':cmd,'startedAt':stamp()};commands.append(row)
 with (out/(name+'.txt')).open('xb') as log:code=subprocess.run(cmd,cwd=repo,env=dict(os.environ,C3_DIVISION_REPO=str(repo)),stdout=log,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW).returncode
 row.update(exitCode=code,finishedAt=stamp());(out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'job':name,'exitCode':code}),flush=True)
 if code:raise SystemExit('JOB_FAILED_RETAIN_EVIDENCE_NO_RETRY')
clean();(out/'REGISTRATION.json').write_text(json.dumps(registration,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
media=[base/'isolated-integration.mjs',out/'media','COD','--provider-run','--candidate-handoff','--media-probe']
execute('preflight-media',media+['--provider-preflight'])
execute('media',media)
if any('usage_limit_reached' in p.read_text(encoding='utf-8') for p in (out/'media').glob('*requests.jsonl')):raise SystemExit('QUOTA_BLOCKED_NO_MORE_GENERATIONS')
execute('advice',[base/'advice-diagnostic.mjs',base/'sales-media-preparation-20261023/advice-paired-inputs.json',out/'advice'])
clean();print(json.dumps({'status':'COMPLETE','nativeMedia':4,'diagnosticAdvice':8}),flush=True)
