# Tư vấn có công cụ đọc — 2026-10-15

Owner yêu cầu sửa → review → chạy lại sau khi bác cách chỉ từ chối món chưa đủ thông tin mà không giúp bán hàng. Đây là thử nghiệm B1 send-disabled trên branch B/draft PR391, không phải A2/A3 mới. A lịch sử vẫn OWNER_BYPASS. Start `6897d0a81b3202b65a26229b00bcc6563c736819`; refresh main `296cdcfbf5759f5bf9cbb24acf3dc63005589361` là implementationBaseSha. Không merge/deploy/live send hoặc ghi nguồn, policy, khách/giỏ/đơn thật.

## Thay đổi cần đo

Lượt trước pre-read đúng một sản phẩm/chính sách rồi tắt tools. Sửa hai instruction tư vấn để giao việc chọn/phối/cân nhắc từ thiết kế, tìm món thay khi hữu ích, không tường thuật kiểm chứng thay tư vấn. Không thêm ví dụ đáp án, từ cấm hoặc quy định số câu. Owner prompt 5.739 → 6.335 bytes, hash trong manifest; tăng 596 bytes để làm rõ nhiệm vụ, không xem độ dài là thước đo chất lượng. Verifier/quality scope/policy nguồn/schema/fallback giữ nguyên.

Cho cả hai owner dùng ba native tools B1 đã có: search_products/read_product/read_policy; vẫn cùng một owner tiếp tục sau dữ kiện tool, tối đa 3 generations, 2 rounds/6 calls. Gemini reuse adapter hiện có. Sol dùng thêm projection function-call/output trên cùng relay no-retry; giữ thứ tự output, call_id và reasoning encrypted_content theo Responses contract. CLI chỉ cấp auth, không nhận native call để thực thi. Verifier không có tools. Không thêm role, semantic router/parser, repair/reverify, tool chọn size/state/effect hoặc framework provider. Existing embedding/search/index được reuse, không thêm semantic role.

Code preload như trước để không bắt model đọc lại facts đang có; source text trùng giữa trusted và preload chưa đổi. Initial text/source/history/latest phải giống nhau giữa hai owner. Sau tool calls, context có thể khác theo chính lựa chọn tìm/đọc của từng model; không ép chúng giống nhau hoặc chọn sẵn món thay. Kết quả search là dữ liệu shop hiện có, không bổ sung dữ kiện độ kín/kiểm nghiệm giả để cứu bài.

## Frozen population và request policy

5 LIVE cases giữ nguyên từ cases.b1.json, cùng thứ tự như lượt trước: changed-occasion, current-policy, price, buying-concern, policy-used. Mỗi case **1 lần/model**, Gemini High và GPT-6.1 Sol Low; cả hai dùng verifier GPT-6.1 Sol High. Tổng **10 terminal outcomes**, tối đa **40 generation requests** thay vì 20 do mở native continuation; không bắt dùng hết. Mỗi invocation ≤1 upstream generation, không automatic retry/đổi model sau auth/429/5xx/timeout/malformed. Embedding/source/OAuth accounting riêng, không tính chúng là owner/verifier generation. Không tự chạy thêm khi fail.

Exact configs, prompt/schema/corpus/source-config/tool-schema hashes, bounds và terminal/fallback identity nằm trong manifest.json. Model version là approved provider alias; API phải trả đúng alias, chưa có immutable dated model snapshot. Source input giữ từ nguồn hiện tại theo config/7200s bound, final readback và gate vẫn bắt buộc. RequestId là hash opaque của run-source+slot; source SHA ghi runtime vào registration sau commit/clean worktree, không ghi ngược vào frozen source.

Protocol: history ≤8 messages/4096 bytes, latest ≤2048, draft ≤4096, request ≤32768, tool results ≤8192/round, existing tool args/ref/permission/privacy checks. Không cắt điều kiện policy hoặc source để lách bound. Mọi hard-precheck-surviving final đều phải vào verifier một lần, rồi current final gate. Fallback C3_A_NONPROTECTED_V2: “Phần này em chưa trả lời được, chị nhé.”; FAIL/UNCERTAIN/error không dựng protected partial fallback, không hứa handoff chưa có.

Evaluator-only caseId/sourceMode/evaluator/expected/scoring không vào requests. Native dialogue, latest và trusted/source reads là runtime projection; function calls chỉ chứa schema/call arguments được code xử lý. Captured provider adapter tests kiểm firewall; audit live ghi đúng mức evidence: Sol relay lưu body outbound, Gemini lưu planned projection gắn với adapter được fake-HTTP-capture test, không claim có independent Gemini HTTP echo.

## Review trước run

Observed RED native transport FROZEN_REQUEST → minimum GREEN; native projection/continuation RED → GREEN; native registration/budgets RED → GREEN. Focused/full eval + existing B boundary/state/effects/protected/reply và worker typecheck/build/lint phải green trước seal. Self-review diff kiểm: verifier vẫn final-only; CLI không execute native calls; source chỉ read; old diagnostic mode/tests giữ nguyên; không hidden retry; không tăng budget vượt đăng ký; không sửa lịch sử/PII/secret.

API references đã search và mở trước implementation: [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [reasoning/stateless continuation](https://developers.openai.com/api/docs/guides/reasoning), [Google function calling](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling). Public Responses docs không tự xác minh tính tương thích của credential route Codex; run phải ghi lỗi thực nếu route không hỗ trợ, không substitute/simulate.

## Chấm whole terminal, không chấm keyword

Preserve raw trước khi primary review toàn lịch sử + source + actual terminal customer outcome; đọc rejected draft sau primary để chẩn đoán. Dùng USABLE / NEEDS_EDIT / FALLBACK_OR_NO_SEND như lượt trước. Xem khách nhận lời khuyên/lựa chọn gì, có ích và hợp hoàn cảnh/ngân sách không, phần hỏi trực tiếp đã được giải quyết chưa, giọng có giống người bán nhắn tin và an toàn không. Có thêm công cụ/search hay câu ngắn không tự thành USABLE. Không bắt có món thay nếu nguồn không có căn cứ; ghi rõ thiếu dữ liệu/capability riêng với model bỏ qua cơ hội hoặc nói vòng vo. Từ chối an toàn vẫn có thể chưa đủ hữu ích.

Report full denominator kể cả lỗi/fallback; tool choices/results/source gaps; usable/edit/fallback counts; observed unsafe eligible; p50/p95 owner/verifier/e2e, timeout/error, input/output/thinking tokens, cost khi expose; binding/firewall/request-count evidence. Primary là nhận xét chủ quan của coding agent, chưa là human acceptance hoặc judge model. N=1 không chứng minh ổn định, và đổi prompt+capability không cho phép quy toàn bộ chênh lệch cho riêng prompt/model. STOP owner review sau một batch, không tự mở vòng tiếp.
