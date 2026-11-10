# B2/B3 — chạy lại7bước có state

Đăng ký7bước,N1, source `6477c840e5cd678d795d336a55b1ba95e287116f`: **lưu trọn6terminal; bước7đã gọi model và commit handoff nhưng host/tool ngắt trước terminal/capture**. Không claim thu đủ7/7. Terminal{"SEND_ELIGIBLE":2,"NO_SEND":2,"FALLBACK":1,"HANDOFF":1,"UNRECORDED_AFTER_HOST_INTERRUPTION":1}. Primary{"PARTIAL_REPLY_PURCHASE_NOT_EXECUTED":1,"UNUSABLE_NO_SEND":1,"UNUSABLE_FALLBACK":1,"PARTIAL_STATE_SUCCESS_REPLY_NEEDS_EDIT":1,"FUNCTIONAL_RECOVERY_CHECKOUT_INCOMPLETE":1,"FUNCTIONAL_AUTHORITY_STOP_PURCHASE_INCOMPLETE":1,"HANDOFF_COMMIT_OBSERVED_TERMINAL_UNRECORDED":1}. **STOP sales/live acceptance**; A giữOWNER_BYPASS. Đây là batch riêng với24B1, không cộng hai population.

## Phạm vi và kiểm tra trước chạy

Host/tool abort xảy ra sau khi cả6bước sales đã lưu và owner lượt7trả toolrequest_handoff. Không có process còn chạy để chờ; database test được đọc ledger công khai rồi cleanup bằng route Ops sẵn có. Handoff/event/case/tag intent đã commit nhưng Inbox lượt7cònPROCESSING, terminal/capture/elapsed chưa biết. Originalraw/integration.jsongiữstatusabsent/testDatabaseDropped=false tại thời điểm ngắt; INTERRUPTION_RECOVERY là evidence cleanup riêng, không chỉnh raw để giả batch hoàn tất.

Không đổi runtime/prompt/corpus/model/config trong request này. Giữ sixpublicturns+oneprivatecode-onlyturn: thêm giỏ → đổi size/số lượng → báo tổng → sửa số đo → private checkout → xác nhận mua; independent human-request cuối. Mỗi ca1lần, không retry/repair/reverify hoặc lượt thay thế lỗi. Source policy/catalog/Redis POS đọc thật; state/giỏ/Inbox/history/Outbox và checkout thử trong database riêng. Capture transport không gửi Meta/Pancake/POS thật.

Focused worker118PASS/database48PASS/protocol-provider26PASS; canonical workerbuildPASS. Real PostgreSQL COD12/12 và BANK_TRANSFER12/12composedgroupsPASS; cả hai database thử đã drop. Provider database thứ3 cũng drop, preflight0generationPASS. Full src/eval/typecheck/lint từ task trước là evidence khác, **NOT_RERUN** ở task evidence-only này.

## Toàn bộ kết quả khách nhận và state

| Bước | Terminal | Review toàn lượt | Lý do |
| --- | --- | --- | --- |
| 1/stateful-open | SEND_ELIGIBLE/PASS | PARTIAL_REPLY_PURCHASE_NOT_EXECUTED | Lưu đúng eo76/mông98, trả giá499.000đ và trạng thái đặt trước của áo beM. Nhưng khách đã chọn mua, giỏ vẫn null; câu chỉ báo thông tin không thực hiện bước mua. Giọng ngắn, đọc được; chưa đạt mục tiêu thao tác. |
| 2/stateful-variant-quantity | NO_SEND/EGRESS_READINESS | UNUSABLE_NO_SEND | Khách đổiL và lấy2chiếc nhưng không nhận tin; giỏ vẫn chưa tồn tại. Không lấy việc giỏ xuất hiện muộn ở bước4 để chấm bước2là đã thực hiện. |
| 3/stateful-quote | FALLBACK/BUDGET | UNUSABLE_FALLBACK | Không báo được tổng hai áo gồm ship; chỉ static fallback. Không có quote/giỏ ở bước này để khách tiếp tục mua. |
| 4/stateful-correction | SEND_ELIGIBLE/RECEIPT_BACKED_ACK | PARTIAL_STATE_SUCCESS_REPLY_NEEDS_EDIT | Đã sửa đúng eo74/mông96 và tạo được giỏ2áo beL theo lựa chọn trước. Đây là tiến triển thật. Nhưng tin khách chỉ là “Giỏ hàng đã được cập nhật, chị nhé.”: không xác nhận rõ việc sửa số đo và nghe máy móc; chưa phải phản hồi tự nhiên, sát câu vừa nhắn. Không yêu cầu đọc lại cả bộ số đo. |
| 5/stateful-private-checkout | HANDOFF/DEPENDENCY_FAILURE | FUNCTIONAL_RECOVERY_CHECKOUT_INCOMPLETE | Private code-only path không gọi model nhưng chuyển handoff DEPENDENCY_FAILURE, không có preview/checkout hoàn tất. Giỏ đã có nên không quy do thiếu giỏ; primary chưa đọc trace để gán dependency cụ thể. Không có tin capture cho khách. |
| 6/stateful-confirm | NO_SEND/CURRENT_AUTHORITY_CHANGED | FUNCTIONAL_AUTHORITY_STOP_PURCHASE_INCOMPLETE | Sau handoff, code dừng lượt chốt với CURRENT_AUTHORITY_CHANGED và không gọi model. Đúng kiểm soát quyền; hành trình xác nhận mua vẫn chưa hoàn tất, không chấm thành bán hàng thành công. |
| 7/stateful-human-request | UNRECORDED_AFTER_HOST_INTERRUPTION/HANDOFF_COMMIT_READ_BACK_TERMINAL_UNKNOWN | HANDOFF_COMMIT_OBSERVED_TERMINAL_UNRECORDED | Bước7bị host/tool ngắt trước khi lưu terminal và capture. Readback xác nhận HUMAN ownership/event/case/tag intent đã commit, nhưng Inbox còn PROCESSING và tag PENDING. Không đủ bằng chứng chấm final reply/delivery hoặc coi lượt hoàn tất; giữ UNKNOWN thay vì tạo outcome giả. |

[Toàn bộ7bước:6capture records+1ledger readback](CONVERSATIONS.md), [primary review](PRIMARY_REVIEW.json), [root cause sau primary](DIAGNOSTICS.md). Chấm actual captured customer outcome; không thay fallback bằng nháp bị chặn, không coi receipt/state write tự đủ cho chất lượng bán hàng. Bước7terminal/capture UNKNOWN, không tạo provider-attempt-7 giả; [interruption](INTERRUPTION.json)/[readback+cleanup](INTERRUPTION_RECOVERY.json). Không generation retry. Các lỗi sau giỏ thất bại được xét theo nguyên nhân tiền đề. Human acceptance=null; coding-agent review chủ quan, nonblind với task/source.

## Source và cấu hình

- implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; startinghead `9cd3f85e6450a381bc5140e47e64183048d6beae`.
- Runtime runSourceSha: `6477c840e5cd678d795d336a55b1ba95e287116f`, commit/clean trước chạy; không ghi SHA ngược vào frozen source.
- Raw `d6252104ef1fbcf0b55c27a444335f1b3f9d487d` trước primary `32fa82a15a0a500e1fab39ffed7270befe5f69e0`, rồi mới diagnosis/audit. [Exact commands, log/helper hashes và spec/plan Git blobs](PROVENANCE.json).
- Vertex/global gemini-3.5-flash-lite High, candidate1/max8192/HIGH/includeThoughts=false/temp+topP omitted/90s/retry0. Verifier Codex-login gpt-6.1-sol High, CLIcodex-cli 0.159.2, tools0/strictJSON/one upstream/90s/retry0/no client continuation. Model versions chỉ là mutable aliases, không dated immutable snapshots.
- Native tool contract cho phép đúng state/cart/quote/handoff ports đang compose; code sở hữu truth/freshness/state/CAS/permission/effects/receipts/privacy. At most3owner generations/2tool rounds/6calls/1verifier mỗi public turn, max24generations cho batch.

| Frozen input | SHA-256 |
| --- | --- |
| owner | `9d477de09ea59dab2f02c3fb4e0c9b9f79a88de189d72267a25e2ef1387180fa` |
| verifier | `e8ba5ab607518cda125600c59d3130c9b17d5fbf3e62da485945cd2ae1ec449d` |
| schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| tools | `56dd04548779a7997df3bc5b1e32e90f957bf2483a7cb7c5e0a532716d752d22` |
| corpus | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |
| sourceConfig | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |
| manifest | `e15d390295a7466093c7367d1f2a32477f12491bd73ce835a229f5c8e2236984` |

## Accounting/metrics

13generation invocations,12owner/1verifier; 13dispatch attempts,0pre-dispatch failures,13prepared envelopes. HTTP{"200":13}. Runtime errors0/13,timeout0,retry0; verifier errors0/timeouts0. Token input56206/output7063,coverage13/13,cost=null(provider không expose, không estimate).

| Metric | N | p50 ms | p95 ms |
| --- | ---: | ---: | ---: |
| owner | 11 | 1992.75 | 4461.50 |
| verifier | 1 | 5053.48 | 5053.48 |
| addedVerification | 1 | 9668.15 | 9668.15 |
| endToEnd | 6 | 25342.05 | 45081.00 |

Nearest-rank mô tả N1, không SLA. Known fallback/handoff/no-send4/7=57.14%;unknown terminal1/7=14.29%;trên6recorded terminals là4/6=66.67%. Không tính unknown như no-send hoặc PASS. OwnerlatencyN11vì lượt7thiếu runtime latency;13requests/tokens đều có telemetry,1lượt7lấy từ OWNER_RESULT log và ghi provenance riêng. Runtime toolcalls12chỉ gồm6lượt đã lưu;embeddingcount=nullvì process chưa flush final counter. [Metrics](METRICS.json), [từng request](REQUEST_ACCOUNTING.json).

Audit13raw/control/preflight/recovery disk+Git hashes,13unique generationIDs,1exact trusted/draft bindings,1actual Codex relay bodies;0evaluator-label/0privatecheckout leaks including nested serializedJSON. Audit statusPARTIAL_BATCH_ACCOUNTING_AND_CLEANUP_VERIFIED, không hoàn tất batch. One request/generation;7registered steps vẫn giữ denominator. Gemini là prepared body+adapterfakeHTTPcapture tests, không có independent live echo. Hai eligible replies gồm1verifierPASS và1code-ownedRECEIPT_BACKED_ACK; không gộp thành2verifierPASS.

Fallback giữC3_A_NONPROTECTED_V2,text “Phần này em chưa trả lời được, chị nhé.”,SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Current readback/final gate/receipt/authority giữ nguyên, không skip verifier cho generated final sống sót hardprecheck. Private checkout không được đưa synthetic name/phone/address vào model. PUBLISHED policy được capture vào test database và nguồn sản phẩm/POS đọc thật; controlled database tests dùng synthetic domain inputs được ghi nhãn riêng.

## Giới hạn và điểm dừng

Đây là chạy lại existingB2/B3cases trên bản hiện tại, không triển khai fix sau kết quả. Bộ7bước không phủ mọi câu hỏi bán hàng hay trạng thái checkout; deterministic composed controls và hành trình model có phạm vi khác nhau. Không lấy24B1làm evidence hoàn tất giỏ/checkout. Không A2/A3mới, A PASS, PhaseC, live policy/index/state mutation, serving migration, routing activation, merge, deploy hoặc live delivery.0new production code/semantic role/gate/store/framework; chỉ scope/evidence/report. Dừng sau batch và review, không automatic repeat.
