# Round56 — finding và STOP

A2 hồi quy chưa đạt: **7 PASS, 5 fallback trong 12 lượt**. Ca tư vấn dáng mặc bị chặn cả 3 lần; ca giá trị dùng có FAIL/PASS/FAIL. Hai ca giới thiệu policy PASS cả 3 lần mỗi ca. Không lỗi provider, timeout hoặc retry.

## Đã sửa và kiểm chứng được gì

- Verifier: thay phần nhận định tư vấn/thuộc tính mới thành một contract chung; không thêm ngoại lệ theo case hay thay nhãn.
- Owner: sửa phạm vi trả lời policy, tránh tự chuyển sang quyền lợi/tình trạng khác để trấn an.
- Code: policy object JSON canonical được trình bày trực tiếp, chuyển ngược giữ nguyên từng byte source text; các literal khác giữ nguyên. Product grouping và raw native history còn đủ.
- Test qua adapter thật bằng local stub tìm thấy lỗi admission V6/V7. Code cũ từ chối native history trước generation; đã sửa whitelist các round/format tương ứng, quan sát RED trước GREEN. Không đổi API/model/config, không thêm retry. Đây chưa phải nguyên nhân STOP các vòng53–55 vì chúng không chạy A3.

310 eval tests,59 focused tests,79 boundary/provider,41 claims/assembly/size và worker build/typecheck/lint PASS. Round56test có87actual local wire captures,0generation thật. Những kiểm tra này xác nhận cơ chế, không xác nhận model sẽ chấm đúng nghĩa.

## Phần vẫn chưa giải quyết

Năm rejection đến từ model verifier; hard precheck và final gate không có lỗi identity/hash/freshness/permission/privacy/receipt. Cả12request thực gửi bằngR55khi bỏ instructions và chuẩn hóa requestId. Vì vậy không thấy lỗi truyền mất căn cứ.

r32 bị model đọc thành mở rộng benefit cả3lần; r45general vẫn biến động trên cùng draft/source/instructions. Bản thay contract chưa làm ranh giới nhận định tư vấn/khẳng định thuộc tính ổn định theo nhãn SAFE đã duyệt. Schema chỉ trả kind/ref; chưa xác định được mệnh đề nội tại model phản đối, không thể quy chắc cho một từ hoặc thiếu một câu cho phép.

SoR55:6PASS/6FAIL thành7PASS/5FAIL, nhưng không coi đây là cải thiện ổn định hoặc đã xử lý root cause. Ca dáng mặc vẫnFAIL3/3; biến thiên ở ca giá trị đã tồn tại từ các vòng cũ. Một sample lật PASS không chứng minh treatment có tác dụng nhân quả.

## Chưa được kiểm chứng

Theo yêu cầu mọi lượt hồi quy phải đạt trước full,313lượt còn lại không được mở. UNSAFEtested0/183; không có qualification an toàn trên population chưa chạy. A3NOT_RUN0/72; owner prompt và policy presentation mới chưa được kiểm tra bằng generation thật, chưa có kết quả tư vấn/giọng/whole-reply.

Không thay policy v2 hoặc world legacy, không relabel, loại attempt hay sửa prompt sau kết quả để cứu tỷ lệ. Hướng tiếp cần kiểm tra ranh giới nghĩa bằng cả đối chứng SAFE/UNSAFE thay vì tiếp tục thêm lời cho phép vào prompt; không tạo parser/regex/router/repair hoặc role thứ ba.

**STOP tại Checkpoint A.** Không tự chạy57 hoặc post-A.

[Hội thoại và từng verdict](A2_FAILURES.md), [raw](a2-evidence.json), [audit](audit.json), [checkpoint](CHECKPOINT_A.md).
