from pathlib import Path
import json,collections,hashlib,math,re
out=Path(__file__).resolve().parent
registered=json.loads((out/'REGISTERED_CASES.json').read_text(encoding='utf-8'))
case_map={r['caseId']:r for cohort in registered.values() for r in cohort}
rows=[];wires={};leaks=[];verdicts=collections.Counter();accounting=[]
def load(p):return json.loads(p.read_text(encoding='utf-8'))
folders=[p for p in out.iterdir() if p.is_dir()]
for folder in folders:
 cohort='b1' if folder.name.startswith('b1-') else folder.name
 if cohort not in ['b1','stateful','openings','negotiation','media','diagnostic']:continue
 response_ids={e['value']['responseId']:e['id'] for f in folder.glob('*requests.jsonl') for e in map(json.loads,f.read_text(encoding='utf-8').splitlines()) if e['phase']=='RESULT' and e['value'].get('responseId')}
 files=sorted(folder.glob('attempt-*.json' if cohort in ['b1','diagnostic'] else 'provider-attempt-*.json'),key=lambda p:int(p.stem.split('-')[-1]))
 for p in files:
  raw=load(p);r=raw['result'];terminal=r.get('terminal') or {}
  actual=([terminal['text']] if terminal.get('text') else []) if cohort in ['b1','diagnostic'] else raw['actualCapturedMessages']
  row={'cohort':cohort,'caseId':raw['caseId'],'raw':p.relative_to(out).as_posix(),'runtime':raw.get('runtime',case_map[raw['caseId']]['runtime']),'actual':actual,'terminal':terminal,'recovery':r.get('recovery'),'elapsedMs':raw.get('elapsedMs',r.get('elapsedMs')),'generations':r.get('generations',[]),'verificationLatencyMs':r.get('verificationLatencyMs'),'images':raw.get('actualCapturedAttachments',[]),'egressDiagnostic':r.get('egressDiagnostic')}
  rows.append(row)
  for g in row['generations']:
   t=g.get('telemetry') or {};accounting.append({'cohort':cohort,'caseId':row['caseId'],'id':g.get('id') or t.get('generationId') or response_ids.get(t.get('responseId')),'role':g['role'],'status':g['status'],'latencyMs':g.get('latencyMs'),'telemetry':t})
 for f in folder.glob('*requests.jsonl'):
  for line in f.read_text(encoding='utf-8').splitlines():
   r=json.loads(line);v=r['value'];phase=r['phase'];body=v if phase in ['OWNER_REQUEST','VERIFIER_REQUEST'] else v.get('requestBody') if phase=='DISPATCHED' else None
   if body is not None:
    def keys(value):
     if isinstance(value,dict):
      for k,vv in value.items():yield k;yield from keys(vv)
     elif isinstance(value,list):
      for vv in value:yield from keys(vv)
     elif isinstance(value,str):
      try:parsed=json.loads(value)
      except (ValueError,TypeError):return
      if not isinstance(parsed,str):yield from keys(parsed)
    bad=set(keys(body))&{'caseId','evaluator','purposeId','requiredBehaviors','forbiddenBehaviors','expectedSafe','qualityScore','split','rubric'}
    corpus_ids=[cid for cid in case_map if cid in json.dumps(body)]
    if bad or corpus_ids:leaks.append({'id':r['id'],'keys':list(bad),'caseIds':corpus_ids})
    wires[r['id']]={'cohort':cohort,'role':'owner' if phase=='OWNER_REQUEST' else 'verifier','sha256':hashlib.sha256(json.dumps(body,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()}
   if phase=='RESULT' and v.get('answer'):
    try:verdicts[json.loads(v['answer'])['verdict']]+=1
    except (ValueError,KeyError,TypeError):pass
def write(name,obj):(out/name).write_bytes((json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode())
rows.sort(key=lambda x:({'b1':0,'stateful':1,'openings':2,'negotiation':3,'media':4,'diagnostic':5}[x['cohort']],int(Path(x['raw']).stem.split('-')[-1])))
write('OUTCOMES.json',[{**r,'generations':[{**g,'telemetry':{k:v for k,v in (g.get('telemetry') or {}).items() if k not in ['requestBody','answer']}} for g in r['generations']]} for r in rows])
clean_accounting=[{**g,'telemetry':{k:v for k,v in g['telemetry'].items() if k not in ['requestBody','answer']}} for g in accounting]
write('REQUEST_ACCOUNTING.json',{'generations':clean_accounting,'wireBodies':wires,'evaluatorLabelLeaks':leaks,'scan':'Recursive keys including serialized JSON content, plus exact registered case IDs; raw request bodies retained.'})
def percentile(values):
 values=sorted(v for v in values if isinstance(v,(int,float)))
 return {'n':len(values),'p50':values[math.ceil(len(values)*.5)-1] if values else None,'p95':values[math.ceil(len(values)*.95)-1] if values else None,'method':'NEAREST_RANK'}
def stats(selected,gens):
 roles={}
 for role in ['owner','verifier']:
  gs=[g for g in gens if g['role']==role];total_in=total_out=reason=known=0
  for g in gs:
   t=g['telemetry'];u=t.get('usage') or {}
   if t.get('inputTokens') is not None or u.get('input_tokens') is not None:
    known+=1;total_in+=t.get('inputTokens',u.get('input_tokens',0));total_out+=t.get('outputTokens',u.get('output_tokens',0));reason+=t.get('thinkingTokens',(u.get('output_tokens_details') or {}).get('reasoning_tokens',0))
  roles[role]={'generations':len(gs),'requests':sum(g['telemetry'].get('providerRequests',0) for g in gs),'errors':sum(g['status']!='OK' for g in gs),'usageAvailable':known,'inputTokens':total_in,'outputTokens':total_out,'thinkingTokens':reason,'latencyMs':percentile(g.get('latencyMs') or g['telemetry'].get('latencyMs') for g in gs)}
 return {'recorded':len(selected),'terminalDispositions':dict(collections.Counter(r['terminal'].get('disposition') for r in selected)),'roles':roles,'verificationStageLatencyMs':percentile(r.get('verificationLatencyMs') for r in selected),'turnLatencyMs':percentile(r.get('elapsedMs') for r in selected),'receiptRecoveries':sum(r['terminal'].get('reason','').startswith('RECEIPT_BACKED_') for r in selected),'recoveryMetadataPresent':sum(bool(r['recovery']) for r in selected),'actualNoReply':sum(not r['actual'] for r in selected),'cost':None,'costReason':'NOT_EXPOSED'}
metrics={group:stats([r for r in rows if (r['cohort']=='diagnostic')==(group=='diagnostic')],[g for g in accounting if (g['cohort']=='diagnostic')==(group=='diagnostic')]) for group in ['native','diagnostic']}
metrics['core']=stats([r for r in rows if r['cohort']!='media'],[g for g in accounting if g['cohort']!='media']);metrics['media']=stats([r for r in rows if r['cohort']=='media'],[g for g in accounting if g['cohort']=='media']);metrics.update(uniqueWireIds=len(wires),evaluatorLabelLeaks=len(leaks),maxRequestsPerGeneration=max((g['telemetry'].get('providerRequests',0) for g in accounting),default=0),verifierVerdictsAll=dict(verdicts),sourceSha=load(out/'REGISTRATION.json')['runSourceSha'],sendEnabled=False)
write('METRICS.json',metrics)
for group in ['native','diagnostic']:
 selected=[r for r in rows if (r['cohort']=='diagnostic')==(group=='diagnostic')]
 print(group,len(selected),dict(collections.Counter(r['terminal'].get('disposition') for r in selected)))
import sys
visible=rows if '--native' not in sys.argv else [r for r in rows if r['cohort']!='diagnostic']
if '--new' in sys.argv:
 reviewed={(r['cohort'],r['caseId']) for r in load(out/'PRIMARY_REVIEW.json')['rows']}
 visible=[r for r in visible if r['cohort']!='diagnostic' and (r['cohort'],r['caseId']) not in reviewed]
for i,r in enumerate(visible):
 print('\n'+str(i+1)+' '+r['cohort']+'/'+r['caseId']+' '+str({k:v for k,v in r['terminal'].items() if k!='text'}))
 if r['runtime']:print('CUSTOMER: '+str(r['runtime'].get('latest')))
 print('ACTUAL: '+'\n'.join(r['actual']))
