# Phase B — opening quote model run 2026-10-24

**Đã thu đủ 5/5 outcomes; chưa đạt mục tiêu mở đầu báo giá. B chưa GO.** Không thêm vòng hoặc tự retry.

Run source `598226ed5bed513c2908222d08d20c721c971585`, clean lúc seal/preflight/start; raw evidence commit `37d595ac`. Owner Vertex `gemini-3.8-flash` HIGH/global, maxOutputTokens8192, timeout90000ms; verifier `gpt-6.1-sol` HIGH / Codex login relay, timeout90000ms. Config, prompt/schema/corpus hashes và retry0 giữ trong [registration](registration.json). Không đổi model/prompt/corpus trong run.

## Kết quả thực tế

| Ca | Terminal | Kết quả khách nhận |
|---|---|---|
| opening-ad | SEND_ELIGIBLE | Hỏi lại mẫu dù ads đã có mã; chưa báo giá |
| opening-ad-repeat | FALLBACK | Request bound trước dispatch; fallback tĩnh |
| opening-organic | SEND_ELIGIBLE | Giá đúng và 2 ảnh; dài, liệt kê thêm món lẻ và hỏi lại lựa chọn |
| opening-unresolved | SEND_ELIGIBLE | Hỏi ảnh/tên mẫu đúng lúc; chưa đoán giá |
| opening-multipart | FALLBACK | Owner timeout; recovery text + 2 ảnh; chưa trả hai câu hỏi |

SEND_ELIGIBLE3/5 chỉ là send eligibility, không đồng nghĩa ba ca chất lượng PASS. Fallback2/5=40%; handoff0/no-send0. Không thấy protected-language sai rõ trong ba actual final texts được verifier cho qua; đây là review trên năm lượt, không phải qualification an toàn rộng hơn. Đọc đủ exact terminal và nhận xét trong [CONVERSATIONS](CONVERSATIONS.md).

## Finding và hướng tiếp theo

1. **Contract bind sản phẩm ads chưa nối kín qua adapter thật.** Ingress `lookup` gọi readProduct(id,false) từ mã ads, nhưng createCommerceReadSources chỉ đọc mã có trong `known` (seed/search). Ca ads seed=[] bị UNBOUND_PRODUCT, bị ingress catch thành unresolved. Captured owner request xác nhận subjects=[] và currentProductId=null; không thể quy cho owner quên mã nó chưa được cấp. Cần nối exact-code lookup có xác minh vào binding trước read, giữ scope/bounds và không dùng ads làm truth. Test phải compose ingress với adapter thật; mock catalog unrestricted trước đây bỏ sót lỗi này.
2. **Request growth sau search.** Lượt hỏi lại có OWNER_REQUEST_BOUND80.634>65.536 bytes sau một search. Zero provider dispatch tại generation bị chặn, không phải model/provider hoặc verifier từ chối. Cần phân tích projection và native content theo byte: giữ facts cần dùng, loại metadata/nguồn trùng; không cắt mù lịch sử hoặc tăng bound để che lỗi. Chưa làm thay đổi trong run.
3. **OpeningQuote chưa thực sự được sử dụng trong ca organic.** Model đọc offerType=null nên nhận nhiều lựa chọn, không có openingQuote. Lời hỏi “set ... bao nhiêu” lại biến thành menu cả bộ/món lẻ và hỏi lại khách. Cần xem cách cấp phần bán đang hỏi và công cụ đọc nó; trước khi thêm chỉ dẫn prompt phải kiểm yêu cầu chọn offer đối với registry thật. Dữ liệu giá và ảnh đã đi được nhưng chưa chứng minh mẫu mở đầu được model dùng.
4. **Owner timeout multipart.** Request48.368 bytes; generation90026.7ms timeout, không HTTPstatus/modelVersion/token usage cho lần timeout. Không có evidence429/quota. Recovery ảnh hữu ích hơn fallback trống nhưng thiếu giá và câu trả lời bán áo riêng. Giữ bằng chứng; chưa đủ để quy timeout cho một nguyên nhân cụ thể.

## Accounting và vận hành

10 owner invocations gồm 1 bị chặn trước dispatch; **9 owner +3 verifier =12 actual generation requests**, 11HTTP200 +1timeout; retry0. Counter `providerGenerations=13` là invocation count, không được gọi là13HTTPrequests. Ngoài ra2embedding requests, ghi riêng trong providerCounts. Timeout rate1/12 generation requests; request-bound failure1/5 outcomes. Verifier3/3PASS, error/timeout0; latency p50=4.812s,p95 nearest-rank=5.933s (n=3, không suy rộng). Captured generation input70023/output16578 tokens trên những lần có usage; timeout usage/cost chưa expose. Output usage giữ đúng telemetry adapter, không tự suy chi phí. [Metrics](METRICS.json).

Firewall kiểm12 request wires thực có capture (9owner +3verifier): không evaluator-only key leak; wrapper caseId chỉ để accounting, không nằm trong value gửi model. Owner bound failure không tạo request wire. Hash raw files khớp [RAW_HASHES](RAW_HASHES.json); source tracked diff rỗng và HEAD giữ nguyên sau dispatch. [Firewall](LABEL_FIREWALL_AUDIT.json).

**Giới hạn run integrity:** preflight PASS0generation, dispatch exit1 sau khi đã thu5/5. Người chạy đặt output dưới thư mục eval source, khiến final statefulPreflight nhìn chính7evidence files chưa tracked và báo DIRTY_EXECUTABLE_OR_CONFIG. Không có tracked executable/config thay đổi; không sửa verdict/attempt để bỏ lỗi. Run không đạt canonical final readiness; evidence chỉ dùng chẩn đoán, không được công bố qualified PASS. Lần sau output phải ở ngoài source tree, chỉ archive vào repo sau khi runner hoàn tất. Không rerun để thay thế run này.

Database test riêng đã dropped; live policy reads chỉ đọc, delivery transport capture, sendEnabled=false. Không live send/deploy. Exact commands/exit codes trong [COMMANDS](COMMANDS.json); không chạy thêm unit/build/CI trong lượt provider này (checks của implementation ở commit598226ed vẫn là evidence riêng). Recommendation **STOP để sửa contract nguồn/offer trước run mới**; B chưa GO.
