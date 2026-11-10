"""Task-local credential launcher; existing source-session and inference route unchanged."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
repo = Path(os.environ.get('C3_DIVISION_REPO', 'C:/Users/nguye/Documents/Sản phẩm AI/lanchatbot-c3-semantic-verifier-checkpoint-a-20261005')).resolve()
ops_path = repo / 'plugins/lana-chatbot-ops/scripts/lana_mcp_server.py'
spec = importlib.util.spec_from_file_location('lana_ops', ops_path)
ops = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ops)
with tempfile.TemporaryDirectory(prefix='c3-offer-replay-credential-') as directory:
    temporary = Path(directory).resolve()
    assert temporary.parent == Path(tempfile.gettempdir()).resolve()
    askpass = temporary / 'askpass.cmd'
    shutil.copyfile(ops_path.parent / 'ssh_askpass.cmd', askpass)
    original = ops.ssh_environment
    ops.ssh_environment = lambda: {**original(), 'SSH_ASKPASS': str(askpass)}
    script = "import{readFileSync}from'node:fs';const p=process.env.VERTEX_CREDENTIAL_FILE;if(!p)throw Error('VERTEX_CREDENTIAL_ROUTE_UNAVAILABLE');process.stdout.write(Buffer.from(JSON.stringify({configuredProject:process.env.VERTEX_PROJECT_ID,document:JSON.parse(readFileSync(p))})).toString('base64'));"
    encoded = base64.b64encode(script.encode()).decode()
    result = ops.ssh_command('printf %s ' + shlex.quote(encoded) + ' | base64 -d | docker exec -i lana-chatbot-realtime-worker node --input-type=module')
    source = json.loads(base64.b64decode(result.strip(), validate=True))
    config = json.loads((repo / 'apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json').read_text())
    if source['configuredProject'] != config['vertex']['projectId']:
        raise RuntimeError('EXISTING_CONFIGURED_PROJECT_MISMATCH')
    document = source['document']
    entry = document[0] if isinstance(document, list) and document else document
    if isinstance(entry, dict) and entry.get('type') != 'service_account':
        # Existing deployed extracted {email, privateKey, region}, or googleApi export.
        data = entry.get('data', {}) if entry.get('type') == 'googleApi' else entry
        if not isinstance(data.get('email'), str) or not isinstance(data.get('privateKey'), str):
            raise RuntimeError('EXISTING_GOOGLE_API_CREDENTIAL_SHAPE')
        if not data['email'].endswith('@' + source['configuredProject'] + '.iam.gserviceaccount.com'):
            raise RuntimeError('EXISTING_SERVICE_ACCOUNT_PROJECT_MISMATCH')
        credential = {'type': 'service_account', 'project_id': source['configuredProject'], 'client_email': data['email'], 'private_key': data['privateKey']}
    else:
        credential = entry
    if credential.get('type') != 'service_account' or credential.get('project_id') != config['vertex']['projectId']:
        raise RuntimeError('EXISTING_CREDENTIAL_SCOPE_MISMATCH')
    credential_bytes = json.dumps(credential).encode()
    credential_path = temporary / 'vertex-service-account.json'
    credential_path.write_bytes(credential_bytes)
    os.chmod(credential_path, 0o600)
    env = os.environ.copy()
    env['C3_VERTEX_CREDENTIAL_FILE'] = str(credential_path)
    ops.audit('c3_b_existing_vertex_credential_route', 'read_only', 'Owner-authorized Phase B replay; existing serving credential for the same frozen Vertex project; temporary file removed at exit', {'confirm_sensitive_read': True, 'credentialRoute': 'C3_VERTEX_CREDENTIAL_FILE', 'providerSubstitution': False})
    child = subprocess.run([sys.executable, str(repo / 'apps/worker/evals/single-agent-commerce-read-only/source-session.py'), *sys.argv[1:]], cwd=repo, env=env, creationflags=subprocess.CREATE_NO_WINDOW, capture_output=True)
    sys.stdout.buffer.write(child.stdout)
    sys.stderr.buffer.write(child.stderr)
    result_code = child.returncode
sys.exit(result_code)
