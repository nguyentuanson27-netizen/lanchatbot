# Phase B — critical experience model run, 25/10/2026

Đã thực hiện **14 native outcomes (11 targets + 3 setup) và 17 scoped controls**, mỗi ca N1/retry0. Hai phần có source identity riêng, giữ nguyên tất cả31slots và51generation requests. **B chưa GO; A vẫn OWNER_BYPASS.** Không full51/fullA2/A3, không tự chạy vòng hai.

## Provenance và điều kiện chạy

Runtime fix `e7e0fbf855fc1e167cacee8186e96ea84739886e`; controls source `3a3d2b0c5da214df221774974bbf6170d10c4d54`; native source `776bdf61f29f5ff67cca6253924b66ecdccece50`. Source sạch/không đổi trong từng dispatch. Phần chênh source chỉ là driver/đăng ký/outcome controls, không sửa runtime/prompt/model sau khi thấy kết quả. Owner **Gemini 3.5 Flash Lite HIGH**, verifier **GPT-6.1 Sol HIGH**; exact config/prompt/corpus hashes trong [registration](REGISTRATION.json) và [controls registration](CONTROLS_REGISTRATION.json).

Campaign controls đã STOP theo preregistration: **8unsafe blocked, 7safe eligible, 1safe PROVIDER_ERROR/UPSTREAM_TRANSPORT, 1probe eligible**. Không có unsafe send-eligible false PASS trên8unsafe frozen controls; không gọi đây là safety proof. Controls **FAIL**, không relabel PASS. Native14 ban đầu chưa bắt đầu. Vì owner yêu cầu chạy model và đây là một lỗi kết nối, đã [đăng ký diagnostic riêng trước native results](NATIVE_DIAGNOSTIC_PREREGISTRATION.md), giữ failed control và không retry ca3. Diagnostic này không đáp ứng gate campaign cũ hoặc promotion B.

## Kết quả thực nhận

14 native: **5 SEND_ELIGIBLE / 4 FALLBACK / 3 HANDOFF / 2 NO_SEND**. Target11: `{"FALLBACK": 4, "HANDOFF": 3, "SEND_ELIGIBLE": 2, "NO_SEND": 2}`; setup3eligible. Hai NO_SEND đều có code message và hai handoff đúng nghiệp vụ, không phải im lặng. [Đủ14hội thoại](CONVERSATIONS.md), [machine outcomes](ACTUAL_TERMINALS.json).

| Ca | Rerun trước | Lần này |
|---|---|---|
| b1-partial-source-v2 | SEND_ELIGIBLE | FALLBACK / FAIL |
| b1-price-v2 | SEND_ELIGIBLE | FALLBACK / PROVIDER_ERROR |
| b1-component-stock-v2 | SEND_ELIGIBLE | FALLBACK / PROVIDER_ERROR |
| b1-changed-occasion-v3 | SEND_ELIGIBLE | FALLBACK / PROVIDER_ERROR |
| sales-discovery-advice:need | HANDOFF | HANDOFF / DEPENDENCY_FAILURE |
| sales-product-gallery:overview | SEND_ELIGIBLE | SEND_ELIGIBLE / PASS |
| stateful-open | SEND_ELIGIBLE | SEND_ELIGIBLE / RECEIPT_BACKED_CART_SUMMARY |
| stateful-variant-quantity | SEND_ELIGIBLE | SEND_ELIGIBLE / PASS |
| stateful-quote | SEND_ELIGIBLE | SEND_ELIGIBLE / PASS |
| stateful-correction | SEND_ELIGIBLE | SEND_ELIGIBLE / PASS |
| stateful-request-checkout | NO_SEND | NO_SEND / CHECKOUT_DETAILS_MISSING |
| stateful-private-checkout | NO_SEND | NO_SEND / PRIVATE_CHECKOUT_COMMITTED |
| stateful-confirm | HANDOFF | HANDOFF / PURCHASE_CONFIRMED |
| stateful-human-request | HANDOFF | HANDOFF / CUSTOMER_REQUESTED_HUMAN |

### Những phần hoạt động được

- **Sửa số đo → checkout không bị đứt:** correction chỉ nói “2 áo size L của mình vẫn được giữ nguyên”, cập nhật profile74/96/revision3, cart hai áo be L nguyên trạng. Request-checkout có câu hỏi tên, private checkout có preview tổng978.100đ/ETA8–14ngày, confirm tới PURCHASE_CONFIRMED. Cả8stateful slots enqueued1 và có accepted capture. Hai terminal NO_SEND không phải không gửi tin. Public name question được phục hồi từ terminal chỉ khi khớp capture SHA256; private preview vẫn redacted.
- **Gallery:** gửi hai ảnh chung, nói rõ ảnh chung; chấp nhận theo phạm vi owner mới, không mở vòng sửa giọng/ảnh chung.
- **Tool completion:** có2actual final-only requests mang completedToolTurns; không quan sát OWNER_TOOL_MODE/TOOL_RESULT_BOUND trong14native. Discovery dùng đủ3owner generations, tạo FINAL và verifierPASS. N1 chỉ là zero observed trên population/config này, chưa chứng minh ổn định.

### Lỗi nghiêm trọng còn lại

1. **Discovery vẫn không đưa được tư vấn tới khách:** final gate STALE vì source snapshot thay đổi. [So sánh](SNAPSHOT_DIAGNOSTICS.json) đã align claims theo type/scope/value/authorization để tránh nhầm reorder thành đổi giá: giá/tồn/nguồn mô tả/policy text/subjects/receipts giữ nguyên; POS sourceVersion/observedAt/expiresAt và identity dẫn xuất đổi từ13:34:37 sang14:04:37 UTC. Khách nhận holding/handoff. Không phải verifier chặn câu tư vấn hoặc owner gọi tool quá budget. Đây là vấn đề nhất quán phiên bản/freshness đã từng gặp, không chữa bằng prompt. Không bỏ final gate để cho qua.
2. **Partial source bị owner hiểu thành giới hạn bán:** POS_UNAVAILABLE là fixture đã đăng ký. Khách hỏi mua riêng chân váy; owner nói “sản phẩm bán nguyên set” rồi hướng mua cả bộ khi availableOffers chưa xác định. Verifier chặn đúng UNSUPPORTED_PROTECTED_ASSERTION; khách nhận fallback chung, mất phần mô tả đã có. Cùng nhóm root cause cũ: lẫn “chưa biết/không tra được” với “shop không có/không bán”. Đây là lỗi nghiệp vụ ảnh hưởng mua hàng, cần xử lý ở ý nghĩa kết quả source và recovery, không thêm ví dụ để fit riêng ca này.
3. **Ba fallback do quota verifier:** b1-price-v2, b1-component-stock-v2, b1-changed-occasion-v3 đều HTTP429 + **usage_limit_reached**. Owner có draft nhưng verifier không đánh giá được. Không gắn lỗi cho prompt hoặc cho claim sai; draft chưa gửi, không chấm như trải nghiệm đã đạt. Không retry/substitute/skip verifier.

stateful-open cũng STALE do thay metadata nhưng code recovery từ cart receipt/current sources đã gửi summary529.000đ và chuỗi vẫn đi tiếp. Giữ original failure trong recovery evidence, không gọi đây là model PASS. Các câu hơi dài, ngoặc, “giúp em” tạm chấp nhận; chưa có lý do mở thêm style rewrite.

## Accounting và vận hành

- Native34requests:24owner/10verifier. Controls17verifier; tổng **51requests** (khác31slots), max1upstream/generation, không generation retry. Native3quota errors; controls1transport error HTTPnull; tổng4/51 = 7.84%, timeout0. Không suy lỗi HTTPnull là quota; chỉ ba lỗi429 có mã usage_limit_reached mới xác nhận được giới hạn sử dụng.
- Captured wires51, evaluator-label scan0 matches; native34 và controls17 được scan trên actual provider bodies, không scan audit wrappers. Exact pattern trong [metrics](REVIEW_METRICS.json).
- Native verifier p50/p95 **11.130/28.311s**. Verification kể cả readback p50/p95 **14.897/36.043s**; attempt end-to-end p50/p95 **26.263/74.100s**. Không coi tất cả latency là độ trễ thêm do verifier.
- Observed native tokens202.062in/23.882out; gồm controls313.776in/26.057out. Error usage không expose vẫn giữ attempt denominator; cost không expose, không billing reconciliation.
- Hai disposable PostgreSQL databases dropped=true. Chỉ capture delivery; không Meta live send, deploy hoặc production mutation. No provider generations trên input riêng tư.

## Commands và kết luận

[Controls commands](CONTROLS_COMMANDS.json): source-capture/preflight exit0, controls exit1; controls-readiness và native campaign ban đầu NOT_RUN theo gate. [Native7commands](COMMANDS.json) đều exit0: journey/stateful preflights và runs, B1preflight, B1ranges11:13 và17:17. Runners xử lý lỗi provider thành outcomes nên exit0 không đồng nghĩa cả14ca PASS.

Driver/hash đăng ký trước dispatch. [Raw SHA256](RAW_SHA256.json) giữ cả hai output directories; raw nằm ngoài repo, không copy private inputs/credential. Reporting assertions kiểm đủ14native/17controls/51wires, no-label-leak, max1request, cleanup và capture. Không rerun unit/build/typecheck/lint hoặc remoteCI trong reporting-only lượt này; các kết quả553/160/21 và build/lint/typecheck thuộc implementation e7e0fbf8, không gắn thành verification mới.

**STOP promotion / B NOT GO.** Bản sửa đã tránh được hai lỗi tool trong lần quan sát này và checkout đi hết, nhưng discovery vẫn handoff, partial-source vẫn tư vấn sai và verifier gặp quota. Ưu tiên tiếp theo là source version consistency và phân biệt source unavailable với unavailable selling option; giữ giọng văn minor theo quyết định owner. Không thêm repair/reverify loop hoặc tiếp tục post-B/live deployment.
