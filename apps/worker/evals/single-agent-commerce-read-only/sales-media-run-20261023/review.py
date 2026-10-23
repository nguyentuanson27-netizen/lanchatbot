from pathlib import Path
import json
root=Path(__file__).resolve().parent
rows=json.loads((root/'OUTCOMES.json').read_text(encoding='utf-8'))
notes={
 'media-detail':{'outcome':'USABLE','voice':'POLISH','reason':'Đúng ảnh CLOSEUP/DETAIL phần AO, nguồn và attachment capture khớp. Lời dẫn đúng việc; câu Chị xem giúp em nha dư nhẹ. Chỉ chứng minh chức năng gửi cận, không tăng conversion.'},
 'media-feedback':{'outcome':'FALLBACK','voice':'NOT_SCORABLE_AS_ADVICE','reason':'Khách thực nhận static fallback. Tool không tìm thấy feedback đã duyệt, source audit cũng0feedback. Draft nói shop chưa có ảnh nhưng verifier wire không mang kết quả media-unavailable; verdict UNCERTAIN chỉ refproduct, chưa chỉ span. Gap truyền bằng chứng đã xác nhận, chưa chứng minh đây là nguyên nhân duy nhất của verdict.'},
 'media-back':{'outcome':'USABLE','voice':'USABLE','reason':'Gửi đúng ảnh BACK/FULL_SET, lời dẫn ngắn đúng câu xin ảnh, không chèn giá hay mô tả thừa.'},
 'media-concern':{'outcome':'NEEDS_EDIT','voice':'NEEDS_EDIT','reason':'Có chủ động select ảnh DETAIL/AO và giao ảnh thật, nhưng khách lo tổng thể ren: ảnh cận áo chưa cho thấy toàn bộ set. Reply mở áo lẻ rồi cảbộ, gom mềm/thoáng/bay/nhãnhặn/sangtrọng/thanhthoát; chưa giúp chốt hướng rõ. Có tool call không đồng nghĩa thuyết phục tốt.'},
 'b1-buying-concern:baseline':{'outcome':'USABLE_WITH_VOICE_FINDING','voice':'NEEDS_EDIT','reason':'Có khuyên mua cảbộ và đúng799k, nhưng mở bằng ngân sách rồi đọc mô tả dài, nhiều tính từ. Không chấm lời trấn an chủ quan là thiếu labtest.'},
 'b1-buying-concern:candidate':{'outcome':'USABLE_WITH_VOICE_FINDING','voice':'NEEDS_EDIT','reason':'Vào thẳng nỗi lo rườm rà hơn baseline, nhưng vẫn dựa chuỗi mềm/rũ/thanhthoát/baybổng và nhắc ngân sách. Chưa tạo sức thuyết phục khác biệt rõ.'},
 'b1-changed-occasion-v2:baseline':{'outcome':'NEEDS_EDIT','voice':'NEEDS_EDIT','reason':'Nói vải thoáng rồi lại bảo khách cân nhắc thêm vì thêu/ren mà không giải thích vì sao. Khách hỏi có bí không vẫn bị trả lại việc quyết định; không gọi đây lỗi thiếu dữ liệu đã chứng minh.'},
 'b1-changed-occasion-v2:candidate':{'outcome':'USABLE_WITH_VOICE_FINDING','voice':'POLISH','reason':'Trả trực tiếp cảm giác mặc từ mềm/thoáng/nhẹ đã có, ít vòng vo hơn baseline. Tuy nhiên không nặng nề lệch nhẹ khỏi nỗi lo nóng/bí; N1 chỉ cho thấy rõ hơn cặp này.'},
 'b1-buying-concern-v2:baseline':{'outcome':'USABLE_WITH_VOICE_FINDING','voice':'NEEDS_EDIT','reason':'Khuyên lấy cảbộ rõ và giải thích lựa chọn, nhưng dài/quảngcáo, dùng nhiều tính từ và đọc lại thói quen. Có thể dùng về quyết định, giọng chưa đạt mục tiêu.'},
 'b1-buying-concern-v2:candidate':{'outcome':'NEEDS_EDIT','voice':'NEEDS_EDIT','reason':'Khuyên nguyênset rồi nếu vẫn quen đồtrơn lại mở áo lẻ. Lỗi trả quyết định cho khách vẫn còn, so baseline còn kém rõ ràng hơn; không ép đáp án phải áo lẻ/cảbộ.'},
 'b1-buying-concern-v3:candidate':{'outcome':'USABLE','voice':'POLISH','reason':'Chọn cảbộ799k, giải thích có bộ đồngbộ và áo phối được với váyđen đã có. Lý do đúng nhu cầu mặc lại. Còn nhắc ngân sách và ngôn ngữ phong cách, chưa hơn baseline rõ.'},
 'b1-buying-concern-v3:baseline':{'outcome':'USABLE','voice':'POLISH','reason':'Cũng chọn cảbộ799k và lợi ích dùng đồngbộ/tácháo với váyđen. Nội dung hợp lý, hơi dài; không cần ép mua áo rẻ hơn.'},
}
assert set(notes)=={r['caseId'] for r in rows}
pairs=[{'case':'b1-buying-concern','comparison':'CANDIDATE_MORE_DIRECT','voice':'Chưa rõ cải thiện','decision':'Candidate trả nỗi lo trước giá, cảhai vẫn quảngcáo.'},
 {'case':'b1-changed-occasion-v2','comparison':'CANDIDATE_CLEARER','voice':'Bớt vòng vo trong cặp này','decision':'Baseline trả lại quyết định bằng cânnhắcthêm; candidate trực tiếp hơn, chưa chứng minh ổn định.'},
 {'case':'b1-buying-concern-v2','comparison':'CANDIDATE_REGRESSION','voice':'Cảhai chưa tốt','decision':'Baseline chọn cảbộ rõ hơn; candidate mở lại áo lẻ sau lời khuyên nguyênset.'},
 {'case':'b1-buying-concern-v3','comparison':'NO_CLEAR_DIFFERENCE','voice':'Tương đương','decision':'Cảhai chọn bộ và cùng lý do mặc lại/tácháo.'}]
review={'method':'MANUAL_WHOLE_TERMINAL_N1_NONBLIND_NO_KEYWORD_SCORE','mediaActualQuality':{'USABLE':2,'NEEDS_EDIT':1,'FALLBACK':1},'notes':notes,'pairs':pairs,'recommendation':'KEEP_BASELINE_ADVICE_DO_NOT_PROMOTE_CANDIDATE; B_NOT_GO','reason':'Hai cặp trực tiếp hơn, một regression rõ về quyết định, một tương đương; giọng chưa tốt hơn rõ. Media chức năng có evidence, nhưng proactive relevance còn yếu và feedback vẫn fallback.'}
(root/'PRIMARY_REVIEW.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# Hội thoại — sales/media run 23/10/2026','','Source6cd998c0, N1;4native media qua capture,8text diagnostic toolsOFF. Không gửi khách thật. Không ghép diagnostic thành native population.','']
mediaCases={c['caseId']:c for c in json.loads((Path.cwd()/'apps/worker/evals/single-agent-commerce-read-only/sales-media-cases.json').read_text())}
for i,r in enumerate(rows,1):
 case=r['caseId'];n=notes[case]
 lines += [f'## {i}. {r["cohort"]} / {case}','']
 if r['runtime']:
  for h in r['runtime'].get('history',[]):lines += [h['role']+':','```text',h['text'],'```','']
 latest=r['runtime']['latest'] if r['runtime'] else mediaCases[case]['runtime']['messages'][0]['text']
 lines+=['Khách:','```text',latest,'```','',f'Terminal: **{r["result"]["terminal"]["disposition"]} / {r["result"]["terminal"]["reason"]}**','', 'Actual capture:' if r['cohort']=='media' else 'Exact diagnostic terminal (không live send eligibility):','```text','\n'.join(r['actualCapturedMessages']) if r['cohort']=='media' else r['result']['terminal']['text'],'```','']
 for a in r.get('actualCapturedAttachments') or []:lines+=[f'- Sequence{a["sequence"]}, {a["type"]}: [Ảnh thực giao]({a["url"]})']
 lines+=['',f'Review: **{n["outcome"]}**; giọng **{n["voice"]}**. {n["reason"]}','']
lines+=['# Draft feedback bị chặn — không phải lời đã giao','']
events=[json.loads(l) for l in (root/'media/provider-requests.jsonl').read_text().splitlines()]
for e in events:
 if e.get('caseId')=='media-feedback' and e['phase']=='OWNER_RESULT' and e['value'].get('kind')=='FINAL':lines+=['```text',e['value']['text'],'```','']
(root/'CONVERSATIONS.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('Reviewed12 outcomes,4pairs; candidate not promoted.')
