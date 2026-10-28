"""Owner-authorized full diagnostic dispatch; no retry, no live delivery, no qualification promotion."""
from pathlib import Path
import concurrent.futures, hashlib, json, os, subprocess, sys, threading

repo = Path(__file__).resolve().parents[5]
out = Path(sys.argv[1]).resolve()
assert not out.is_relative_to(repo), 'RAW_OUTPUT_MUST_BE_OUTSIDE_SOURCE'
out.mkdir()
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
launcher = base / 'model-code-division-run-20261019/raw/credential-launcher.py'
session = base / 'source-session.py'
commands = []
stop = threading.Event()
violation = []
lock = threading.Lock()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()
assert not git('status','--porcelain')
source = git('rev-parse','HEAD')
registration = {'mode':'OWNER_REQUESTED_FULL_DIAGNOSTIC_NOT_QUALIFICATION', 'sourceSha':source,
    'nativeOutcomes':46, 'newOpeningOutcomes':5, 'controls':17, 'totalRegisteredOutcomes':68,
    'publicModelNativeTurns':50, 'privateCodeOnlyTurns':1, 'repetitions':1, 'retry':0,
    'maximumGenerationRequests':217, 'sendEnabled':False,
    'implementationBaseSha':'0eeb5dce2d40f99250ec16efd2f5ee51a9d6ea62',
    'execution':'Controls first; negotiation/media/discovery priority cohorts then B1 plus remaining persisted cohorts in independent process lanes; N1, no generation retry, no promotion.',
    'driverHash':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'hashes':{name:hashlib.sha256((base/name).read_bytes()).hexdigest() for name in [
        'manifest.json','cases.b1.json','stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json','opening-quote-cases.json','source-config.b1.json','prompts/owner.vi.txt','prompts/verifier.vi.txt','handoff-matrix.candidate.json']}}
(out/'REGISTRATION.json').write_text(json.dumps(registration,indent=2))
def run(name,args):
    if stop.is_set(): return 97
    print('START '+name,flush=True)
    with (out/(name+'.log')).open('xb') as log:
        code = subprocess.run(list(map(str,args)),cwd=repo,stdout=log,stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW).returncode
    with lock:
        commands.append({'name':name,'command':list(map(str,args)),'exitCode':code})
        (out/'COMMANDS.json').write_text(json.dumps(commands,indent=2))
    print('DONE '+name+' exit='+str(code),flush=True)
    if code != 0:
        # Infrastructure/runner failure is not silently retried or ignored.
        stop.set()
    return code

def require_cohort(name,flags):
    common=[sys.executable,launcher,'node',base/'isolated-integration.mjs']
    args=['COD','--provider-run','--candidate-handoff',*flags]
    if run(name+'-preflight',common+[out/(name+'-preflight'),*args,'--provider-preflight']) != 0: return False
    if run(name,common+[out/name,*args]) != 0: return False
    result=json.loads((out/name/'integration.json').read_text(encoding='utf-8-sig'))
    assert result.get('testDatabaseDropped') is True, 'ISOLATED_DATABASE_NOT_DROPPED'
    for file in (out/name).glob('provider-attempt-*.json'):
        a=json.loads(file.read_text(encoding='utf-8-sig'))
        assert a['result'].get('sendEnabled') is False, 'LIVE_SEND_UNEXPECTED'
    return True
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
    # These dependency-complete cohorts are part of the same 51-case denominator.
    # No setup/prefix is run twice.
    for name,flags in [('negotiation',['--negotiation-probe']),('media-followup',['--media-followup']),('journey-openings',['--journey-openings'])]:
        assert require_cohort(name,flags), 'PRIORITY_COHORT_FAILED'
    def persisted():
        for name,flags in [('stateful',[]),('opening-quotes',['--opening-quotes'])]:
            if not require_cohort(name,flags): return
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for f in [pool.submit(b1),pool.submit(persisted)]: f.result()
    assert not stop.is_set(), 'DISPATCH_COMMAND_FAILED'
    assert git('rev-parse','HEAD') == source
    assert not git('status','--porcelain')
    (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW','sourceSha':source,'sourceUnchanged':True}))
except Exception as error:
    (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status':'BLOCKED_OR_INCOMPLETE','sourceSha':source,'error':str(error)}))
    raise
