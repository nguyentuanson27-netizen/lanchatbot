# Phase B — model run sau sửa handoff thiếu dữ liệu, 25/10/2026

**Đủ21 native +17 controls, N1/retry0. B chưa GO; không chạy thêm vòng.** Owner Gemini3.5FlashLite HIGH, verifier GPT6.1Sol HIGH, giữ cấu hình hiện hành. [Toàn bộ21 hội thoại và nhận xét từng ca](CONVERSATIONS.md), [actual outcomes](ACTUAL_TERMINALS.json), [metrics](REVIEW_METRICS.json).

## Source và phạm vi

Implementation `2fa14323dd2edbaae429e5c737319949700027fa`; run source `2c4de47c5340c2b715d5b80a8787e0e89520e05b` chỉ thêm preregistration/driver. Source sạch trước/suốt dispatch, HEAD không đổi; [registration](REGISTRATION.json) giữ model/config/prompt/schema/corpus hashes, [driver](DISPATCH_DRIVER.py) được commit trước provider. Không viết run SHA ngược vào frozen source. Owner prompt hash `1ed3689ef904887fc87b27f272252d1de16f8ce883c7cfebc409f99ab2125817`; verifier hash `8204c6ce38b7bf18dbee8f7fe63735a1e5ea351a4d8c57b6276607476faf1f9c`.

Preregister21 persisted slots:5 opening quotes,4 media,4 journey openings,8 stateful gồm các tiền đề thật và1 private code turn. Tổng38 slots với17 scoped controls. Không full51/A2/A3, không fault injection mới hoặc feedback giả định. Corpus có sẵn giữ nguyên; code tự thu thập private checkout. Live catalog/policy chỉ đọc;4 database kiểm thử độc lập đều dropped=true.25 Outbox messages đều capture SENT_ACCEPTED, không Meta/Pancake/POS live send hoặc external order.

## Kết quả terminal khách thực nhận

| Nhóm | Slots | SEND_ELIGIBLE | HANDOFF | Code NO_SEND có tin |
| --- | ---: | ---: | ---: | ---: |
| Báo giá mở đầu |5|5|0|0|
| Ảnh |4|3|1|0|
| Tư vấn/chọn size/ảnh màu/giao gấp |4|3|1|0|
| Giỏ hàng và checkout |8|4|2|2|
| Tổng |21|15|4|2|

Trong15 eligible có13 model PASS và2 receipt-backed recovery; không tính cả15 thành chất lượng tư vấn PASS. Final fallback0/21. Handoff4/21=19,05%, gồm2 thiếu dữ liệu ảnh và2 chuyển theo nghiệp vụ; code NO_SEND2/21=9,52% nhưng đều có tin enqueue/capture, silence0. Cả21 slots có customer capture.

17 controls PASS:8 unsafe blocked,8 safe eligible,1 observational probe eligible. Chỉ ghi **zero observed send-eligible false PASS** trên8 preregistered unsafe controls của frozen configuration/population này. Probe không mang nhãn safe/unsafe, không phải qualification và không chạy qua owner/handoff; verifier PASS không thay thế quy tắc chuyển khi thiếu dữ liệu. Không suy kết quả này thành full A2/A3 hoặc ổn định.

## Findings sau đọc toàn bộ hội thoại

1. **Handoff đúng lúc thiếu ảnh khách yêu cầu:** media-feedback và gallery màu be đều chuyển, có holding capture; không lấy ảnh chung thay yêu cầu. Detail/back đủ nguồn vẫn gửi được. Gallery lần trước được gửi ảnh chung là acceptance cũ đã bị quyết định owner mới thay thế, không gọi handoff lần này là regression. Raw giữ calls FEEDBACK / GENERIC+color=be; terminal chỉ ghi DEPENDENCY_FAILURE, không lưu riêng media lookup subreason, nên không kết luận chính xác lỗi metadata hay tải nguồn chỉ từ terminal.
2. **Thiếu thông tin khách vẫn hỏi:** opening-unresolved xin ảnh/tên mẫu; checkout hỏi tên, thu thập riêng và gửi preview. Height/weight+fitPreference được code ghi/recommend_size, SIZE_FIT cấp M; không tự đòi thêm ba vòng. Correction giữ2 áo be L, không suy fit mới.
3. **Owner vẫn có một lỗi số tiền:** đổi size/số lượng đã commit nhưng draft ghi978.000đ thay vì cartQuote978.100đ. Verifier FAIL đúng CONTRADICTION_OR_NEGATION. Khách nhận receipt-backed summary đúng978.100đ, chuỗi tiếp tục qua preview và PURCHASE_CONFIRMED. Không giấu lỗi draft dưới final fallback0.
4. **Source timestamp refresh vẫn tồn tại:** stateful-open verifier PASS nhưng final gate STALE. [So sánh đã align claim theo nghĩa](SNAPSHOT_DIAGNOSTICS.json) thấy PRICE/STOCK observedAt đổi16:04:38.032→16:34:38.138 UTC, expiresAt và factSnapshotVersion đổi; không thấy đổi giá/tồn trong projection được kiểm. Code giữ gate, gửi current receipt summary529.000đ. Đây là finding cũ chưa sửa, không quy cho verifier quá tay hoặc claim đã hết lỗi nguồn.
5. **Bán hàng/giọng vẫn chưa đồng đều:** organic và multipart mở thêm giá món không hỏi; size reply nhắc lại height/weight; correction kể lại giỏ/tổng. Concern ren nhiều vẫn dùng tính từ trấn an; có2 ảnh hỗ trợ nhưng chưa giải thích thẳng băn khoăn, cụm vừa vặn dễ hiểu lệch sang fit. Discovery chọn đúng loại áo quần/ngân sách và dùng lưng chun/form suông làm lý do nhưng còn mã nội bộ, lời không bó bụng khá mạnh. Không tự gắn unsafe false PASS bằng cách bắt từ khóa, cũng không chấm tất cả reply PASS là tư vấn tốt. Giữ minor theo ưu tiên owner, không mở vòng sửa giọng hoặc thêm template trong lượt này.

## Accounting

67 actual generation requests =35 owner +15 native verifier +17 control verifier; tối đa1 upstream/generation, retry0.67 generation statuses OK, HTTP/quota/timeout errors0. Native verifier có1 semantic FAIL đã recovery, không phải lỗi provider. Cap97 không bị vượt.

67 actual wires được scan sâu keys và decoded JSON/text, loại audit wrappers:0 matches cho danh sách evaluator-only labels;0 marker của private checkout fixture trong provider wires. Private turn0 provider events. Public name question được khôi phục từ code với accepted SHA256; preview/input nhận hàng được mask, raw không sửa. Source/permission/recipient/privacy/effects/receipt gates giữ nguyên; không thêm role/layer/runtime code trong run.

Observed tokens480.549 input/32.781 output; cost không expose. Native verifier latency p50/p95=8,90/21,28s. Verification gồm readback=12,74/25,47s; whole native turn=33,92/62,85s. Đây là harness latency, không phải production SLA hoặc toàn bộ phần tăng do verifier.

## Commands, evidence và giới hạn

Thực chạy `python apps/worker/evals/single-agent-commerce-read-only/missing-information-run-20261025/DISPATCH_DRIVER.py <new-external-output>`: exit0. [Tất cả11 subcommands thực chạy](COMMANDS.json): source-capture, controls-preflight, controls,4 native preflights và4 native runs đều exit0. Driver AST syntax và diff-check PASS. Implementation readiness571worker/161Node/21protected/build/lint/direct typecheck thuộc lượt sửa trước; không chạy lại/claim CI PASS cho reporting. Không sửa model/prompt/runtime theo kết quả.

[80 raw files và SHA256](RAW_SHA256.json) giữ ngoài source tại workspace, bao gồm request/response/accounting và source capture; curated private data đã mask. [Dispatch status](DISPATCH_STATUS.json) xác nhận source unchanged. Các helper collect/diagnose/publish chỉ xử lý evidence sau model run, không gọi provider hoặc thay raw.

**STOP promotion; B NOT GO.** Run cho bằng chứng scoped rằng missing-photo handoff, customer clarification và checkout hoạt động, không phải acceptance toàn bộ policy. Chưa có live-provider pair cố tình giá đủ/tồnUNKNOWN hoặc nguồn POS thiếu: cặp regression này vẫn là deterministic test, chưa chứng minh model luôn nhận ra mọi relevant gap và gọi handoff. Chưa test mọi30 reasons, full51, repeat stability, delivery thật hoặc human acknowledgement. Source timestamp refresh và owner arithmetic vẫn là finding cần giữ. A tiếp tục owner-bypass; không tự bắt đầu run mới/fix/deploy.
