"""Owner-authorized full diagnostic dispatch; no retry, no live delivery, no qualification promotion."""
from pathlib import Path
import concurrent.futures, hashlib, json, os, subprocess, sys, threading

repo = Path('C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')
out = repo.parent / 'c3-phase-b-full-20261024'
out.mkdir()
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
launcher = base / 'model-code-division-run-20261019/raw/credential-launcher.py'
session = base / 'source-session.py'
commands = []
lock = threading.Lock()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()
assert not git('status','--porcelain')
source = git('rev-parse','HEAD')
registration = {'mode':'OWNER_REQUESTED_FULL_DIAGNOSTIC_NOT_QUALIFICATION', 'sourceSha':source,
    'nativeOutcomes':46, 'newOpeningOutcomes':5, 'controls':17, 'totalRegisteredOutcomes':68,
    'publicModelNativeTurns':50, 'privateCodeOnlyTurns':1, 'repetitions':1, 'retry':0,
    'maximumGenerationRequests':217, 'sendEnabled':False,
    'execution':'Controls readiness first, then two independent process lanes; continue ordinary attempt failures, retain all outcomes. No old-prefix qualification or GO claimed.',
    'hashes':{name:hashlib.sha256((base/name).read_bytes()).hexdigest() for name in [
        'manifest.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json','opening-quote-cases.json','source-config.b1.json','prompts/owner.vi.txt','prompts/verifier.vi.txt']}}
(out/'REGISTRATION.json').write_text(json.dumps(registration,indent=2))
def run(name,args):
    print('START '+name,flush=True)
    with (out/(name+'.log')).open('xb') as log:
        code = subprocess.run(list(map(str,args)),cwd=repo,stdout=log,stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW).returncode
    with lock:
        commands.append({'name':name,'command':list(map(str,args)),'exitCode':code})
        (out/'COMMANDS.json').write_text(json.dumps(commands,indent=2))
    print('DONE '+name+' exit='+str(code),flush=True)
    return code
try:
    assert run('source-capture',[sys.executable,session,'node',base/'feedback-source-capture.mjs',out/'source']) == 0
    assert run('controls-preflight',['node',base/'feedback-controls-20261023.mjs',out/'controls-preflight','--capture',out/'source/capture.json','--preflight']) == 0
    controls_code=run('controls',['node',base/'feedback-controls-20261023.mjs',out/'controls','--capture',out/'source/capture.json','--prepared',out/'controls-preflight/prepared.json'])
    assert controls_code == 0, 'CONTROLS_NOT_PASS_NO_NATIVE_DISPATCH'
    bootstrap="import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs'; import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs';const i=readFeedbackRunIdentity();assertCleanFeedbackSource(i);console.log(JSON.stringify({identity:i,controlsHash:requirePassingControls(process.argv[1],i)}));"
    assert run('controls-readiness',['node','--input-type=module','-e',bootstrap,out/'controls']) == 0
    def b1():
        cmd=[sys.executable,launcher,'node',base/'run.mjs','--config',base/'source-config.b1.json','--cases',base/'cases.b1.json']
        if run('b1-preflight',cmd+['--out',out/'b1-preflight','--preflight']) != 0: return
        run('b1',cmd+['--out',out/'b1','--run'])
    def persisted():
        jobs=[('stateful',[]),('journey-openings',['--journey-openings']),('media-followup',['--media-followup']),
            ('negotiation',['--negotiation-probe']),('opening-quotes',['--opening-quotes'])]
        for name,flags in jobs:
            common=[sys.executable,launcher,'node',base/'isolated-integration.mjs']
            args=['COD','--provider-run','--candidate-handoff',*flags]
            if run(name+'-preflight',common+[out/(name+'-preflight'),*args,'--provider-preflight']) != 0: continue
            run(name,common+[out/name,*args])
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for f in [pool.submit(b1),pool.submit(persisted)]: f.result()
    assert git('rev-parse','HEAD') == source
    assert not git('status','--porcelain')
    (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW','sourceSha':source,'sourceUnchanged':True}))
except Exception as error:
    (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'BLOCKED_OR_INCOMPLETE','sourceSha':source,'error':str(error)}))
    raise
