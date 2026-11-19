# Giới hạn owner 70.000 byte · J4 ×5 và control hai áo ×5

**Hai ca mục tiêu đều đạt 5/5** sau khi tăng giới hạn text request owner từ 65.536 lên 70.000 byte theo yêu cầu owner ngày 18/11/2026. Chạy đủ **10 hội thoại / 30 lượt**, tất cả SEND_ELIGIBLE, 0 handoff và 0 NO_SEND. Chấm mù GPT-6.1 Sol High đánh giá cả 10 hội thoại đạt wholePass, factsPass và voicePass, không ghi nhận material issue. [Hội thoại](CONVERSATIONS.md), [chấm mù](BATCH_JUDGE_RESULTS.json), [tổng hợp](SUMMARY.json).

Source thực thi là `6cb3be513905cf48230cc977b18832ab23bab8a3`, implementation base `505e731956f4fe32038faef778b5a7620eb464c7`. Bản sửa cập nhật hằng số adapter, manifest, quyết định owner và test biên. Verifier text bound và signature bound vẫn là 65.536 byte. Models, prompt, schema và lời khách được đối chiếu với vòng trước. World vẫn là `dfbc11c72f413c1d4052c49cd574886e8ca413589841f44f5f6654687a5e0403`, được chụp lúc 00:32 ngày 18/11 và còn hiệu lực khi chạy. [Đối chứng đầu vào](COMPARISON_INPUTS.json), [source và cấu hình](PROVENANCE.json).

| Ca | Trước · 65.536 byte | Sau · 70.000 byte |
| --- | --- | --- |
| J4 ×5 | 0/5, dừng ở lượt xin hỗ trợ | 5/5. Hỏi màu còn thiếu, lưu yêu cầu hỗ trợ, báo đúng **529.000đ** cho một áo gửi Cần Thơ. |
| Control hai áo ×5 | 0/5, dừng ngay lượt đầu | 5/5. Báo **978.100đ** trước giỏ, thêm đúng hai áo trắng M khi khách chọn màu, xét hỗ trợ một lần và báo đúng **948.100đ** gồm ship. |

Control cả năm lần đều có một receipt ghi yêu cầu pending và một negotiation event khi mở giỏ. Cart hiện hành giữ giảm 5% tương ứng 49.900đ cùng miễn phí ship 30.000đ. Năm frame continuity đã khớp revision và thời điểm biên nhận gốc trong ledger. Lượt cuối tiếp tục dùng tổng 948.100đ, không áp hỗ trợ lặp. J4 giữ pending và không tạo giỏ khi khách chưa chọn màu. [Biên nhận và tổng giỏ](PENDING_RECEIPT_AUDIT.json), [audit](PUBLIC_AUDIT.json).

## Giới hạn request và kế toán

Có **10 request text vượt giới hạn cũ**, nay gửi được. Text frame lớn nhất **67.360 byte**, dưới giới hạn mới 70.000 byte. Đủ 57 owner request giữ bound và signature độc lập. Vòng này không có lỗi BUILD, admission, provider hay timeout. [Đo kích thước từng request](REQUEST_SIZE_AUDIT.json), [bản ghi lỗi rỗng](BUILD_FAILURES.json).

Tổng **87 native generation request** gồm **57 owner + 30 verifier**, cùng **10 judge** là **97 request thực tế**. Cả 30 verifier verdict là PASS và gắn với đúng câu trả lời được ghi Outbox. Không có retry, không thực thi nhánh VERIFIED_QUOTE_REPLY. Sáu job dùng cùng source/world với trần 120 native và 10 judge. Control tiếp tục đăng ký thành năm campaign N1 độc lập để thực thi đủ ×5 trên harness hiện có. Mọi DB test được dọn, 0 tin gửi thật. [Preflight](PREFLIGHT.json), [tool calls và args](TOOL_CALLS.json).

| Phép đo adapter | p50 | p95 | Input token | Output token |
| --- | --- | --- | --- | --- |
| Owner | 5,60 giây | 8,45 giây | 774.531 | 58.436 |
| Verifier | 7,47 giây | 12,07 giây | 324.869 | 3.020 |

Token ở bảng chỉ tính native. Chi phí không được expose. Số request tăng so với vòng bị chặn vì các lượt tiếp tục thực thi đủ bước gọi tool và verifier.

## Giọng tư vấn và giới hạn kết luận

Các câu hỏi màu và câu báo tổng đều ngắn, đúng việc khách hỏi. Một số câu xin hỗ trợ vẫn nói “hệ thống”, “lên giỏ” và diễn giải quy trình. Control có lần hỏi lại có muốn thêm giỏ dù khách đã nói lấy hai áo, hoặc hỏi chốt lặp. Judge chấp nhận các hạn chế giọng nhẹ theo rubric hiện hành. Chưa có bằng chứng vòng này cải thiện riêng giọng tư vấn.

Đây là kết quả hai ca mục tiêu trên cùng world, N=5 mỗi ca. Các ca khác của Phase C chưa được chạy trong vòng này. Trạng thái qualification toàn Phase C giữ STOP chờ đánh giá phần còn lại.

Guard chuyển sang final sau lỗi BUILD chưa được thay đổi. Frame vượt 70.000 byte vẫn có thể gặp chuỗi chặn đã ghi ở vòng trước.

## Kiểm tra thực sự đã chạy

Test biên mới được quan sát RED ở hằng số và manifest cũ, sau sửa GREEN. Xác nhận 69.999 và 70.000 byte được nhận, 70.001 bị chặn trước auth/HTTP. **138 test Node trọng tâm**, worker compile và lint/typecheck đều qua. Bản sửa không thay nguồn shared package.

```powershell
node --test --test-name-pattern 'exact 70000-byte bound|B request bounds' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs
pnpm --filter @lana/worker exec tsc -p tsconfig.json
pnpm --filter @lana/worker lint
git diff --check
```

Run local nằm tại `C:/Users/nguye/Documents/Sản phẩm AI/c3-j4-two-shirts-70000-6cb3be51-20261118-011012`. Dùng lại nguyên WORLD.json của vòng trước, thu initial state mới trên source khóa qua `isolated-integration.mjs ... COD --phase-c-initial-world ...`, chạy `seal.mjs` và `judge.mjs freeze` trước dispatch. Session `c3-j4-two-shirts-70000-session-20261118.py` chạy sáu lệnh `sales-context-screen.mjs native-dispatch` ở tối đa hai process đồng thời. Sau khi tất cả hoàn thành, chạy `audit.mjs`, `judge.mjs prepare/run`, `summarize.py` và `publish.py`.
