"""Recover only exact orphan test databases recorded by the interrupted runs."""
from pathlib import Path
import base64,importlib.util,json,re,shlex,shutil,tempfile
repo=Path(__file__).parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
checks=repo.parent/'c3-turn-completion-checks-20261024'
ops_path=repo/'plugins/lana-chatbot-ops/scripts/lana_mcp_server.py'
spec=importlib.util.spec_from_file_location('lana_ops',ops_path);ops=importlib.util.module_from_spec(spec);spec.loader.exec_module(ops)
targets=[]
for payment in ['cod','bank']:
 p=checks/(payment+'-integration-qualified')/'integration.json'
 r=json.loads(p.read_text())
 assert r['sourceSha']=='235d570a90f792a096e37d4094e6feaf3c7eee95' and r['providerGenerations']==0 and not r['testDatabaseDropped']
 assert re.fullmatch(r'c3_b_test_[a-f0-9]{16}',r['testDatabase'])
 targets.append({'database':r['testDatabase'],'versionId':r['candidateHandoff']['versionId']})
script=r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const {Pool}=createRequire('/app/packages/database/package.json')('pg');
const targets=TARGETS;
const secret=(name,...files)=>process.env[name]?.trim()||files.map(f=>process.env[f]).filter(Boolean).map(f=>readFileSync(f,'utf8').trim())[0];
const url=secret('DATABASE_URL','REALTIME_DATABASE_URL_FILE','DATABASE_URL_FILE');assert(url);
const admin=new Pool({connectionString:url,max:1}),result=[];
try{
 for(const t of targets){
  assert(/^c3_b_test_[a-f0-9]{16}$/.test(t.database));const target=new URL(url);assert.notEqual(target.pathname,'/'+t.database);target.pathname='/'+t.database;
  const exists=await admin.query('SELECT datname FROM pg_database WHERE datname=$1 AND NOT datistemplate',[t.database]);
  if(!exists.rowCount){result.push({...t,status:'ALREADY_ABSENT'});continue;}
  const test=new Pool({connectionString:target.toString(),max:1});
  try{assert.equal((await test.query('SELECT EXISTS(SELECT 1 FROM admin_artifact_versions WHERE version_id=$1) AS proven',[t.versionId])).rows[0].proven,true,'TEST_DATABASE_IDENTITY');}
  finally{await test.end();}
  assert.equal(Number((await admin.query('SELECT count(*) AS n FROM pg_stat_activity WHERE datname=$1',[t.database])).rows[0].n),0,'ACTIVE_TEST_SESSION');
  await admin.query('DROP DATABASE "'+t.database+'"');
  assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[t.database])).rowCount,0);
  result.push({...t,status:'DROPPED_VERIFIED_TEST_DATABASE'});
 }
 console.log(JSON.stringify({status:'PASS',targets:result}));
}finally{await admin.end();}
'''.replace('TARGETS',json.dumps(targets))
with tempfile.TemporaryDirectory(prefix='c3-cleanup-') as folder:
 helper=Path(folder)/'askpass.cmd';shutil.copyfile(ops_path.parent/'ssh_askpass.cmd',helper)
 original=ops.ssh_environment;ops.ssh_environment=lambda:{**original(),'SSH_ASKPASS':str(helper)}
 status=ops.ssh_command("docker inspect --format '{{.RestartCount}} {{.State.StartedAt}} {{.State.Status}}' lana-chatbot-postgres")
 ops.audit('c3_b_test_database_cleanup','started','Cleanup exact interrupted disposable test databases after network reset; verify candidate artifact identity before DROP',{'targets':targets})
 encoded=base64.b64encode(script.encode()).decode()
 raw=ops.ssh_command('printf %s '+shlex.quote(encoded)+' | base64 -d | docker exec -i lana-chatbot-realtime-worker node --input-type=module',timeout=90)
 report=json.loads(raw.strip().splitlines()[-1]);report['postgresContainer']=status.strip()
 (checks/'ORPHAN_DATABASE_CLEANUP.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 print(json.dumps(report))
