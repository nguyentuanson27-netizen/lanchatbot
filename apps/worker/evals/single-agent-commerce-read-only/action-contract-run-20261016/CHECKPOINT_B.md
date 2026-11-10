# Phase B — contract theo action và một run đầy đủ

**Đã fix, self-review, kiểm tra và chạy đủ 7 ordered stateful trước + 24 B1 / N1. Lượt đổi giỏ hoàn tất L/be×2 ngay trong lượt; sales/live acceptance vẫn STOP, source checkout BLOCKED.**

| Nhóm | Actual terminal | Whole-outcome primary |
| --- | --- | --- |
| 24 B1 | 23 eligible / 1 HANDOFF STALE | 18 USABLE / 5 NEEDS_EDIT / 1 FALLBACK_OR_NO_SEND |
| 7 stateful | 4 eligible / 2 handoff / 1 no-send | 5 USABLE / 2 FALLBACK_OR_NO_SEND |

Tổng **23 USABLE / 5 NEEDS_EDIT / 3 FALLBACK_OR_NO_SEND**. Ba USABLE B1 là partial-source controls; một USABLE stateful chỉ là requested ownership transfer, không phải mua hàng hoàn tất. Actual static fallback0; primary unresolved3 khác với handoff3 + no-send1 vì requested handoff được chấm dùng được trong phạm vi ownership.

[Toàn bộ31 outcomes](CONVERSATIONS.md) · [Primary từng lượt](PRIMARY_REVIEW.md) · [Finding và hướng xử lý](FINDINGS.md) · [Trace sau primary](DIAGNOSIS.json).

## Implementation và source provenance

[Plan](PLAN.md), [scope](SCOPE.md), [preparation/RED→GREEN/self-review/commands](PREPARATION.md), [frozen inputs](FROZEN_INPUTS.json).

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake/rollback: `938086a7b1c52eae32a1756067237336872cbfef`.
- Owning code/test savepoint: `72367940e2a138ae41ff51200e6e6ff1ac6efa80`.
- Preparation: `3daf892e`.
- Clean runtime **bRunSourceSha `69d8d27e4332de4d37fc1a9ebf0d8031067acb47`**, capture sau commit/freeze, không ghi ngược vào source làm đổi HEAD. Không executable/config/prompt change trong collection.
- Raw savepoint `c0f95777a9b8b576e5092b3177404e61f74e554f` trước primary `acb7d037e4a793a91f75f2c1cf540d446ce68861`, trước diagnosis. 31/31 outcomes mới, không lịch sử bù, retry, replacement hoặc reseed.
- Spec blobs: architecture `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; verifier amendment `4a09b55d2f3a972a65697738876cc5eab21e7a2b`; Phase B execution `a452326d77e4493b88b02c0072cef808fecad2d8`; advisory/chat boundary `5a531cfeb03fcc20e178517a47f5be5a234e1593`. Plan/todo identities trước provider trong frozen inputs.

Allowlist riêng cho ba cart actions trước authorize/select/commit, không bỏ qua field action khác. Recovery mutation báo current committed quantity, chỉ nêu size/màu nếu tất cả components đồng nhất. Existing receipt/readback/authority/privacy checks và PARTIAL_EFFECT handoff giữ nguyên. Hai command vẫn commit riêng, không nâng thành atomic cả batch.

Native change_cart_item description là instruction duy nhất đổi. Owner/verifier prompts, manifest, projection/transport, declarations khác/schema/tool count/names, model/config/budget/corpus/policy/source/static fallback giữ restored baseline. Không thêm combined mutation, cart-dedup, parser/regex/router, template theo case, third runtime model, repair/reverify, retry, gate/store/framework hoặc production wiring. **Net +11 runtime TS lines; 0 roles/layers/gates/stores added.** Independent review là review phương án trước sửa; source sau sửa self-reviewed, không claim independent exact-head approval.

## Exact models và identities

Owner: **Vertex AI/global gemini-3.5-flash-lite High**, version cùng alias; candidate1, text/plain, maxOutputTokens8192, thinking HIGH/includeThoughts=false, omitted temperature/topP defaults, timeout90s, retry0. Route `C3_VERTEX_CREDENTIAL_FILE` đã có.

Verifier: **Codex ChatGPT login gpt-6.1-sol High**, CLI0.159.2/bounded Responses relay; tools=[], tool_choice=none, parallel_tool_calls=false, store=false, stream=true, timeout90s, max response1.048.576 bytes, tối đa một upstream generation/invocation, retry0; client continuation không forward. CLI binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`. Provider không expose immutable builds; alias/version không là immutable revision. Không substitute model/account.

| Identity | SHA256 |
| --- | --- |
| Owner prompt,11.756bytes | `8cb461c2874522915aabdbd7d945768df656577ce60a426d6b7f4636bf5702f3` |
| Verifier prompt,11.646bytes | `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Native B1 declarations | `23867cc18d8d7c1fb37d789960f4807b8129b20cd607551b09021292ed0b40f8` |
| Native composed declarations | `a0b9ab8ae3eaa8fc5193df5f0ac0d0e9524596c0d3fdf2c7a5f2660231f615c3` |
| B1 priority corpus | `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267` |
| Stateful corpus | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |
| Source config | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |

Static fallback **C3_A_NONPROTECTED_V2**: “Phần này em chưa trả lời được, chị nhé.” SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. PASS chỉ eligible sau current final gate, send disabled; FAIL/UNCERTAIN/malformed/error/timeout dùng frozen terminal map. BUDGET dùng cùng static fallback; stale/binding invalidation có thể HANDOFF, changed authority/privacy/permission có thể NO_SEND. Receipt recovery reason vẫn RECEIPT_BACKED_ACK, recipe/source hash frozen; không được dùng như rewrite model final. Không có recovery ACK hoặc static fallback trong provider run này.

## Quan sát chính và limits

Mở đúng AO/be/M×1; đổi bằng hai calls variant L/BE và quantity2 trong một batch, hoàn tất ngay chính lượt đó; báo đúng quote978.100đ; sửa profile74/96 và giữ L/be×2. Bốn exact replies đều được verifier PASS và capture một lần. Không có mixed-action rejection trong run, nên negative guard và ACK evidence nằm ở unit/controlled checks, không giả thành provider coverage.

B1 slot21 verifier PASS cho draft áo M còn/499k, final gate HANDOFF/STALE nên không có sent-eligible text. Chưa có after-readback snapshot/field-level reason để xác định expiry hay binding/snapshot field nào đổi; không kết luận chắc chắn source stock đổi hoặc gate sai. Private checkout CART_ETA_UNAVAILABLE, không preview; mapping địa chỉ→vùng có thẩm quyền còn thiếu theo trace trước. Confirm sau handoff NO_SEND; requested human chỉ chứng minh ownership transfer trong isolated DB, không employee notification/service thật.

Năm B1 cần sửa:3 lựa chọn/lý do còn catalog;5/8 báo cáo hệ thống thay lời shop;13/18 mở bước size/xử lý ngoài B1 read-only. Không relabel policy unsafe chỉ vì thiếu checklist; không lấy keyword hoặc một từ xưng hô để chấm cả lượt. Upsell cả set và lời gợi lớp áo thông thường vẫn được xét theo owner boundary.

Baseline restored tổng24/5/2; treatment bị rollback17/5/9; hiện23/5/3. Stateful từ4USABLE/1EDIT/2unresolved thành5USABLE/2unresolved; B1 từ20USABLE/4EDIT thành18USABLE/5EDIT/1STALE. B1 prompts/read declarations không đổi và không có effect tools này, nên **không quy điểm B1 cho fix đổi giỏ**. Đây là N1, nguồn live có variance, primary chủ quan/non-independent, human acceptance null; không stability/causal proof hoặc23 giao dịch mua.

**A OWNER_BYPASS**, không A2/A3 mới, không a2RunSourceSha/a3RunSourceSha hoặc adversarial false-PASS-rate claim. Verifier semantic boundaries còn history PASS/FAIL gần nghĩa; một run toàn PASS không chứng minh đã ổn định. Max observed owner wire31.352/32.768bytes; long-signature offline variation vẫn vượt bound, không được coi payload đã sửa.

## Accounting, firewall và vận hành

[AUDIT](AUDIT.json), [METRICS](METRICS.json), [REQUEST_ACCOUNTING](REQUEST_ACCOUNTING.json), [COVERAGE](COVERAGE.json), [raw hashes](RAW_HASHES.json).

- **88 invocations / 88 generation HTTP200 =60 owner+28 verifier**, max registered120. Unknown accounting0; generation HTTP error/timeout0/88; verifier error/timeout0/28; automatic retry0. Không invocation bound error hoặc final-only tool violation lần này.
- Cả **28 model finals đều qua verifier**;28 exact bindings,27 exact eligible final drafts. B1 stale draft không được gửi dù verifier PASS. Stateful4 captures khớp exact verified finals; private checkout0 model requests. Final-only requests4, tools-under-NONE0. Không classifier skip verifier.
- **41 raw disk/Git hashes**,60 owner dispatch body hashes,13 frozen input identities khớp. Zero observed evaluator-label/private-fixture leaks trong captures; firewall tests PASS. Prepared/dispatched hashes không phải independent provider-side echo.
- **352.544 input /31.890 output tokens**, usage complete88/88. Cost không expose, không ước tính. Owner auth requests2; Codex auth network count unknown. Owner alias echoed đúng trên60responses.
- B1 source counters cuối là cumulative:0embedding/51catalog/36POS/12policy reads; không cộng snapshots từng attempt. Stateful0embedding; source precheck riêng1embedding/0 owner-verifier. Không gọi đây là toàn bộ network inventory.
- Static fallback **0/31**; handoff **3/31=9,68%**; no-send **1/31=3,23%**. B1handoff1/24=4,17%; statefulhandoff2/7/no-send1/7. Một B1 logical handoff không chứng minh persisted transfer; hai stateful handoff là actual code-owned outcomes.
- Provider DB đã drop/readback true; controlled COD DB cũng drop. Nguồn PostgreSQL/Redis/Qdrant chỉ đọc, delivery capture-only. Không POS order/payment/hold, live customer send, human notification, source/index/policy publication, merge/deploy hoặc Phase C.

Latency nearest-rank, giây; whole turn không gồm build/startup/tunnel:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner generation |60|2,793|5,408|
| Verifier generation |28|7,825|13,248|
| Added verification B1 |24|8,621|13,798|
| Whole B1 turn |24|16,277|22,203|
| Added verification stateful |4|12,139|18,427|
| Whole stateful outcome |7|31,067|63,099|

Stateful includes transaction/readback/delivery drain; code-only/ownership outcomes có denominator khác. Không paired latency experiment, không quy latency riêng cho description/guard.

## Commands và kiểm tra thực sự chạy

[PREPARATION](PREPARATION.md) ghi exact commands trước seal: effect RED38 PASS/5 FAIL→43 PASS, final mixed-cart control44 PASS; full worker130 files/1.799 PASS; focused provider/protocol/comparison47 PASS; protected claims/reply21 PASS; full Node eval489 PASS/0 FAIL/2 existing optional SKIP; worker typecheck/build/lint mỗi command exit0. Offline60captured body checks giữ context/native parts, known long-signature limit được ghi rõ.

Controlled PostgreSQL COD **24/24 PASS**,0 provider generations, DB drop true; clean source72367940/sourceDirty=false. Đây là synthetic domain/current captured policy integration, không source purchase/provider outcome. Bank control không chạy lại lần này và không claim historical bank report là mới. Không shared source changes, fullrepo pnpm check hoặc remote CI PASS claim.

Collection/evidence commands thực sự chạy:

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-action-contract-stateful-unused-20261016 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-action-contract-source-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-action-contract-stateful-20261016 COD --provider-run
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:24 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-action-contract-b1-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-action-contract-preserve-20261016.py
python C:/Users/nguye/AppData/Local/Temp/c3-action-contract-primary-review-20261016.py
node C:/Users/nguye/AppData/Local/Temp/c3-action-contract-audit-20261016.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-action-contract-diagnose-20261016.py
git diff --check
```

Config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED; stateful preflight PREFLIGHT_PASS; source check SOURCE_ADAPTERS_READ_BACK/PASS; tất cả0 owner-verifier generations trước collection. Canonical builds thực sự chạy. Stateful hoàn tất/dropDB trước B1; hai collection commands exit0 vì thu đủ outcomes, không phải sales PASS. Raw byte-exact/-text; frozen Git identities dùng clean filters.

Offline diagnosis invocation đầu chạy song song audit nên METRICS chưa được tạo, FileNotFoundError; đã chạy lại tuần tự sau audit và PASS. Đây là lỗi thứ tự ở tooling offline,0 provider generations, không sửa executable/config/prompt/raw hoặc loại một attempt. Không claim mọi command đều PASS lần đầu.

Dùng [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) và credential/source-session route đã có, không in secrets. Self-review và hash/projection checks giữ scope hẹp. Không post-result runtime/prompt fix hoặc generation thêm.

**Recommendation: STOP sales/live acceptance. Source checkout BLOCKED; A OWNER_BYPASS giữ nguyên.** Không tự mở combined atomic update, đổi verifier/quality bar hoặc tiếp tục Phase C/live.
