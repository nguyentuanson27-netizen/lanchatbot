# Self-review trước provider

Sửa owning limitation: previous diagnostic khóa tools nên không cho owner tự tìm hàng khác. Reuse native B1 loop thay vì thêm prompt ví dụ hoặc semantic decision in code. Hai model nhận cùng initial source/history/latest; không có code chọn câu trả lời hay món thay theo caseId.

- Sol dùng cùng no-retry relay, một upstream mỗi generation. Native mode chỉ cho conversation và ba read tool đã có; verifier vẫn contract tools0. CLI không nhận function-call output để thực thi, chỉ đưa kết quả về code-owned loop. Không mở shell/web/MCP/effect capability cho CLI/model.
- Preserve thứ tự native reasoning/call/output và call_id qua continuation; giữ encrypted reasoning theo API contract, không lấy hidden reasoning làm ownership/quality surface. Exact final text tiếp tục hard precheck → verifier → readback/final gate. Intermediate prose/tool plans không là tin gửi khách.
- Không generation retry/repair hoặc đổi model sau lỗi. Existing loop vẫn3generations/2rounds/6calls; registration khai max40/10outcomes rõ ràng. Legacy diagnostic giữ max1owner và tools0; no-retry/provider/schema/boundary regression tests vẫn chạy.
- Policy/current facts/orderEligibility/null, size/quote/receipts/privacy vẫn từ source/code. Không hardcode số ngày/phí/điều kiện hoặc thêm căn cứ vật lý vào fixtures. Không thay nguồn/source config/claim authority/production entrypoint; sources read-only qua đường đã được owner dùng trước đó.
- Owner thêm596bytes, hai bullet thay thế, không thêm few-shot hoặc danh sách câu phải/cấm. Giữ tự tin chọn/phối/suy luận tư vấn; không tự nhận thiếu dữ liệu là lỗi món hoặc gọi màu/chất liệu của món thay là bằng chứng giải quyết độ kín.
- Không thể kết luận trước rằng search sẽ tìm được món có thông tin đủ. Run phải phân biệt source coverage/retrieval/capability với lỗi owner dùng dữ kiện hoặc giọng hành chính. Mở tools không tự cải thiện lời văn và không tự biến thiếu thông tin thành bảo đảm.
- Primary review toàn terminal + lịch sử/source trước rejected drafts, không dựa số từ/keyphrase/two-sentence form. N1 là diagnostic; không human acceptance, stability/causality claim hoặc full B1/A2/A3 PASS.

Complexity delta: chỉ eval runner/relay/test và prompt/hash, reuse existing source readers/index/tool loop/verifier/gate. Thêm một native comparison mode và provider wire projection cho ba tools đã có; không production abstraction, durable state, semantic role, quality gate hoặc parser ngôn ngữ. Các schema Sol là projection scalar của cùng ba B1 declarations; code vẫn kiểm args/refs/permissions. Chưa dedup context, chưa thử riêng tác động prompt versus tools, không sửa lịch sử.

RED evidence và focused GREEN đã có; readiness/preflight kết quả thực ghi trong PREPARATION.json trước run. Public Responses docs không chứng minh Codex backend hỗ trợ mọi field; runtime phải fail closed/retain error nếu không tương thích. Không báo model chạy thành công chỉ từ fake transport tests.
