from pathlib import Path
import json,collections
out=Path(__file__).resolve().parent;old=out.parent/'c3-b-opening-advice-20261023'
load=lambda p:json.loads(p.read_text(encoding='utf-8'))
a={r['caseId']:r for r in load(old/'OUTCOMES.json') if r['cohort']!='diagnostic'};b={r['caseId']:r for r in load(out/'OUTCOMES.json')}
ar={r['caseId']:r for r in load(old/'PRIMARY_REVIEW.json')['rows']};br={r['caseId']:r for r in load(out/'PRIMARY_REVIEW.json')['rows']}
rows=[{'caseId':cid,'cohort':a[cid]['cohort'],'previousTerminal':a[cid]['terminal']['disposition'],'currentTerminal':b[cid]['terminal']['disposition'],'previousReason':a[cid]['terminal']['reason'],'currentReason':b[cid]['terminal']['reason'],'previousReview':ar[cid]['assessment'],'currentReview':br[cid]['assessment'],'textUnchanged':a[cid]['actual']==b[cid]['actual']} for cid in a if cid in b and cid in br]
r={'mode':'OBSERVATIONAL_N1_REPEAT_SAME_EXECUTABLE_NOT_CAUSAL_TREATMENT','previousSourceSha':load(old/'REGISTRATION.json')['runSourceSha'],'currentSourceSha':load(out/'REGISTRATION.json')['runSourceSha'],'previousReviewCounts':dict(collections.Counter(x['assessment'] for x in ar.values())),'currentReviewCounts':dict(collections.Counter(x['assessment'] for x in br.values())),'compared':len(rows),'rows':rows}
(out/'COMPARISON.json').write_bytes((json.dumps(r,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'compared':len(rows),'manual':r['currentReviewCounts'],'changedReview':[x for x in rows if x['previousReview']!=x['currentReview']]},ensure_ascii=False,indent=2))
