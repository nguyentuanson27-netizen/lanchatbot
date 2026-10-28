"""Scoped N1 acceptance on existing persisted cohorts; no runtime or prompt patch."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

repo = Path(__file__).resolve().parents[5]
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
out = Path(sys.argv[1]).resolve()
assert not out.is_relative_to(repo), 'RAW_OUTPUT_MUST_BE_OUTSIDE_SOURCE'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()

assert not git('status', '--porcelain'), 'DIRTY_SOURCE'
source = git('rev-parse', 'HEAD')
out.mkdir()
manifest = json.loads((base / 'manifest.json').read_text())
assert manifest['models']['conversation']['model'] == 'gemini-3.5-flash-lite'
assert manifest['models']['verifier']['model'] == 'gpt-6.1-sol'
assert all(m['effort'] == 'high' for m in manifest['models'].values())
cohorts = [('opening-quotes', ['--opening-quotes'], 5),
           ('media-probe', ['--media-probe'], 4),
           ('journey-openings', ['--journey-openings'], 4),
           ('stateful', [], 8)]
files = ['manifest.json', 'source-config.b1.json', 'opening-quote-cases.json',
         'sales-media-cases.json', 'sales-journeys.candidate.json', 'stateful-cases.json',
         'prompts/owner.vi.txt', 'prompts/verifier.vi.txt', 'handoff-matrix.candidate.json',
         'isolated-integration.mjs', 'stateful-provider.mjs', 'gemini-inference.mjs',
         'protocol.mjs', 'feedback-controls-20261023.mjs', 'source-session.py']
registration = {'sourceSha': source, 'implementationBaseSha': '2fa14323dd2edbaae429e5c737319949700027fa',
                'mode': 'SCOPED_PERSISTED_MISSING_INFORMATION_ACCEPTANCE',
                'models': manifest['models'], 'promptHashes': manifest['promptHashes'],
                'hashes': {f: hashlib.sha256((base / f).read_bytes()).hexdigest() for f in files},
                'driverSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'registeredControls': 17, 'registeredNativeSlots': 21, 'registeredTotalSlots': 38,
                'maximumGenerationRequests': 97, 'repetitions': 1, 'generationRetry': 0,
                'sendEnabled': False, 'cohorts': [{'name': n, 'flags': f, 'slots': s} for n, f, s in cohorts]}
(out / 'REGISTRATION.json').write_text(json.dumps(registration, indent=2), encoding='utf-8')
commands = []
status = {'sourceSha': source, 'status': 'REGISTERED', 'completedNativeCohorts': [], 'nativeNotRun': [c[0] for c in cohorts]}

def save():
    (out / 'COMMANDS.json').write_text(json.dumps(commands, indent=2), encoding='utf-8')
    (out / 'DISPATCH_STATUS.json').write_text(json.dumps(status, indent=2), encoding='utf-8')

def run(name, args):
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain'), 'SOURCE_CHANGED'
    print('START ' + name, flush=True)
    with (out / (name + '.log')).open('xb') as log:
        result = subprocess.run(list(map(str, args)), cwd=repo, stdout=log, stderr=subprocess.STDOUT,
                                creationflags=subprocess.CREATE_NO_WINDOW)
    commands.append({'name': name, 'command': list(map(str, args)), 'exitCode': result.returncode})
    save()
    print('DONE ' + name + ' exit=' + str(result.returncode), flush=True)
    assert result.returncode == 0, 'COMMAND_FAILED_' + name
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain'), 'SOURCE_CHANGED'

save()
try:
    run('source-capture', [sys.executable, base / 'source-session.py', 'node', base / 'feedback-source-capture.mjs', out / 'source'])
    run('controls-preflight', ['node', base / 'feedback-controls-20261023.mjs', out / 'controls-preflight', '--capture', out / 'source/capture.json', '--preflight'])
    run('controls', ['node', base / 'feedback-controls-20261023.mjs', out / 'controls', '--capture', out / 'source/capture.json', '--prepared', out / 'controls-preflight/prepared.json'])
    assert json.loads((out / 'controls/summary.json').read_text(encoding='utf-8-sig'))['controlsPass'] is True, 'CONTROLS_NOT_PASS'
    launcher = base / 'model-code-division-run-20261019/raw/credential-launcher.py'
    for name, flags, slots in cohorts:
        args = [sys.executable, launcher, 'node', base / 'isolated-integration.mjs']
        shared = ['COD', '--provider-run', '--candidate-handoff', *flags]
        run(name + '-preflight', args + [out / (name + '-preflight'), *shared, '--provider-preflight'])
        run(name, args + [out / name, *shared])
        report = json.loads((out / name / 'integration.json').read_text(encoding='utf-8-sig'))
        assert report['testDatabaseDropped'] is True, 'TEST_DATABASE_NOT_DROPPED'
        status['completedNativeCohorts'].append(name)
        status['nativeNotRun'].remove(name)
        save()
    status['status'] = 'COLLECTED_REQUIRES_WHOLE_TERMINAL_REVIEW'
    status['sourceUnchanged'] = True
except Exception as error:
    status.update({'status': 'STOPPED_RETAIN_EVIDENCE', 'error': str(error)})
    save()
    raise
save()
