from pathlib import Path
import json,collections,hashlib
out=Path(__file__).resolve().parent
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
rows=load(out/'OUTCOMES.json');review=load(out/'PRIMARY_REVIEW.json');notes={(r['cohort'],r['caseId']):r for r in review['rows']}
native=[r for r in rows if r['cohort']!='diagnostic'];diag=[r for r in rows if r['cohort']=='diagnostic']
def block(text):return '```text\n'+'\n'.join(line.rstrip() for line in str(text).splitlines())+'\n```\n'
doc=['# Full39 — hội thoại actual, 23/10/2026','Source `'+load(out/'REGISTRATION.json')['runSourceSha']+'`; N1. 24 B1 + 8 stateful + 4 openings + 3 negotiation. Captured delivery only, không gửi khách thật. Actual được review trước rejected draft; generic image markers là attachment code đã capture. Private checkout đã redacted, không suy chất lượng toàn bộ lời riêng tư từ bản redacted.']
for i,r in enumerate(native,1):
 n=notes.get((r['cohort'],r['caseId']),{})
 doc+=['\n## '+str(i)+'. '+r['cohort']+' / '+r['caseId'], 'Raw: [attempt](raw/'+r['raw']+'). Terminal: **'+r['terminal']['disposition']+' / '+r['terminal']['reason']+'**.']
 rt=r.get('runtime') or {}
 if rt.get('history'):
  doc+=['Lịch sử đầu vào:']+[block(h['role']+': '+h['text']) for h in rt['history']]
 elif r['cohort'] in ['stateful','negotiation']:doc+=['Lịch sử dùng state/accepted history thật của journey, không gán transcript scripted.']
 doc+=['Khách:',block(rt.get('latest') or '[PRIVATE_CHECKOUT_SYNTHETIC_FORM — CODE ONLY]'),'Kết quả khách nhận:',block('\n'.join(r['actual']) or '[KHÔNG CÓ TIN NHẮN]'),'Review: **'+n.get('assessment','PENDING')+'** — '+n.get('wholeTurnReason','Chưa chấm.')]
doc+=['\n# Rejected drafts — chỉ để chẩn đoán, không chấm như đã gửi']
for r in native:
 if r['terminal']['disposition']!='FALLBACK' and not (r['recovery'] and r['terminal']['disposition']=='SEND_ELIGIBLE'):continue
 raw=load(out/r['raw']);ids={g.get('id') or (g.get('telemetry') or {}).get('generationId') for g in raw['result'].get('generations',[])}
 requests=out/Path(r['raw']).parent/('requests.jsonl' if r['cohort']=='b1' else 'provider-requests.jsonl')
 events=[json.loads(l) for l in requests.read_text(encoding='utf-8').splitlines()]
 events=[e for e in events if e['id'] in ids]
 drafts=[e['value'].get('text') for e in events if e['phase']=='OWNER_RESULT' and e['value'].get('kind')=='FINAL']
 answers=[e['value'].get('answer') for e in events if e['phase']=='RESULT']
 doc+=['\n## '+r['caseId'],block(drafts[-1] if drafts else '[KHÔNG CÓ FINAL DRAFT HỢP LỆ]'),block('\n'.join(a for a in answers if a) or '[VERIFIER KHÔNG TRẢ VERDICT / KHÔNG ĐƯỢC GỌI]')]
(out/'CONVERSATIONS.md').write_bytes(('\n\n'.join(doc)+'\n').encode())
dn={r['caseId']:r for r in load(out/'DIAGNOSTIC_REVIEW.json')['rows']}
dd=['# Diagnostic4 — captured-context replay, không phải native eligibility','Tools OFF; captured clock, common candidate prompt; N1; không A/B nhân quả. Native39 vẫn chạy đầy đủ theo yêu cầu mới nhất của owner dù diagnostic còn điểm cần sửa.']
for r in diag:dd+=['\n## '+r['caseId'],block(r['runtime']['latest']),block('\n'.join(r['actual'])),dn[r['caseId']]['assessment']+' — '+dn[r['caseId']]['reason']]
(out/'DIAGNOSTIC.md').write_bytes(('\n\n'.join(dd)+'\n').encode())
m=load(out/'METRICS.json');m['native']['manualReview']=dict(collections.Counter(r['assessment'] for r in review['rows']));m['native']['reviewed']=len(review['rows'])
m['cohorts']={c:{'recorded':len([r for r in native if r['cohort']==c]),'terminals':dict(collections.Counter(r['terminal']['disposition'] for r in native if r['cohort']==c))} for c in ['b1','stateful','openings','negotiation']}
m['isolatedDatabases']=[{'cohort':c,'dropped':load(out/c/'integration.json')['testDatabaseDropped'],'candidateHandoff':load(out/c/'integration.json').get('candidateHandoff')} for c in ['stateful','openings','negotiation'] if (out/c/'integration.json').exists()]
(out/'METRICS.json').write_bytes((json.dumps(m,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'native':len(native),'reviewed':len(review['rows']),'diagnostic':len(diag),'reviewCounts':m['native']['manualReview'],'bytes':(out/'CONVERSATIONS.md').stat().st_size}))
