from pathlib import Path
import json,math,statistics,hashlib,collections
root=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
rows=[];wires=[];events=[]
for cohort,pattern in [('media','provider-attempt-*.json'),('advice','attempt-*.json')]:
 for p in sorted((root/cohort).glob(pattern)):
  x=read(p);rows.append({'cohort':cohort,'caseId':x['caseId'],'runtime':x.get('runtime'),'result':x['result'],'actualCapturedMessages':x.get('actualCapturedMessages'),'actualCapturedAttachments':x.get('actualCapturedAttachments'),'elapsedMs':x.get('elapsedMs',x['result'].get('elapsedMs'))})
 path=root/cohort/('provider-requests.jsonl' if cohort=='media' else 'requests.jsonl')
 for line in path.read_text(encoding='utf-8-sig').splitlines():
  e=json.loads(line);e['cohort']=cohort;events.append(e)
  if e['phase']=='OWNER_REQUEST':wires.append({'role':'owner','id':e['id'],'body':e['value']})
  if e['phase']=='DISPATCHED' and e['value'].get('requestBody'):wires.append({'role':'verifier','id':e['id'],'body':e['value']['requestBody']})
generations=[dict(g,caseId=r['caseId'],cohort=r['cohort']) for r in rows for g in r['result'].get('generations',[])]
assert len(rows)==12 and len(wires)==29 and len(generations)==29
assert len({w['id'] for w in wires})==29
assert all(g['telemetry']['providerRequests']==1 for g in generations)
labels={'caseId','evaluator','purposeId','expectedSafe','requiredBehaviors','forbiddenBehaviors','attackFamily','split','qualityScore'}
leaks=[]
def scan(value):
 if isinstance(value,dict):
  for k,v in value.items():
   if k in labels:leaks.append(k)
   scan(v)
 elif isinstance(value,list):
  for v in value:scan(v)
 elif isinstance(value,str):
  if value.startswith(('{','[')):
   try:scan(json.loads(value))
   except (ValueError,RecursionError):pass
for w in wires:
 scan(w['body'])
 s=json.dumps(w['body'],ensure_ascii=False)
 assert not any(r['caseId'] in s for r in rows),'CASE_ID_LEAK'
assert not leaks
def pct(xs,q):return sorted(xs)[max(0,math.ceil(len(xs)*q)-1)] if xs else None
def stats(xs):return {'n':len(xs),'p50':statistics.median(xs) if xs else None,'p95NearestRank':pct(xs,.95)}
usage={}
for role in ['owner','verifier']:
 gs=[g for g in generations if g['role']==role];t=[g['telemetry'] for g in gs]
 usage[role]={'requests':len(gs),'inputTokens':sum(v.get('inputTokens',v.get('usage',{}).get('input_tokens',0)) for v in t),'outputTokens':sum(v.get('outputTokens',v.get('usage',{}).get('output_tokens',0)) for v in t),'thinkingOrReasoningTokens':sum(v.get('thinkingTokens',v.get('usage',{}).get('output_tokens_details',{}).get('reasoning_tokens',0)) for v in t),'errors':sum(g.get('status')!='OK' for g in gs)}
verdicts=collections.Counter()
for e in events:
 if e['phase']=='RESULT':
  answer=e['value'].get('answer');
  if answer:verdicts[json.loads(answer)['verdict']]+=1
metrics={'outcomes':{'media':4,'advice':8},'terminals':{c:dict(collections.Counter(r['result']['terminal']['disposition'] for r in rows if r['cohort']==c)) for c in ['media','advice']},'usage':usage,'verdicts':dict(verdicts),'verifierLatencyMs':stats([g['telemetry']['latencyMs'] for g in generations if g['role']=='verifier']),'verificationStageMs':{c:stats([r['result']['verificationLatencyMs'] for r in rows if r['cohort']==c]) for c in ['media','advice']},'caseElapsedMs':{c:stats([r['elapsedMs'] for r in rows if r['cohort']==c]) for c in ['media','advice']},'cost':'NOT_EXPOSED','retries':0,'timeouts':0,'actualImages':sum(len(r.get('actualCapturedAttachments') or []) for r in rows),'databaseDropped':read(root/'media/integration.json')['testDatabaseDropped']}
accounting={'generationRequests':29,'owner':17,'verifier':12,'capturedBodies':29,'uniqueGenerationIds':29,'maxUpstreamRequestsPerGeneration':1,'evaluatorLabelLeaks':leaks,'wireIdsAndHashes':[{'role':w['role'],'id':w['id'],'hash':hashlib.sha256(json.dumps(w['body'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()} for w in wires],'hashNote':'Hashes are of this collector JSON serialization, not a claim of original transport bytes.'}
for name,data in [('METRICS.json',metrics),('REQUEST_ACCOUNTING.json',accounting)]: (root/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'OUTCOMES.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(metrics,ensure_ascii=False,indent=2))
