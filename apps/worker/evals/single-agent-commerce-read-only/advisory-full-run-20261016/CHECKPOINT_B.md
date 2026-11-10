# Phase B — một lần chạy đầy đủ candidate đã sửa

**Đã chạy đủ 24 B1 + 7 stateful, mỗi ca một lần, cùng source SHA. Recommendation: STOP sales/live acceptance.**

| Nhóm | Actual terminal | Review cả lượt |
| --- | --- | --- |
| 24 B1 | 20 eligible, 4 fallback | 15 USABLE / 5 NEEDS_EDIT / 4 FALLBACK_OR_NO_SEND |
| 7 stateful | 4 eligible, 2 handoff, 1 no-send | 5 USABLE / 2 FALLBACK_OR_NO_SEND |

Tổng primary: **20 USABLE / 5 NEEDS_EDIT / 6 FALLBACK_OR_NO_SEND**. Nhóm review cuối gồm cả hai kết quả mua dừng ở handoff/no-send; runtime chỉ có **4 static fallback**. [31 hội thoại](CONVERSATIONS.md) · [Review từng lượt](PRIMARY_REVIEW.md) · [Finding, root cause và nháp bị chặn](FINDINGS.md).

## Provenance và cấu hình

- Refreshed main / implementationBaseSha: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake và verified candidate: `65b5e9b6bed49bc1b94dd559c7f8790af77b348e`.
- [Scope](SCOPE.md) và [frozen inputs](FROZEN_INPUTS.json) được commit trước generation. Clean bRunSourceSha: `0d5a1d14916f9bcb587af37722dcf7cedd1c33c2`, không ghi SHA ngược vào frozen source.
- Raw `cebd5cb08f926583084cf55989bbe101b176d02b` trước primary `572e4b65` và chẩn đoán. Không sửa executable/config/prompt giữa các phần collection. [40 raw/preflight/source hashes](RAW_HASHES.json) khớp disk và Git.
- Exact existing priority corpus slots 1:24 và 7 ordered stateful: 6 public provider turns, 1 private code-only step. N1, tối đa 120 generation invocations (96 B1 + 24 stateful). Đủ 31/31, không lấy kết quả cũ, reseed journey, retry hoặc thay thế attempt lỗi.
- Owner: Vertex AI/global `gemini-3.5-flash-lite`, High, version là cùng alias; candidate 1, plaintext, max 8192, thinking HIGH, includeThoughts false, omitted temperature/topP defaults, timeout 90s, retry 0.
- Verifier: Codex ChatGPT login `gpt-6.1-sol`, High, CLI 0.159.2; bounded Responses relay, tools=[], tool_choice=none, store=false, timeout 90s, tối đa một upstream generation request cho mỗi invocation, retry 0. Immutable provider model builds không được expose. CLI binary SHA256: `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`.

| Identity | SHA256 |
| --- | --- |
| Owner prompt | `32be6de2d2e2f2dea333486b125284375a9a3cafa35156780d98cb902ee49726` |
| Verifier prompt | `2e2594eac4ca8f9cb688feda8f9f32cd34acfcfc6bb77d1d4231b272edc81f26` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| B1 native tools | `23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8` |
| Composed native tools | `486f4134f7015c3281e335e425d62c62bd5a63dfd376fd277a866c917a3c859b` |
| Source config | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |
| B1 priority corpus | `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267` |
| Stateful corpus | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |

Full generation config, schema, terminal map, file hashes và spec/plan Git blobs nằm trong frozen inputs. Static fallback `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`.

## Kết quả và giới hạn

B1 fallback: sân khấu FAIL, ngoài trời/dễ nóng FAIL, policy đổi màu sau 10 ngày FAIL, partial-source chân váy BUDGET. Ba semantic FAIL không phải provider error. Heat draft vẫn bị chặn trong phạm vi owner đã chấp nhận; stage và policy cần xét whole claim/context, không kết luận sai chỉ từ lời nhấn mạnh hoặc một điều kiện chưa kể. Audit xác nhận prompt mới đã vào request. Không có bằng chứng đủ để nói verifier chỉ dò keyword.

Giá/tồn đúng phần hỏi, phân biệt component/set, tìm mẫu và ba ca thật sự vi phạm policy dùng được. Năm reply eligible vẫn cần sửa về giọng, độ quyết định hoặc bước tiếp ngoài capability. Không chấm lỗi vì bán thêm hoặc chọn khác đáp án mẫu.

Stateful đã thêm/sửa đúng giỏ, giữ BE khi đổi L và số lượng 2; báo **978.100đ** đúng quote sau ưu đãi/ship; sửa profile 74/96 mà giữ size khách chọn. Private checkout dừng ở `CART_ETA_UNAVAILABLE`, không preview rồi handoff; confirm sau đó không gửi vì ownership đã đổi. Requested human handoff chỉ chứng minh chuyển ownership trong isolated DB. Một USABLE khác là partial-source control; không phải giao dịch hoàn tất.

Review chủ quan, không độc lập, human acceptance null. N1 và nguồn live khác không chứng minh tính ổn định hoặc tác động riêng của một sửa đổi. Historical A/B prompts, verdicts, scores và raw giữ nguyên. **A OWNER_BYPASS**, không A2/A3 mới hoặc qualification claim; run B này không đo preregistered A2 unsafe population.

## Accounting và đo vận hành

[AUDIT](AUDIT.json) · [REQUEST_ACCOUNTING](REQUEST_ACCOUNTING.json) · [METRICS](METRICS.json).

- **90 unique generation invocations / 90 HTTP200 = 63 owner + 27 verifier**, dưới max 120. Không unknown request count, generation error, timeout hoặc retry. Một parsed tool return dưới NONE bị chặn BUDGET; chưa chứng minh provider luôn tuân final-only.
- Cả 27 generated finals được verifier kiểm; 27 exact bindings, 24 eligible texts đúng draft. Bốn stateful eligible replies được capture đúng một lần và đúng verified text. Private checkout không gọi model.
- 40 raw disk/Git hashes, 63 owner dispatch body hashes, 13 frozen files khớp disk/source qua Git clean filters; **zero observed evaluator/private-fixture leaks**. Prepared/dispatched body hash không phải independent provider-side echo.
- **351.369 input / 29.461 output tokens**, usage đủ 90/90. Cost không expose, không ước tính. Hai owner auth requests được ghi; Codex auth network count unknown.
- B1 source counters: embedding 1, catalog 50, POS 35, policy 12; stateful embedding 0. Source check có riêng một embedding và không owner/verifier generation. Đây là instrumentation, không phải toàn bộ network inventory.
- B1 fallback **4/24 = 16,7%**. Stateful: 0/7 static fallback, handoff **2/7 = 28,6%**, no-send **1/7 = 14,3%**. Overall runtime: 4 fallback, 2 handoff, 1 no-send trên 31. Không suy ra tỷ lệ traffic thật hoặc chốt đơn.

Latency nearest-rank, giây:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation | 63 | 1,797 | 4,509 |
| Verifier generation | 27 | 4,940 | 6,958 |
| Added verification — B1 | 23 | 5,428 | 7,082 |
| Whole B1 turn | 24 | 10,863 | 17,266 |
| Added verification — stateful | 4 | 6,456 | 7,505 |
| Whole stateful outcome | 7 | 23,960 | 37,186 |

Whole turn không gồm startup/build/tunnel; stateful gồm transaction/delivery drain. Code-only turns thay đổi denominator. Không có paired latency experiment.

## Commands thực sự chạy

Dùng lại [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md), hashed credential launcher và source-session có sẵn; không ghi secret vào evidence. PostgreSQL nguồn, Redis và Qdrant chỉ đọc. Chỉ một disposable test DB do harness sở hữu được tạo/ghi/drop, drop readback true; delivery capture-only. Không POS order/payment/hold, thông báo nhân viên thật, customer send, source publication, merge hoặc deploy.

```text
git fetch origin main
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-advisory-full-stateful-unused-20261016 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-advisory-full-source-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:24 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-advisory-full-b1-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-advisory-full-stateful-20261016 COD --provider-run
node C:/Users/nguye/AppData/Local/Temp/c3-advisory-full-audit-20261016.mjs
git diff --check
```

Preflight và source check PASS, không owner/verifier generation. Canonical worker builds thực sự chạy trong source check/dispatch. Collection commands exit 0 với những customer failures đã ghi, không phải sales PASS. Raw preservation, primary và coverage là offline Python checks, không generation. Request/binding/firewall audit PASS.

Audit extension ban đầu so raw disk SHA256 với Git blob mà chưa xét EOL đã fail: manifest/source-config/source-session có CRLF trên disk và LF trong Git. Sửa assumption của audit: raw bytes vẫn khớp frozen SHA256; Git clean-filter hashes khớp sealed source blobs cho 13 files. Bốn mươi raw artifacts có `-text`, vẫn byte-exact disk/Git. Không đổi frozen input, provider request hoặc source để cứu kết quả. Đây là lỗi audit offline, không phải một generation attempt bị bỏ.

Reuse checks thực sự chạy ở **65b5e9b6**, không claim chạy lại trong task model-only này: 37 effect tests; 130 files / 1.792 worker tests PASS; 489 Node eval PASS + 2 existing optional SKIP; 21 protected-claims/reply-assembler PASS; worker typecheck/build/lint exit 0. Không runtime/shared-package change, test mới, full-repository pnpm check hoặc remote CI PASS. Complexity delta của lần chạy: **0 executable changes, 0 roles/layers/gates/stores added**. Self-review kiểm raw/source/hash/link/secret trước delivery; không post-result patch hoặc extra generation.

**Recommendation: STOP sales/live acceptance; source checkout BLOCKED; A OWNER_BYPASS giữ nguyên.** Cart/state/quote đã dùng được trong lần đo này; giọng tư vấn, verifier calibration và ETA checkout vẫn chưa đạt. Không tự tiếp tục Phase C hoặc production.
