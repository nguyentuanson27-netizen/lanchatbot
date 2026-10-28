# B1 — đối chiếu Gemini High và Sol Low trên hai ca lỗi

**Recommendation: STOP.** Đã thực hiện đủ **12/12** outcome (hai ca ×3lần/model), không chạy bù. Sol Low có6/6reply được gate cho qua, primary thấy dùng được trong phạm vi hai câu hỏi; Gemini có4 fallback/6 và một câu sai về eligibility vẫn được verifier cho qua. Sol còn dài và giọng giải trình, chưa chứng minh hội thoại bán hàng tự nhiên hoặc native tool ownership.

| Ca | Gemini 3.5 Flash Lite High | GPT-6.1 Sol Low |
|---|---|---|
| Sân khấu/độ kín |1/3 eligible;2 fallback;1 dùng được|3/3 eligible, có quyết định hợp lý; còn dài|
| Đổi màu sau10ngày/phí |1/3 eligible nhưng cấp quyền rộng hơn nguồn;2 fallback;0 dùng được|3/3 eligible; trả thời hạn/phí và giữ phần xét đơn chưa biết|
| Tổng |2/6 eligible,4 fallback,1 observed unsafe eligible|6/6 eligible,0fallback,0 observed unsafe eligible|

Đây là primary review chủ quan của toàn câu hỏi/lịch sử/terminal, không điểm từ khóa và không human acceptance.7/12 outcome được nhận xét functional adequate (Sol6, Gemini1); không chuyển thành một A3 score mới.120human dimension ratings vẫnnull. [Đủ12hội thoại](CONVERSATIONS.md), [primary](PRIMARY_REVIEW.json), [4 fallback+1unsafe](FAILURES.md).

## Identity và phạm vi

- implementationBaseSha / refreshed main: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`.
- Starting implementation/spec source: `9bc8d25743dbea12f45fe316a361f7e263bd509f`.
- comparisonRunSourceSha: `695f126db30aeeb5369bb2eefefedd8fafd24c64`; clean executable/config HEAD captured runtime, preflight cùng SHA, source không đổi trong dispatch.
- Raw commit `23beeb81324fe870812d981484172673a3a019b8`; primary commit `eeaa1b019172fc63a24aacf8e0634ad7d6439412`; rejection diagnostics chỉ sau primary.
- [B1 plan](../../../../../docs/specs/c3-phase-b-read-only-integration-plan-20261014.md), [B execution](../../../../../docs/specs/c3-phase-b-execution-20261014.md), [frozen scope](SCOPE.md), [exact manifest](manifest.json).
- Surface **POST_READ_OWNER_DIAGNOSTIC**: code preload nguồn LIVE qua PostgreSQL policy, Redis POS, Qdrant product, rồi owner một generation để viết exact final customer text. Hai arm cùng prompt/lịch sử/source text; no native model tool call, không source fault injection/replay. Sol native B1 tool calling chưa được implement/verified qua phép thử này.
- A2/A3: **NOT_RUN trong đợt này**. Checkpoint A trước vẫn OWNER_BYPASS; đây không phải A GO, full B1 qualification, model promotion hoặc quyền triển khai Phase C/deploy/live send. Năm control B1 còn lại không chạy lại.

## Models, inputs và boundary

Gemini provider VERTEX_AI, `gemini-3.5-flash-lite`/same version alias, global, High, candidateCount1, maxOutput8192, text/plain, thinkingLevelHIGH/includeThoughtsfalse; temperature/topP omitted provider default. Credential routeC3_VERTEX_CREDENTIAL_FILE giữ trong process.

Sol owner provider OPENAI, `gpt-6.1-sol`/same version alias, **Low**; verifier cùng model **High**. Codex ChatGPT login, CLI0.159.2, bounded Responses relay, streamtrue/storefalse/tools[], tool_choice none, parallel false, maxOutputTokens omitted for backend, maxResponseBytes1048576. User config bị bỏ; captured wire6 Sol owner dùnglow và12 verifier dùnghigh. Returned modelVersion khớp alias đã đăng ký ở24 generations; không có dated immutable provider snapshot được expose. [Request accounting](REQUEST_ACCOUNTING.json).

Mỗi generation tối đa1upstream, no automatic retry. Timeout90s; draft≤4096bytes, request≤32768bytes, latest≤2048bytes, history≤8/4096bytes. Mọi12 final drafts sống hard precheck đều có một verifier, rồi existing source readback/final deterministic gate.12draft/hash/snapshot bindings được đối chiếu;8 eligible có readback unchanged. Không classifier skip verifier, rewrite, repair/reverify hoặc send.

Hashes:

- Owner prompt: `d6ba7b6c3a4705fcab140a0d74b527ce9b36ebb9639c1b7cf470eb48a3c02a67`.
- Verifier prompt: `fe7e21965c6cc608c854b97f2513130c9d2f39cf5bec443f4a637f7d8e6f7957`.
- Verdict schema: `76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97`.
- Registered source-case file: `a5c2f5e6f1af91acb84ea5ebe865536dfa5a5148360e004a25d22551b7582059`.
- Source config: `5ca8dc68da2a11d6a29bb9d03617686f3116a3e43b8c646da0b012212bcefb6e`.
- Owner input text hashes: stage `3263c693ba8ea2f52ec9849b59902a4d6d46ada14460c5e0b238c4e17fd6fa57`; policy `491d86789678ce8b900a1e21b8ca9dee11108adec92097d40ab112f2a8160536`. Cả6body/ca cùng hash (instructions + ordered text contents), kể cả qua hai native role encodings khác provider.

Runtime chỉ nhận latest/history/initialProductCodes từ allowlist. RequestId là SHA256 của runSourceSha + slot opaque; binding exact draft + trusted snapshot/state/fact/revision/recipient dùng code hiện có. Trusted state allowlist và JSON serialization tái dùng B builder/context; sourceReads giữ actual results, strip nguyên nhân vận hành khỏi availability cho owner như native B. CaseId/split/expected/rubric/behavior tags/repetition không vào provider input.30captured body records được audit (12 owner projections +18OpenAI relay captures), **24unique generation requests**, không phải30lượt. Tests intercept actual Gemini fetch và relay body; runtime builder/body equality cùng frozen source. [Structural audit](AUDIT.json), [metrics](METRICS.json).

Terminal map vẫn như manifest: PASS + current valid→SEND_ELIGIBLE (send disabled); FAIL/UNCERTAIN/malformed/provider failure→code static fallback; state/freshness invalidation→existing handoff/no-send. Quan sát thực tế:8SEND_ELIGIBLE,4FALLBACK,0HANDOFF,0NO_SEND. Fallback ID `C3_A_NONPROTECTED_V2`, text **Phần này em chưa trả lời được, chị nhé.**, SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`. Không hứa đã handoff hoặc salvage/rewrite draft.

## Code đã sửa và self-review

1. Đường so sánh evaluation-only tái dùng Gemini adapter, Codex bounded text relay, runCommerceTurn, verifier và gate. Sol dùng documented Responses history string-content form. Không đổi prompt/schema/labels/bars/fallback hoặc native Gemini default.
2. Builder Gemini hỗ trợ declarations rỗng thành tools[]; diagnostic từ chối provider tool output dù modeNONE. Default ba native B tool không đổi. Tests captured wire giữ đúng runtime projection, explicitLow, all12repetitions/error accounting.
3. Preflight phát hiện **cache policy5s**: read_policy + readback chỉ load pointers1lần. Regression composition với cùng clock cho thấy source thay đổi vẫn trả bản cũ, hoặc source unavailable vẫn dùng cache. Sửa candidate source port bằng `resolver.invalidate(pageId, channel)` trước resolve; source lỗi LAST_KNOWN_GOOD bị existing tools reject. Fixture cũ tạo resolver mới trong callback đã che seam cache; chỉ tách factory pointers của fixture để test resolver/composer thật.

Đã quan sát RED (5PASS/2FAIL) rồi GREEN90focused, full126files/1715worker tests, typecheck/build/lint. Preflight cuối thật ghi policyReads2 cho read+readback; batch có12policyReads qua6policy outcomes. Không publish policy hoặc sửa DB live để tạo test. Hai preliminary seals0generation: b11ac53a preflightPASS,97dcbbc4 preflight bị dừng trước generation khi phát hiện cache; không có attempt provider bị bỏ khỏi denominator.

Complexity delta: một CLI diagnostic + hai transport wrappers nhỏ,6 Node tests; port source thêm một invalidate của API có sẵn,2 TS regression và tái dùng fixture. Một dòng builder hỗ trợ empty declarations. Không thêm runtime gate/operator/schema/store/framework/semantic parser/regex/template/third role. Semantic roles mỗi attempt vẫn one owner + one verifier. Production entrypoint, shared packages và historical A/B evidence không đổi.18raw/preflight disk+Git blobs verified; source seal không ghi ngược SHA vào frozen source.

## Quan sát vận hành

24/24 generation requests (12 owner +12 verifier), max 1/request, retry0;24HTTP200,0provider errors/24,0timeouts/24. Auth requests không phải generation. Source domain counts catalog18/POS12/policy12, không phải HTTP/query counts tương đương1:1.

| Sample latency | p50 | p95 |
|---|---:|---:|
| Verifier (n12) |7.69s|12.90s|
| Added verifier + final readback (n12)|8.39s|13.54s|
| Whole attempt, gồm source preload (n12)|15.12s|21.68s|
| Whole attempt Gemini arm (n6)|18.72s|22.50s|
| Whole attempt Sol arm (n6)|14.34s|15.29s|

Owner median Gemini5.56s, Sol6.91s: không kết luận Sol sinh câu nhanh hơn. E2E còn phụ thuộc verifier/draft. Quantiles nội suy mẫu nhỏ, gồm local transport/auth/API, không gồm setup/compile; không suy thành SLA.

Tokens reported ở cả24 generations: owner input37755/output9397; verifier input41060/output2279. Gemini owner input18933/output8644; Sol owner input18822/output753. Output gồm thinking khi provider tính vào usage, không đồng nghĩa reply Gemini dài gấp tỷ lệ này. Cost **null/not exposed**, không ước lượng hoặc gọi miễn phí.

## Finding và bước xử lý cần chốt tiếp

**Owner:** Gemini vẫn suy cấu tạo/kết quả dưới đèn từ tên chất liệu và biến phần điều kiện đã biết thành đủ điều kiện toàn đơn. Sol 6/6giữ giới hạn căn cứ dưới cùng text input; đây là lý do đáng thử Sol cho B tiếp, chưa đủ khẳng định model hơn trong toàn bán hàng. Catalog chưa có opacity/lining nên chưa thể tư vấn mua tự tin cho yêu cầu đó; dữ liệu thực cần bổ sung thay vì bịa hoặc bắt khách cung cấp.

**Verifier:** slots3/7/11 có cùng vấn đề quyền đổi,2FAIL/1PASS. Slot7 là **1 observed unsafe send-eligible PASS**; không chấp nhận nó vì hai lần khác đã chặn. Đây là ba draft khác nhau, chưa đo variance của exact cùng draft. Phát hiện sau full dispatch/primary, không có provider request tiếp theo. Policy prompt hiện đã cấm lấy phần biết thành đủ quyền; lời này chưa làm boundary ổn định. Không giải quyết bằng check thiếu từ/cấm từ “được”.

**Context:** đủ rules cho15 ngày/30k/max 1, không có private order eligibility là giới hạn thật của B1. Owner source-read payload có SHOP_RULES/orderEligibilitynull; verifier nhận policy literal/rules mà không có scope marker ấy rõ như owner. Có thể đưa chính metadata phạm vi nguồn đang có vào context verifier, rồi kiểm exact slot7 cùng đối chứng safe chỉ xác nhận thời hạn; đây là giả thuyết cho scope mới, chưa chứng minh sẽ fix. Không thêm parser/eligibility do model tự tính hoặc gate mới.

**Giọng:** Sol còn chuyển giải thích nội bộ về căn cứ ra thành tin khách, nhắc nguyên hoàn cảnh và lặp nhiều điều kiện vừa được kể; stage2/10 có câu tự giải thích thừa, policy cả3reply dài. Một fact dùng giải thích như10ngày vẫn trong hạn là hợp lý. Cần chỉnh toàn nhiệm vụ diễn đạt, không thêm đáp án mẫu theo hai ca hoặc cắt/rewrite reply sau verifier.

Ưu tiên scope kế tiếp: giữ Sol Low làm candidate để kiểm native B1 riêng; kiểm lại boundary eligibility bằng exact unsafe draft + safe contrast trước khi mở rộng; xử lý giọng gọn bằng review cả reply. Không tự chạy thêm trong delivery này. **STOP**, không model promotion/deploy/Phase C; [commands thực sự chạy](COMMANDS.md), [readiness evidence](PREPARATION.json).
