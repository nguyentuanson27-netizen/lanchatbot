"""Task-local acceptance dispatch. Frozen 51 native slots, N1, retry0, capture only."""
from pathlib import Path
import concurrent.futures, hashlib, json, subprocess, sys, threading

repo = Path('C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')
out = repo.parent / 'c3-acceptance-complete-20261024'
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
launcher = base / 'model-code-division-run-20261019/raw/credential-launcher.py'
capture = repo.parent / 'c3-acceptance-model-source-complete-20261024/capture.json'
stage = sys.argv[1]
assert stage in ['prefix', 'remaining']
lock = threading.Lock()
def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()
assert not git('status', '--porcelain')
source = git('rev-parse', 'HEAD')
names = ['manifest.json', 'cases.b1.json', 'stateful-cases.json', 'sales-journeys.candidate.json',
    'sales-media-followup-cases.json', 'opening-quote-cases.json', 'source-config.b1.json', 'prompts/owner.vi.txt', 'prompts/verifier.vi.txt']
hashes = {name: hashlib.sha256((base/name).read_bytes()).hexdigest() for name in names}
if stage == 'prefix':
    out.mkdir()
    for payment in ['cod', 'bank']:
        check = json.loads((repo.parent / ('c3-acceptance-'+payment+'-complete-20261024/integration.json')).read_text())
        assert check['status'] == 'PASS' and check['testDatabaseDropped'] and len(check['cases']) == 8
        assert all(c['status'] == 'PASS' for c in check['cases'])
        assert check['sourceSha'] == source and not check['sourceDirty'] and check['providerGenerations'] == 0
    registration = {'sourceSha': source, 'driverHash': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'models': json.loads((base/'manifest.json').read_text())['models'],
        'nativeOutcomes': 51, 'controls': 17, 'totalRegisteredOutcomes': 68,
        'publicModelNativeTurns': 50, 'privateCodeOnlyTurns': 1, 'repetitions': 1, 'retry': 0, 'maximumGenerationRequests': 217,
        'sendEnabled': False, 'hashes': hashes, 'captureHash': json.loads(capture.read_text())['hash'],
        'execution': '17 controls, then 11 affected native prefix including actual journey dependencies; only after whole-terminal prefix review dispatch 40 remaining. Prefix slots are not repeated.',
        'prefixAcceptance': {
            'sales-product-gallery:overview': 'Actual approved requested-product generic images delivered; no false color assertion. Generic-only remains PARTIAL, original verifier verdict retained.',
            'media-and-size:ask': 'Actual requested detail image delivered plus correct size outcome. Approved source chart permits ASK_MORE for missing inputs. No guessed fit or invented chart; unavailable source may use atomic media+handoff.'}}
    (out/'REGISTRATION.json').write_text(json.dumps(registration, indent=2))
    commands = []
else:
    registration = json.loads((out/'REGISTRATION.json').read_text())
    assert registration['sourceSha'] == source and registration['hashes'] == hashes
    assert registration['driverHash'] == hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    review = json.loads((out/'PREFIX_REVIEW.json').read_text())
    assert review['verdict'] == 'PASS' and review['sourceSha'] == source
    commands = json.loads((out/'COMMANDS.json').read_text())
def run(name, args):
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain')
    with (out/(name+'.log')).open('xb') as log:
        code = subprocess.run(list(map(str, args)), cwd=repo, stdout=log, stderr=subprocess.STDOUT,
            creationflags=subprocess.CREATE_NO_WINDOW).returncode
    with lock:
        commands.append({'name': name, 'command': list(map(str, args)), 'exitCode': code})
        (out/'COMMANDS.json').write_text(json.dumps(commands, indent=2))
    print(name+' exit='+str(code), flush=True)
    return code
def persisted(name, flags):
    common = [sys.executable, launcher, 'node', base/'isolated-integration.mjs']
    args = ['COD', '--provider-run', '--candidate-handoff', *flags]
    assert run(name+'-preflight', common+[out/(name+'-preflight'), *args, '--provider-preflight']) == 0
    assert run(name, common+[out/name, *args]) == 0
def b1():
    common = [sys.executable, launcher, 'node', base/'run.mjs', '--config', base/'source-config.b1.json', '--cases', base/'cases.b1.json']
    assert run('b1-preflight', common+['--out', out/'b1-preflight', '--preflight']) == 0
    assert run('b1', common+['--out', out/'b1', '--run']) == 0
try:
    if stage == 'prefix':
        assert run('controls-preflight', ['node', base/'feedback-controls-20261023.mjs', out/'controls-preflight', '--capture', capture, '--preflight']) == 0
        assert run('controls', ['node', base/'feedback-controls-20261023.mjs', out/'controls', '--capture', capture, '--prepared', out/'controls-preflight/prepared.json']) == 0
        bootstrap = "import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs'; import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs';const i=readFeedbackRunIdentity();assertCleanFeedbackSource(i);console.log(JSON.stringify({identity:i,controlsHash:requirePassingControls(process.argv[1],i)}));"
        assert run('controls-readiness', ['node', '--input-type=module', '-e', bootstrap, out/'controls']) == 0
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            tasks = [pool.submit(persisted, 'journey-openings', ['--journey-openings']), pool.submit(persisted, 'media-followup', ['--media-followup'])]
            for task in tasks: task.result()
        status = 'PREFIX_COLLECTED_AWAITING_WHOLE_TERMINAL_REVIEW'
    else:
        def lane():
            for name, flags in [('stateful', []), ('negotiation', ['--negotiation-probe']), ('opening-quotes', ['--opening-quotes'])]:
                persisted(name, flags)
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            for task in [pool.submit(b1), pool.submit(lane)]: task.result()
        status = 'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW'
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain')
    (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status': status, 'stage': stage, 'sourceSha': source, 'sourceUnchanged': True}))
except Exception as error:
    (out/'DISPATCH_STATUS.json').write_text(json.dumps({'status': 'BLOCKED_OR_INCOMPLETE', 'stage': stage, 'sourceSha': source, 'error': str(error)}))
    raise
