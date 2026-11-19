from pathlib import Path
from collections import Counter
import json, math, sys
root=Path(sys.argv[1])
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
plan=read(root/'RUN_PLAN.json');audit=read(root/'AUDIT.json');judge=read(root/'BATCH_JUDGE_RESULTS.json')
assert len(judge['rows'])==10
turns=[t for c in audit['conversations'] for t in c['turns']]
gens=audit['generations'];roles=Counter((g['role'],g['status']) for g in gens)
admissions=[];builds=[];budgets=[]
for job in plan['jobs']:
 rows=[json.loads(line) for line in (Path(job['out'])/'NATIVE_REQUESTS.jsonl').read_text(encoding='utf-8').splitlines()]
 admissions.extend({'batch':job['batch'],'kind':job['kind'],**r['value']} for r in rows if r['phase']=='ADMISSION_REJECTED')
 for row in rows:
  g=row['value'];t=g.get('telemetry') or {}
  if row['phase']=='ERROR':
   entry={'batch':job['batch'],'kind':job['kind'],'id':g['id'],'errorCode':g.get('errorCode'),'failureLayer':g.get('failureLayer'),
      'providerRequests':g['providerRequests'],'telemetry':t}
   builds.append(entry)
   if t.get('requestBytes') is not None:budgets.append(t['requestBytes'])
def percentile(values,p):
 if not values:return None
 s=sorted(values);return s[max(0,math.ceil(len(s)*p)-1)]
def metrics(role):
 rows=[g for g in gens if g['role']==role and g['providerRequests']==1]
 vs=[(g.get('metrics') or {}).get('latencyMs') for g in rows];vs=[v for v in vs if isinstance(v,(int,float))]
 return {'requests':len(rows),'latencyP50Ms':percentile(vs,.5),'latencyP95Ms':percentile(vs,.95),
   'inputTokens':sum((g.get('metrics') or {}).get('inputTokens') or 0 for g in rows),
   'outputTokens':sum((g.get('metrics') or {}).get('outputTokens') or 0 for g in rows),
   'usageExposed':sum(isinstance((g.get('metrics') or {}).get('inputTokens'),(int,float)) for g in rows)}
results=[]
for c in audit['conversations']:
 found=[j for j in judge['rows'] if j['caseId']==c['caseId'] and j['repetition']==c['repetition']]
 assert len(found)==1 and found[0]['rating'] is not None
 rating=found[0]['rating']['arms'][0]
 results.append({'caseId':c['caseId'],'repetition':c['repetition'],'terminals':[t['terminal']['disposition'] for t in c['turns']],
   'wholePass':rating['wholePass'],'voicePass':rating['voicePass'],'factsPass':rating['factsPass'],
   'materialIssue':rating['materialIssue'],'judgeReason':rating['reason']})
summary={'source':plan['source'],'worldHash':plan['worldHash'],'cases':2,'attempts':10,'terminalTurns':30,
 'terminalCounts':dict(Counter(t['terminal']['disposition'] for t in turns)),'sourceFreshnessClock':'ACTUAL_WALL_CLOCK',
 'nativeProviderRequests':sum(g['providerRequests'] for g in gens),'judgeProviderRequests':sum(r['providerRequests'] for r in judge['rows']),
 'providerRegisteredAttempts':len(gens),'localBuildRejections':sum(r.get('failureLayer')=='BUILD' for r in builds),'generationErrors':len(builds),'localAdmissionRejections':len(admissions),
 'completeRuntimeGenerationAttemptCount':len(gens)+len(admissions),
 'generationOutcomes':{f'{r}:{s}':n for (r,s),n in roles.items()},'models':plan['models'],
 'owner':metrics('OWNER'),'verifier':metrics('VERIFIER'),
 'providerErrorsOrTimeouts':sum(g['status']!='OK' and g['providerRequests']==1 for g in gens),
 'localBuildRequestBytes':{'minimum':min(budgets) if budgets else None,'maximum':max(budgets) if budgets else None,'limit':70000},
 'codeReplies':sum(bool(t['codeReply']) for t in turns),'continuityFrames':len(audit['continuity']),
 'testDatabasesDropped':all(j['testDatabaseDropped'] for j in audit['jobAudits']),
 'voiceMeasuredOnCustomerVisibleTextOnly':True,'cost':'NOT_EXPOSED','liveSends':0,'results':results}
(root/'SUMMARY.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'BUILD_FAILURES.json').write_text(json.dumps({'failures':builds,'admissionRejections':admissions},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in ('models','results')},ensure_ascii=False))
for r in results:print(r['caseId'],r['repetition'],r['wholePass'],r['judgeReason'])
