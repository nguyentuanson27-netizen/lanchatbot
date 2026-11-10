# Phase B — sửa native contract và chạy lại đầy đủ

**Đã fix, self-review, kiểm tra và chạy đủ 24 B1 + 7 stateful/N1. Kết quả model giảm; recommendation STOP sales/live acceptance.**

| Nhóm | Actual terminal | Review toàn actual outcome |
| --- | --- | --- |
| B1, 24 ca | 21 eligible / 3 static fallback | 16 USABLE / 5 NEEDS_EDIT / 3 FALLBACK_OR_NO_SEND |
| Stateful, 7 lượt | 4 static fallback / 2 handoff / 1 no-send | 1 USABLE / 6 FALLBACK_OR_NO_SEND |

Tổng **17 USABLE / 5 NEEDS_EDIT / 9 FALLBACK_OR_NO_SEND**, so với 24 / 5 / 2 ở run trước. Một USABLE stateful chỉ là requested ownership transfer; ba partial-source controls không phải hành trình mua. **Không có giỏ được tạo trong run mới.** [31 hội thoại](CONVERSATIONS.md) · [Primary từng lượt](PRIMARY_REVIEW.md) · [Finding/root cause/hướng xử lý](FINDINGS.md) · [Trace diagnosis](DIAGNOSIS.json).

## Thay đổi và provenance

[Plan](PLAN.md) · [Scope](SCOPE.md) · [Implementation/RED→GREEN/self-review/commands](PREPARATION.md) · [Frozen inputs](FROZEN_INPUTS.json).

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Intake: `40f400e7d3d121fa12da7a2a02ca1cf8fdccb9ee`.
- Minimum GREEN guard/projection: `a2bc12085e8fe4fbb9ad2b3cd91d668c43365466`.
- Native descriptions/owner/preparation: `dce58d2f0739def5ab59d6947d31e0234cba9b8c`.
- Clean runtime **bRunSourceSha `f2289491ccbf88ad58692060160f29aa1bf6133b`**, captured sau commit/freeze, không ghi ngược vào frozen source làm thay HEAD. Không đổi executable/config/prompt trong collection.
- Raw savepoint `3eef8a448bbce715e07df421bd9d5ab72d1c12a4` trước primary `3672936cdfa651abbe55a8eb24ea7cbbc0602ff2`, trước diagnosis. Đủ 31/31, không nhận kết quả lịch sử, retry, replacement hoặc reseed giỏ sau lỗi.
- Spec Git blobs: architecture `7e0265e3b6b3d556d8fb0f3c7267abccef5de86a`; verifier amendment `4a09b55d2f3a972a65697738876cc5eab21e7a2b`; Phase B execution `a452326d77e4493b88b02c0072cef808fecad2d8`; advisory/chat boundary `5a531cfeb03fcc20e178517a47f5be5a234e1593`. Plan/todo identities ở frozen inputs là bản trước kết quả.

`change_cart_item` validate allowlist theo action trước effects/CAS, không lặng lẽ bỏ quantity khi nhận variant action. Owner projection bỏ full cart chỉ khi khớp exact current public cartItems/cartQuote; giữ operation/receipt, native signed parts và context gốc. Descriptions làm rõ hai action cho variant + quantity; owner thay đoạn advice/policy/voice tại chỗ. Verifier, facts/policy/source, model/config/budgets/corpus/fallback không đổi. Owner 11.756 → 10.835 bytes (−921/−7,83%), nhưng rút descriptions đã làm mất hướng dẫn có ích và run không cải thiện.

Structural complexity delta: **+6 guard / +9 projection runtime lines; 0 semantic roles, layers, gates, stores hoặc framework added.** Không regex/parser/router, per-case production template, third model, semantic repair/reverify hoặc generation retry. Không production entrypoint wiring. Controlled tests không thay thế model evaluation.

## Model, config và frozen identities

Owner: **Vertex AI/global `gemini-3.5-flash-lite`, High**, version cùng alias; candidate 1, text/plain, maxOutputTokens 8192, thinking HIGH/includeThoughts false, omitted temperature/topP defaults, timeout 90s, retry 0. Credential route `C3_VERTEX_CREDENTIAL_FILE` hiện có.

Verifier: **Codex ChatGPT login `gpt-6.1-sol`, High**, CLI 0.159.2, bounded Responses relay; tools=[], tool_choice=none, parallel_tool_calls=false, store=false, stream=true; timeout 90s, max response 1.048.576 bytes, tối đa một upstream generation request/invocation, retry 0. First error kết thúc attempt, client continuation không được forward. CLI binary SHA256 `52f75c649bebb8001102a1dd129c1ea6d02b0940321e6d7e82ee0526753bd58a`.

Provider không expose immutable model build; alias/version không phải immutable revision. Không đổi model/account hoặc substitute. Owner giới hạn 3 generations / 2 tool rounds / 6 calls; exact wire bound 32.768 bytes. Verifier chỉ chấm exact final, không tool/retrieval/effect/write/rewrite/send.

| Identity | SHA256 |
| --- | --- |
| Owner prompt | `0b8f38a8f9f4818ebd993cdabb52a5d0740a2c766082807cbdbea227489f72d8` |
| Verifier prompt | `b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24` |
| Verdict schema | `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97` |
| Native declarations B1 | `93df1cba0e430bd14bdf9758682c6059625f569ac45c13c1e2e79246a9134e5a` |
| Native declarations composed | `b67fff7b6f8ab9600ae47d75b805789520433092dd71f8d5e5c7959a8fb75e70` |
| B1 priority corpus | `8f858e80f27984008e5d29d87d421645ee1b3c53631e09b31c4c2ea7eb722267` |
| Stateful corpus | `51d53b26a9d85ee37786a269df1700cbbe9b4b2fd16ec243bc4a2bce56f3a749` |
| Source config | `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e` |

Static fallback **C3_A_NONPROTECTED_V2**: “Phần này em chưa trả lời được, chị nhé.” SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. PASS qua final deterministic gate mới eligible, send disabled; FAIL/UNCERTAIN/malformed/error/timeout dùng frozen fallback theo map. BUDGET dùng cùng static fallback. Private dependency/requested human handoff là committed ownership outcomes, không phải thông báo nhân viên thật đã nhận; changed authority dẫn NO_SEND. Chi tiết terminal map/bounds/serialization/file hashes trong frozen inputs và raw registration.

## Kết quả và giới hạn

B1 fallback ở slot **1/5/23**: claim kết quả dưới đèn mạnh; biến POS unavailable thành không bán rời; so sánh set 799k “kinh tế hơn” áo 499k chưa rõ cơ sở. Hai ca đầu có căn cứ để chặn; ca thứ ba cần xét nghĩa so sánh, không được coi upsell là lỗi. Schema verdict chỉ có kind/ref, không expose rationale chính xác. Năm eligible replies cần sửa giọng/quyết định hoặc bước size vượt availableTools; xem whole-turn review, không chấm theo keyword.

Bốn lượt stateful đầu cùng bỏ màu khỏi add_to_cart, nhận CART_VARIANT_AMBIGUOUS rồi cố gọi tool ở generation cuối đã NONE. Runtime giữ đúng budget, không execute. Giỏ null; private checkout **PLANNER / NO_TRANSITION_PLAN**, confirm NO_SEND sau handoff. Lượt này **chưa thực thi đến kiểm ETA**. Mapping địa chỉ → vùng ETA có thẩm quyền vẫn là dependency chưa giải quyết từ source trace trước; không tự dựng mapping. Không có successful cart continuation để chứng minh projection mới hoặc variant+quantity fix cải thiện provider flow.

Không quy regression riêng cho một đoạn prompt: native descriptions và owner cùng đổi, N1, không matched paired experiment. Primary chủ quan/non-independent, human acceptance null; không sửa rubric/điểm để cứu run. **A vẫn OWNER_BYPASS, không A2/A3 mới**, không gán a2RunSourceSha/a3RunSourceSha hoặc báo A PASS từ B. Không suy false-PASS rate, conversion hoặc độ ổn định từ population này.

## Request, binding, token và latency

[AUDIT](AUDIT.json) · [METRICS](METRICS.json) · [REQUEST_ACCOUNTING](REQUEST_ACCOUNTING.json) · [COVERAGE](COVERAGE.json) · [Raw hashes](RAW_HASHES.json).

- **89 unique invocations / 89 generation HTTP200 = 65 owner + 24 verifier**, max đăng ký 120; unknown accounting 0, automatic retry 0, generation HTTP error/timeout 0/89, verifier error/timeout 0/24. Tool-contract/BUDGET failures vẫn ở denominator, không bị gọi là provider errors.
- Cả **24 generated finals đều verify**, 24 exact request/draft/context bindings; 21 eligible texts đúng exact final draft. Stateful không có model final/eligible capture; bốn tool outputs dưới NONE không được thực thi. Tổng final-only requests 8, bốn trong đó vi phạm bằng tool output. Không skip verifier bằng classifier.
- **42 raw disk/Git hashes**, 65 owner dispatch body hashes, 13 frozen input identities khớp. Zero observed evaluator-label/private-fixture leaks trong captures; private checkout 0 model requests. Prepared/dispatched hashes không phải independent provider-side echo.
- Usage **337.379 input / 30.401 output tokens**, complete 89/89 invocations. Cost không expose, không ước tính. Owner auth requests 2; Codex auth network count unknown. Alias owner echo cùng `gemini-3.5-flash-lite` trên 65 responses.
- B1 cumulative counters cuối: 0 embedding / 53 catalog / 38 POS / 12 policy reads. Không cộng cumulative snapshots của 24 attempts. Stateful 0 embedding; source precheck riêng có 1 embedding, 0 owner/verifier generations. Đây không phải toàn bộ network inventory.
- Static fallback **7/31 = 22,58%**; handoff **2/31 = 6,45%**; no-send **1/31 = 3,23%**. B1 fallback 3/24; stateful fallback 4/7, handoff 2/7, no-send 1/7. Primary category 9 FALLBACK_OR_NO_SEND khác với 7 static fallbacks vì requested human handoff được chấm USABLE.
- Disposable provider DB đã drop/readback true; cả hai controlled DB cũng drop. Nguồn PostgreSQL, Redis/Qdrant chỉ đọc, delivery capture-only. Không POS order/payment/hold, customer send, human notification hoặc source/index/policy publication.

Latency nearest-rank, giây; whole turn không gồm startup/build/tunnel:

| Boundary | N | p50 | p95 |
| --- | --- | --- | --- |
| Owner invocation | 65 | 2,367 | 3,968 |
| Verifier generation | 24 | 7,383 | 10,271 |
| Added verification — B1 | 24 | 8,112 | 10,932 |
| Whole B1 turn | 24 | 14,179 | 19,646 |
| Added verification — stateful | 0 | Không thực thi | Không thực thi |
| Whole stateful outcome | 7 | 30,335 | 37,108 |

Stateful whole time gồm tool/transaction/delivery drain; code-only và ownership stop thay denominator. Không có paired latency study. Max observed owner wire 29.616 bytes; verifier prepared request max 21.463 bytes. Offline 60 captures/long-signature variation trong [preparation](PREPARATION.md) không chứng minh mọi signature tương lai đều vừa.

## Commands thực sự chạy và checks

[PREPARATION](PREPARATION.md) ghi commands, intermediate failures và RED→GREEN: effect **41 PASS**, adapter **29 PASS**, provider/protocol/comparison **50 PASS**, protected claims/reply **21 PASS**, full worker **130 files / 1.796 PASS**. Full Node eval đầu **491 PASS / 1 FAIL / 2 optional SKIP**; isolated historical round56 **7 PASS**, rerun full **492 PASS / 0 FAIL / 2 existing optional SKIP**, không sửa source/test/timeout để cứu. First failure chưa rõ nguyên nhân, không claim luôn ổn định. Worker typecheck/build/lint mỗi command exit 0; no shared source change, không fullrepo pnpm check/remote CI PASS claim.

Controlled COD/bank integration **24/24 PASS mỗi loại**, 0 provider generations, raw trong controls/. Chạy ở preparation a2bc1208/sourceDirty true trước commit descriptions/prompt/docs; không gọi là sealed provider result hoặc source purchase. Dùng [Lana Chatbot Ops skill](../../../../../plugins/lana-chatbot-ops/skills/lana-chatbot-ops/SKILL.md) và route hiện có, không in secrets.

Collection/evidence commands thực sự chạy:

```text
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --preflight --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-native-contract-stateful-unused-20261016 COD --provider-preflight
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --source-check --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-native-contract-source-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/run.mjs --run --range 1:24 --config apps/worker/evals/single-agent-commerce-read-only/source-config.b1.json --cases apps/worker/evals/single-agent-commerce-read-only/context-fix-20261016/cases.priority.json --out C:/Users/nguye/AppData/Local/Temp/c3-native-contract-b1-20261016
python C:/Users/nguye/AppData/Local/Temp/c3-offer-replay-session-20261016.py node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs C:/Users/nguye/AppData/Local/Temp/c3-native-contract-stateful-20261016 COD --provider-run
python C:/Users/nguye/AppData/Local/Temp/c3-native-contract-preserve-20261016.py
python C:/Users/nguye/AppData/Local/Temp/c3-native-contract-primary-review-20261016.py
node C:/Users/nguye/AppData/Local/Temp/c3-native-contract-audit-20261016.mjs
python C:/Users/nguye/AppData/Local/Temp/c3-native-contract-diagnose-20261016.py
git diff --check
```

Config preflight CONFIG_READY_CONNECTIONS_UNVERIFIED; stateful preflight PASS; source check SOURCE_ADAPTERS_READ_BACK/PASS; tất cả 0 owner/verifier generations trước collection. Canonical builds thực sự chạy; stateful bắt đầu sau B1 build/registration, không đọc dist đang compile. Hai collection commands exit 0 vì đã thu đủ outcomes, không phải sales PASS. Preservation/review/audit/diagnosis đều offline. Raw được giữ byte-exact với -text; frozen working-file Git identities dùng clean filters.

**Recommendation: STOP sales/live acceptance. Source checkout BLOCKED; A OWNER_BYPASS giữ nguyên.** Không post-result fix/extra generation, Phase C, source publication, merge/deploy hoặc live action. Hướng sửa tiếp theo đã ghi cụ thể trong FINDINGS; chưa được tính là sửa xong.
