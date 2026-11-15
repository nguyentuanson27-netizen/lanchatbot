# J4 và control hai áo · sửa dữ liệu báo giá và retry

Code chạy tại `4673fdc401525d9c7e0e33424cdadf5dc8e5dbdb` trên base `d61343b2bcfce46cdb23e9d1153a9130b3e8bd31`. Runtime hash `7f380256064de0c0b316ba47e4830ee101bbf057ed52ebf65defe9f30e987735`. Giữ hai bộ ca và world `83facf100a289302c2a34911c699856895c5ac446a78562671305162480a033c` của vòng đối chứng. Hai preflight chạy trên source sạch. Prompt owner, verifier và cấu hình model được đối chiếu bằng hash. [Preflight](PRICE_AUTHORITY_PREFLIGHT_20261116.json) · [Cấu hình và request audit](PRICE_AUTHORITY_AUDIT_20261116.json)

Giá theo báo giá, khoản hỗ trợ đã cấp và mức giá thấp nhất có ý nghĩa riêng. Code gắn `negotiatedPriceFloor: NOT_ESTABLISHED` vào dữ kiện báo giá và yêu cầu hỗ trợ. Báo giá giỏ giữ từng khoản đã áp dụng, số tiền, rule và decision ID theo đúng cart revision. Fixture hai áo xác nhận còn đủ cả giảm 5% và miễn ship trong dữ liệu sau khi kích hoạt hỗ trợ. Hai model vẫn dùng dữ kiện này trong luồng kiểm tra hiện có.

Adapter Phase C cho phép tối đa một lần thử lại khi lần sinh trả về đầu ra không dùng được hoặc HTTP 429/5xx, theo quyết định 12/11. Lần lỗi và lần thử lại có ID và bộ đếm riêng trong giới hạn ba lần sinh owner mỗi lượt. Test xác nhận 401, lỗi xác thực và request sai shape bị chặn. Request có tool dùng `VALIDATED` để Vertex kiểm schema khi sinh function call và vẫn cho model trả lời bằng văn bản. [Tài liệu Google](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/tools/function-calling)

| Ca | Kết quả thực tế | Chấm cả hội thoại |
| --- | --- | --- |
| J4 · lần 1, 3, 4, 5 | Cả ba lượt đủ điều kiện gửi trong từng lần chạy. Tổng một áo về Cần Thơ là 529.000đ. | 4 PASS |
| J4 · lần 2 | Cả ba lượt đủ điều kiện gửi, tổng vẫn đúng. Lượt 2 chạy RECORD hai lần rồi hỏi màu, bỏ lửng câu khách xin hỗ trợ giá. | FAIL về đủ việc |
| Control hai áo | Lượt 1 báo đúng 978.100đ theo ưu đãi mua hai áo, sau đó hứa tự động xét hỗ trợ thêm ngay khi có giỏ. Verifier chặn chính lời hứa đó. Handoff im lặng, hai lượt sau NO_SEND. | FAIL vì hành trình dừng trước khi ghi giỏ và kích hoạt hỗ trợ |

Chạy đủ **6 hội thoại, 18 lượt**. Có 15 SEND_ELIGIBLE, 1 HANDOFF, 2 NO_SEND. Tất cả 33 owner generation dùng `VALIDATED` và trả HTTP 200 với đầu ra đọc được. Cả 16 verifier generation hoàn thành, 15 PASS và 1 FAIL. Có 6 request chấm mù GPT-6.1 Sol High, tổng 55 generation request. Test DB đã được dọn, bộ chạy ghi 0 tin gửi thật. [Hội thoại](PRICE_AUTHORITY_CONVERSATIONS_20261116.md) · [Kết quả chấm mù](PRICE_AUTHORITY_JUDGE_20261116.json)

J4 cải thiện từ 3/5 lên 4/5, control giảm từ 1/1 xuống 0/1. Không quan sát lại `MALFORMED_FUNCTION_CALL` hoặc câu khẳng định “giá niêm yết tốt nhất” trong lượt này. Do không tái diễn lỗi transport, đường retry chỉ được thực thi trong kiểm tra hồi quy. Control dừng ở lượt 1 nên việc trình bày các khoản đã cấp và tính liên tục của biên nhận chưa được tái kiểm trong hội thoại thật của vòng này. Chấm mù đánh giá nội dung khách thực tế nhận, nên draft control bị chặn không được tính là claim đã lọt. **Phase C giữ STOP.**

Các test hồi quy mới ban đầu thất bại với guard retry cũ, mode cũ và dữ kiện báo giá còn thiếu. Sau khi sửa, 342 test runtime, 124 test Node, 18 test protected claim boundary và 22 test claim/reply assembly qua. Worker build, kiểm kiểu và lint qua.

```powershell
pnpm --filter @lana/worker exec vitest run --reporter=dot src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/candidate-provider.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-read-only/preparation-admission.test.mjs
node --test --test-reporter=dot apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
pnpm --filter @lana/worker exec vitest run src/track-b-protected-claim-boundary.test.ts --reporter=dot
pnpm exec vitest run packages/business-tools/src/protected-claims.test.ts packages/business-tools/src/reply-assembler.test.ts --reporter=dot
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```
