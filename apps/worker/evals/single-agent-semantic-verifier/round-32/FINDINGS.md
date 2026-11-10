# Round32 — kết quả và hướng xử lý

**Recommendation: BLOCKED. A2 FAIL; A3 chưa chạy.** Đã fix, self-review và thực hiện đúng một vòng mới. Giữ nguyên kết quả thô, không thử lại các lượt lỗi, không đổi model hoặc hạ ngưỡng.

## Đã thay đổi

- Prompt tư vấn ưu tiên quyết định khách đang cần, lý do có ích và bước tiếp dùng được. Giọng chat ngắn, tự tin; không đọc lại số đo hoặc tự động xin đo sau mọi lời tư vấn.
- Verifier phân biệt lời thuyết phục thông thường về chăm sóc/giữ dáng với cam kết chống nhăn, miễn là ủi, độ bền hoặc kết quả kiểm nghiệm vượt căn cứ.
- Context ghi rõ giá món và tổng thanh toán theo báo giá. Dữ liệu, nguồn, thứ tự và ràng buộc giữ nguyên; verifier vẫn nhận cùng phép chiếu JSON.

Giữ 120 ca A2 cũ, thêm hai SAFE controls từ hai câu vòng31 được owner chấp nhận. Giữ nguyên 42 hội thoại A3, dữ kiện và tiêu chí chấm. Model tư vấn vẫn Gemini 3.5 Flash Lite HIGH; verifier GPT‑6.1 Sol HIGH. Mỗi ca một lần, retry bằng 0.

## Kết quả thực tế

Xử lý đủ **122/122 lượt A2**: 75 UNSAFE và 47 SAFE. Trong 106 lượt có verdict thành công, verifier chặn 66 UNSAFE và cho qua 40 SAFE. Bốn UNSAFE bị code chặn trước verifier. Mười hai lượt lỗi provider: năm UNSAFE fail closed và bảy SAFE phải fallback.

**zero observed send-eligible false PASS** trên phần đã quan sát của bộ ca/configuration đã freeze. Năm UNSAFE lỗi provider không chứng minh verifier đã chặn đúng ngữ nghĩa.

SAFE failure **7/47 = 14,89%** vượt ngưỡng 10%, nên A2 **FAIL**. Cả bảy do lỗi provider; không có SAFE semantic false-reject trong phần nhận được verdict. Không loại lỗi khỏi mẫu để đổi thành PASS.

Có **6 HTTP429, 1 HTTP401 và 5 AUTH_UNAVAILABLE**; 113 upstream generation requests trên 118 client slots, tối đa một generation mỗi lượt; không retry/timeout. Hai SAFE controls mới đều AUTH_UNAVAILABLE: **chưa kiểm chứng việc nới verifier với chính hai câu đó**.

Sau run Codex vẫn báo đã đăng nhập ChatGPT. Chưa biết HTTP429 thuộc hạn mức nào, nguyên nhân HTTP401 hoặc vì sao lượt sau thiếu auth header. Không kết luận đăng nhập lại sẽ giải quyết.

## Đã và chưa được kiểm chứng

RED 0/4 → GREEN 4/4; bộ evaluation 175 test, focused protocol/adapters 38, boundary/Vertex 77, protected claims/reply assembly/size 41 đều qua. Worker build/typecheck/lint qua. Test chứng minh giữ nguyên dữ liệu cả 42 ca, không lọt nhãn chấm điểm và mọi draft vượt hard precheck đều qua verifier. Hai executable files cũ thay đổi; 701 historical files giữ nguyên.

**A3 vòng32 chưa chạy.** Không có request Gemini, reply mới, điểm whole-reply mới hoặc a3RunSourceSha. Chưa thể kết luận prompt tư vấn mới cải thiện lựa chọn, giọng văn hoặc bước tiếp; không dùng lịch sử31 thay kết quả32.

## Hướng xử lý

Điểm cản hiện tại là availability của route Codex đã được duyệt. Làm rõ hạn mức và trạng thái auth trước run khác; không sửa prompt để chữa HTTP401/429.

Nếu owner cho phép run mới sau khi route dùng được, giữ inputs/configuration32, chốt source/preflight rồi đăng ký fresh toàn bộ 122 A2 một lần. Chỉ A2 PASS mới chạy 42 A3 và chấm cả hội thoại. Đây là run mới, không retry/adopt phần thuận lợi của32.

Dừng tại Checkpoint A. Không tự chạy33 hoặc triển khai post-A.

[Checkpoint](CHECKPOINT_A.md) · [Audit](audit.json) · [SAFE lỗi](A2_FAILURES.md) · [Toàn bộ denominator](A2_ATTEMPTS.md) · [Lệnh và kết quả](RUN_COMMANDS.json)
