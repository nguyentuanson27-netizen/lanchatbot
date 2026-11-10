from pathlib import Path
import json,collections,math
out=Path(__file__).resolve().parent
cohorts={'b1':24,'stateful':8,'openings':4,'negotiation':3}
rows=[];wire={};leaks=[]
for cohort,registered in cohorts.items():
 folder=out/cohort
 pattern='attempt-*.json' if cohort=='b1' else 'provider-attempt-*.json'
 files=sorted(folder.glob(pattern),key=lambda p:int(p.stem.split('-')[-1]))
 for p in files:
  raw=json.loads(p.read_text(encoding='utf-8'));result=raw['result'];actual=([result['terminal']['text']] if result['terminal'].get('text') else []) if cohort=='b1' else raw['actualCapturedMessages']
  rows.append({'cohort':cohort,'caseId':raw['caseId'],'raw':str(p.relative_to(out)),'actual':actual,'terminal':result['terminal'],'recovery':result.get('recovery'),'elapsedMs':raw['elapsedMs'],'generations':result.get('generations',[]),'verificationLatencyMs':result.get('verificationLatencyMs'),'private':not result.get('generations') and bool(actual)})
 requestFile=folder/('requests.jsonl' if cohort=='b1' else 'provider-requests.jsonl')
 if requestFile.exists():
  for line in requestFile.read_text(encoding='utf-8').splitlines():
   record=json.loads(line);phase=record['phase'];value=record['value']
   body=value if phase=='OWNER_REQUEST' else value.get('requestBody') if phase=='DISPATCHED' else None
   if body is not None:
    import re
    if re.search(r'"(?:caseId|evaluator|purposeId|requiredBehaviors|expectedSafe|qualityScore)"',json.dumps(body)):leaks.append(record['id'])
    wire[record['id']]={'role':'owner' if phase=='OWNER_REQUEST' else 'verifier','bodyHash':__import__('hashlib').sha256(json.dumps(body,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()}
(out/'OUTCOMES.partial.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('recorded',len(rows),dict(collections.Counter(x['terminal']['disposition'] for x in rows)))
print('wire',len(wire),'leaks',len(leaks))
for i,r in enumerate(rows):
 print('\n'+str(i+1)+' '+r['cohort']+' / '+r['caseId']+' / '+r['terminal']['disposition']+' '+r['terminal']['reason'])
 print('\n'.join(r['actual']) if r['actual'] else '[KHONG_CO_REPLY]')
