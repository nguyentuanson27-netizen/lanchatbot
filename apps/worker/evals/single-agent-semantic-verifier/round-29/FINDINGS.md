# Vòng 29 — provider chặn A2; chưa kiểm chứng prompt tư vấn mới

**A2 frozen result: FAIL. Recommendation: BLOCKED về vận hành. Batch dừng sau ba vòng.** Verifier trả 101 lỗi HTTP 429 trên 116 request. Toàn bộ 120 ca vẫn nằm trong denominator: 75 UNSAFE/45 SAFE, 4 hard block, 15 verdict hợp lệ đều chặn UNSAFE, 101 lỗi gồm 56 UNSAFE/45 SAFE. Tất cả 45 SAFE nhận fallback, nên usability failure=100%, vượt ngưỡng 10%.

Số unsafe send-eligible false PASS quan sát bằng 0 không tạo qualification: phần lớn ca không có semantic verdict. Kết quả terminal là 118 fallback/2 handoff, không có send-eligible hay live send. Mỗi registered attempt chỉ một request, retry=0; không đổi model/credential route hoặc gọi lại các ca lỗi.

Raw errorStage=GENERATION_HTTP, httpStatus=429, error=UPSTREAM_HTTP xác nhận provider từ chối request. Không có retry-after, request ID hoặc thông tin đủ để xác định quota, tần suất/concurrency hay thời điểm hồi phục. Kiểm tra code, firewall, binding và final gate đạt; các kiểm tra đó không chứng minh provider luôn khả dụng.

Do A2 FAIL, không chạy A3. Prompt owner29 đã sửa phạm vi tư vấn, giọng chat, quan hệ đặc điểm–lợi ích và bước tiếp dùng được; chưa có output Gemini để đánh giá hiệu quả. Không có a3RunSourceSha, generation, lịch sử mới hoặc điểm chất lượng cho vòng này. Verifier, corpus và config giữ nguyên vòng28. Không thể quy lỗi provider cho prompt, hoặc nói sửa owner đã cải thiện/kém đi.

Hai vòng có A3 đạt 33/42 rồi 29/42. Verifier28 giảm SAFE reject từ 3 xuống 0 trong A2, nhưng chất lượng tư vấn chưa cải thiện tương ứng. Các lỗi còn quan sát gồm giọng catalogue/lặp hồ sơ, nối sai lý do, phương án thay yếu, hỏi tên size thay đầu vào code cần và hứa checkout ngoài khả năng. Calibration verifier không giải quyết toàn bộ trách nhiệm owner này. Review xét toàn hội thoại và tin khách thực nhận trước các điểm chẩn đoán, không chấm bằng từ khóa.

Cơ chế code authority, mandatory verifier và fail-closed có bằng chứng chạy; chưa có vòng đạt cả safety/usability/whole-reply quality. Không kết luận model hoặc kiến trúc bất khả thi, cũng không coi thêm quy tắc prompt trên corpus đã biết là chứng minh ổn định. Đây là thử nghiệm continuations tổng hợp, một mẫu/configuration, primary review không blind; chưa chứng minh dữ liệu shop thật, stateful journey, conversion hoặc human/independent/owner acceptance.

[Toàn bộ denominator A2](A2_ATTEMPTS.md), [raw requests/errors](a2-evidence.json), [checkpoint](CHECKPOINT_A.md), [findings và đánh giá ba vòng](../CHECKPOINT_A_ROUNDS_27_29.md).

STOP sau ba vòng: không vòng thứ tư, post-A, mutation/promotion, production wiring, merge/deploy hoặc live send.
