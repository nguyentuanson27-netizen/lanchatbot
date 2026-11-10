# Phase B — sửa và chạy một lượt đầy đủ

**Đã sửa, self-review, kiểm tra và chạy đủ 24 B1 + 7 stateful, mỗi ca một lần. Recommendation: STOP sales/live acceptance; checkout nguồn thật còn BLOCKED.**

| Nhóm | Actual terminal | Review toàn lượt |
| --- | --- | --- |
| B1, 24 ca | 24 eligible, 0 static fallback | 20 USABLE / 4 NEEDS_EDIT |
| Stateful, 7 lượt | 4 eligible, 2 handoff, 1 no-send | 4 USABLE / 1 NEEDS_EDIT / 2 FALLBACK_OR_NO_SEND |

Tổng **24 USABLE / 5 NEEDS_EDIT / 2 FALLBACK_OR_NO_SEND**. Ba USABLE là partial-source controls, một USABLE chỉ là requested ownership transfer; không phải 24 đơn mua. [31 hội thoại](CONVERSATIONS.md) · [Review từng lượt](PRIMARY_REVIEW.md) · [Finding/root cause và hướng xử lý](FINDINGS.md).

## Thay đổi và provenance

[Kế hoạch](PLAN.md) · [Implementation/self-review/commands](PREPARATION.md) · [Scope](SCOPE.md) · [Frozen inputs](FROZEN_INPUTS.json).

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake: `995b1d4a59cff4577356e3fa602aaca41ee8d888`.
- Prompt correction và checks: `33e018dccee069cde58f73f9cbfcc4d8213abbe2`.
- Clean bRunSourceSha, được capture sau commit/freeze: `c7105bd1cb3ac955a99df589faa1aef4aaef5fd3`. Không ghi SHA ngược làm thay HEAD hoặc sửa source giữa collection.
- Raw savepoint `88f9775792e2343553cba9b6328d84af6e822b12`, trước primary `4c01efbf8419b9a088ac8aabd0e96160dff13a02` và diagnosis. Đủ 31/31 outcomes, không retry, replacement hoặc nhận kết quả từ lịch sử.
- Specs: architecture blob `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; verifier amendment blob `4a09b55d2f3a972a65697738876cc5eab21e7a2b`; Phase B execution blob `a452326d77e4493b88b02c0072cef808fecad2d8`; owner advisory boundary blob `5a531cfeb03fcc20e178517a47f5be5a234e1593`. Plan/todo blob identities nằm trong frozen inputs.

Chỉ thay các đoạn prompt đang sở hữu lỗi: cảm giác/công năng và policy theo câu hỏi ở verifier; referent thành phần, thiếu POS, quyết định và giọng chat ở owner. Manifest chỉ đổi active prompt hashes. Không thêm runtime code, regex, parser, router, câu trả lời mẫu, repair/reverify, generation retry, tool budget hoặc role/layer/gate/store. Owner +732 bytes/6,64%; verifier +386 bytes/3,43%. Không claim prompt đã được rút gọn hoặc tự nhiên đã ổn định.

## Model và identities

Owner: **Vertex AI/global `gemini-3.5-flash-lite`, High**, version cùng alias; candidate 1, text/plain, max 8192, thinking HIGH/includeThoughts false, omitted temperature/topP defaults, timeout 90s, retry 0. Dùng `C3_VERTEX_CREDENTIAL_FILE` qua route đã có, không substitute.

Verifier: **Codex ChatGPT login `gpt-6.1-sol`, High**, CLI 0.159.2/bounded Responses relay; tools=[], tool_choice=none, parallel_tool_calls=false, store=false, stream=true, timeout 90s, max response 1.048.576 bytes, tối đa một upstream request mỗi invocation, retry 0. First error kết thúc invocation, không hidden client continuation. CLI binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`. Immutable provider model builds không expose; không claim model alias là build bất biến.

| Identity | SHA256 |
| --- | --- |
| Owner prompt | `8cb461c2874522915aabdbd7d945768df656577ce60a426d6b7f4636bf5702f3` |
| Verifier prompt | `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| B1 native tools | `23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8` |
| Composed native tools | `486f4134f7015c3281e335e425d62c62bd5a63dfd376fd277a866c917a3c859b` |
| Source config | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |
| B1 priority corpus | `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267` |
| Stateful corpus | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |

Giữ exact existing 8 mục đích × 3 biến thể B1; 7 stateful theo thứ tự gồm 6 public provider turns và 1 private code-only checkout. N1, max 120 invocations (96 B1 + 24 stateful), owner max 3 generations/2 tool rounds/6 calls, verifier max 1. Full configs/schema/file hashes/spec-plan blobs và terminal map nằm trong frozen inputs. Static fallback giữ `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.” Hash `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`; lần này không dùng static fallback.

## Điều đã cải thiện và điều chưa đạt

Bốn fallback cũ đều đã thành eligible: sân khấu, nóng ngoài trời, chân váy thiếu POS và thời hạn đổi màu. Heat/partial/time-fee dùng được trong lần này; stage vẫn NEEDS_EDIT về giọng. Tìm mẫu, giá, tồn, phân biệt món lẻ/cả set và ba tình huống thực sự vi phạm policy đều trả đúng. B1 17 đã chọn áo lẻ theo dịp gặp khách; B1 19 giữ xưng hô và bỏ báo cáo kết nối. B1 23 upsell cả bộ có lý được chấm USABLE, không ép phương án rẻ nhất.

Năm NEEDS_EDIT: B1 sân khấu còn quảng cáo; hai concern còn mỹ từ/thiếu hướng ưu tiên; B1 18 có rủi ro biến tóm tắt thành điều kiện đủ cho đổi hàng; stateful 2 chưa hoàn tất quantity. Riêng policy B1 18 chưa được adjudicate là unsafe: không kết luận chỉ từ thiếu chữ “chưa giặt” hoặc tự giả định khách đã vi phạm.

Stateful thêm áo M/be thành công. Lượt đổi L + quantity 2 chỉ đổi variant, quantity cuối lượt còn 1. Continuation bị `OWNER_REQUEST_BOUND` **trước dispatch** và code gửi receipt ACK chung. Lượt báo tiền sau mới sửa quantity 2 và quote đúng **978.100đ**. Profile sửa thành 74/96 và giữ L/be×2. Không dùng thành công muộn để cứu lượt lỗi.

[Bound diagnosis](BOUND_DIAGNOSIS.json): native signature mới ở lượt variant dài 11.364 ký tự, so với 6.660 trước đó; prompt/history cũng tăng. Check offline trước run dùng 90 request cũ, max 31.081 bytes, không bao phủ variance native signature này. Exact failed wire bytes không được capture. Không quy lỗi chỉ do prompt hoặc provider, không tăng bound/budget, cắt signature hay retry để cứu run.

Private checkout tiếp tục `CART_ETA_UNAVAILABLE`, handoff dependency, không preview/capture. Source có prep/transit, nhưng chưa có mapping địa chỉ TP.HCM tới key vùng có thẩm quyền. Confirm sau handoff NO_SEND vì authority đã đổi. Requested human handoff chỉ chứng minh ownership commit ở test DB; không chứng minh nhân viên thật phục vụ. Real-source purchase vẫn chưa hoàn tất.

So với full run trước: B1 primary từ 15 lên 20 USABLE, nhưng stateful từ 5 xuống 4 USABLE do lượt đổi giỏ. Chỉ mô tả hai lần đo N1; không chứng minh độ ổn định hay tác động riêng của prompt. Primary chủ quan, không độc lập, human acceptance null. **A vẫn OWNER_BYPASS; không A2/A3 mới**, không gán a2RunSourceSha/a3RunSourceSha hoặc qualification từ lần chạy B này. Không claim unsafe false-PASS rate bằng 0 trên population không chạy.

## Request, binding và vận hành

[AUDIT](AUDIT.json) · [METRICS](METRICS.json) · [REQUEST_ACCOUNTING](REQUEST_ACCOUNTING.json) · [COVERAGE](COVERAGE.json).

- **88 unique invocations / 87 generation HTTP requests = 60 owner HTTP200 + 27 verifier HTTP200.** Invocation owner còn lại là pre-dispatch bound failure với request count 0, vẫn nằm trong mẫu số. Không automatic retry hoặc unknown request accounting. `UNKNOWN` ở một HTTP-status bucket của metrics nghĩa là không có HTTP request, không phải một HTTP response bị mất.
- Local pre-dispatch failure: **1/88 = 1,14%**; HTTP error **0/87**; timeout **0**; verifier error/timeout **0/27**. Không gọi local bound failure là provider HTTP lỗi. Không loại invocation này để báo 88/88 thành công.
- Cả **27 model finals đều qua verifier**, 27 exact bindings và 27 eligible texts đúng draft. Stateful có 4 eligible captures: **3 model finals đã verify + 1 code-owned receipt ACK**, mỗi tin capture một lần. Private checkout 0 model requests; không dùng code ACK để né verifier cho final model.
- 40 raw disk/Git hashes, 60 owner dispatch body hashes và 13 frozen file identities khớp. **Zero observed evaluator-label/private-fixture leaks** trong captured requests; runtime/evaluator projection tests cũng PASS. Prepared/dispatched body hashes không phải independent provider-side echo.
- Usage **347.473 input / 31.490 output tokens**. Complete usage 87/88 invocations, tương ứng 87/87 HTTP responses; invocation không dispatch không có token usage. Cost không expose, không ước tính. Owner auth requests được ghi là 2; Codex auth network count unknown.
- B1 source counters: 0 embedding, 51 catalog reads, 36 POS reads, 12 policy reads; stateful 0 embedding. Source precheck riêng có 1 embedding/0 owner-verifier generations. Đây là counters, không phải toàn bộ network inventory.
- Static fallback **0/31**; handoff **2/31 = 6,45%**; no-send **1/31 = 3,23%**. Trong stateful: handoff 2/7, no-send 1/7; **1 receipt ACK recovery** sau lỗi, không được che bởi con số static fallback 0. Không suy ra conversion/traffic thật.
- Disposable provider test DB đã drop/readback true. Nguồn PostgreSQL, Redis, Qdrant chỉ đọc; delivery capture-only. Không POS order/payment/hold, customer send, human notification, source publication, merge hoặc deploy.

Latency nearest-rank, giây:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner invocation | 61 | 1,850 | 4,015 |
| Verifier generation | 27 | 6,679 | 8,194 |
| Added verification — B1 | 24 | 7,189 | 8,938 |
| Whole B1 turn | 24 | 12,301 | 15,880 |
| Added verification — stateful | 3 | 10,426 | 12,294 |
| Whole stateful outcome | 7 | 29,724 | 53,377 |

Whole turn không gồm startup/build/tunnel; stateful gồm transaction/delivery drain. Code-only và receipt recovery đổi denominator. Không có paired latency experiment; không quy thay đổi latency riêng cho prompt.

## Commands và checks thực sự chạy

[Preparation](PREPARATION.md) ghi exact commands trước seal: focused protocol/provider/comparison **47 PASS**, focused worker **185 PASS**, protected claims/reply assembler **21 PASS**, full Node eval **489 PASS + 2 existing optional SKIP / 0 FAIL**, worker typecheck/build/lint mỗi command **exit 0**, offline 90 request size checks PASS. Không claim full worker suite vừa chạy, full repo `pnpm check` hoặc remote CI PASS. No shared source changes.

Collection/evidence commands thực sự chạy:

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-stateful-unused-20261016 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-source-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:24 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-b1-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-stateful-20261016 COD --provider-run
python C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-preserve-20261016.py
python C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-primary-review-20261016.py
node C:/Users/nguye/AppData/Local/Temp/c3-advisory-context-audit-20261016.mjs
git diff --check
```

Preflights/source readback PASS/0 owner-verifier generations; canonical worker builds actually ran inside source check/B1 runner. Stateful started after B1 canonical build/registration to avoid reading dist while compile was active. Both collection commands exit 0 với customer failures đã giữ, không phải sales PASS. Raw preservation/primary/audit/diagnosis đều offline, 0 generations. Audit dùng Git clean filters cho frozen working files/EOL; raw artifacts byte-exact với `-text`.

Dùng lại [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) và credential/source-session route đã có; không in secret. Structural complexity delta của sửa này: **0 executable changes / 0 semantic roles, layers, gates hoặc stores added**. Self-review xác nhận không đổi source/config/prompt trong collection. Không post-result fix hoặc extra generation.

**Recommendation: STOP sales/live acceptance.** Giảm fallback không đủ giải quyết giọng và tính hoàn tất của thao tác; cần xử lý envelope/mutation contract và nguồn mapping ETA. **Source checkout BLOCKED; A OWNER_BYPASS giữ nguyên.** Không tiếp tục Phase C hoặc live.
