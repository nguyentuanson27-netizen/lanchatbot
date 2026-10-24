from pathlib import Path
import collections,hashlib,json
root=Path(__file__).parent/'c3-tool-history-model-20261025'
items=json.loads((root/'PRIMARY_INPUT.json').read_text(encoding='utf-8'))
assert len(items)==21
reviews={
 'sales-discovery-advice:need':('FALLBACK','Khách cần chọn bộ đi làm; thực nhận câu chưa trả lời được, không có hướng mua.'),
 'sales-product-gallery:overview':('TASK_FAIL','Khách xin ảnh màu be; nhận giá/chất liệu/size và câu hỏi size nhưng không có ảnh hoặc giải thích thiếu ảnh.'),
 'sales-size-advice:height-weight':('USEFUL_WITH_POLISH','Chọn M có SIZE_FIT và giá/tồn đúng nguồn. Tham chiếu chiều cao/cân nặng có liên quan; đoạn nhắc lại nhu cầu và câu hỏi đôi cuối có thể gọn hơn.'),
 'sales-southern-delivery:deadline':('USEFUL','Trả ngay không kịp sáng mai từ ETA 4–8 ngày; không thêm intro/ảnh hoặc khuyên chuẩn bị đồ khác.'),
 'opening-ad':('USEFUL','Đúng mẫu quảng cáo, giá cả bộ 799k, ảnh được capture cùng nhóm và next step không bị kéo dài.'),
 'opening-ad-repeat':('USEFUL','Trả đúng 799k, ngắn và không gửi lại ảnh khi khách chỉ hỏi lại giá.'),
 'opening-organic':('USEFUL','Giá cả bộ, size còn và ảnh phù hợp một lượt mở đầu hỏi mẫu cụ thể.'),
 'opening-unresolved':('USEFUL','Chưa xác định mẫu thì hỏi tên/ảnh, không quote một mẫu gần nghĩa thay thế.'),
 'opening-multipart':('USEFUL','Trả cả set 799k và áo lẻ 499k, có ảnh; không bỏ ý mua lẻ. Cụm nhấn mạnh có thể gọn nhưng không làm mất mục tiêu.'),
 'media-overview-next:ask':('USEFUL','Nói rõ chưa có feedback của mẫu rồi chủ động gửi ảnh mẫu tổng thể; không giả ảnh shop thành ảnh khách.'),
 'media-overview-next:continue':('USEFUL','Khách yêu cầu gửi cả bộ; gửi lại đúng ảnh theo yêu cầu. Lịch sử ảnh không thành luật cấm resend.'),
 'media-detail-next:ask':('USEFUL_WITH_POLISH','Phân biệt feedback với ảnh mẫu, ảnh được gửi. Giá/size thêm vào chưa cần thiết cho câu hỏi này nhưng câu vẫn dùng được.'),
 'media-detail-next:continue':('USEFUL','Đúng ảnh cận TOP theo metadata/capture, lời dẫn ngắn và không kể lại catalog.'),
 'media-and-price:ask':('USEFUL','Giải quyết cả ảnh thay thế và giá áo lẻ 499k, không vì thiếu feedback mà bỏ phần mua hàng.'),
 'media-and-size:ask':('USEFUL','Có ảnh cận và M từ engine; tham chiếu chiều cao/cân nặng dùng để giải thích size là hợp lý, không tự chấm lỗi vì nhắc fact.'),
 'media-decision:ask':('NEEDS_EDIT','Dồn mềm/rũ/thanh thoát/sang trọng để trấn an chuyện ren nhiều, chọn hướng mua muộn rồi chuyển sang size. Chưa gỡ băn khoăn bằng lý do trực tiếp, giọng quảng cáo dài.'),
 'stateful-open':('USEFUL_WITH_POLISH','Thêm đúng áo be M theo lựa chọn khách, báo đặt trước. Có receipt; cách nói thêm vào giỏ và ngoặc tiếng Anh còn mang giọng giao diện.'),
 'stateful-variant-quantity':('USEFUL_WITH_POLISH','Actual reply/giỏ xác nhận 2 áo L và tổng 978100 có ship. Khối mẫu/tổng/đặt trước đúng nhưng giọng code assembler, không tính là owner tư vấn đã cải thiện.'),
 'stateful-quote':('USEFUL_WITH_POLISH','Tổng 978100 gồm ship đúng giỏ. Phép tính trong ngoặc thừa với câu hỏi chỉ cần tổng; không phải lỗi số học.'),
 'stateful-correction':('NEEDS_EDIT','State sửa 74/96 đúng và giữ 2 áo L. Câu báo ghi nhận với ngoặc hồ sơ cứng; đánh giá toàn câu, không phạt tự động vì nhắc hai số mới sửa.'),
 'stateful-request-checkout':('USEFUL','Code đã gửi câu xin tên người nhận để tiếp tục checkout; NO_SEND là terminal model, không phải im lặng. Exact public text được đối chiếu bằng transport SHA256.')
}
assert set(reviews)=={a['caseId'] for a in items}
text='Chị cho em tên người nhận nhé.'
attempt=json.loads((root/'stateful/provider-attempt-5.json').read_text())
proof=attempt['actualCapturedTextHashes'][0]
assert proof['sequence']==0 and proof['sha256']==hashlib.sha256(text.encode()).hexdigest()
(root/'PUBLIC_CHECKOUT_HASH_PROOF.json').write_text(json.dumps({'status':'PASS','caseId':'stateful-request-checkout',
    'text':text,'transportSha256':proof['sha256'],'source':'apps/worker/src/realtime-sales-cycle.ts CHECKOUT_FIELD_LABELS.FULL_NAME + SINGLE_FIELD builder',
    'note':'Public code-owned prompt only; raw redacted capture remains unchanged. Does not reconstruct private customer values.'},ensure_ascii=False,indent=2),encoding='utf-8')
rows=[{'caseId':a['caseId'],'verdict':reviews[a['caseId']][0],'wholeTurnReason':reviews[a['caseId']][1],
    'terminal':a['terminal'],'captureMode':a['captureMode'],'attemptSha256':a['sha256']} for a in items]
review={'sourceSha':'9e352f382e8915d6a1f1c080c75817065da42c63','reviewedNative':21,'remainingNativeNotRun':30,
 'recommendation':'STOP','technicalReady':False,'privacyRegressionDetectedOffline':True,
 'protocolLimitation':'Discovery terminal.semanticDiagnostic was inadvertently exposed by the first primary-input projection before lock. Subsequent projection omits diagnostics; do not claim fully blind review for that case. Its actual static fallback independently fails usefulness.',
 'method':'Whole actual terminal/history/attachments/current public state and code receipts; no keyword scoring or rejection of all fact references. No original drafts for other rejected cases read before this lock.',
 'summary':dict(collections.Counter(r['verdict'] for r in rows)),'cases':rows}
p=root/'PRIMARY_REVIEW.json';assert not p.exists()
p.write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
digest=hashlib.sha256(p.read_bytes()).hexdigest()
(root/'PRIMARY_REVIEW.sha256').write_text(digest+'\n')
(root/'PREFIX_REVIEW.json').write_text(json.dumps({'sourceSha':review['sourceSha'],'reviewedNative':21,
 'technicalReady':False,'recommendation':'STOP','primaryReviewSha256':digest,
 'reason':'Privacy regression found offline; discovery actual fallback and requested gallery missing. Prefix interrupted at completed stateful attempt5; no remaining dispatch.'},indent=2),encoding='utf-8')
print(json.dumps({'reviewedNative':21,'summary':review['summary'],'primarySha256':digest}))
