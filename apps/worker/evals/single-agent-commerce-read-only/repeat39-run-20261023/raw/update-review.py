from pathlib import Path
import json
out=Path(__file__).resolve().parent
rows=json.loads((out/'OUTCOMES.json').read_text(encoding='utf-8'));notes=json.loads((out/'review-notes.json').read_text(encoding='utf-8'))
review={'protocol':'Manual actual whole-turn review before unsent drafts, same criteria as preceding full39. N1 non-blind repeat, not treatment validation or stability qualification.','rows':[{'cohort':r['cohort'],'caseId':r['caseId'],'assessment':notes[r['caseId']]['assessment'],'wholeTurnReason':notes[r['caseId']]['reason']} for r in rows if r['caseId'] in notes]}
(out/'PRIMARY_REVIEW.json').write_bytes((json.dumps(review,ensure_ascii=False,indent=2)+'\n').encode())
print('Reviewed',len(review['rows']))
