# Phase C — quote batch model run, 08/11/2026

**R1 đã chạy đủ 4 ca/7 lượt: integrity PASS, tác vụ FAIL 1 ca. STOP theo gate đã khóa; 30 ca/48 lượt còn lại NOT_RUN.** Đã khóa bộ 34/55 trước provider, không loại attempt khỏi denominator, không chạy lại generation và không đổi ngưỡng sau kết quả.

Source `06b3901b8986233766d181534c0805691729f98a`, world `9b6d8b1e69965b719c476395f70b600e0cffe4cd359eefd4ea790dbcb395c41a`. Owner **Vertex Gemini 3.5 Flash Lite HIGH**, verifier **GPT-6.1 Sol HIGH** qua Codex CLI0.159.2; exact versions/config/prompt/schema/corpus hashes tại [provenance](PROVENANCE.json). [Bảy lượt nguyên văn](CONVERSATIONS.md).

## Kết quả thực tế

| Phần | Kết quả |
|---|---|
| Ca/lượt thực thi | 4/7, cả 4 ca EXECUTED |
| Customer terminal | 7 SEND_ELIGIBLE, 0 handoff, 0 no-send; 7 text + 4 ảnh đã capture/Outbox |
| Provider | 23 generation/23 HTTP: 16 owner + 7 verifier, tất cả OK; generation retry0; OAuth1 tính riêng |
| Provider timeout/error | 0/23; không có request-bound trong R1 |
| Verifier | 7 PASS; không phải điểm hoàn thành tác vụ/chất lượng |
| Verifier provider latency | p50 8,935ms; p95 11,871ms, n=7 |
| Verification window trong runtime | p50 11,439ms; p95 14,431ms, n=7; có overhead quanh verifier/readback |
| Token quan sát | 231,654 input / 16,979 output; usage đủ 23/23; cost không expose |
| Cleanup | DB test đã xóa; source sạch trong run; source-shop writes0/live send0 |

[Accounting](ACCOUNTING.json), [audit độc lập](INDEPENDENT_AUDIT.json), [gate](GATE.json). Audit kiểm 23 request hashes, firewall evaluator labels, runtime/history bindings; 7 native hashes, exact draft/snapshot bindings, final gate tại recorded time, accepted Outbox và cleanup. Không có third online role/parser/router/regex mới, không retry/repair/reverify, không production wiring hay deploy.

## Ca chưa đạt và nguyên nhân

**j1, lượt 3:** khách hỏi “Em báo lại tổng cả phí ship cho chị nhé.” Sau hai lượt đã có số lượng hai áo, một M và một L, bot vẫn trả:

> Dạ, áo lẻ Set Thạch Thảo có hai màu Trắng và Be. Chị chọn màu nào cho size M và size L để em tính tổng tiền và phí ship chính xác cho mình nhé ạ?

Owner gọi `add_to_cart(M,null)` + `add_to_cart(L,null)` + `quote_cart`, rồi hỏi màu tiếp. Code từ chối đúng khi chưa đủ biến thể, không ghi giỏ; nhưng đó không phải đường cần cho yêu cầu hỏi tổng. `quote_product` đã được khai báo trong cả hai owner requests; hai màu cùng giá499000. Thiếu màu cần hỏi trước khi hoàn tất lựa chọn, không phải điều kiện để báo tổng trước giỏ ở đây.

Lỗi nằm ở **owner chọn chuỗi thao tác và tạo phụ thuộc giỏ không cần thiết**. Không phải thiếu context/nguồn giá, tool không được nối, verifier chặn quá tay, provider hay cap. Verifier cho qua các khẳng định có căn cứ; nó không chấm việc đã trả lời đúng điều khách đang hỏi. Căn cứ FAIL là câu hỏi T3 và requiredCustomerOutcomes đã khóa (“tổng gồm phí từ policy/source”), không phải thay rubric sau kết quả.

## Phần đã qua và giới hạn

- p06: dùng quote_product, đúng COMPOSITE989000/ba món và ảnh; không còn false-order block trong lần này.
- p07: áo/quần đều theo kết quả M của code, không tự thêm L. Vẫn nhắc lại chiều cao/cân nặng, và cần hai vòng tool sau lỗi arguments ban đầu; đã dùng hết sáu primitive. Phần giọng nhỏ được hoãn theo policy, không đổi thành FAIL sau run.
- p08: mua set có receipt hợp lệ; đổi sang áo riêng hỏi màu khi khách chưa chọn, không tự hoàn thành biến thể. Còn gọi lại đường đổi giỏ khi thiếu màu trước khi hỏi; task gate chấp nhận clarification, không xem đây là bằng chứng lập tool tối ưu.
- j1 hai lượt đầu giữ M/L và hỏi màu hợp lý; riêng T3 không báo tổng nên ca FAIL. Không đánh trượt mọi câu hỏi màu.

So với R1 ngay trước (6 SEND/1 HANDOFF, FAIL p07), lần này 7 SEND/0 HANDOFF nhưng chuyển lỗi sang j1T3; cả hai vẫn một ca FAIL. Đây là N1 với snapshot mới, không quy được cải thiện/thoái lui cho từng thay đổi. Chưa chứng minh ổn định. Quote+media batch thật đã qua PG acceptance; model R1 dùng quote đơn ở p06, **chưa đo model trên các ca mixed batch/p04 continuation/s02/p09** vì R2/remainder bị gate chặn. Không chấm mù toàn bộ chất lượng, chưa C3 parity/comparison, không Phase C GO.

## Acceptance kỹ thuật và lệnh thực chạy

Kết nối PostgreSQL đã hoạt động lại. Test mới trước đó chưa được chạy thật có hai lỗi harness: đọc lazy sales state trước khi tạo, và kỳ vọng4 thay vì5 primitive khi bật opening-media rule. Chỉ sửa test: tạo state bằng factory hiện hành; kiểm riêng opening1/quote2 và tổng5; giữ nguyên no-cart/commands/order/verifier/once-only delivery. Không đổi runtime/prompt/config trong bước chuẩn bị 08/11.

- `node --check apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs`: PASS.
- `git diff --check`: PASS.
- `node --test apps/worker/evals/single-agent-commerce-read-only/quote-task.test.mjs apps/worker/evals/single-agent-commerce-read-only/task-path-repair.test.mjs`: **16 PASS**.
- Real PG exact clean source06b3901b `--check-prefix "C quote batch V2"`: **1/1 PASS**, DB dropped/provider0. [Result](PG_ACCEPTANCE.json), [independent approval](PG_REVIEW.json). Đây hoàn tất mục PG từng BLOCKED ngày07/11.
- Fresh capture02: **107 products**, nguồn chỉ đọc; initial native state PG **1/1 PASS/droptrue/provider0**; all4 frozen input approvals và actual-time preflights PASS; launch R1 exit0; accounting + independent audit integrity PASS/task FAIL.

Exact commands và các lần setup thất bại đã giữ tại [provenance](PROVENANCE.json). Capture01 dùng nhầm danh sách chứa mã test SM613 không có trong catalog thật, fail trước generation; capture02 dùng danh sách9 mã nguồn thực của các lần trước. Không substitute dữ liệu/model hoặc gia hạn timestamp. Build/typecheck/lint và commerce944/Node870 là evidence sửa07/11, **không chạy lại/không nhận PASS mới ở lượt test-harness/report này**.

## Kết luận

**STOP tại gate R1.** Giữ nguyên 23 request và cả bảy outcome; không tự sửa prompt rồi chạy vòng khác. Hướng cần đánh giá tiếp là owner sử dụng đường báo giá không phụ thuộc giỏ và tránh gọi mutation khi chỉ đang hỏi tổng; không cần nới verifier hoặc bổ sung regex. Chưa kết luận mixed quote batch/continuation đã cải thiện trên model vì các ca tương ứng chưa chạy.
