# Phase B — chọn nội dung tư vấn và giữ phạm vi lời khẳng định

Ngày 2026-10-21. Implementation base: `9f75a9a0a483262aa5e0de6fa3fd6c267a474e3c`.

Trạng thái: **IMPLEMENTED_FOCUSED_CHECKS_PASS_MODEL_NOT_RUN**.

Owner yêu cầu “thực hiện fix đi” sau review ba vòng cùng implementation `950d05b4`. Phạm vi lượt này: sửa owner/verifier prompt tại chỗ, cập nhật hash và hướng dẫn review; chưa chạy generation mới.

## Bằng chứng và giới hạn kết luận

- Ba thư mục `full-b123-20261021-offer-capability`, `...-repeat`, `...-repeat2` trong `apps/worker/evals/single-agent-commerce-read-only/` giữ đủ 96 outcomes và 262 generation requests. Có 4 provider errors, không retry. Raw và primary lịch sử giữ nguyên.
- B1–4 trả đúng giá nhưng cả ba mẫu vẫn thêm giá lẻ không được hỏi. B1–9 dao động giữa trấn an/chỉ dẫn sinh hoạt và đề xuất cách mặc. B1–15 vòng cuối mở lại hai phương án rồi trả lựa chọn cho khách. Đây là lỗi chọn nội dung/lý do tư vấn, dù prompt cũ đã yêu cầu tự nhiên và đưa đề xuất chính.
- B1–23 vòng cuối có lý do upsell dùng được nhưng so sánh “tiết kiệm hơn mua lẻ” không làm rõ comparator trong câu hỏi áo hay cả bộ. Code đã cấp chênh đơn giá; không thiếu bộ tính giá.
- B1–2 vòng cuối tự thêm kết luận điều kiện đủ vào câu trả lời thời hạn/phí. Không suy ra mọi câu policy ngắn phải đọc đủ mọi điều kiện.
- B1–17 vòng cuối bị chặn với `UNSUPPORTED_PROTECTED_ASSERTION`, ref sản phẩm, không có span/explanation. Cả đoạn có thể nói hợp với dịp mặc thay vì fit cơ thể; đây là một khả năng chặn quá tay, chưa biết chính xác câu nào quyết định verdict.
- Review trước chưa nhất quán ở comparator và ranh giới suy luận chất liệu. Nhãn USABLE cũ không chứng minh giọng tự nhiên hoặc bán hàng tốt. Ghi nhận lại trong review mới, không sửa primary cũ hoặc coi agent review là human adjudication.

## Thay đổi đã áp dụng

`prompts/owner.vi.txt`:

- Lý do của đề xuất phải giải quyết băn khoăn qua cách mặc/dùng; khi có so sánh, chỉ rõ điểm làm shop chọn phương án đó. Không bắt mọi câu phải so sánh hay ép áo lẻ/phương án rẻ nhất.
- Giữ một đề xuất chính khi khách nhờ chọn. Lựa chọn phụ cần có đánh đổi thực sự; không mở lại hai hướng rồi bảo khách tự cân nhắc. Mục tiêu là giúp mua hàng, không phải mô tả đủ các cách mua.
- Thông tin bổ sung phải giúp việc đang bàn. Không tự mở bảng giá các cách mua khác khi khách đã chọn rõ, nhưng vẫn trả đủ nhiều câu hỏi và các lựa chọn khách thực sự cần so sánh.
- Khi hoàn cảnh đổi, xét lại đề xuất; có thể giữ món, phối khác hoặc tìm món thay. Không bắt có phép thử cho mọi lợi ích, không dùng mẹo sinh hoạt thay lời khuyên chọn trang phục.
- Upsell gắn với công dụng của phần mua thêm và khoản trả thêm. Khi đổi comparator phải nêu rõ và có giá/thành phần tương ứng từ nguồn. Không gọi việc mua thêm đắt hơn là tiết kiệm tiền.
- Policy trả đúng thời hạn/phí theo phạm vi câu hỏi và hành vi khách đã nói; không tự thêm lời đã xét đủ điều kiện hoặc đã duyệt hồ sơ. Quy tắc và số liệu tiếp tục lấy từ nguồn hiện hành, không hardcode vào prompt.
- Giọng chat ưu tiên ý giúp trả lời/chọn mua/bước tiếp theo; bỏ mô tả không giúp quyết định. Không cấm tính từ, ngoặc, danh sách hay nhắc thông tin hữu ích bằng từ khóa.

`prompts/verifier.vi.txt`:

- Xét cả câu/đoạn để phân biệt phù hợp dịp mặc/phong cách với vừa/chật cơ thể. Chỉ loại sau cần SIZE_FIT đúng món/hồ sơ. Không quyết định fit từ một từ nhiều nghĩa.
- Xác định hai cách mua thực sự đang được so sánh từ câu hỏi và reply trước khi kiểm lời rẻ hơn/tiết kiệm; không tự điền comparator để hợp thức hóa lời khẳng định. Upsell có giá cao hơn vẫn được phép.
- Giữ ranh giới tư vấn chất liệu/thẩm mỹ đã được owner chấp nhận. Verifier không chấm giọng, độ đầy đủ, lựa chọn hay CTA; không biến nhận xét cảm giác thông thường thành công bố kiểm nghiệm. Các dữ kiện cấu tạo/công năng mới, quyền lợi, fit và receipts vẫn cần đúng căn cứ.

Không đổi executable, tool/state/receipt/final gate, model/config, schema/fallback, corpus hoặc prompt thí nghiệm lịch sử. Không thêm model role, router/parser, regex, template, repair loop, gate hoặc framework.

## Review vòng kế tiếp

Giữ actual terminal outcome làm đối tượng chấm. Trước khi đọc rejected draft/verdict diagnostics, đánh giá cả lượt về: khách đã nhận được câu trả lời cần thiết chưa; đề xuất có hợp hoàn cảnh/gu không; lý do có xử lý băn khoăn mua hàng không; giọng có tự nhiên và trọng tâm không. Đọc phần diễn giải, không dùng USABLE tổng hợp để thay cho từng nhận xét này. Không thêm schema, model judge hoặc bộ chấm keyword.

- Khi khách nhờ chọn, nêu một món cùng nhiều lời khen chưa đủ: lý do phải giúp giải quyết băn khoăn. Có hai phương án không tự là lỗi nếu vẫn có đề xuất chính và tradeoff hữu ích.
- Không mặc định mua ít/rẻ là đúng; upsell hợp nhu cầu được chấp nhận. Lời so sánh giá cần rõ đối tượng, kể cả trong câu được verifier PASS.
- Nhận xét chất liệu/cảm giác theo ranh giới hiện hành được phép. Chỉ ghi safety finding khi chỉ ra nghĩa cụ thể vượt ranh giới và nguồn liên quan; chưa đủ căn cứ thì ghi tranh luận/unknown, không mặc định verifier đúng hoặc sai.
- Thiếu POS có chủ đích, provider error, dependent block và code-owned recovery phải được ghi riêng. Không quy tất cả fallback cho prompt hoặc coi code summary là chất lượng văn của model.

Lượt model sau dự kiến dùng sáu ca B1 có sẵn 2/4/9/15/17/23 ×3; giữ mọi sample/lỗi trong denominator, không best-of hoặc retry. Chỉ khi quan sát thấy cải thiện nhất quán mới chạy full 24 B1 +8 stateful; giữ controls multi-offer, inference được phép, policy bị loại trừ, giao dịch có quyền thật và sửa hồ sơ. Đây là cách đọc evidence phát triển hiện có, không phải gate/runtime mới hay mở rộng benchmark. Chưa đăng ký hoặc chạy các lượt đó trong lần sửa này.

## Verification và self-review

Đã thấy protocol từ chối prompt mới khi manifest còn hash cũ: 7 PASS /3 FAIL `PROMPT_HASH`. Đây chỉ là bằng chứng source identity fail-closed, **không phải RED→GREEN chứng minh sửa được nghĩa hoặc giọng**. Sau cập nhật đúng hai hash, focused tests kiểm hợp đồng hiện có; không thêm test khớp câu chữ prompt để giả lập chất lượng model.

Commands thực sự chạy từ repo root:

```text
node --test apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/b1-owner-prompt.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/codex-inference-diagnostics.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce.test.ts
pnpm --filter @lana/worker build
git diff --check
```

Lệnh đầu quan sát mismatch như trên trước cập nhật manifest. Kết quả cuối: Node **101 PASS /0 FAIL /1 SKIP** (installed-login test tùy chọn); Vitest **70 PASS /0 FAIL**; worker build và diff check **PASS**. Build gồm dependency builds; không claim đã chạy riêng typecheck/lint/full worker suite. Provider adapter tests dùng stub, không phải provider generation.

Offline `node --input-type=module -` thay đúng prompt trong captured requests của repeat2 rồi serialize lại để kiểm request bound hiện có: 61 owner requests, max34.105→34.738 bytes/65.536; 28 verifier requests, max22.886→23.576 bytes/32.768. Không gửi request hoặc chạy lại raw; không thay lịch sử. Đây chỉ là headroom trên capture cũ, không chứng minh mọi future context đều vừa bound.

Owner prompt13.538→14.170 bytes (+632, khoảng4,7%), SHA256 `e10fad7aa815038e0bb1d48ac4bc97e4d4913227807b14f40d7f8ee881eddee5`. Verifier12.317→13.007 bytes (+690, khoảng5,6%), SHA256 `0b240599a04d9a86c25ed2b3b815c152e83106c85e61940efde15b020e4c2fde`. Manifest chỉ đổi hai hash. Complexity delta: **0 dòng executable**, thay các đoạn prompt hiện có, thêm tài liệu quyết định/review; không tạo lớp chấm hoặc authority mới.

Self-review: không ép mọi tư vấn phải so sánh; inference chất liệu/thẩm mỹ, upsell và nhận size khách tự chọn vẫn được phép. SIZE_FIT, policy source/inspection, receipts, handoff thật, privacy và final gate giữ hợp đồng. Không thêm dữ liệu benchmark/câu mẫu vào provider prompt; không thay nhãn lịch sử để làm kết quả tốt hơn. Các test trên chứng minh hợp đồng deterministic còn qua, **chưa chứng minh model tuân chỉ dẫn mới hoặc sửa được lỗi lặp lại**. Điều này cần lượt provider mới có đăng ký nguồn/config và review toàn lượt.

Chưa claim provider-quality improvement, stability, A PASS hay B live GO. Checkpoint A vẫn OWNER_BYPASS; chưa generation mới, deploy/live send.
