"""Run the registered existing populations once; reuse the approved runners."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys

repo = Path.cwd()
base = Path('apps/worker/evals/single-agent-commerce-read-only')
registration = json.loads((Path(__file__).parent / 'REGISTRATION.json').read_text(encoding='utf-8'))
launcher, output = (Path(p).resolve() for p in sys.argv[1:3])
assert hashlib.sha256(launcher.read_bytes()).hexdigest() == registration['launcherHash']
assert registration['registeredSlots'] == 16 and registration['repetitions'] == 1
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=repo, text=True).strip()
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
output.mkdir(exist_ok=False)
(output / 'RUN_SOURCE.json').write_text(json.dumps({
    'candidateRunSourceSha': source, 'registeredSlots': 16,
    'maximumGenerationRequests': 52, 'sendEnabled': False,
}, indent=2) + '\n', encoding='utf-8')
commands = []


def run(name, args):
    command = [sys.executable, str(launcher), 'node', *map(str, args)]
    with (output / (name + '.log')).open('xb') as log:
        code = subprocess.run(command, cwd=repo, env=dict(os.environ, C3_DIVISION_REPO=str(repo)),
                              stdout=log, stderr=subprocess.STDOUT,
                              creationflags=subprocess.CREATE_NO_WINDOW).returncode
    commands.append({'name': name, 'command': command, 'exitCode': code})
    (output / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n', encoding='utf-8')
    assert code == 0, name + '_EXECUTABLE_FAILURE'


run('stateful-preflight', [base/'isolated-integration.mjs', 'unused', 'COD', '--provider-preflight'])
run('source-check', [base/'run.mjs', '--config', base/'source-config.b1.json', '--cases',
                     Path(__file__).parent/'cases.prioritized.json', '--out', output/'source-check', '--source-check'])
run('stateful-1', [base/'isolated-integration.mjs', output/'stateful-1', 'COD', '--provider-run'])
run('b1-1', [base/'run.mjs', '--config', base/'source-config.b1.json', '--cases',
             Path(__file__).parent/'cases.prioritized.json', '--range', '1:4', '--out', output/'b1-1', '--run'])

folder = output/'b1-1'
assert json.loads((folder/'registration.json').read_text(encoding='utf-8'))['bRunSourceSha'] == source
events = [json.loads(line) for line in (folder/'requests.jsonl').read_text(encoding='utf-8').splitlines()]
captures = []
for slot in range(1, 5):
    attempt = json.loads((folder/('attempt-'+str(slot)+'.json')).read_text(encoding='utf-8'))
    generations = {g['id']: g for g in attempt['result'].get('generations', [])}
    requests = [dict(e['value'], providerRequests=generations[e['id']].get('telemetry', {}).get('providerRequests', 0))
                for e in events if e['phase'] == 'PUBLIC_CONTEXT_CAPTURE' and e['id'] in generations]
    captures.append({'caseId': attempt['caseId'], 'runtime': attempt['runtime'],
                     'requests': requests, 'sourceSha': source})
path = output/'advice-input-1.json'
path.write_text(json.dumps(captures, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(output/'CAPTURE_INPUT_HASHES.json').write_text(json.dumps([
    {'rep': 1, 'hash': hashlib.sha256(path.read_bytes()).hexdigest()}
], indent=2)+'\n', encoding='utf-8')
run('advice-1', [base/'advice-diagnostic.mjs', path, output/'advice-1'])
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip() == source
print(json.dumps({'completedPopulationJobs': 3, 'runSourceSha': source, 'out': str(output)}))
