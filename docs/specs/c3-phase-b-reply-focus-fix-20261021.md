# Phase B — sửa lựa chọn, giọng tư vấn và so sánh giá

Ngày: 2026-10-21. Base: `5a6430c7fef6752b77fc491a7d5db2c7980158ab`.
Owner yêu cầu thực hiện phương án sửa sau review full B1/B2/B3. Đây là bản sửa đã kiểm tra deterministic, chưa có kết quả model mới.

## Căn cứ và thay đổi

Nguồn: `apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-additive/FAILURES_AND_REVIEW.md` và `FAILURE_DIAGNOSIS.json`. Giữ nguyên mọi nhãn và bằng chứng của lượt cũ.

| Finding | Thay đổi | Giới hạn |
| --- | --- | --- |
| B1–4 mở bảng giá lẻ và hỏi lại phạm vi | Thay hướng dẫn mở đầu: trả đúng món/phần khách hỏi; thêm lựa chọn khi giải quyết băn khoăn | Không cấm bảng giá khi khách thực sự hỏi nhiều lựa chọn |
| B1–9 bảo đảm không bí khi ở ngoài trời lâu | Phân biệt nhận xét chất liệu với bảo đảm cảm giác sử dụng; giải quyết bằng cách mặc hoặc món phù hợp từ nguồn | Giữ quyền suy luận thẩm mỹ/chất liệu đã được owner chấp nhận, không yêu cầu phép thử cho mọi lợi ích |
| B1–15 dài và khen chung | Hướng dẫn xử lý băn khoăn về cách mặc bằng cách phối cụ thể; bỏ chuỗi lời khen thay lý do | Không ép chọn áo lẻ, đổi món hoặc một đáp án cố định |
| B1–21 mời lên đơn ngoài khả năng B1 | Dùng `execution.availableTools` hiện có; khách yêu cầu thì gọi tool phù hợp, không có khả năng thì không hứa xử lý tiếp | Không thêm classifier/capability layer; B2/B3 vẫn thực hiện giỏ/checkout theo quyền hiện hành |
| Stateful–4 báo cáo sửa hồ sơ | Xác nhận kết quả khách cần; sửa thông tin nền không đổi lựa chọn thì đáp nhận lời ngắn | Không đổi state/receipt; vẫn được nhắc số đo có ích cho quyết định |
| B1–17 bộ 799k “tiết kiệm hơn” áo 499k | Code bổ sung `priceDifferences` trong native read_product response cho owner; prompt phân biệt trả thêm với đáng mua hơn | Đây là số học hỗ trợ model, không bảo đảm model sẽ dùng đúng; verifier/final gate vẫn kiểm reply |
| B1–5 verifier stream error | Kiểm tra parser và chạy test stream lỗi/hoàn tất/accounting sẵn có | `PROVIDER_STREAM_ERROR` xuất phát từ event `error`, không phải semantic FAIL. Chưa xác định nguyên nhân sâu ở provider; không sửa adapter hoặc retry để che lỗi |

## Phân công code và model

`gemini-inference.mjs` tính chênh lệch giữa hai lựa chọn bán của cùng sản phẩm: mỗi bên một đơn vị, chưa gồm ship và ưu đãi. Mỗi bên giữ offerType, variantId và đơn giá; giá trị dương là trả thêm khi chuyển từ `from` sang `to`. Chỉ dùng PRICE VND hợp lệ trong readback, cùng scope và giá trị với protectedClaims hiện tại. Không tính khi thiếu, xung đột hoặc khác scope; không làm mất dữ kiện gốc khi không tính được.

Không suy ra bộ hàng gồm những phần nào từ tên SET, không cộng áo/váy thành một bộ khi chưa có căn cứ thành phần. Không tạo cartQuote, quyền lợi, receipt hoặc lời khuyên mua bằng phép trừ. Dùng boundary freshness/binding/final gate hiện có; không thêm gate hoặc durable state.

Prompt sửa từ baseline đang active sau khi lượt additive kết thúc và đã restore. Thay các chỉ dẫn cũ tại chỗ, không nối ví dụ benchmark hoặc chỉnh lại các file prompt thí nghiệm lịch sử. Policy, size, state, checkout và nguồn dữ liệu giữ hợp đồng hiện hành. Owner prompt: 12.135 → 12.848 bytes (+713, khoảng 5,9%); phần tăng gồm diễn giải trường so sánh mới và ranh giới lời khuyên. Chưa có bằng chứng provider về chất lượng sau sửa.

## Verification thực sự chạy

- RED: `node --test --test-name-pattern='owner receives scoped|owner price differences' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs` — 1 PASS / 1 FAIL trước implementation, thiếu priceDifferences như dự kiến.
- Trong quá trình sửa: phát hiện assertion clone AbortSignal không phù hợp và manifest prompt hash chưa cập nhật; sửa assertion chỉ kiểm dữ liệu đầu vào và cập nhật hash chính xác. Không bỏ test.
- GREEN cuối: `node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs` — 88 PASS / 0 FAIL / 1 optional installed-login test SKIP. Upstream trong adapter tests là stub, không phải provider generation.
- `pnpm --filter @lana/worker build` — PASS, gồm dependency builds. Không claim separate lint/typecheck/full worker suite đã chạy.
- One-off `node --input-type=module -` offline reconstruction từ PUBLIC_CONTEXT_CAPTURE và OWNER_REQUEST của raw B1 trước: 50 request dựng được, 10 request có 28 cặp chênh lệch, max 25.180 bytes; có đúng cặp 499k/799k chênh 300k. Không gọi provider. Đây là dựng lại từ wire đã project, không phải fresh runtime/provider test. Thử gộp stateful dừng vì log đó không có cùng PUBLIC_CONTEXT_CAPTURE; không tính stateful vào kết quả replay.
- `git diff --check` — PASS. Self-review: context mới chỉ bổ sung số học cho owner; không đổi verifier, quyền tool, facts/receipt/state, native model signatures hay dữ liệu evaluator. Test captured request giữ firewall và quyền tool.

## Cần kiểm chứng ở lượt model tiếp theo

Chạy các ca B1–4/9/15/17/21 và stateful–4, kèm ca đối chứng hỏi nhiều giá, upsell hợp lý, lời khuyên chất liệu được chấp nhận và checkout có quyền thật. B1–5 kiểm chứng riêng lỗi vận hành. Chấm toàn bộ câu trả lời theo nhu cầu mua của khách; không kiểm keyword, số tính từ hay khớp câu mẫu. Không coi test deterministic là bằng chứng giọng tự nhiên hoặc các ca đã hết lỗi.

Không có provider generation, chạy lại full B, deploy, live send hoặc promotion trong lượt sửa này. Chưa khẳng định chất lượng tốt hơn; cần đăng ký run mới trước khi đo model. Complexity delta: 19 dòng executable owner projection, 2 test mới và bổ sung assertion capture; không thêm model role, parser, regex, tool, framework, repair loop hoặc nguồn dữ liệu.
