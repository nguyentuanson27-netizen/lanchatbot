from pathlib import Path
import collections,json,math
root=Path(__file__).parent/'c3-tool-history-continuation-20261025'
attempts=[];generations=[];jobs={}
for job in sorted(root.iterdir()):
 if not job.is_dir() or job.name.startswith('controls') or job.name.endswith('preflight'):continue
 files=[*job.glob('attempt-*.json'),*job.glob('provider-attempt-*.json')]
 records=[json.loads(p.read_text(encoding='utf-8')) for p in files]
 if not records:continue
 attempts.extend(records)
 gs=[dict(g,caseId=a['caseId']) for a in records for g in a['result'].get('generations',[])]
 generations.extend(gs)
 jobs[job.name]={'attempts':len(records),'terminals':dict(collections.Counter(a['result']['terminal']['disposition'] for a in records)),
  'databaseDropped':json.loads((job/'integration.json').read_text())['testDatabaseDropped'] if (job/'integration.json').exists() else None}
assert len({a['caseId'] for a in attempts})==len(attempts)
controls=[json.loads(p.read_text(encoding='utf-8')) for p in (root/'controls').glob('attempt-*.json')]
for c in controls:
 t=(c.get('provider') or {}).get('telemetry',{})
 generations.append({'id':c['request']['generationId'],'role':'verifier','caseId':'CONTROL','status':t.get('status'),'telemetry':t})
requests=[g for g in generations if g.get('telemetry',{}).get('providerRequests',0)>0]
assert all(g['telemetry']['providerRequests']==1 for g in requests)
def q(v):
 v=sorted(v)
 return {'n':len(v),'p50Ms':v[math.ceil(.5*len(v))-1] if v else None,'p95Ms':v[math.ceil(.95*len(v))-1] if v else None,'policy':'nearest-rank'}
usage=lambda g:g.get('telemetry',{}).get('usage') or {}
safe=[c for c in controls if c['definition'].get('safe') is True]
unsafe=[c for c in controls if c['definition'].get('safe') is False]
errors=[{'caseId':g['caseId'],'role':g['role'],'httpStatus':g['telemetry'].get('httpStatus'),'generationStatus':g.get('status'),
 'failureStage':g['telemetry'].get('failureStage'),'failureCode':g['telemetry'].get('failureCode')} for g in requests if g['telemetry'].get('httpStatus')!=200 or g['telemetry'].get('status','OK')!='OK']
m={'sourceSha':json.loads((root/'REGISTRATION.json').read_text())['sourceSha'],'jobs':jobs,
 'native':{'registered':35,'attempted':len(attempts),'notRun':35-len(attempts),'sendEligibilityOnly':sum('actualCapturedMessages' not in a for a in attempts),
  'captureTransport':sum('actualCapturedMessages' in a for a in attempts),'terminals':dict(collections.Counter(a['result']['terminal']['disposition'] for a in attempts)),
  'reasons':dict(collections.Counter(a['result']['terminal']['reason'] for a in attempts)),
  'actualSilentCapturedTurns':sum(not a.get('actualCapturedMessages') for a in attempts if 'actualCapturedMessages' in a)},
 'controls':{'registered':0,'attempts':len(controls),'safe':len(safe),'unsafe':len(unsafe),'probe':len(controls)-len(safe)-len(unsafe),
  'unsafeSendEligibleFalsePass':sum(c['terminal']['disposition']=='SEND_ELIGIBLE' and c['terminal']['reason']=='PASS' for c in unsafe),
  'safeRejected':sum(c['terminal']['disposition']!='SEND_ELIGIBLE' for c in safe)},
 'operations':{'generationAttempts':len(generations),'actualGenerationRequests':len(requests),'ownerRequests':sum(g['role']=='owner' for g in requests),
  'verifierRequests':sum(g['role']=='verifier' for g in requests),'automaticGenerationRetries':0,'maximumProviderRequestsPerGeneration':max([g['telemetry']['providerRequests'] for g in requests] or [0]),
  'knownInputTokens':sum(g['telemetry'].get('inputTokens') or usage(g).get('input_tokens') or 0 for g in requests),
  'knownOutputTokens':sum(g['telemetry'].get('outputTokens') or usage(g).get('output_tokens') or 0 for g in requests),
  'requestsWithUnknownUsage':sum(g['telemetry'].get('inputTokens') is None and usage(g).get('input_tokens') is None for g in requests),
  'cost':'NOT_EXPOSED','providerErrors':errors,'providerErrorCount':len(errors),
  'providerTimeoutCount':sum(g.get('status')=='TIMEOUT' or g['telemetry'].get('status')=='TIMEOUT' for g in requests),
  'generationContractErrors':[{'caseId':g['caseId'],'role':g['role'],'kind':'UNEXPECTED_TOOL_CALL_IN_FINAL_ONLY'} for g in requests if g['telemetry'].get('unexpectedToolCall')],
  'verifierLatency':q([g['telemetry']['latencyMs'] for g in requests if g['role']=='verifier' and isinstance(g['telemetry'].get('latencyMs'),(int,float))]),
  'verificationStageLatency':q([a['result']['verificationLatencyMs'] for a in attempts if a['result'].get('verifierGenerations',0)>0 and isinstance(a['result'].get('verificationLatencyMs'),(int,float))]),
  'readOnlyAttemptLatency':q([a['elapsedMs'] for a in attempts if 'actualCapturedMessages' not in a]),
  'captureAttemptLatency':q([a['elapsedMs'] for a in attempts if 'actualCapturedMessages' in a]),
  'measurementLimit':'Isolated DB/SSH/fake Meta transport; not production latency, first-token, controlled added-E2E latency, or conversion.'}}
(root/'METRICS.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(m,ensure_ascii=False,indent=2))
