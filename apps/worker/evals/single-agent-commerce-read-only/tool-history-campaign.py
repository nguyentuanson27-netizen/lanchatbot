"""One registered Phase B campaign. Explicit stages, no retry or live delivery."""
from pathlib import Path
import argparse, concurrent.futures, hashlib, json, subprocess, sys, threading, time

repo = Path(__file__).resolve().parents[4]
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
parser = argparse.ArgumentParser()
parser.add_argument('--out', required=True)
parser.add_argument('--stage', choices=['controls', 'prefix', 'remaining'], required=True)
args = parser.parse_args()
out = Path(args.out).resolve()
assert not out.is_relative_to(repo), 'OUTPUT_MUST_NOT_DIRTY_SOURCE'
out.mkdir(exist_ok=True)
def git(*parts):
    return subprocess.check_output(['git', *parts], cwd=repo, text=True).strip()
assert not git('status', '--porcelain'), 'DIRTY_SOURCE'
source = git('rev-parse', 'HEAD')
hash_file = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
registration = {'mode':'PHASE_B_TOOL_HISTORY_N1', 'sourceSha':source,
    'driverHash':hash_file(Path(__file__)), 'models':json.loads((base/'manifest.json').read_text())['models'],
    'nativeOutcomes':51, 'controls':17, 'totalRegisteredOutcomes':68,
    'repetitions':1, 'retry':0, 'maximumGenerationRequests':221, 'sendEnabled':False,
    'prefixB1Indices':[1,9,15,23], 'prefixNative':31, 'remainingNative':20,
    'T4':'ADVICE_NO_INTERVENTION',
    'gate':'Controls PASS, then 31 prefix; manual whole-terminal review required before remaining. Unsafe authority/effect/privacy stops new dispatch. No source patch/rerun.',
    'hashes':{name:hash_file(base/name) for name in ['manifest.json','source-config.b1.json','cases.b1.json',
        'stateful-cases.json','sales-journeys.candidate.json','sales-media-followup-cases.json','opening-quote-cases.json',
        'handoff-matrix.candidate.json','prompts/owner.vi.txt','prompts/verifier.vi.txt']}}
reg = out/'REGISTRATION.json'
if reg.exists():
    assert json.loads(reg.read_text()) == registration, 'RUN_IDENTITY_CHANGED'
else:
    assert args.stage == 'controls', 'CONTROLS_FIRST'
    reg.write_text(json.dumps(registration,indent=2),encoding='utf-8')
commands_file=out/'COMMANDS.json'
commands=json.loads(commands_file.read_text()) if commands_file.exists() else []
lock=threading.Lock()
launcher=base/'model-code-division-run-20261019/raw/credential-launcher.py'
session=base/'source-session.py'
def run(name, command):
    assert git('rev-parse','HEAD')==source and not git('status','--porcelain'), 'SOURCE_CHANGED'
    command=list(map(str,command))
    started=time.time()
    with (out/(name+'.log')).open('xb') as log:
        code=subprocess.run(command,cwd=repo,stdout=log,stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0).returncode
    with lock:
        commands.append({'name':name,'command':command,'exitCode':code,'elapsedSeconds':time.time()-started})
        commands_file.write_text(json.dumps(commands,indent=2),encoding='utf-8')
    print(json.dumps({'name':name,'exitCode':code}),flush=True)
    return code
def require_controls():
    assert json.loads((out/'controls/summary.json').read_text())['status']=='PASS', 'CONTROLS_NOT_PASS'
    boot="import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs'; import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs';const i=readFeedbackRunIdentity();assertCleanFeedbackSource(i);console.log(JSON.stringify({identity:i,controlsHash:requirePassingControls(process.argv[1],i)}));"
    assert run(args.stage+'-controls-readiness',['node','--input-type=module','-e',boot,out/'controls'])==0
def persisted(name, flags):
    common=[sys.executable,launcher,'node',base/'isolated-integration.mjs']
    tail=['COD','--provider-run','--candidate-handoff',*flags]
    if run(name+'-preflight',common+[out/(name+'-preflight'),*tail,'--provider-preflight'])==0:
        run(name,common+[out/name,*tail])
def b1(first,last):
    name=f'b1-{first}-{last}'
    common=[sys.executable,launcher,'node',base/'run.mjs','--config',base/'source-config.b1.json',
        '--cases',base/'cases.b1.json','--range',f'{first}:{last}']
    if run(name+'-preflight',common+['--out',out/(name+'-preflight'),'--preflight'])==0:
        run(name,common+['--out',out/name,'--run'])
try:
    if args.stage=='controls':
        assert run('source-capture',[sys.executable,session,'node',base/'feedback-source-capture.mjs',out/'source'])==0
        assert run('controls-preflight',['node',base/'feedback-controls-20261023.mjs',out/'controls-preflight',
            '--capture',out/'source/capture.json','--preflight'])==0
        assert run('controls',['node',base/'feedback-controls-20261023.mjs',out/'controls',
            '--capture',out/'source/capture.json','--prepared',out/'controls-preflight/prepared.json'])==0, 'CONTROLS_FAIL'
    elif args.stage=='prefix':
        require_controls()
        # Independent DBs; keep each conversation ordered. No repeated prefix slots.
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            for f in [pool.submit(persisted,'journey-openings',['--journey-openings']),
                      pool.submit(persisted,'opening-quotes',['--opening-quotes'])]: f.result()
        for name,flags in [('media-followup',['--media-followup']),('stateful',[]),('negotiation',['--negotiation-probe'])]:
            assert not (out/'UNSAFE_STOP.json').exists(), 'UNSAFE_STOP'
            persisted(name,flags)
        for index in registration['prefixB1Indices']:
            assert not (out/'UNSAFE_STOP.json').exists(), 'UNSAFE_STOP'
            b1(index,index)
    else:
        require_controls()
        review=json.loads((out/'PREFIX_REVIEW.json').read_text(encoding='utf-8'))
        assert review['sourceSha']==source and review['reviewedNative']==31 and review['technicalReady'] is True, 'PREFIX_NOT_READY'
        assert not (out/'UNSAFE_STOP.json').exists(), 'UNSAFE_STOP'
        for first,last in [(2,8),(10,14),(16,22),(24,24)]: b1(first,last)
    assert git('rev-parse','HEAD')==source and not git('status','--porcelain'), 'SOURCE_CHANGED'
    (out/(args.stage+'-status.json')).write_text(json.dumps({'stage':args.stage,'status':'COLLECTED_REQUIRES_REVIEW',
        'sourceSha':source}),encoding='utf-8')
except Exception as error:
    (out/(args.stage+'-status.json')).write_text(json.dumps({'stage':args.stage,'status':'BLOCKED_OR_STOP',
        'sourceSha':source,'error':str(error)}),encoding='utf-8')
    raise
