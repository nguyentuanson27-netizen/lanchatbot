from pathlib import Path
import json,hashlib,shutil,subprocess,re
parent=Path(r'C:/Users/nguye/Documents/Sản phẩm AI');repo=parent/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005';base=repo/'apps/worker/evals/single-agent-commerce-read-only';run=parent/'c3-tool-history-continuation-20261025';artifact=base/'tool-history-continuation-20261025'
assert not artifact.exists()
reg=json.loads((run/'REGISTRATION.json').read_text());v=json.loads((run/'VALIDATION.json').read_text());m=json.loads((run/'METRICS.json').read_text());review=json.loads((run/'PRIMARY_REVIEW.json').read_text(encoding='utf-8'));items=json.loads((run/'PRIMARY_INPUT.json').read_text(encoding='utf-8'))
assert v['status']=='PASS' and v['targetOutcomes']==30
assert hashlib.sha256((run/'PRIMARY_REVIEW.json').read_bytes()).hexdigest()==(run/'PRIMARY_REVIEW.sha256').read_text()
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==reg['sourceSha']
assert not subprocess.check_output(['git','status','--porcelain'],cwd=repo,text=True).strip()
shutil.copytree(run,artifact/'raw')
(artifact/'frozen-inputs').mkdir();(artifact/'source').mkdir()
for name,h in reg['hashes'].items():
 b=(base/name).read_bytes();assert hashlib.sha256(b).hexdigest()==h
 p=artifact/'frozen-inputs'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
for n in ['c3-tool-history-continuation-20261025.py','c3-tool-history-continuation-review-input.py','c3-tool-history-continuation-metrics.py','c3-tool-history-continuation-firewall.mjs','c3-tool-history-continuation-lock-review.py','c3-tool-history-continuation-validate.py','c3-tool-history-continuation-archive.py']:
 shutil.copyfile(parent/n,artifact/'source'/n)
assert hashlib.sha256((artifact/'source/c3-tool-history-continuation-20261025.py').read_bytes()).hexdigest()==reg['driverHash']
for n in ['REGISTRATION.json','METRICS.json','PRIMARY_REVIEW.json','LABEL_FIREWALL_AUDIT.json','VALIDATION.json','PUBLIC_CHECKOUT_HASH_PROOF.json']:
 shutil.copyfile(run/n,artifact/n)
notes={c['caseId']:c for c in review['cases']}
lines=['# Hội thoại — 30 ca tiếp nối và 5 lượt tiền đề mới','',f"Source `{reg['sourceSha']}`. N1, retry0. Đọc nguyên câu trả lời; không chấm theo từ khóa. 24 ca B1 là send eligibility, 11 lượt stateful/đàm phán có capture transport. Không phải gửi live.",'']
for i,a in enumerate(items,1):
 n=notes[a['caseId']];runtime=a['runtime'];customer=runtime.get('latest') or ('Thông tin checkout giả lập do code nhận; không đưa model.' if runtime.get('privateCheckoutFixture') else (a['actualInitialDialogue'] or [{}])[-1].get('text',''))
 lines.extend([f"## {i}. {a['caseId']}",'',n['scope'],''])
 for h in runtime.get('history',[]):lines.append(('Khách: ' if h['role']=='customer' else 'Shop: ')+h['text'])
 lines.extend(['','Khách: '+customer,'',f"Terminal: {a['terminal']['disposition']} / {a['terminal']['reason']}",'','```text','\n'.join(a['actualCapturedMessages']) if a['actualCapturedMessages'] is not None else (a['terminal']['text'] or '[NO TEXT]'),'```','',n['verdict']+': '+n['wholeTurnReason'],''])
 if a['caseId']=='stateful-request-checkout':lines.extend(['Public text được chứng minh bằng hash transport: “Chị cho em tên người nhận nhé.”',''])
(artifact/'CONVERSATIONS.md').write_text('\n'.join(lines),encoding='utf-8')
report='''# Phase B — hoàn tất 30 ca còn lại, 25/10/2026

**Đã chạy đủ 30/30 ca còn lại. Khuyến nghị giữ B chưa GO.** Không sửa prompt/runtime trong lượt này. Chạy tiếp theo yêu cầu owner trên source có bản sửa privacy; giữ nguyên report STOP và 21 kết quả cũ.

- bRunSourceSha: `e51db388c6dfa95c5e5af7b2b82c21646e1e1933` (executable đã có correction `94cb6b089321d65cff57d810eb6ad2b3c74627ca`).
- Source của 21 kết quả cũ: `9e352f382e8915d6a1f1c080c75817065da42c63`. Tổng hợp 51 ca có **hai source**, không phải một qualification cùng source.
- Driver nằm ngoài repo lúc chạy, hash được freeze trong REGISTRATION trước dispatch; nay archive nguyên byte trong source/. Không ghi run SHA ngược vào executable. Worktree sạch trước/sau campaign; HEAD không đổi trong run.
- Owner Vertex/global `gemini-3.5-flash-lite` HIGH; verifier Codex login `gpt-6.1-sol` HIGH. Config/prompt/schema được giữ theo manifest; exact identities/hashes trong REGISTRATION và frozen-inputs/manifest.json. Không đổi model, retry hay giới hạn tool.

## Denominator và kết quả

| Nhóm | Ca mục tiêu | Kết quả |
|---|---:|---|
| B1 | 24 | 24 SEND_ELIGIBLE/PASS, chỉ kiểm send eligibility |
| Đàm phán | 3 | 3 SEND_ELIGIBLE/PASS, actual capture |
| Stateful còn thiếu | 3 | private checkout committed + purchase-confirmed handoff + requested-human handoff; đều có actual capture |
| Tiền đề stateful mới | 5 bổ sung | Dựng lại lịch sử/giỏ thật trong database mới; 4 PASS + 1 code hỏi tên người nhận |

**30 mục tiêu / 30 đã chạy; NOT_RUN0.** 27 SEND_ELIGIBLE, 1 NO_SEND theo terminal model vì private checkout được code xử lý, 2 HANDOFF. NO_SEND ở đây có preview code gửi vào capture, không phải im lặng. Fallback0, actual silent captured turns0.

Database cũ đã dọn nên không thể tiếp tục stateful tại cùng state identity. Năm lượt tiền đề là **năm provider turns mới có đăng ký**, không giả lập model, không chép PASS cũ, không thay 5 kết quả lịch sử. Tổng lượt native mới thực sự35. Cả hai database mới đã DROP trong finally; nguồn live chỉ đọc, mọi delivery/effect được cô lập/capture, không POS order/live send.

## Review toàn câu

Đã đọc35 actual terminal outcomes, tách30 mục tiêu và5 tiền đề. Đánh giá mức hoàn thành nhu cầu, quyết định mua, trọng tâm và tiếng Việt tự nhiên; không cộng điểm do đủ keyword. Review primary khóa trước khi xem diagnostic/căn cứ sau review; không claim blind review vì đã đọc corpus trước.

Trong30 mục tiêu: **8 dùng tốt,18 dùng được nhưng cần gọt giọng/trọng tâm,4 cần sửa tư vấn**. Đây là đánh giá review, không phải ngưỡng pass benchmark mới hoặc kết quả conversion.

1. `b1-changed-occasion`: đã chuyển mẫu theo việc đi ô tô lâu, nhưng đoạn tư vấn dồn mô tả, tính từ và lợi ích, dài hơn mức cần để khách quyết định.
2. `b1-buying-concern`: khách ngại nhiều ren, bot dùng mềm/bay/rũ để kết luận không rườm rà; lý do chưa đi vào vấn đề mức độ chi tiết thiết kế.
3. `b1-buying-concern-v2`: hiểu gu đồ trơn nhưng đưa áo lẻ/váy lẻ/cả set, rồi hỏi khách chọn. Không giúp chốt một hướng; câu dài và các nhánh làm nhau yếu đi.
4. `b1-buying-concern-v3`: đã chọn áo riêng theo chân váy khách có, rồi mở lại cả bộ mà không có đánh đổi mới. Kết luận bị loãng, chất liệu quảng cáo lấn cách mặc lại.

Các ca chính sách từ chối đúng tình huống mặc đi làm/mặc thử/đã giặt cắt tem; vẫn nói kiểu quy định và xin thông cảm dài. Các ca thiếu POS giữ được mô tả có nguồn và không bịa giá/tồn, nhưng dùng ngôn ngữ “hệ thống chưa có thông tin”. Các ca giá trả đúng ý chính nhưng hay thêm dãy size. Ca đổi hoàn cảnh-v3 đã chọn áo riêng cho gặp khách, song giải thích so sánh dài. Đàm phán báo đúng tổng/ship theo code nhưng giải thích trong ngoặc chưa gọn.

Stateful đã giữ hai áo L, profile sửa74/96, code quote978100, nhận checkout riêng không gọi model, chuyển PURCHASE_CONFIRMED và handoff. Câu correction không đọc lại cả số đo; “em ghi nhận” còn hơi mang giọng xử lý dữ liệu. Code hỏi tên bị redaction ở raw capture, exact public text được chứng minh qua transport hash trong PUBLIC_CHECKOUT_HASH_PROOF.

## Căn cứ sau primary review

Snapshot policy hiện tại có15 ngày, phí hai chiều30k, requiredConditions và HOLD_UP_ONLY. Lịch sử7 ngày/25k không lấn policy hiện tại. Không đổi policy nguồn trong lượt này.

Nguồn mô tả SQ675 xác nhận chất liệu thô hoa laze/thô ướt, lót habutai, thiết kế và cách dùng; **không có kết quả so sánh ít nhăn khi ngồi xe3giờ**. Câu tư vấn tự suy luận lợi ích đó từ chất liệu, verifier cho PASS. Ghi đây là inference cần đánh giá riêng theo ranh giới owner đã chấp thuận; không gọi PASS là bằng chứng độc lập rằng công năng đã được xác minh. Tương tự câu “không bí” cho tiệc ngoài trời là suy luận từ mô tả thoáng, chưa có phép thử cá nhân. Không tự đổi thành UNSAFE hay nới verifier để đẹp số trong run này.

## Vận hành, accounting và giới hạn

- 97 actual generation requests =66 owner +31 verifier; max1 upstream/generation; retry0; error0; timeout0; unexpected-tool contract errors0. Đủ request wire cho cả97; firewallPASS, evaluator labels/private checkout fixture/internal delegation leaks0.
- 519221 input tokens,52663 output tokens; usage có cho mọi request. CostNOT_EXPOSED.
- Verifier latency nearest-rank p50/p95:5.315s/9.271s. Verification stage gồm re-read:6.167s/13.159s. B1 turn p50/p95:12.534s/28.765s; captured turn:29.038s/56.485s. Đây là isolated DB/SSH/capture, không phải production/first-token/controlled added-E2E latency.
- Không chạy lại17 controls hoặc full A2. Kết quả controls cũ chỉ là lịch sử; zero unsafe registered trong continuation nên unsafe false-PASS **chưa đo trong run mới**, không suy ra0 trên population chưa chạy.
- 8preflight +8run commands đều exit0, nguyên command/exit/timing trong raw/COMMANDS.json. Mỗi B1 runner thực sự build worker hiện hành. Các lệnh projection/metrics/firewall/validation đã chạy và PASS. Không rerun focused/typecheck/lint/remoteCI; evidence trước vẫn giữ đúng source labels.
- Không thêm semantic role/layer/tool/parser/template hoặc sửa production entrypoint; thay đổi repo của lượt này chỉ là evidence/docs.

## Đánh giá và bước tiếp theo

Hoàn tất inventory51 ca qua old21+new30; giữ5 setup mới tách riêng. Kết quả này khép30 NOT_RUN, chưa xóa fallback discovery và task failure gửi ảnh ở21 ca cũ, cũng chưa chứng minh ổn định của51 ca trên corrected source. **B chưa GO; không tự chạy vòng khác, sửa prompt, merge/deploy/live send.**

Nếu owner chọn sửa tiếp, dùng4 whole-turn findings trên để đánh giá chất lượng quyết định và cách trình bày. Không tiếp tục nhồi mô tả/tính từ hoặc thêm ví dụ riêng từng benchmark; không đánh đồng verifier acceptance với hiệu quả bán hàng. Lượt này chỉ thu thập và review, chưa chọn can thiệp tiếp theo.
'''
(artifact/'CHECKPOINT_B.md').write_text(report,encoding='utf-8')
(artifact/'.gitattributes').write_text('raw/** -text\nfrozen-inputs/** -text\nsource/** -text\n*.json -text\n*.sha256 -text\n',encoding='utf-8')
rawhash={str(p.relative_to(artifact/'raw')).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in (artifact/'raw').rglob('*') if p.is_file()}
(artifact/'RAW_HASHES.json').write_text(json.dumps(rawhash,indent=2),encoding='utf-8')
patterns=[rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'ya29\.[A-Za-z0-9_-]{20,}',rb'gh[pousr]_[A-Za-z0-9]{25,}']
files=[p for p in artifact.rglob('*') if p.is_file()]
assert all(not any(re.search(pattern,p.read_bytes()) for pattern in patterns) for p in files),'SECRET_PATTERN'
print(json.dumps({'artifact':str(artifact),'rawFiles':len(rawhash),'files':len(files),'bytes':sum(p.stat().st_size for p in files),'secretPatternMatches':0},ensure_ascii=False))
