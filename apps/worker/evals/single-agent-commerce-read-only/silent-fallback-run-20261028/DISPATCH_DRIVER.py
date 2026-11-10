"""One preregistered campaign, explicit phases, no retry or live delivery."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

repo = Path(__file__).parent / 'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
out = Path(sys.argv[1]).resolve()
phase = sys.argv[2]
assert phase in ['controls', 'native']
assert not out.is_relative_to(repo), 'RAW_OUTPUT_OUTSIDE_SOURCE'
launcher = base / 'model-code-division-run-20261019/raw/credential-launcher.py'
cohorts = [
    ('opening-quotes', ['--opening-quotes'], 5, 'native'),
    ('media-followup', ['--media-followup'], 7, 'native'),
    ('missing-pos', ['--missing-pos'], 3, 'native'),
    ('b1-first', ['--range', '1:8', '--live-only'], 7, 'native'),
    ('b1-rest', ['--range', '9:24', '--live-only'], 14, 'native'),
    ('journey-openings', ['--journey-openings'], 4, 'native'),
    ('stateful', [], 8, 'native'),
    ('negotiation', ['--negotiation-probe'], 3, 'native'),
]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()

assert not git('status', '--porcelain'), 'DIRTY_SOURCE'
source = git('rev-parse', 'HEAD')
manifest = json.loads((base / 'manifest.json').read_text())
assert manifest['models']['conversation']['model'] == 'gemini-3.5-flash-lite'
assert manifest['models']['verifier']['model'] == 'gpt-6.1-sol'
assert all(m['effort'] == 'high' for m in manifest['models'].values())
# Verify the frozen client before source capture or the first control generation.
codex = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import{inspectCodex}from'./apps/worker/evals/single-agent-semantic-verifier/codex-inference.mjs';console.log(JSON.stringify(inspectCodex()));"], cwd=repo, text=True))
assert codex['version'] == 'codex-cli 0.159.2'
assert codex['binarySha256'] == '52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a'
if phase == 'controls':
    out.mkdir()
    names = ['manifest.json', 'source-config.b1.json', 'cases.b1.json', 'opening-quote-cases.json',
             'sales-media-followup-cases.json', 'sales-journeys.candidate.json', 'stateful-cases.json',
             'prompts/owner.vi.txt', 'prompts/verifier.vi.txt', 'handoff-matrix.candidate.json',
             'isolated-integration.mjs', 'stateful-provider.mjs', 'gemini-inference.mjs', 'protocol.mjs',
             'feedback-controls-20261023.mjs', 'source-session.py', 'candidate-handoff.mjs', 'run.mjs',
             'sales-journeys-registration.mjs', 'native-presentation.mjs', 'owner-data-presentation.mjs', 'attempt-evidence.mjs']
    registration = {'sourceSha': source, 'implementationBaseSha': 'e836de67e0be0b59bbd046f9b5d2cc1002bd2035', 'reviewedExecutableSourceSha': '24a2ed1bf775592f20da8ea260d43c64e4e589fd', 'fallbackDelivery': manifest['fallbackDelivery'],
        'codex': codex, 'mode': 'COMPACT_V2_FULL_NATIVE_ALL_REGISTERED_COHORTS', 'ownerContextPresentation': 'VI_DATA_BLOCKS_COMPACT_V2', 'models': manifest['models'],
        'promptHashes': manifest['promptHashes'], 'schemaHash': manifest['schemaHash'],
        'nativeOutcomes': 51, 'controls': 17, 'totalRegisteredOutcomes': 68,
        'publicModelNativeTurns': 50,
        'privateCodeOnlyTurns': 1, 'maximumGenerationRequests': 217,
        'repetitions': 1, 'generationRetry': 0, 'sendEnabled': False,
        'cohorts': [{'name': n, 'flags': f, 'slots': s, 'phase': p} for n, f, s, p in cohorts],
        'hashes': {n: hashlib.sha256((base / n).read_bytes()).hexdigest() for n in names},
        'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    if 'quoteTask' in manifest: registration['quoteTask'] = manifest['quoteTask']
    (out / 'REGISTRATION.json').write_text(json.dumps(registration, indent=2), encoding='utf-8')
    status = {'sourceSha': source, 'status': 'REGISTERED', 'completedCohorts': [],
              'nativeNotRun': [n for n, _, _, _ in cohorts], 'processedCohorts': [], 'qualificationFailures': [], 'nativeSlotNotRun': {}}
    commands = []
else:
    registration = json.loads((out / 'REGISTRATION.json').read_text())
    assert registration['sourceSha'] == source, 'SOURCE_CHANGED'
    assert registration['codex'] == codex, 'CLIENT_CHANGED'
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
    commands.append({'name': name, 'command': list(map(str, args)), 'status': 'ATTEMPTED'})
    save()
    with (out / (name + '.log')).open('xb') as log:
        code = subprocess.run(list(map(str, args)), cwd=repo, stdout=log, stderr=subprocess.STDOUT,
                              creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands[-1].update(status='COMPLETE', exitCode=code)
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
        status['status'] = 'CONTROLS_PASS_AWAIT_NATIVE'
    else:
        bootstrap = "import {readFeedbackRunIdentity,assertCleanFeedbackSource} from './apps/worker/evals/single-agent-commerce-read-only/feedback-run-identity.mjs';import {requirePassingControls} from './apps/worker/evals/single-agent-commerce-read-only/feedback-native-gates.mjs';const i=readFeedbackRunIdentity();assertCleanFeedbackSource(i);console.log(JSON.stringify({controlsHash:requirePassingControls(process.argv[1],i)}));"
        run(phase + '-readiness', ['node', '--input-type=module', '-e', bootstrap, out / 'controls'])
        for name, flags, slots, selected_phase in cohorts:
            assert name not in status['processedCohorts'], 'NO_REPEAT_COHORT'
            if name.startswith('b1-'):
                common = [sys.executable, launcher, 'node', base / 'run.mjs', '--config', base / 'source-config.b1.json', '--cases', base / 'cases.b1.json', *flags, '--owner-presentation', 'VI_DATA_BLOCKS_COMPACT_V2']
                run(name + '-preflight', common + ['--out', out / (name + '-preflight'), '--preflight'])
                run(name, common + ['--out', out / name, '--run'])
                assert len(list((out / name).glob('attempt-*.json'))) == slots
            else:
                common = [sys.executable, launcher, 'node', base / 'isolated-integration.mjs']
                shared = ['COD', '--provider-run', '--candidate-handoff', *flags, '--owner-presentation', 'VI_DATA_BLOCKS_COMPACT_V2']
                run(name + '-preflight', common + [out / (name + '-preflight'), *shared, '--provider-preflight'])
                run(name, common + [out / name, *shared])
                report = json.loads((out / name / 'integration.json').read_text(encoding='utf-8-sig'))
                assert report['testDatabaseDropped'] is True
                q = report['qualificationSummary']
                assert q['registered'] == slots and q['executed'] + q['notRun'] == slots, 'QUALIFICATION_DENOMINATOR'
                assert report['completedOutcomes'] == q['executed'], 'EXECUTED_COUNT'
                if q['qualificationErrors'] or q['notRun']:
                    status['qualificationFailures'].append({'cohort': name, 'summary': q, 'queueLatch': report.get('queueLatch')})
                    status['nativeSlotNotRun'][name] = [r['caseId'] for r in report['outcomes'] if r.get('executionStatus') == 'NOT_RUN_BY_QUALIFICATION']
                    status['processedCohorts'].append(name)
                    if not q['notRun']: status['nativeNotRun'].remove(name)
                    save()
                    continue
            status['processedCohorts'].append(name)
            status['completedCohorts'].append(name)
            status['nativeNotRun'].remove(name)
            save()
        status['status'] = 'QUALIFICATION_FAILED_RETAIN_EVIDENCE' if status['qualificationFailures'] else 'FULL_COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW'
    status['sourceUnchanged'] = True
except Exception as error:
    status.update({'status': 'STOPPED_RETAIN_EVIDENCE', 'error': str(error)})
    save()
    raise
save()
