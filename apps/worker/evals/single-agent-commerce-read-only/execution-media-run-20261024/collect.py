from pathlib import Path
import json,math,hashlib
out=Path(__file__).resolve().parent
attempts=[]
for branch in ['controls','eta','advice']:
 for p in sorted((out/branch).glob('attempt-*.json')):
  attempts.append((branch,p,json.loads(p.read_text(encoding='utf-8-sig'))))
for p in sorted((out/'native').glob('*/attempt-*.json'))+sorted((out/'native').glob('*/provider-attempt-*.json')):
 attempts.append(('native',p,json.loads(p.read_text(encoding='utf-8-sig'))))
events=[];wires=[];native=[]
for branch,p,a in attempts:
 if branch in ['controls','eta']:
  t=(a.get('provider') or {}).get('telemetry') or {};events.append({'role':'verifier','telemetry':t})
 else:
  events.extend(a.get('result',{}).get('generations',[]))
 if branch=='native':native.append({'file':str(p.relative_to(out)),'caseId':a['caseId'],'terminal':a['result']['terminal'],'actualCapturedMessages':a.get('actualCapturedMessages'),'actualCapturedAttachments':a.get('actualCapturedAttachments')})
  # B1 native verifier has its wire in telemetry rather than a separate VERIFIER_REQUEST log row.
 if branch=='native' and p.name.startswith('attempt-'):
  for g in a.get('result',{}).get('generations',[]):
   if g.get('role')=='verifier' and g.get('telemetry',{}).get('requestBody'):
    w=g['telemetry']['requestBody'];wires.append(json.loads(w) if isinstance(w,str) else w)
for p in list(out.glob('*/requests.jsonl'))+list((out/'native').glob('*/requests.jsonl'))+list((out/'native').glob('*/provider-requests.jsonl')):
 for line in p.read_text(encoding='utf-8-sig').splitlines():
  r=json.loads(line)
  if 'wire' in r:wires.append(r['wire'])
  elif r.get('phase') in ['OWNER_REQUEST','VERIFIER_REQUEST']:wires.append(r['value'])
forbidden={'caseId','split','expectedSafe','requiredBehaviors','forbiddenBehaviors','evaluator','rubric','attackFamily','qualityTags'}
leaks=[]
def walk(v,path=''):
 if isinstance(v,dict):
  for k,a in v.items():
   if k in forbidden:leaks.append(path+'.'+k)
   # Stringified trusted source/policy JSON is also inspected.
   if isinstance(a,str) and a.startswith(('{','[')):
    try:walk(json.loads(a),path+'.'+k)
    except json.JSONDecodeError:pass
   walk(a,path+'.'+k)
 elif isinstance(v,list):
  for i,a in enumerate(v):walk(a,path+f'[{i}]')
for w in wires:walk(w)
lat=[];input_tokens=output_tokens=reasoning_tokens=0;requests=0;errors=0
for e in events:
 t=e.get('telemetry') or {};requests+=t.get('providerRequests',0)
 u=t.get('usage') or {};input_tokens+=t.get('inputTokens') or u.get('input_tokens',0);output_tokens+=t.get('outputTokens') or u.get('output_tokens',0)
 reasoning_tokens+=t.get('thinkingTokens') or u.get('output_tokens_details',{}).get('reasoning_tokens',0)
 if e.get('role')=='verifier' and t.get('latencyMs') is not None:lat.append(t['latencyMs'])
 if e.get('status',t.get('status','OK'))!='OK':errors+=1
lat.sort()
stats={'executedOutcomes':len(attempts),'nativeCompleted':len(native),'generationEvents':len(events),'providerRequests':requests,'wireCount':len(wires),'inputTokens':input_tokens,'outputTokensIncludesReasoning':output_tokens,'reasoningTokensIncluded':reasoning_tokens,'errorGenerationEvents':errors,'verifierLatencySamples':len(lat),'verifierP50ms':lat[math.ceil(len(lat)*.5)-1] if lat else None,'verifierP95ms':lat[math.ceil(len(lat)*.95)-1] if lat else None,'cost':'NOT_EXPOSED','retry':0}
(out/'STATS.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
(out/'LABEL_FIREWALL_AUDIT.json').write_text(json.dumps({'wireCount':len(wires),'leaks':leaks,'status':'PASS' if not leaks else 'FAIL'},indent=2),encoding='utf-8')
(out/'NATIVE_OUTCOMES.json').write_text(json.dumps(native,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(stats))
