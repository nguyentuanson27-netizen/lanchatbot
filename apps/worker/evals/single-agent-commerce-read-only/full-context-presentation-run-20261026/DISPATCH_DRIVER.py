"""A single registered 17-control + 16-slot diagnostic; no automatic retry or full run."""
import json
from pathlib import Path
import subprocess
import sys

repo = Path(__file__).resolve().parents[5]
base = repo / 'apps/worker/evals/single-agent-commerce-read-only'
out = Path(sys.argv[1]).resolve()
assert not out.is_relative_to(repo), 'RAW_OUTPUT_OUTSIDE_SOURCE'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()

assert not git('status', '--porcelain'), 'DIRTY_SOURCE'
source = git('rev-parse', 'HEAD')
out.mkdir()
registration = {'sourceSha': source, 'mode': 'CAPTURED_WORLD_FULL_CONTEXT_PRESENTATION_NOT_LIVE_ELIGIBILITY',
                'controls': 17, 'diagnosticSlots': 16, 'totalRegisteredOutcomes': 33,
                'maximumGenerationRequests': 49, 'repetitions': 1, 'retry': 0, 'sendEnabled': False}
(out / 'REGISTRATION.json').write_text(json.dumps(registration, indent=2), encoding='utf-8')
commands = []
status = {'sourceSha': source, 'status': 'REGISTERED'}

def save():
    (out / 'COMMANDS.json').write_text(json.dumps(commands, indent=2), encoding='utf-8')
    (out / 'STATUS.json').write_text(json.dumps(status, indent=2), encoding='utf-8')

def run(name, args):
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain'), 'SOURCE_CHANGED'
    assert not any(c['name'] == name for c in commands), 'NO_RETRY'
    print('START ' + name, flush=True)
    commands.append({'name': name, 'command': list(map(str, args)), 'status': 'ATTEMPTED'})
    save()
    with (out / (name + '.log')).open('xb') as log:
        code = subprocess.run(list(map(str, args)), cwd=repo, stdout=log, stderr=subprocess.STDOUT,
                              creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands[-1].update(status='COMPLETE', exitCode=code)
    save()
    print('DONE ' + name + ' exit=' + str(code), flush=True)
    assert code == 0, 'FAILED_' + name
    assert git('rev-parse', 'HEAD') == source and not git('status', '--porcelain'), 'SOURCE_CHANGED'

save()
try:
    # All historical worlds and normalized paired wires must reconstruct before fresh provider controls.
    offline = "import{readFileSync}from'node:fs';import{prepareFullPresentation}from'./apps/worker/evals/single-agent-commerce-read-only/full-context-presentation.mjs';import{hardPrecheck}from'./apps/worker/dist/single-agent-semantic-verifier-boundary.js';const f=JSON.parse(readFileSync(process.argv[1]));prepareFullPresentation(f,readFileSync(process.argv[2],'utf8'));for(const r of f.records)if(hardPrecheck(r.capture.context,'Dạ.',new Date(r.capture.capturedAt)))throw Error('CAPTURE_NOT_REPLAYABLE');console.log('OFFLINE_PASS_ZERO_PROVIDER');"
    run('offline-preflight', ['node', '--input-type=module', '-e', offline,
                             base / 'quote-presentation-run-20261026/frozen-inputs.json', base / 'prompts/owner.vi.txt'])
    run('source-capture', [sys.executable, base / 'source-session.py', 'node', base / 'feedback-source-capture.mjs', out / 'source'])
    run('controls-preflight', ['node', base / 'feedback-controls-20261023.mjs', out / 'controls-preflight', '--capture', out / 'source/capture.json', '--preflight'])
    run('controls', ['node', base / 'feedback-controls-20261023.mjs', out / 'controls', '--capture', out / 'source/capture.json', '--prepared', out / 'controls-preflight/prepared.json'])
    assert json.loads((out / 'controls/summary.json').read_text())['controlsPass'] is True
    run('diagnostic-preflight', ['node', base / 'full-context-presentation.mjs', out / 'diagnostic-preflight', '--preflight', out / 'controls'])
    run('diagnostic', [sys.executable, base / 'model-code-division-run-20261019/raw/credential-launcher.py',
                       'node', base / 'full-context-presentation.mjs', out / 'diagnostic', '--run', out / 'controls',
                       out / 'diagnostic-preflight/registration.json'])
    status['status'] = 'COLLECTED_REQUIRES_BLIND_REVIEW'
except Exception as error:
    status.update(status='STOPPED_RETAIN_EVIDENCE', error=str(error))
    save()
    raise
save()
