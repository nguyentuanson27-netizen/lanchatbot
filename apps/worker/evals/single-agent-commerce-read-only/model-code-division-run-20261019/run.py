"""Bounded registered comparison. Uses the existing credential/source launcher."""
from pathlib import Path
import concurrent.futures
import hashlib
import json
import os
import subprocess
import sys

repo = Path.cwd()
baseline, launcher, output = map(lambda p: Path(p).resolve(), sys.argv[1:4])
base = Path('apps/worker/evals/single-agent-commerce-read-only')
registration = json.loads((repo / base / 'model-code-division-run-20261019/REGISTRATION.json').read_text(encoding='utf-8'))
assert hashlib.sha256(launcher.read_bytes()).hexdigest() == registration['launcherHash']
output.mkdir(exist_ok=False)
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
commands = []

def job(root, name, args):
    out = output / name
    env = dict(os.environ, C3_DIVISION_REPO=str(root))
    command = [sys.executable, str(launcher), 'node', *map(str, args)]
    with (output / (name + '.log')).open('xb') as log:
        code = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW).returncode
    return {'name': name, 'cwd': str(root), 'command': command, 'exitCode': code, 'out': str(out)}

def group(population, factory):
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(factory, rep) for rep in (1, 2, 3)]
        for f in concurrent.futures.as_completed(futures):
            row = f.result()
            commands.append(row)
            (output / 'commands.json').write_text(json.dumps(commands, indent=2)+'\n', encoding='utf-8')
    assert all(r['exitCode'] == 0 for r in commands if r['name'].startswith(population)), population + '_EXECUTABLE_FAILURE'

(output / 'RUN_SOURCE.json').write_text(json.dumps({'candidateRunSourceSha': source, 'baselineSourceSha': registration['baselineHarnessSha'], 'registeredSlots': 51, 'maximumGenerationRequests': 180, 'sendEnabled': False}, indent=2)+'\n', encoding='utf-8')
group('baseline', lambda rep: job(baseline, 'baseline-'+str(rep), [base/'isolated-integration.mjs', output/('baseline-'+str(rep)), 'COD', '--provider-run', '--opening-only']))
group('stateful', lambda rep: job(repo, 'stateful-'+str(rep), [base/'isolated-integration.mjs', output/('stateful-'+str(rep)), 'COD', '--provider-run']))
group('b1', lambda rep: job(repo, 'b1-'+str(rep), [base/'run.mjs', '--config', base/'source-config.b1.json', '--cases', base/'model-code-division-run-20261019/cases.prioritized.json', '--range', '1:4', '--out', output/('b1-'+str(rep)), '--run']))

captures = []
for rep in (1, 2, 3):
    folder = output / ('b1-'+str(rep))
    events = [json.loads(l) for l in (folder/'requests.jsonl').read_text(encoding='utf-8').splitlines()]
    assert json.loads((folder/'registration.json').read_text(encoding='utf-8'))['bRunSourceSha'] == source
    rows = []
    for slot in range(1, 5):
        attempt = json.loads((folder/('attempt-'+str(slot)+'.json')).read_text(encoding='utf-8'))
        generations = {g['id']: g for g in attempt['result'].get('generations', [])}
        requests = []
        for e in events:
            if e['phase'] == 'PUBLIC_CONTEXT_CAPTURE' and e['id'] in generations:
                capture = dict(e['value'], providerRequests=generations[e['id']].get('telemetry', {}).get('providerRequests', 0))
                requests.append(capture)
        rows.append({'caseId': attempt['caseId'], 'runtime': attempt['runtime'], 'requests': requests, 'sourceSha': source})
    path = output / ('advice-input-'+str(rep)+'.json')
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    captures.append({'rep': rep, 'hash': hashlib.sha256(path.read_bytes()).hexdigest()})
(output/'CAPTURE_INPUT_HASHES.json').write_text(json.dumps(captures, indent=2)+'\n', encoding='utf-8')
group('advice', lambda rep: job(repo, 'advice-'+str(rep), [base/'advice-diagnostic.mjs', output/('advice-input-'+str(rep)+'.json'), output/('advice-'+str(rep))]))
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip() == source
print(json.dumps({'completedJobs': len(commands), 'expectedJobs': 12, 'runSourceSha': source, 'out': str(output)}))
