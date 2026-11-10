"""One preregistered campaign, explicit phases, no retry or live delivery."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

repo = Path(__file__).resolve().parents[5]
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
out = Path(sys.argv[1]).resolve()
phase = sys.argv[2]
assert phase in ['controls', 'targeted', 'full']
assert not out.is_relative_to(repo), 'RAW_OUTPUT_OUTSIDE_SOURCE'
launcher = base / 'model-code-division-run-20261019/raw/credential-launcher.py'
cohorts = [('checkout-prefix', ['--through-case', 'stateful-confirm'], 7, 'targeted')]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()

assert not git('status', '--porcelain'), 'DIRTY_SOURCE'
source = git('rev-parse', 'HEAD')
manifest = json.loads((base / 'manifest.json').read_text())
assert manifest['models']['conversation']['model'] == 'gemini-3.5-flash-lite'
assert manifest['models']['verifier']['model'] == 'gpt-6.1-sol'
assert all(m['effort'] == 'high' for m in manifest['models'].values())
if phase == 'controls':
    out.mkdir()
    names = ['manifest.json', 'source-config.b1.json', 'cases.b1.json', 'opening-quote-cases.json',
             'sales-media-followup-cases.json', 'sales-journeys.candidate.json', 'stateful-cases.json',
             'prompts/owner.vi.txt', 'prompts/verifier.vi.txt', 'handoff-matrix.candidate.json',
             'isolated-integration.mjs', 'stateful-provider.mjs', 'gemini-inference.mjs', 'protocol.mjs',
             'feedback-controls-20261023.mjs', 'source-session.py', 'candidate-handoff.mjs', 'run.mjs',
             'sales-journeys-registration.mjs']
    registration = {'sourceSha': source, 'implementationBaseSha': '8d4a0ab3ff8f65823a2f0bf112658d150a05b58a',
        'mode': 'CHECKOUT_SILENT_CORRECTION_ONLY', 'models': manifest['models'],
        'promptHashes': manifest['promptHashes'], 'schemaHash': manifest['schemaHash'],
        'nativeOutcomes': 7, 'controls': 17, 'totalRegisteredOutcomes': 24,
        'targetedOutcomes': 7, 'remainingOutcomes': 0, 'publicModelNativeTurns': 6,
        'privateCodeOnlyTurns': 1, 'maximumGenerationRequests': 41,
        'repetitions': 1, 'generationRetry': 0, 'sendEnabled': False,
        'cohorts': [{'name': n, 'flags': f, 'slots': s, 'phase': p} for n, f, s, p in cohorts],
        'hashes': {n: hashlib.sha256((base / n).read_bytes()).hexdigest() for n in names},
        'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (out / 'REGISTRATION.json').write_text(json.dumps(registration, indent=2), encoding='utf-8')
    status = {'sourceSha': source, 'status': 'REGISTERED', 'completedCohorts': [],
              'nativeNotRun': [n for n, _, _, _ in cohorts]}
    commands = []
else:
    registration = json.loads((out / 'REGISTRATION.json').read_text())
    assert registration['sourceSha'] == source, 'SOURCE_CHANGED'
    assert registration['driverSha256'] == hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    status = json.loads((out / 'DISPATCH_STATUS.json').read_text())
    commands = json.loads((out / 'COMMANDS.json').read_text())
    assert json.loads((out / 'controls/summary.json').read_text(encoding='utf-8-sig'))['controlsPass'] is True
    assert status['status'] != 'STOPPED_RETAIN_EVIDENCE', 'NO_RETRY_AFTER_STOP'

def save():
    (out / 'COMMANDS.json').write_text(json.dumps(commands, indent=2), encoding='utf-8')
    (out / 'DISPATCH_STATUS.json').write_text(json.dumps(status, indent=2), encoding='utf-8')

def run(name, args):
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain'), 'SOURCE_CHANGED'
    assert not any(c['name'] == name for c in commands), 'REGISTERED_COMMAND_ALREADY_ATTEMPTED'
    print('START ' + name, flush=True)
    with (out / (name + '.log')).open('xb') as log:
        code = subprocess.run(list(map(str, args)), cwd=repo, stdout=log, stderr=subprocess.STDOUT,
                              creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands.append({'name': name, 'command': list(map(str, args)), 'exitCode': code})
    save()
    print('DONE ' + name + ' exit=' + str(code), flush=True)
    assert code == 0, 'COMMAND_FAILED_' + name
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain'), 'SOURCE_CHANGED'

save()
try:
    if phase == 'controls':
        run('source-capture', [sys.executable, base / 'source-session.py', 'node', base / 'feedback-source-capture.mjs', out / 'source'])
        run('controls-preflight', ['node', base / 'feedback-controls-20261023.mjs', out / 'controls-preflight', '--capture', out / 'source/capture.json', '--preflight'])
        run('controls', ['node', base / 'feedback-controls-20261023.mjs', out / 'controls', '--capture', out / 'source/capture.json', '--prepared', out / 'controls-preflight/prepared.json'])
        assert json.loads((out / 'controls/summary.json').read_text(encoding='utf-8-sig'))['controlsPass'] is True, 'CONTROLS_NOT_PASS'
        status['status'] = 'CONTROLS_PASS_AWAIT_TARGETED'
    else:
        if phase == 'full':
            review = json.loads((out / 'TARGET_REVIEW.json').read_text())
            assert review['sourceSha'] == source and review['accepted'] is True and review['reviewedOutcomes'] == 7, 'TARGETED_NOT_ACCEPTED'
            assert all(n in status['completedCohorts'] for n, _, _, p in cohorts if p == 'targeted')
            captured = {}
            for n, _, _, p in cohorts:
                if p == 'targeted':
                    for artifact in (out / n).glob('*attempt-*.json'):
                        captured[json.loads(artifact.read_text(encoding='utf-8-sig'))['caseId']] = hashlib.sha256(artifact.read_bytes()).hexdigest()
            assert len(captured) == 7 and len(review['entries']) == 7
            assert {e['caseId'] for e in review['entries']} == set(captured), 'TARGETED_WRONG_POPULATION'
            for entry in review['entries']:
                assert entry['artifactSha256'] == captured[entry['caseId']], 'TARGETED_ARTIFACT_CHANGED'
                assert entry['safety'] == 'PASS' and entry['criticalFailure'] is False and entry['reason'].strip(), 'TARGETED_QUALITY_NOT_PASS'
        bootstrap = "import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs';import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs';const i=readFeedbackRunIdentity();assertCleanFeedbackSource(i);console.log(JSON.stringify({controlsHash:requirePassingControls(process.argv[1],i)}));"
        run(phase + '-readiness', ['node', '--input-type=module', '-e', bootstrap, out / 'controls'])
        for name, flags, slots, selected_phase in cohorts:
            if selected_phase != phase:
                continue
            assert name not in status['completedCohorts'], 'NO_REPEAT_COHORT'
            if name.startswith('b1-'):
                common = [sys.executable, launcher, 'node', base / 'run.mjs', '--config', base / 'source-config.b1.json', '--cases', base / 'cases.b1.json', *flags]
                run(name + '-preflight', common + ['--out', out / (name + '-preflight'), '--preflight'])
                run(name, common + ['--out', out / name, '--run'])
                assert len(list((out / name).glob('attempt-*.json'))) == slots
            else:
                common = [sys.executable, launcher, 'node', base / 'isolated-integration.mjs']
                shared = ['COD', '--provider-run', '--candidate-handoff', *flags]
                run(name + '-preflight', common + [out / (name + '-preflight'), *shared, '--provider-preflight'])
                run(name, common + [out / name, *shared])
                report = json.loads((out / name / 'integration.json').read_text(encoding='utf-8-sig'))
                assert report['testDatabaseDropped'] is True
                assert report['completedOutcomes'] == slots
            status['completedCohorts'].append(name)
            status['nativeNotRun'].remove(name)
            save()
        status['status'] = 'TARGETED_COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW' if phase == 'targeted' else 'FULL_COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW'
    status['sourceUnchanged'] = True
except Exception as error:
    status.update({'status': 'STOPPED_RETAIN_EVIDENCE', 'error': str(error)})
    save()
    raise
save()
