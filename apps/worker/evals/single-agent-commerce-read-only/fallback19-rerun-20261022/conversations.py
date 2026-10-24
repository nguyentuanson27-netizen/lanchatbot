from pathlib import Path
import json
out=Path(__file__).resolve().parent
rows=json.loads((out/'OUTCOMES.json').read_text(encoding='utf-8'));reg=json.loads((out/'REGISTRATION.json').read_text(encoding='utf-8'))
lines=['# Rerun 19 fallback — actual terminal conversations','',f"Run source: `{reg['runSourceSha']}`. N1, không retry; 19 target và 4 lượt prerequisite tách riêng.",'','Owner Gemini 3.5 Flash Lite HIGH; verifier GPT-6.1 Sol HIGH. Prompt/config không đổi. Không gửi Meta thật.','',
 'Stateless B1 giữ input lịch sử trong corpus. Stateful/negotiation dùng cart và history thật được tạo lại trong DB test; không phải replay byte-identical transcript cũ. Verdict PASS là kết quả boundary, không phải điểm chất lượng tư vấn.','']
for index,row in enumerate(rows,1):
 raw=json.loads((out/row['raw']).read_text(encoding='utf-8'));terminal=row['terminal']
 lines.extend([f"## {index}. {row['caseId']} — {row['role']}",'',f"`{terminal['disposition']}` / `{terminal['reason']}`; evidence: [{row['raw']}]({row['raw'].replace(chr(92),'/')}).",''])
 if row['cohort']=='b1':
  for h in raw['runtime'].get('history',[]):lines.extend([('Khách' if h['role']=='customer' else 'Shop trước đó')+': '+h['text'],''])
  texts=[raw['runtime']['latest']]
 else:texts=[m.get('text') for m in raw.get('inboundMessages',[]) if m.get('text')]
 for text in texts:lines.extend(['Khách: '+text,''])
 lines.extend(['**Actual terminal customer outcome**',''])
 lines.extend(['```text',*row['actual'],'```',''] if row['actual'] else ['[Không có customer capture.]',''])
 lines.extend(['Verifier: `'+json.dumps(row['verdicts'],ensure_ascii=False)+'`',''])
 if row.get('draft') and row['draft'] not in row['actual']:lines.extend(['Draft bị giữ lại, chỉ dùng chẩn đoán sau actual outcome:','','```text',row['draft'],'```',''])
 if row['role']=='TARGET':
  previous=next(x for x in reg['targets'] if x['cohort']==row['cohort'] and x['caseId']==row['caseId'])
  lines.extend([f"Lượt trước: `{previous['previousTerminal']['disposition']}` / `{previous['previousTerminal']['reason']}`.",''])
(out/'CONVERSATIONS.md').write_text('\n'.join(lines),encoding='utf-8')
print('conversation records',len(rows))
