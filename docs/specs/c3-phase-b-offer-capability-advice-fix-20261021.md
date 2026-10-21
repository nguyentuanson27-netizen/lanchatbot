# Phase B — đúng lựa chọn bán, khả năng thao tác và lời khuyên mua

Ngày 2026-10-21. Implementation base: `f050868642ce4aa0735f65012078b10130a2696a`.
Owner yêu cầu “sửa đi” sau phương án xử lý bốn finding của full B1/B2/B3 reply-focus. Trạng thái: **IMPLEMENTED_DETERMINISTIC_CHECKED_MODEL_NOT_RUN**.

## Căn cứ và bản sửa

Nguồn hội thoại: `apps/worker/evals/single-agent-commerce-read-only/full-b123-20261021-reply-focus/CONVERSATIONS_AND_REVIEW.md`. Giữ nguyên raw, primary và các kết luận lịch sử.

- **B1–4, hỏi giá cả set nhưng trả bảng giá rồi hỏi lại:** capture gọi `read_product({subjectRef:"SV2447"})` dù lựa chọn bán đã có. Sửa mô tả tool và chỉ dẫn đọc: model chọn `offerType` từ availableOffers/offerLabels khi khách hỏi một lựa chọn đã rõ. Vẫn đọc nhiều offer khi so sánh hoặc chưa biết mã. Code không phân loại lời khách, không tự chọn offer và không giấu các lựa chọn bán khác.
- **B1–9, chỉ cảnh báo mà chưa giúp chọn mua:** thay chỉ dẫn về hoàn cảnh đổi bằng quyết định có nên mua món đang xem cho dịp mới; giữ thì giải thích cách dùng, đổi thì tìm món phù hợp bằng tool. Không ép đổi món do thiếu phép thử, không tự thêm tính năng để thuyết phục.
- **B1–15, khen dài rồi trả lựa chọn cho khách:** thay chỉ dẫn tư vấn bằng lựa chọn của shop và cách giải quyết đúng băn khoăn; phương án thứ hai cần có đánh đổi thực sự. Không thêm câu mẫu benchmark, không ép mua áo lẻ hoặc phương án rẻ nhất; giữ upsell hợp lý.
- **B1–21, mời thêm giỏ trong luồng chỉ đọc:** prompt chung có chỉ dẫn gọi giỏ không kèm điều kiện, mâu thuẫn với danh sách tool thực tế. Sửa tại chỗ để thao tác phụ thuộc khả năng luồng và yêu cầu mua; hỏi giá/tồn kèm size không tự thành yêu cầu thêm giỏ. B2/B3 vẫn thực hiện giao dịch khi được yêu cầu và có quyền.

Capture B1–21 còn 1 lượt tool/4 calls; lỗi đó **không phải do hết ngân sách**. Audit đồng thời thấy projection xóa danh sách capability khi toolsAllowed=false. Sửa projection giữ danh sách đã cấu hình và chuyển tiếp cờ toolsAllowed sẵn có, để phân biệt luồng không có giỏ với lượt sinh không còn được gọi tool. Native tools vẫn rỗng/NONE khi false; runtime vẫn từ chối tool ngoài quyền hoặc vượt ngân sách. Không thêm quyền, gate, state hay lớp điều phối.

## Self-review và giới hạn

- Đã kiểm cả danh sách chỉ đọc và có mutation, toolsAllowed true/false, danh sách rỗng; captured body giữ đúng declarations và 1 upstream request. Comparison không tool vẫn nhận danh sách rỗng; hai owner nhận cùng nội dung trusted.
- Tests hiện có giữ khả năng đọc toàn bộ offer, đọc riêng offer, thiếu nguồn, nhiều giá, chênh đơn giá, state/effect receipts, exact native history và evaluator firewall. Policy, verifier, giá, size-fit, privacy và final gate không sửa.
- Prompt thay 6 dòng hướng dẫn tại chỗ: 12.848 → 13.538 bytes (+690, khoảng 5,4%). SHA256 `644d4535c9a2f73d5ef0203ddd2a6ce5b157a2cc51e62327ea5b14a623d1d361`; manifest cập nhật. Không thêm ví dụ/case ID/quy tắc riêng cho sản phẩm, regex hoặc parser.
- Thay đổi executable chỉ ở adapter eval: mô tả tool và projection execution; không production wiring/shared package change. Không đổi model, corpus, ngưỡng hoặc kết quả cũ.
- Độ tự nhiên, sức thuyết phục và model có chọn đúng offer vẫn là giả thuyết cần đo. Tests deterministic không chứng minh bốn câu đã hết lỗi. Lượt model mới cần gồm bốn ca này và control hỏi nhiều giá, upsell, yêu cầu mua thật, checkout, sửa hồ sơ; chấm toàn lượt theo nhu cầu khách, không khớp từ khóa/câu mẫu.

## Commands thực sự chạy

Từ repo root:

```text
node --test --test-name-pattern='configured capabilities|configured tool capabilities|rollback keeps bounded' apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
```

RED trước implementation: 0 PASS / 3 FAIL (thiếu cờ và mất danh sách capability).

```text
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce.test.ts
pnpm --filter @lana/worker build
git diff --check
```

GREEN: lần lượt 65 PASS, 12 PASS, 70 PASS; build và diff check PASS. Không skip/fail trong các suite này. Build gồm dependency builds; không claim chạy riêng typecheck/lint hoặc full worker suite. Provider trong adapter tests là stub; **0 model generation mới**, chưa đăng ký/chạy vòng provider, không deploy/live send/promotion.
