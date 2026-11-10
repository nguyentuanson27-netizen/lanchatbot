from pathlib import Path
import json,hashlib,re,collections,math
out=Path(__file__).resolve().parent;registration=json.loads((out/'REGISTRATION.json').read_text(encoding='utf-8'))
targetKeys={(x['cohort'],x['caseId']) for x in registration['targets']};setupKeys={(x['cohort'],x['caseId']) for x in registration['prerequisites']}
rows=[];wire={};leaks=[];drafts={}
for folderName,cohort in [('b1-head','b1'),('b1-tail','b1'),('openings','openings'),('stateful','stateful'),('negotiation','negotiation')]:
 folder=out/folderName
 for p in sorted(folder.glob('*attempt-*.json'),key=lambda p:int(p.stem.split('-')[-1])):
  raw=json.loads(p.read_text(encoding='utf-8'));result=raw['result'];key=(cohort,raw['caseId']);assert key in targetKeys|setupKeys
  actual=([result['terminal']['text']] if result['terminal'].get('text') else []) if cohort=='b1' else raw['actualCapturedMessages']
  rows.append({'cohort':cohort,'caseId':raw['caseId'],'role':'TARGET' if key in targetKeys else 'PREREQUISITE','raw':str(p.relative_to(out)),
   'actual':actual,'terminal':result['terminal'],'recovery':result.get('recovery'),'elapsedMs':raw['elapsedMs'],'generations':result.get('generations',[]),
   'verificationLatencyMs':result.get('verificationLatencyMs'),'status':raw.get('status'),'committedPublicState':raw.get('committedPublicState')})
 requestFile=folder/('requests.jsonl' if cohort=='b1' else 'provider-requests.jsonl')
 if requestFile.exists():
  for line in requestFile.read_text(encoding='utf-8').splitlines():
   record=json.loads(line);phase=record['phase'];value=record['value']
   body=value if phase=='OWNER_REQUEST' else value.get('requestBody') if phase=='DISPATCHED' else None
   if body is not None:
    if re.search(r'"(?:caseId|evaluator|purposeId|requiredBehaviors|expectedSafe|qualityScore)"',json.dumps(body)):leaks.append(record['id'])
    assert record['id'] not in wire,'DUPLICATE_DISPATCH_ID'
    wire[record['id']]={'role':'owner' if phase=='OWNER_REQUEST' else 'verifier','bodyHash':hashlib.sha256(json.dumps(body,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()}
   if phase=='OWNER_RESULT' and value.get('kind')=='FINAL':drafts[record['id'].split(':owner:')[0]]=value['text']
for row in rows:
 owners=[g for g in row['generations'] if g['role']=='owner']
 row['draft']=drafts.get(owners[-1]['id'].split(':owner:')[0]) if owners else None
 row['verdicts']=[]
 for g in row['generations']:
  if g['role']=='verifier':
   try:row['verdicts'].append(json.loads(g.get('telemetry',{}).get('answer') or 'null'))
   except (ValueError,TypeError):row['verdicts'].append({'malformed':True})
keys=[(r['cohort'],r['caseId']) for r in rows];assert len(keys)==len(set(keys))
targets=[r for r in rows if r['role']=='TARGET'];setup=[r for r in rows if r['role']=='PREREQUISITE']
generations=[dict(caseId=r['caseId'],scope=r['role'],**g) for r in rows for g in r['generations']]
assert len({g['id'] for g in generations})==len(generations)
def counts(rs):return dict(collections.Counter(r['terminal']['disposition'] for r in rs))
def percentiles(values):
 values=sorted(v for v in values if isinstance(v,(int,float)))
 return {'n':len(values),'p50':values[math.ceil(.5*len(values))-1] if values else None,'p95':values[math.ceil(.95*len(values))-1] if values else None,'method':'NEAREST_RANK_ALL_ATTEMPTS_INCLUDING_ERRORS'}
roles={}
for role in ['owner','verifier']:
 gs=[g for g in generations if g['role']==role];ts=[g.get('telemetry',{}) for g in gs]
 roles[role]={'generations':len(gs),'requests':sum(t.get('providerRequests',0) or 0 for t in ts),'errors':sum(g['status']!='OK' for g in gs),
  'inputTokens':sum(t.get('inputTokens') or (t.get('usage') or {}).get('input_tokens') or 0 for t in ts),
  'outputTokens':sum(t.get('outputTokens') or (t.get('usage') or {}).get('output_tokens') or 0 for t in ts),
  'thinkingTokens':sum(t.get('thinkingTokens') or ((t.get('usage') or {}).get('output_tokens_details') or {}).get('reasoning_tokens') or 0 for t in ts),
  'modelVersions':list(sorted({t['modelVersion'] for t in ts if t.get('modelVersion')}))}
maxRequests=max((g.get('telemetry',{}).get('providerRequests',0) or 0 for g in generations),default=0)
metrics={'runSourceSha':registration['runSourceSha'],'targetRegistered':19,'targetRecorded':len(targets),'targetTerminalDispositions':counts(targets),
 'prerequisiteRegistered':4,'prerequisiteRecorded':len(setup),'prerequisiteTerminalDispositions':counts(setup),'totalRegistered':23,'totalRecorded':len(rows),
 'allTerminalDispositions':counts(rows),'providerRequests':sum(r['requests'] for r in roles.values()),'roles':roles,'capturedWireBodies':len(wire),
 'uniqueGenerationIds':len(generations),'maxRequestsPerGeneration':maxRequests,'evaluatorLabelLeaks':len(leaks),
 'verifierVerdicts':dict(collections.Counter(v.get('verdict','MALFORMED') for r in rows for v in r['verdicts'] if isinstance(v,dict))),
 'verifierLatencyMs':percentiles([g.get('telemetry',{}).get('latencyMs') for g in generations if g['role']=='verifier']),
 'addedVerificationLatencyMs':percentiles([r['verificationLatencyMs'] for r in rows]),
 'providerHttpErrors':sum((g.get('telemetry',{}).get('httpStatus') or 0)>=400 for g in generations),
 'providerErrorCodes':dict(collections.Counter(g.get('telemetry',{}).get('providerErrorCode') for g in generations if g.get('telemetry',{}).get('providerErrorCode'))),
 'timeouts':sum('TIMEOUT' in g['status'].upper() or 'TIMEOUT' in str(g.get('telemetry',{}).get('error','')).upper() for g in generations),
 'cost':None,'costReason':'NOT_EXPOSED','retry':0,'repetitions':1,'sendEnabled':False,
 'databases':{n:{k:json.loads((out/n/'integration.json').read_text()).get(k) for k in ['status','testDatabaseDropped','registeredOutcomes','completedOutcomes']} for n in ['openings','stateful','negotiation'] if (out/n/'integration.json').exists()}}
metrics['verifierVerdictsByScope']={scope:dict(collections.Counter(v.get('verdict','MALFORMED') for r in rows if r['role']==scope for v in r['verdicts'] if isinstance(v,dict))) for scope in ['TARGET','PREREQUISITE']}
metrics['providerRequestsByScope']={scope:sum(g.get('telemetry',{}).get('providerRequests',0) or 0 for g in generations if g['scope']==scope) for scope in ['TARGET','PREREQUISITE']}
metrics['codeReceiptRecoveries']=[{'caseId':r['caseId'],'scope':r['role'],'terminalReason':r['terminal']['reason'],'recovery':r['recovery']} for r in rows if r['recovery'] and r['terminal']['reason'].startswith('RECEIPT_')]
summaryGenerations=[{'caseId':g['caseId'],'scope':g['scope'],'id':g['id'],'role':g['role'],'status':g['status'],**{k:g.get('telemetry',{}).get(k) for k in ['providerRequests','httpStatus','providerErrorCode']}} for g in generations]
for name,value in [('OUTCOMES.json',rows),('METRICS.json',metrics),('REQUEST_ACCOUNTING.json',{'generations':summaryGenerations,'wire':wire,'evaluatorLabelLeakIds':leaks})]:
 (out/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:metrics[k] for k in ['targetRecorded','prerequisiteRecorded','targetTerminalDispositions','providerRequests','evaluatorLabelLeaks','providerHttpErrors']},ensure_ascii=False))
for r in rows:
 print(r['role'],r['caseId'],r['terminal']['disposition'],r['terminal']['reason'])
