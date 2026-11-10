from pathlib import Path
import hashlib, json
root = Path('C:/Users/nguye/Documents/Sản phẩm AI/c3-acceptance-complete-20261024')
reviews = {
 'sales-discovery-advice:need': ('NOT_RESOLVED', 'Khách cần chọn đồ đi làm, nhưng chỉ nhận câu chưa trả lời được. Không có lựa chọn hoặc bước tiếp theo.'),
 'sales-product-gallery:overview': ('PARTIAL_RECOVERY', 'Khách nhận hai ảnh đúng mẫu và lời dẫn ảnh chung. Đã sửa mất ảnh của recovery; chưa chứng minh ảnh đúng màu be, không coi hoàn thành yêu cầu màu.'),
 'sales-size-advice:height-weight': ('NOT_RESOLVED', 'Handoff im lặng, khách không nhận câu trả lời chọn size hoặc câu hỏi bổ sung. Cần chẩn đoán sau primary review; chưa quy nguyên nhân cho model hay chart.'),
 'sales-southern-delivery:deadline': ('NEEDS_EDIT', 'Đã báo không nhận lịch gấp, nhưng mở đầu bằng giá/mã/danh sách size và ảnh làm loãng câu hỏi thời hạn. Câu không thể kịp giao dễ đọc thành kết luận chắc chắn từ ETA dự kiến; cần giữ riêng giới hạn này.'),
 'media-overview-next:ask': ('USABLE', 'Phân biệt ảnh mẫu với feedback và gửi hai ảnh. Có thể dùng, câu dẫn hơi nhiều mô tả.'),
 'media-overview-next:continue': ('USABLE_WITH_POLISH', 'Thực hiện đúng yêu cầu tiếp nối và gửi cả bộ. Cụm xem phom dáng giúp em hơi gượng; không làm mất kết quả.'),
 'media-detail-next:ask': ('NOT_RESOLVED', 'Không có tin hoặc ảnh cho khách, handoff im lặng. Chẩn đoán kỹ thuật giữ riêng sau primary review.'),
 'media-detail-next:continue': ('BLOCKED_BY_PRIOR_HANDOFF', 'Lượt sau không chạy tư vấn do quyền đã chuyển HUMAN ở lượt trước. Không đếm thành một lỗi model độc lập mới; vẫn giữ trong denominator.'),
 'media-and-price:ask': ('USABLE', 'Gửi ảnh mẫu, giá áo lẻ và tồn size đúng phạm vi. Dùng được; không gọi ảnh mẫu là ảnh khách.'),
 'media-and-size:ask': ('USABLE_PENDING_FIT_PROVENANCE', 'Có đúng ảnh cận thêu và trả lời size M. Câu nhắc chiều cao/cân nặng để giải thích lựa chọn, không phải đọc lại hồ sơ ba vòng. Chưa xác nhận fit có code claim trước khi xem diagnostics.'),
 'media-decision:ask': ('NEEDS_EDIT', 'Dài, nhiều lời khen và hai cách mua rồi để khách tự chọn. Tự giả định khách có chân váy trơn trong tủ. Câu không bị nóng bức chắc hơn thông tin thoáng/mềm; ghi residual, không tự đổi verdict sau run.')}
items=[]
for job in ['journey-openings','media-followup']:
 for file in sorted((root/job).glob('provider-attempt-*.json')):
  a=json.loads(file.read_text()); verdict,reason=reviews[a['caseId']]
  terminal=a['result']['terminal']
  view={'terminal':{k:terminal.get(k) for k in ['disposition','reason','text','fallbackId']},
    'messages':a['actualCapturedMessages'],'attachments':a['actualCapturedAttachments'],'outbox':a['deliveryEvidence']['outboxRows']}
  items.append({'caseId':a['caseId'],'actualOutcome':view,'review':verdict,'reason':reason,
    'attemptFileSha256':hashlib.sha256(file.read_bytes()).hexdigest()})
assert len(items)==11
(root/'PREFIX_PRIMARY_REVIEW.json').write_text(json.dumps({'sourceSha':json.loads((root/'REGISTRATION.json').read_text())['sourceSha'],
 'protocol':'Whole actual customer outcome and dialogue continuity; no keyword scores. Original rejected drafts/tool diagnostics reviewed separately afterwards. Gallery terminal includes its retained diagnostic; it is not used to turn original FAIL into PASS.',
 'items':items},ensure_ascii=False,indent=2),encoding='utf8')
print('PREFIX_PRIMARY_REVIEW_SEALED 11')
