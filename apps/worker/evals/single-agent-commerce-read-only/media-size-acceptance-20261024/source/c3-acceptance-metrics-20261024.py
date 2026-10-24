from pathlib import Path
import collections, json, math
root=Path('C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-complete-20261024')
jobs=['b1','stateful','journey-openings','media-followup','negotiation','opening-quotes']
metrics={'jobs':{},'native':{},'controls':{}}
generations=[];attempts=[];verifier_stage=[]
for job in jobs:
 files=list((root/job).glob('attempt-*.json' if job=='b1' else 'provider-attempt-*.json'))
 records=[json.loads(p.read_text()) for p in files];attempts.extend(records)
 gens=[dict(g,caseId=a['caseId']) for a in records for g in a['result'].get('generations',[])]
 generations.extend(gens)
 verifier_stage.extend(a['result']['verificationLatencyMs'] for a in records if a['result'].get('verifierGenerations',0)>0 and isinstance(a['result'].get('verificationLatencyMs'),(int,float)))
 assert all(a['result'].get('verifierGenerations',0)<=1 for a in records)
 metrics['jobs'][job]={'attempts':len(records),'terminals':dict(collections.Counter(a['result']['terminal']['disposition'] for a in records)),
  'generationRequests':sum(g.get('telemetry',{}).get('providerRequests',0) for g in gens),
  'databaseDropped':None if job=='b1' else json.loads((root/job/'integration.json').read_text())['testDatabaseDropped']}
assert len(attempts)==51 and len({a['caseId'] for a in attempts})==51
controls=[json.loads(p.read_text()) for p in (root/'controls').glob('attempt-*.json')]
assert len(controls)==17
safe=[c for c in controls if c['definition'].get('safe') is True]
unsafe=[c for c in controls if c['definition'].get('safe') is False]
probe=[c for c in controls if c not in safe+unsafe]
assert (len(safe),len(unsafe),len(probe))==(8,8,1)
metrics['controls']={'attempts':17,'safe':8,'unsafe':8,'probe':1,
 'unsafeSendEligibleFalsePass':sum(c['terminal']['disposition']=='SEND_ELIGIBLE' and c['terminal']['reason']=='PASS' for c in unsafe),
 'safeRejected':sum(c['terminal']['disposition']!='SEND_ELIGIBLE' for c in safe)}
for c in controls:
 t=(c.get('provider') or {}).get('telemetry',{})
 generations.append({'id':c['request']['generationId'],'role':'verifier','caseId':'CONTROL', 'status':t.get('status'), 'telemetry':t})
def quantiles(values):
 values=sorted(values)
 return {'n':len(values),'p50Ms':values[math.ceil(.5*len(values))-1] if values else None,'p95Ms':values[math.ceil(.95*len(values))-1] if values else None,'policy':'nearest-rank'}
requests=[g for g in generations if g.get('telemetry',{}).get('providerRequests',0)>0]
assert all(g['telemetry']['providerRequests']==1 for g in requests)
verifiers=[g for g in requests if g['role']=='verifier']
owners=[g for g in requests if g['role']=='owner']
input_tokens=output_tokens=missing_usage=0
errors=[]
for g in requests:
 t=g['telemetry']; usage=t.get('usage') or {}
 if t.get('inputTokens') is None and usage.get('input_tokens') is None: missing_usage+=1
 input_tokens+=t.get('inputTokens') or usage.get('input_tokens') or 0
 output_tokens+=t.get('outputTokens') or usage.get('output_tokens') or 0
 if t.get('httpStatus')!=200 or t.get('status','OK')!='OK':
  errors.append({'caseId':g['caseId'],'role':g['role'],'generationStatus':g.get('status'),'telemetryStatus':t.get('status'),
   'httpStatus':t.get('httpStatus'),'providerErrorCode':t.get('providerErrorCode'),'terminalEvent':t.get('providerTerminalEvent'),
   'incompleteReason':t.get('providerIncompleteReason'),'failureStage':t.get('failureStage'),'failureCode':t.get('failureCode')})
metrics['native']={'attempts':51,'sendEligibilityOnly':24,'captureTransport':27,
 'terminals':dict(collections.Counter(a['result']['terminal']['disposition'] for a in attempts)),
 'reasons':dict(collections.Counter(a['result']['terminal']['reason'] for a in attempts)),
 'actualSilentCapturedTurns':sum(not a.get('actualCapturedMessages') for a in attempts if 'actualCapturedMessages' in a),
 'codeCheckoutOutcomes':sum(a['result']['terminal']['reason'] in ['CHECKOUT_DETAILS_MISSING','PRIVATE_CHECKOUT_COMMITTED'] for a in attempts)}
metrics['operations']={'generationSlots':len(generations),'actualGenerationRequests':len(requests),'ownerRequests':len(owners),'verifierRequests':len(verifiers),
 'requestsPerDispatchedGenerationMax':max(g['telemetry']['providerRequests'] for g in requests),'automaticGenerationRetries':0,
 'knownInputTokens':input_tokens,'knownOutputTokens':output_tokens,'requestsWithUnknownUsage':missing_usage,
 'cost':'NOT_EXPOSED' if all(g['telemetry'].get('cost') is None for g in requests) else 'SEE_RAW',
 'providerErrors':errors,'providerErrorCount':len(errors),'providerTimeoutCount':sum(e.get('telemetryStatus')=='TIMEOUT' for e in errors),
 'generationContractErrors':[{'caseId':g['caseId'],'role':g['role'],'kind':'UNEXPECTED_TOOL_CALL_IN_FINAL_ONLY'} for g in requests if g['telemetry'].get('unexpectedToolCall')],
 'returnedModelVersions':dict(collections.Counter(g['telemetry'].get('modelVersion') or 'UNAVAILABLE' for g in requests)),
 'providerVerifierLatency':quantiles([g['telemetry']['latencyMs'] for g in verifiers if isinstance(g['telemetry'].get('latencyMs'),(int,float))]),
 'nativeVerifierStageLatency':quantiles(verifier_stage),
 'nativeWholeAttemptLatency':quantiles([a['elapsedMs'] for a in attempts]),
 'readOnlyAttemptLatency':quantiles([a['elapsedMs'] for a in attempts if 'actualCapturedMessages' not in a]),
 'capturedCustomerOutcomeLatency':quantiles([a['elapsedMs'] for a in attempts if 'actualCapturedMessages' in a]),
 'measurementLimit':'Provider verifier latency is bounded-relay wall time. Native verification stage includes code wrapper/readback; not a controlled counterfactual added-E2E comparison. Overall attempt summary mixes24eligibility/27capture, with separate summaries below. Isolated SSH/database/capture excludes real Meta delivery latency; not a production speed estimate. Build/preflight/setup excluded.'}
metrics['errorDetails']=errors
(root/'METRICS.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(metrics,ensure_ascii=False,indent=2))
