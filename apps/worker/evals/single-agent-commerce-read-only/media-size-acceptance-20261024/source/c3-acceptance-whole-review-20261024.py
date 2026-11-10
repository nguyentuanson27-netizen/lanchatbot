from pathlib import Path
import hashlib, json, collections
root=Path('C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-complete-20261024')
reviews={
'b1-changed-occasion':('NOT_RESOLVED','Khách muốn đổi lựa chọn do ngồi xe lâu; fallback không đưa lựa chọn hay bước tiếp theo.'),
'b1-current-policy':('USABLE','Dùng policy hiện hành 15 ngày/30k thay ký ức 7 ngày, trả đúng vấn đề đổi màu rồi hỏi màu cần đổi.'),
'b1-partial-source':('PARTIAL_SOURCE_NOT_FULLY_RESOLVED','Giữ được chất liệu, không bịa giá/tồn khi nguồn POS bị fault có chủ đích. Nhu cầu giá/tồn chưa hoàn thành; đây là giới hạn nguồn/capability, không quy thành model không hiểu câu hỏi.'),
'b1-price':('USABLE','Trả giá cả set, thành phần và các size. Đủ cho lượt hỏi giá, hơi dài nhưng không mở menu món lẻ.'),
'b1-component-stock':('USABLE','Đúng áo lẻ, size M, còn hàng và giá; ngắn, sát câu hỏi.'),
'b1-search-read':('USABLE_WITH_POLISH','Tìm đúng SD375 và phân biệt giá áo lẻ/cả bộ. Có thể dùng; nên ưu tiên cách mua khách đang hỏi khi đã rõ.'),
'b1-buying-concern':('NOT_RESOLVED','Fallback làm mất tư vấn về ren/ngân sách/tiệc ban ngày. Chỉ xác định nguyên nhân kỹ thuật sau primary review.'),
'b1-policy-used':('USABLE_WITH_POLISH','Từ chối đúng việc đã mặc đi làm. Phần phí cho trường hợp hợp lệ trả lời ý hỏi phí nhưng có thể gọn hơn.'),
'b1-changed-occasion-v2':('NEEDS_EDIT','Nhận bối cảnh ngoài trời nhưng chủ yếu đọc chất liệu rồi khẳng định đảm bảo thoải mái. Chưa giải thích quyết định đủ sát việc ở ngoài lâu/dễ nóng; giọng bảo đảm mạnh hơn cần thiết.'),
'b1-current-policy-v2':('USABLE','Trả đúng thời hạn/phí hiện hành và hỏi size đổi; bước kiểm kho nằm trong read_product hiện có.'),
'b1-partial-source-v2':('PARTIAL_SOURCE_NOT_FULLY_RESOLVED','Giữ đúng vải/dáng chân váy và không bịa giá/tồn. Câu hệ thống chưa có sẵn là văn phong kỹ thuật; nhu cầu mua chưa được giải quyết khi nguồn bị fault.'),
'b1-price-v2':('USABLE','Trả đúng cả bộ, không đẩy lựa chọn áo/váy lẻ. Ngoặc thành phần không gây khó hiểu.'),
'b1-component-stock-v2':('USABLE','Đúng chân váy riêng size M và giá449k, ngắn và dùng được.'),
'b1-search-read-v2':('USABLE','Tìm đúng Khánh Trang và phân biệt lựa chọn cả bộ/món lẻ. Có câu hỏi tiếp theo phù hợp.'),
'b1-buying-concern-v2':('NEEDS_EDIT','Nhiều đoạn và tính từ lặp để khẳng định không quá điệu, thay vì một lý do rõ cho người quen đồ trơn. Chưa thuyết phục hơn dù có chốt mua cả bộ.'),
'b1-policy-used-v2':('USABLE','Hiểu đã mặc thử vào người và từ chối đúng HOLD_UP_ONLY; không chỉ dò đủ tem/chưa giặt.'),
'b1-changed-occasion-v3':('USABLE_WITH_POLISH','Đã đổi quyết định sang áo lẻ khi hoàn cảnh đổi, có cách phối. 799k cần gắn rõ cả bộ, và câu sắc sảo/chuyên nghiệp hơn rất nhiều hơi quảng cáo. Không coi thêm phương án cả bộ là lỗi chỉ vì có upsell.'),
'b1-current-policy-v3':('USABLE','Dùng thời hạn15ngày hiện hành, trả thẳng việc còn đổi được; thêm phí là thông tin liên quan.'),
'b1-partial-source-v3':('PARTIAL_SOURCE_NOT_FULLY_RESOLVED','Trả vải áo/váy, giữ giá/tồn là chưa biết đúng fault source. Chưa hoàn thành toàn nhu cầu mua nhưng không bịa hoặc hứa bước ngoài khả năng.'),
'b1-price-v3':('USABLE','Giá cả bộ và size, ngắn và rõ.'),
'b1-component-stock-v3':('USABLE','Đủ bán riêng/còn M/giá499k, giọng bình thường.'),
'b1-search-read-v3':('USABLE','Tìm đúng SQ223, giá và size chia đúng áo/quần/cả bộ. Danh sách ở đây giúp phân biệt lựa chọn thay vì đọc lại hồ sơ.'),
'b1-buying-concern-v3':('USABLE_WITH_POLISH','Chọn cả bộ trong ngân sách và giải thích phối lại áo với chân váy khách đã có. Upsell này có lý do thương mại; không đánh lỗi vì khách đã sở hữu một chân váy. Lý do ngân sách/tính từ còn có thể gọn hơn.'),
'b1-policy-used-v3':('USABLE','Từ chối đúng hàng cắt tem/đã giặt, không kéo khách qua quy trình đổi không hợp lệ.'),
'stateful-open':('USABLE','Nhận áo be M khách tự chọn, báo đã thêm giỏ có receipt và tình trạng đặt trước. Không đọc lại số đo hoặc tự nhận M là size vừa.'),
'stateful-variant-quantity':('USABLE','Đổi đúng be L x2 và xác nhận đúng việc vừa nhờ, không đổi nhầm màu.'),
'stateful-quote':('USABLE_WITH_POLISH','Tổng978100 và phần ưu đãi/ship rõ, đáp đúng câu hỏi. Cụm liệt kê trong ngoặc dài hơn cần thiết.'),
'stateful-correction':('NEEDS_EDIT','Hồ sơ được sửa nhưng giỏ giữ L đúng yêu cầu. Giọng đã ghi nhận số đo mới/được giữ nguyên trong giỏ vẫn là báo cáo hệ thống, chưa phải lời nhận ngắn tự nhiên.'),
'stateful-request-checkout':('CODE_CHECKOUT_REDACTED_CAPTURE','Có tin code xin thông tin nhận hàng. Capture đã redacted thành [NAME], không kết luận bot gửi nguyên marker hay chấm văn phong phần bị che.'),
'stateful-private-checkout':('CODE_CHECKOUT_REDACTED_CAPTURE','Code dựng preview riêng tư, tổng978100/ETA/thanh toán; không đưa private fixture vào model. Tên parent Set váy trong dòng áo lẻ còn hơi khó đọc, không lẫn giá cả bộ.'),
'stateful-confirm':('EXPECTED_HANDOFF','Sau preview và xác nhận, thực hiện handoff rồi báo nhân viên kiểm tra/lên đơn; không tự nói đã tạo đơn live.'),
'stateful-human-request':('EXPECTED_HANDOFF','Yêu cầu gặp người được chuyển và báo đúng, không thêm ảnh/tư vấn ngoài yêu cầu.'),
'negotiation-cart-setup':('USABLE_WITH_POLISH','Đúng áo be M và giá/tổng; nhiều ngoặc và cụm tổng giỏ hàng nghe hệ thống.'),
'negotiation-price-objection':('USABLE_WITH_POLISH','Dùng hỗ trợ ship có code quote để xử lý phản đối giá, không tự đặt mức giảm. Câu giá niêm yết/tổng giỏ hàng hơi hành chính.'),
'negotiation-total-control':('USABLE_WITH_POLISH','Tổng499k trả đúng sau hỗ trợ ship. Ngoặc giải thích ba khoản làm dài câu hỏi tổng tiền đơn giản.'),
'opening-ad':('USABLE','Bind đúng mẫu từ ads, báo giá cả set và gửi ảnh đúng mẫu.'),
'opening-ad-repeat':('USABLE','Dùng lịch sử thật, chỉ trả lại giá; không gửi ảnh hay khối mở đầu lần nữa.'),
'opening-organic':('USABLE','Đúng sản phẩm do khách nêu, giá cả bộ và ảnh. Không nhầm first contact với ads.'),
'opening-unresolved':('USABLE','Không bịa mẫu/giá từ ads chưa bind, xin ảnh hoặc tên để tra; bước dùng được.'),
'opening-multipart':('USABLE','Trả đủ giá bộ và có bán áo riêng/giá áo, kèm ảnh. Có thể gọn từ hoàn toàn/ạ nhưng vẫn dùng được.')}
items=list(json.loads((root/'PREFIX_PRIMARY_REVIEW.json').read_text())['items'])
for job in ['b1','stateful','negotiation','opening-quotes']:
 pattern='attempt-*.json' if job=='b1' else 'provider-attempt-*.json'
 files=sorted((root/job).glob(pattern),key=lambda p:int(p.stem.split('-')[-1]))
 for file in files:
  a=json.loads(file.read_text()); label,reason=reviews[a['caseId']]
  t=a['result']['terminal']; view={'terminal':{k:t.get(k) for k in ['disposition','reason','text','fallbackId']}}
  if job=='b1': view.update({'mode':'SEND_ELIGIBILITY_ONLY','customer':a['runtime']['latest'],'history':a['runtime']['history']})
  else: view.update({'mode':'CAPTURE_TRANSPORT','messages':a['actualCapturedMessages'],'attachments':a['actualCapturedAttachments'],'outbox':a['deliveryEvidence']['outboxRows']})
  items.append({'caseId':a['caseId'],'job':job,'actualOutcome':view,'review':label,'reason':reason,'attemptFileSha256':hashlib.sha256(file.read_bytes()).hexdigest()})
assert len(items)==51 and len({i['caseId'] for i in items})==51
output={'sourceSha':json.loads((root/'REGISTRATION.json').read_text())['sourceSha'],
 'protocol':'Human whole-reply review of actual customer outcome and dialogue continuity, not matching isolated phrases. Qualitative labels are findings, not a new numeric qualification threshold. Private capture is redacted; B1 is eligibility only. Original prefix primary review is retained unchanged; later provenance/snapshot diagnostics are separate.',
 'prefixPrimaryReviewHash':hashlib.sha256((root/'PREFIX_PRIMARY_REVIEW.json').read_bytes()).hexdigest(),
 'counts':dict(collections.Counter(i['review'] for i in items)),'items':items}
(root/'PRIMARY_REVIEW.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf8')
print('WHOLE_PRIMARY_REVIEW_SEALED 51')
