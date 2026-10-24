from pathlib import Path
from datetime import datetime,timezone
import collections,hashlib,json,subprocess
folder=Path(__file__).parent
root=folder/'c3-turn-completion-model-20261024'
repo=folder/'lanchatbot-c3-semantic-verifier-checkpoint-a-20261005'
data=json.loads((root/'PRIMARY_INPUT_PREFIX.json').read_text(encoding='utf-8'))
assert len(data)==31
reviews={
 'b1-changed-occasion':('NOT_RESOLVED','Không có reply eligible cho việc ngồi xe lâu/chọn món đỡ nhăn. Đây là B1 eligibility-only, chưa có delivery/handoff thật; chẩn đoán STALE sau primary, không quy thành lỗi giọng hoặc khẳng định owner chưa sinh được draft.'),
 'b1-changed-occasion-v2':('NEEDS_EDIT','Nhận ra ngoài trời/dễ nóng nhưng kể chất liệu rồi bảo khách tự cân nhắc thời tiết. Chưa đưa lời khuyên mua/cách chọn phù hợp hơn; thận trọng hơn không tự thành tư vấn hữu ích.'),
 'b1-buying-concern-v2':('NEEDS_EDIT','Khách nhờ quyết có nên lấy khi quen đồ trơn; ba đoạn trấn an và lời khen, cuối lại trả cả áo lẻ/cả bộ cho khách chọn. Lý do mềm/rũ không giải quyết mức độ trang trí và lời khuyên chưa giúp chốt hướng mua.'),
 'b1-buying-concern-v3':('USABLE_WITH_POLISH','Chọn cả bộ799k, có thêm bộ đồng điệu và có thể phối lại áo với chân váy đen khách đã có. Upsell có ích với mục tiêu mặc lại, không lỗi vì chi nhiều hơn áo lẻ. Lý do vừa ngân sách ở đầu và câu sau dài có thể gọn hơn.'),
 'sales-discovery-advice:need':('NOT_RESOLVED','Khách cần bộ đi làm dưới1triệu, không bó bụng; actual fallback không đưa mẫu hay bước giúp mua. Giữ T2_NO_INTERVENTION, không gọi run này đã sửa khả năng khám phá.'),
 'sales-product-gallery:overview':('PARTIAL_GENERIC_WITH_POLISH','Có hai ảnh chung đúng mẫu và nói rõ ảnh chung, chưa đáp ứng ảnh đúng màu be. Bảng giá bộ/áo/váy và size trong ngoặc không cần cho lượt xin ảnh; original PASS không làm yêu cầu màu thành hoàn tất.'),
 'sales-size-advice:height-weight':('USABLE_PENDING_FIT_PROVENANCE','Đưa M theo cao/nặng và thích rộng, không bắt xin ba vòng. Nhắc hai dữ kiện giải thích lựa chọn được chấp nhận; câu về chất liệu thêm hơi nhiều. Primary chưa dùng verifier PASS làm proof fit, cần kiểm claim sau lock.'),
 'sales-southern-delivery:deadline':('USABLE','Giải quyết ngay sáng mai bằng lịch4–8ngày, không chèn giá/mã/size/ảnh. Từ chối lịch gấp trong bối cảnh này hợp lý; không chấm lỗi chỉ vì nói không kịp.'),
 'media-overview-next:ask':('USABLE','Phân biệt ảnh khách với ảnh mẫu, trả giới hạn rồi gửi hai ảnh mẫu có ích. Không gọi ảnh mẫu là feedback.'),
 'media-overview-next:continue':('USABLE','Khách yêu cầu xem cả bộ nên gửi lại ảnh cả bộ là đúng việc, khác ca chỉ hỏi lại giá. Lời dẫn ngắn.'),
 'media-detail-next:ask':('USABLE_WITH_POLISH','Trả lời chưa có feedback và đề nghị ảnh chi tiết; chưa gửi ảnh ở lượt này. Câu có dạng xin xác nhận nên không tự coi là tuyên bố gửi xong. Có thể chủ động hơn và bỏ đuôi nhéạ?; lượt sau thực hiện được.'),
 'media-detail-next:continue':('CAPTURE_TEXT_REDACTION_LIMIT','Một ảnh cận thêu được capture và Outbox accepted. Lời dẫn trong capture bị che thành[ADDRESS], nên không chấm marker là lời bot hoặc lấy terminal text thay cho exact captured text. Giới hạn evidence chữ cần ghi riêng; draft lời dẫn không phải bằng chứng mọi byte đã gửi.'),
 'media-and-price:ask':('PARTIAL_ALTERNATIVE_WITH_POLISH','Có ảnh mẫu và giá áo499k, đáp phần giá và đưa ảnh thay có ích; chưa có ảnh khách theo yêu cầu. Caption gọi đúng ảnh mẫu. Ngoặc size và câu cứ nhắn em chung chung có thể gọn.'),
 'media-and-size:ask':('USABLE_PENDING_FIT_PROVENANCE','Có đúng một ảnh cận thêu và trả M, đáp hai ý gọn. Nhắc cao/nặng để giải thích không phải liệt kê hồ sơ; kiểm SIZE_FIT sau lock để xác nhận authority.'),
 'media-decision:ask':('NEEDS_EDIT','Khách ngại ren nhiều khi đi cưới trưa; reply dài, khen mềm/rũ/nhã nhặn rồi đọc cả ba giá và hỏi size. Ảnh cận chất liệu có ích nhưng lời tư vấn chưa giúp quyết định phần ren có hợp gu hay nên chọn cách mua khác.'),
 'negotiation-cart-setup':('USABLE','Nhận áo be M và báo hàng đặt trước, không đọc lại số đo; xác nhận hành động đúng nhu cầu.'),
 'negotiation-price-objection':('USABLE_WITH_POLISH_CODE_RECOVERY','Actual code summary có ưu đãi30k, tổng499k gồm ship và đúng áo be M. Giải quyết được đề nghị giảm nhưng câu giống bản kê, lặp hàng đặt trước và tên parent không cần thiết. Không nhầm phần code-owned này với văn phong owner.'),
 'negotiation-total-control':('USABLE_WITH_POLISH','Tổng499k đúng sau ưu đãi ship; giải thích499k+30k−30k rõ nhưng nên trả tổng trước. Không gọi đúng phép tính là lỗi nghiệp vụ chỉ vì có nhiều số.'),
 'opening-ad':('USABLE','Bind đúng SV2447 từ ads, giá cả bộ799k và hai ảnh đúng mẫu, không bắt khách xác định lại.'),
 'opening-ad-repeat':('NEEDS_EDIT_MEDIA_REPEAT','Lịch sử đã gửi hai ảnh, khách chỉ hỏi lại giá. Text gọn và giá đúng nhưng lại gửi cùng hai ảnh; regression trực tiếp của control T3, không hoàn thành yêu cầu tránh lặp khối mở đầu.'),
 'opening-organic':('USABLE_WITH_POLISH','Đúng mẫu và giá cả bộ; gửi ảnh được. Thêm giá áo/váy lẻ dù khách chưa hỏi làm câu nặng hơn baseline, nhưng vẫn giải quyết được việc hỏi giá.'),
 'opening-unresolved':('USABLE','Không đoán mẫu/giá khi ads chưa bind; xin ảnh hoặc tên để tra, bước tiếp theo có thể dùng.'),
 'opening-multipart':('USABLE','Trả đủ giá bộ799k và áo riêng499k, không để lời giới thiệu che phần bán lẻ. Không có ảnh ở lượt này nhưng khách đã được đáp hai ý; không tự thêm gate bắt buộc ảnh cho ca này.'),
 'stateful-open':('USABLE','Nhận đúng áo be M khách tự chọn, báo pre-order, không tự kết luận M vừa hay đọc lại số đo.'),
 'stateful-variant-quantity':('USABLE_WITH_POLISH','Đổi đúng L/hai áo, có xác nhận rõ. Tổng tiền thêm chưa cần nhưng vẫn có ích, không làm sai việc sửa giỏ.'),
 'stateful-quote':('USABLE','Trả tổng978100 sau ưu đãi và có ship30k, ngắn hơn khối ngoặc bản trước; đúng nhu cầu hỏi tổng.'),
 'stateful-correction':('USABLE','Dạ vâng…giữ nguyên2áoL là lời nhận tự nhiên hơn báo cáo ghi nhận/cập nhật. Ngữ cảnh là giữ lựa chọn giỏ, không tự hiểu thành cam kết giữ tồn kho.'),
 'stateful-request-checkout':('CODE_CHECKOUT_REDACTED_CAPTURE','Có code invitation và chuyển sang bước nhận thông tin. Capture bị redactor rút thành[NAME], không chấm marker là literal; không đếm NO_SEND của model như khách không nhận tin.'),
 'stateful-private-checkout':('CODE_CHECKOUT_REDACTED_CAPTURE','Code preview có áo/be/L/x2/tổng978100/COD/ETA; private input không cần model. Bản kê xác nhận là định dạng phù hợp, còn tên parent Set váy trong dòng áo hơi khó đọc.'),
 'stateful-confirm':('EXPECTED_HANDOFF','Sau preview và khách chốt, có lời báo chuyển nhân viên kiểm tra/lên đơn. Không tự báo đã tạo đơn POS.'),
 'stateful-human-request':('EXPECTED_HANDOFF','Khách xin gặp nhân viên, có một lời báo ngắn và chuyển người; không gửi thêm tư vấn/ảnh.'),
}
assert set(reviews)=={a['caseId'] for a in data}
source=json.loads((root/'REGISTRATION.json').read_text())['sourceSha']
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()==source
items=[{**a,'review':reviews[a['caseId']][0],'reason':reviews[a['caseId']][1]} for a in data]
primary={'sourceSha':source,'lockedAt':datetime.now(timezone.utc).isoformat(),'protocol':'Actual terminal/history/attachments first; no rejected-draft/verdict diagnostics used to judge primary quality. Qualitative whole-turn review by agent, not owner acceptance or keyword score.',
 'primaryInputHash':hashlib.sha256((root/'PRIMARY_INPUT_PREFIX.json').read_bytes()).hexdigest(),'counts':dict(collections.Counter(a['review'] for a in items)),'items':items}
with (root/'PRIMARY_REVIEW.json').open('x',encoding='utf-8') as f:json.dump(primary,f,ensure_ascii=False,indent=2)
primary_hash=hashlib.sha256((root/'PRIMARY_REVIEW.json').read_bytes()).hexdigest()
gate={'sourceSha':source,'verdict':'STOP','allowRemaining':False,'registeredNative':51,'completedNative':31,'remainingNativeNotRun':20,
 'controls':'17/17 PASS','T1':'COD21/BANK21 deterministic PASS; native expected handoff works. No forced native POS refresh; do not infer causality from old silent turns becoming eligible.',
 'T2':{'b1-changed-occasion':{'intervention':'T2_NO_INTERVENTION','observation':'OBSERVED_INCOMPLETE','terminal':'HANDOFF/STALE'},
       'sales-discovery-advice:need':{'intervention':'T2_NO_INTERVENTION','observation':'OBSERVED_INCOMPLETE','terminal':'FALLBACK/OWNER_TOOL_MODE'}},
 'T3':{'deadline':'USABLE, no price/size/images before answer','opening-ad-repeat':'REGRESSION: same two images repeated for price-only follow-up','status':'NOT_PROMOTED'},
 'primaryReviewSha256':primary_hash,'reasons':['Discovery not completed','Changed-occasion no eligible reply','Opening-repeat control regressed'],
 'evidenceLimit':'Public media-detail caption was redacted in capture; retain that limit, never call marker an actual customer reply.'}
with (root/'PREFIX_REVIEW.json').open('x',encoding='utf-8') as f:json.dump(gate,f,ensure_ascii=False,indent=2)
(root/'FINAL_DISPOSITION.json').write_text(json.dumps({'status':'STOP_AT_PREFIX','sourceSha':source,'nativeAttempted':31,'nativeNotRun':20,'controlsAttempted':17,'providerReruns':0,'primaryReviewSha256':primary_hash},indent=2),encoding='utf-8')
print(json.dumps({'verdict':'STOP','native':31,'notRun':20,'primaryHash':primary_hash,'counts':primary['counts']},ensure_ascii=False))
