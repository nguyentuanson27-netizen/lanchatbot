from pathlib import Path
import json,hashlib,collections
r=Path(r'C:/Users/nguye/Documents/Sản phẩm AI/c3-tool-history-continuation-20261025')
items=json.loads((r/'PRIMARY_INPUT.json').read_text(encoding='utf-8'))
notes={
'b1-changed-occasion':('NEEDS_EDIT','Có đổi lựa chọn theo việc ngồi xe lâu, nhưng câu trả lời quá dài, nửa sau dồn mô tả và tính từ quảng cáo; lý do chọn thay bị loãng. Cần kiểm căn cứ các khẳng định ít nhăn/thoải mái sau khóa review.'),
'b1-current-policy':('USEFUL','Trả trực tiếp mốc hiện tại 15 ngày và phí 30k, xử lý đúng câu hỏi so với lịch sử 7 ngày. Kết luận điều kiện cần đối chiếu snapshot sau review.'),
'b1-partial-source':('USEFUL_WITH_POLISH','Giữ được câu trả lời chất liệu khi POS thiếu và không bịa giá/tồn; câu vẫn giống chép mô tả, kết thúc bằng cách nói tra cứu.'),
'b1-price':('USEFUL_WITH_POLISH','Giá nguyên set rõ và ngắn; đưa thêm toàn bộ size dù khách chỉ hỏi giá.'),
'b1-component-stock':('USEFUL','Đúng phạm vi áo lẻ, báo giá và tồn M ngắn gọn, không tự tư vấn vừa.'),
'b1-search-read':('USEFUL_WITH_POLISH','Tìm được mã và phân biệt áo lẻ/cả bộ; đoạn size bổ sung không cần cho câu hỏi giá.'),
'b1-buying-concern':('NEEDS_EDIT','Khách ngại nhiều ren/rườm rà, câu trả lời dùng mềm/bay/rũ để phủ định rườm rà; chưa giải thích thuyết phục về mức độ chi tiết của thiết kế, giọng quảng cáo.'),
'b1-policy-used':('USEFUL_WITH_POLISH','Từ chối thẳng theo việc đã mặc đi làm, không mở quyền đổi sai. Đoạn quy định và thông cảm dài hơn cần thiết.'),
'b1-changed-occasion-v2':('USEFUL_WITH_POLISH','Đáp đúng nỗi lo nóng và khá ngắn; vẫn nhắc dãy chất liệu rồi kết luận thoải mái/không bí. Căn cứ thực dụng phải kiểm riêng, không coi giọng tự tin là lỗi tự động.'),
'b1-current-policy-v2':('USEFUL_WITH_POLISH','Dùng mốc/phí hiện tại, không nhắc phí cũ như luật; câu nhắc 12 hôm và thêm mốc 15 ngày trong ngoặc gây dài.'),
'b1-partial-source-v2':('USEFUL_WITH_POLISH','Trả chất liệu/dáng và giới hạn giá/tồn đúng phạm vi váy; cách nói hệ thống chưa có sẵn còn mang giọng máy.'),
'b1-price-v2':('USEFUL_WITH_POLISH','Hiểu cả bộ qua lịch sử và báo giá; thêm dãy size không cần thiết.'),
'b1-component-stock-v2':('USEFUL','Hiểu chân váy rời qua lịch sử, trả gọn đúng giá và tồn M.'),
'b1-search-read-v2':('USEFUL_WITH_POLISH','Tìm đúng tên và giá cả bộ; bổ sung giá món rời tuy có ích tùy khách nhưng lượt này chưa cần.'),
'b1-buying-concern-v2':('NEEDS_EDIT','Hiểu gu đồ trơn nhưng trả nhiều nhánh áo/váy/cả set, rồi hỏi ngược khách chọn. Không chốt giúp khách; gần 200 từ và mô tả quảng cáo làm lựa chọn khó hơn.'),
'b1-policy-used-v2':('USEFUL_WITH_POLISH','Hiểu đã mặc thử khác chỉ ướm, từ chối đúng tình huống thay vì chỉ kiểm tem; giọng quy định dài và nặng.'),
'b1-changed-occasion-v3':('USEFUL_WITH_POLISH','Đã đổi từ cả bộ dự tiệc sang áo lẻ cho gặp khách và nêu cách phối; phần so sánh lặp gọn gàng/bay rũ dài, nhiều tính từ.'),
'b1-current-policy-v3':('USEFUL','Đáp mốc hiện tại, phí và hỏi size muốn đổi; đi tiếp được trong tư vấn, không nói đã thực hiện đổi.'),
'b1-partial-source-v3':('USEFUL_WITH_POLISH','Giữ được chất liệu có nguồn và không bịa giá/tồn; mô tả dài và ngôn ngữ hệ thống vẫn cứng.'),
'b1-price-v3':('USEFUL_WITH_POLISH','Giá cả bộ rõ; thông tin size cộng thêm không phục vụ câu hỏi chính.'),
'b1-component-stock-v3':('USEFUL','Xác nhận bán áo riêng và trả đủ giá/tồn M tự nhiên, không kéo sang khẳng định fit.'),
'b1-search-read-v3':('USEFUL_WITH_POLISH','Tìm đúng mã, trả tồn/giá và phân biệt lựa chọn bán; bảng ba mức giá hơi nhiều nhưng khách chưa chốt offer nên có lý do dùng.'),
'b1-buying-concern-v3':('NEEDS_EDIT','Đã chọn áo riêng dựa trên váy khách có, nhưng nửa sau quảng cáo chất liệu rồi mở lại cả bộ mà không có đánh đổi mới. Lời khuyên bị loãng, chưa tập trung cách mặc lại.'),
'b1-policy-used-v3':('USEFUL_WITH_POLISH','Từ chối đúng tình trạng đã giặt/cắt tem; giải thích trong ngoặc lặp điều vừa nói và xin thông cảm dài.'),
'negotiation-cart-setup':('USEFUL_WITH_POLISH','Có xác nhận áo/biến thể và đặt trước từ trạng thái; pre-order trong ngoặc thừa.'),
'negotiation-price-objection':('USEFUL_WITH_POLISH','Nói giá hiện tại và hỗ trợ ship thay vì bịa giảm thêm; đoạn xin thông cảm còn sáo.'),
'negotiation-total-control':('USEFUL_WITH_POLISH','Tổng thanh toán rõ; giải thích ship giảm trừ trong ngoặc quá dài cho câu hỏi tổng tiền.'),
'stateful-open':('USEFUL','Xác nhận đúng áo lẻ/be/M đã thêm và báo đặt trước, không đọc lại hai số đo.'),
'stateful-variant-quantity':('USEFUL','Xác nhận gọn việc đổi L và số lượng hai áo, không kéo sang fit.'),
'stateful-quote':('USEFUL_WITH_POLISH','Báo tổng code 978100 và các khoản; ưu đãi chưa hiển thị thành một khoản riêng nên khách phải tự đối chiếu 998k+30k với tổng.'),
'stateful-correction':('USEFUL_WITH_POLISH','Đã nhận sửa số đo mà không đọc lại số; giữ đúng hai áo L. Cụm em ghi nhận vẫn hơi mang giọng xử lý dữ liệu.'),
'stateful-request-checkout':('USEFUL','Code hỏi tên người nhận, không phải actual silence; raw capture bị redaction nên public text chỉ được xác nhận bằng hash/code.'),
'stateful-private-checkout':('USEFUL','Code nhận thông tin riêng và tạo preview đầy đủ tổng/ưu đãi/ship/đặt trước/ETA, hỏi xác nhận. Không gọi model cho PII.'),
'stateful-confirm':('USEFUL','Xác nhận mua dẫn tới handoff với câu ngắn có bước tiếp theo, không báo đã tạo đơn POS.'),
'stateful-human-request':('USEFUL','Yêu cầu gặp nhân viên được chuyển với câu ngắn, không tiếp tục tư vấn vòng vo.')}
setup={'stateful-open','stateful-variant-quantity','stateful-quote','stateful-correction','stateful-request-checkout'}
assert len(items)==35 and set(notes)=={x['caseId'] for x in items}
cases=[{'caseId':a['caseId'],'job':a['job'],'scope':'ADDITIONAL_PREREQUISITE' if a['caseId'] in setup else 'REMAINING_TARGET','verdict':notes[a['caseId']][0],'wholeTurnReason':notes[a['caseId']][1]} for a in items]
review={'sourceSha':json.loads((r/'REGISTRATION.json').read_text())['sourceSha'],'reviewed':35,'targetReviewed':30,'additionalPrerequisitesReviewed':5,'protocol':'Human-agent whole-turn reading of actual terminal text/history, task completion, usefulness/decision and Vietnamese voice. No keyword points, no claim of sales conversion or blind review; corpus expectations had been read. No rejected-draft diagnostics inspected before this lock. Factual source validation follows separately.','counts':dict(collections.Counter(c['verdict'] for c in cases)),'targetCounts':dict(collections.Counter(c['verdict'] for c in cases if c['scope']=='REMAINING_TARGET')),'cases':cases}
b=json.dumps(review,ensure_ascii=False,indent=2).encode();(r/'PRIMARY_REVIEW.json').write_bytes(b);(r/'PRIMARY_REVIEW.sha256').write_text(hashlib.sha256(b).hexdigest())
print(json.dumps({k:review[k] for k in ['reviewed','targetReviewed','counts','targetCounts']},ensure_ascii=False))
