# Kế hoạch C3 Phase B — nối nghiệp vụ vào conversational owner

**Ngày:** 2026-10-14, Asia/Saigon. **Trạng thái:** kế hoạch để owner review; chưa triển khai hoặc gọi provider. Owner yêu cầu “lập kế hoạch B đi” sau [quyết định OWNER_BYPASS](c3-checkpoint-a-owner-bypass-20261014.md).

**Planning base:** `e5e54c85da5045d0529dd1bbe61c2fde8dd96c8b`, branch `feat/c3-semantic-verifier-checkpoint-a-20261005`, draft PR390. Đã refresh `origin/main`: `296cdcfbf5759f5bf9cbb24acf3dc63005589361`. Đây là identity lúc lập kế hoạch, chưa phải implementation/run SHA của B.

Nguồn: [architecture §§1.1, 6–8, 10–11, 13–16](c3-single-agent-commerce-architecture-20261004.md), [amendment §§6–9, 11–12](c3-semantic-verifier-boundary-amendment-20261005.md), [plan A §11](../../tasks/plan.md#11-post-a-compatibility-skeleton--not-implementation-tasks). “Phase B” ở đây là giai đoạn xây hành vi candidate; **không phải Gate B để thay C3** trong spec.

## 1. Kết quả cần có

Bot lấy được dữ liệu shop qua code, hiểu câu hỏi và viết lời tư vấn bán hàng có căn cứ. Đổi policy hoặc dữ liệu nguồn phải đổi được câu trả lời mà không sửa prompt. Khách hỏi giá thì trả giá; khi khách đổi hoàn cảnh, bot dùng dữ liệu hiện có để đổi lời khuyên. Dữ liệu thiếu được ghi thành việc bổ sung cho shop, không bịa thêm hoặc bắt khách cung cấp dữ liệu sản phẩm.

B bắt đầu bằng một candidate **send-disabled**, đứng ngoài production entrypoint. Lát cắt đầu tiên chỉ đọc policy/sản phẩm. Lựa chọn size theo thông tin mới, quote phụ thuộc state, ghi giỏ/đơn và recovery đi sau theo dependency bên dưới. Không hứa rằng nối nguồn sẽ tự sửa toàn bộ lỗi hiểu ý, giọng văn hoặc verifier.

| Thứ tự | Phạm vi | Điểm kết thúc |
| --- | --- | --- |
| **B1 — chi tiết trong tài liệu này** | Đọc policy, tìm sản phẩm, đọc thuộc tính/bảng size/giá/tồn; vòng tool hữu hạn; exact reply → verifier → current final gate; không send/write | Báo cáo tích hợp B1 và các giới hạn quan sát được |
| **B2 — kế hoạch chi tiết tiếp theo** | Bounded refs qua nhiều lượt; accepted customer state trước tool phụ thuộc; size/fit và quote theo đúng revision | Correction/clear/replace, thiếu đầu vào, conflict và tính toán không đọc state cũ |
| **B3 — sau B2** | Mutation permission/idempotency, receipt/readback, ambiguous reconciliation và post-effect recovery | Không tạo trùng, không báo thành công giả, không replay effect khi lỗi reply |
| **C — sau hành vi B** | Absolute target, sealed safety holdout, paired/stateful matched C3 comparison, real-adapter qualification, quyết định replacement | Plan qualification/rollout riêng; không được suy từ bypass A hoặc B1 |

Yêu cầu hiện tại chỉ lập kế hoạch. B1 là scope đề nghị triển khai đầu tiên sau owner review; không mở toàn bộ B2/B3/C cùng lúc.

## 2. Ranh giới giữ nguyên

- Một conversational owner, tối đa một semantic verifier. Owner hiện là Vertex `gemini-3.5-flash-lite` / high; verifier `gpt-6.1-sol` / high qua route Codex đã dùng. Không tự đổi model/provider/effort.
- Code giữ identity, truth, freshness, state, permission, effects, receipts và privacy. Verifier không tool/retrieval riêng, ghi state, effect, rewrite hay send.
- Mọi exact final draft sống sót hard precheck phải qua verifier một lần và final gate. Không classifier để bỏ verifier; không sửa chữ sau PASS.
- Không Producer/Strategist/Responder, obligation/intent JSON làm ownership surface, semantic router/parser, regex/template theo ca, repair/reverify loop hoặc durable semantic memory mới.
- B1 không tạo Outbox, ghi history live, pin policy, ghi profile/cart, tag/handoff thật hoặc send. `SEND_ELIGIBLE` là kết quả đánh giá; `sendEnabled=false` vẫn cố định.
- A2 qualification FAIL, full A3 38/42 FAIL và recheck riêng 3/3 giữ nguyên. Không cần A PASS để bắt đầu B theo owner bypass; qualification trước sử dụng production vẫn phải làm theo amendment §12.

## 3. Kiểm kê nguồn và code tái sử dụng

Kiểm kê này xác nhận đường source/interface trong repo. **Chưa xác nhận kết nối, credentials đọc-only, dữ liệu đầy đủ hoặc version đang chạy của nguồn thật.**

| Dữ liệu | Đường có sẵn | Quy tắc nối B1 |
| --- | --- | --- |
| Policy, offer, bảng size | `PostgresRuntimePolicyStore.loadActivePointers` trong `packages/database/src/runtime-policy.ts`; `RuntimePolicyResolver` trong `packages/chat-runtime/src/runtime-policy-resolver.ts`; `ShopPolicyAdminContentV1.customerCare` trong contracts | Dùng source/page/channel được chỉ định, schema/hash/version/pointer revision đã xác minh. `customerCare` optional: thiếu thì báo thiếu, không lấy corpus làm policy live. |
| Giá, tồn, BOM, fulfillment | `BusinessFactsReader` / `RedisBusinessFactsReader` trong `apps/worker/src/redis-business-facts.ts`; `realtime-sales-catalog.ts`; `buildRealtimeProductFactsV2` | Redis là POS snapshot đã ingest, không phải truy vấn POS live mới. Kiểm freshness bằng resolver/domain rules hiện có; đọc raw snapshot thành công chưa đủ để cấp facts. |
| Tìm mẫu, thuộc tính, ảnh đã duyệt | `ProductSearchService`, `QdrantStableCatalogSearchAdapter`, `StableProductDocument`, `ProductAttributesV1` | Exact code/alias/search theo service hiện có; lấy canonical identity từ kết quả server. Qdrant không làm nguồn giá/tồn/quyền lợi. Không suy chất liệu/fit từ ảnh hoặc description chưa xác minh. |
| Evidence sản phẩm | `verifyProductAttributesV1`, `build/verifyProductPresentationEvidenceV1`, `ProtectedClaimV1` builders | Giữ hash/authority/version/scope gốc. Presentation evidence hiện chỉ xác nhận tên/variant, không chứng minh mọi lợi ích mặc. |
| State/history hiện có | `CustomerProfileV1`, `mergeCustomerProfile`; `PostgresChatHistoryStore.listConversationHistory`; verified product context | B1 nhận read-only pre-turn context qua port hẹp; không nối writer/history recorder. B2 mới nhận đề xuất sửa state và gọi tool phụ thuộc. |
| Size, quote, commerce | `recommendSize`, `createVerifiedSizeRecommendationClaim`, `evaluateShopPolicy`, canonical cart engine | Tái sử dụng ở B2/B3. Không gọi cart engine để giả lập rằng đã có cart hoặc receipt trong B1. |
| Egress | `single-agent-semantic-verifier-boundary.ts`, `realtime-protected-claim-boundary.ts` | Mở rộng tối thiểu để nhận evidence nguồn thật; giữ kiểm exact hash/current snapshot và lỗi fail-closed. Không wire realtime runner/server. |

Ba chỗ không được cắm nguyên xi:

1. `RuntimePolicyResolver.resolve` có thể ghi pin/audit khi được cấp ports đó. Composition B1 chỉ cấp `loadActivePointers`, không cấp pin/audit writer và không truyền `pin`. Freeze đúng page/channel có nguồn được duyệt; ưu tiên `CANARY_SHADOW` khi nguồn đó có sẵn, không tạo pointer hoặc đổi lifecycle để phục vụ demo. Giữ nguyên marker nguồn: đọc bundle `PUBLISHED` không cấp capability gửi tin cho B1, cũng không đổi nhãn nó thành shadow. Không sửa `outboundRuntimePolicy`; dùng bundle đã validate trong composition candidate luôn send-disabled, không kích hoạt cờ outbound của runtime.
2. `RedisCachedProductSearch` có nhánh ghi cache cho image search. B1 dùng `ProductSearchService` với adapter tìm kiếm đọc-only; chỉ mở text/code search và metadata ảnh sẵn có, chưa mở tải ảnh tùy ý. Embedding nếu cần dùng đúng cấu hình index hiện có, đếm riêng request, không thêm conversational role.
3. Boundary A nhận `ProductProfile.authority=EVALUATION_FIXTURE` và gộp một `sourceVersion`. B1 phải nhận các evidence type đã có, giữ version/freshness từng nguồn; không đổi nhãn fixture thành nguồn thật. Không dùng fallback timestamp `now` để làm mới dữ liệu thiếu thời gian quan sát.

Boundary A còn yêu cầu một current product cho mọi draft và chỉ truyền product IDs vào claim authorization. B1 phải hỗ trợ lượt policy/clarification không có sản phẩm bằng absence rõ ràng, không tạo product giả; product claim vẫn cần binding thật. Với variant, truyền expected product/variant scope đã có trong `authorizeRealtimeProtectedClaimProposal`, không chỉ so parent ID. Các thay đổi hẹp này cần regression riêng trong B1.1.

## 4. Luồng B1 và contract nhỏ nhất

```text
code-owned scope + pre-turn context + recent dialogue
    → cùng owner: final text HOẶC native function calls
    → code kiểm tool/args/refs → nguồn/domain readers → typed results
    → cùng owner nhận nguyên hội thoại và kết quả mới
    → exact final text → hard precheck → verifier → current readback/final gate
    → terminal outcome + telemetry; sendEnabled=false
```

Nếu context đã có facts hợp lệ thì owner trả lời ngay, không bắt gọi tool. Chỉ gọi lại owner khi có tool result hoặc failure mới. Không lưu/đòi hidden reasoning để duy trì “same agent”.

Chỉ ba tool ở B1, tên cuối cùng freeze cùng source trước provider run:

| Tool | Model được gửi | Code tự gắn / kết quả |
| --- | --- | --- |
| `search_products` | Query text có giới hạn | Shop/page/conversation lấy từ scope; tối đa 3 candidate và refs do code cấp. Không tự chọn subject khi ambiguous. |
| `read_product` | `subjectRef`, color/size nếu khách đã chọn | Resolve ref trong turn; đọc profile/attributes/chart và giá/tồn đúng parent/offer/variant. Size ở đây là biến thể cần xem tồn, không phải model tự chọn size hợp người. |
| `read_policy` | Không có protected identity hoặc quyền tự chọn policy version | Trả public policy/offer đang được nguồn cho phép, version/hash; không lộ internal concession strategy hoặc private checkout. |

Không nhận tenant/page/customer/conversation ID, raw product/cart/order ID, revision, permission hoặc receipt từ model. Query tìm kiếm không cấp quyền chọn sản phẩm bất kỳ ngoài kết quả server. Schema tool chặn unknown field/tool, wrong scope, stale ref và giá trị ngoài domain trước I/O.

**Budget đề nghị cho B1:** tối đa 3 owner generations, 2 tool rounds, 6 domain tool calls mỗi turn, tối đa 1 verifier generation cho final draft. Independent reads cùng round; search → đọc mẫu tìm được là dependency hợp lệ. Không có automatic generation retry. Auth/401/429/5xx/timeout/stream thiếu completed verdict kết thúc generation hiện tại; không dùng owner continuation để thử lại generation lỗi. Token refresh chỉ cho attempt sau. Duplicate tool calls vẫn tính budget; không có vòng tool chỉ để viết lại câu cho verifier.

Mỗi owner invocation có generation ID/request accounting riêng, cùng turn ID; continuation chỉ hợp lệ sau kết quả tool mới. Đây là budget B được đăng ký trước run, không sửa quy tắc một generation/A attempt hoặc tái dùng attempt ID của A. Verifier vẫn chỉ một request trên exact final draft.

Khi hết budget mà chưa có final text: dùng fallback code-owned; không lấy intermediate prose/tool plan làm câu gửi khách. Kết quả tool thành công trước một tool lỗi vẫn được giữ; owner có thể dùng phần đó để trả lời phần có căn cứ trong continuation còn ngân sách. Nếu exact final draft không qua verifier thì dùng terminal disposition đã freeze, không tự dựng partial protected fallback.

**Đầu vào B1:** kế thừa bounds A ở phần không đổi: history tối đa 8 message/4.096 UTF-8 bytes, latest 2.048 bytes, exact draft/verdict mỗi phần 4.096 bytes, tối đa 8 subject/32 claims/16 violations, trusted/verifier input tối đa 32.768 bytes; token upper bound bảo thủ bằng bytes. Context owner gồm tool declarations/transcript cũng phải nằm trong 32.768 bytes; tool results tổng không quá 8.192 bytes/round, query không quá 512 bytes. Không cắt mất điều kiện policy hoặc một nửa bảng size để vừa bound: trả trạng thái thiếu/oversized hoặc dùng scope nhỏ hơn. B1.1 kiểm chứng các con số này đủ cho contract; thay đổi phải được ghi trước generation.

State allowlist kế thừa: `conversationOwner`, `revision`, `currentProductId`, `consideredSize`, `salesStage`, `factSnapshotVersion`, `bindingVersion`, `recipient`, `permission`, `privacyAllowed`, `customerProfileId`, `customerProfileRevision`, `measurementFingerprint`. Model chỉ thấy phần tối thiểu cần cho vai trò; code giữ protected scope/permission. Customer/history/retrieved strings là data, không thành instructions. Evaluator labels không vào request.

**B1 chưa mở tool chọn size hoặc quote cá nhân hóa.** Bảng size là dữ liệu sản phẩm; B1 không copy SIZE_FIT từ history/fixture thành trusted result. Khách sửa số đo/cân nặng thì không được lấy fit claim cũ để tư vấn như đã chấp nhận correction. Những đường phụ thuộc thông tin mới được đánh dấu chưa hỗ trợ ở B1 và triển khai tại B2. Không âm thầm làm state proposal trong một tool “read-only”.

## 5. Công việc B1 theo thứ tự

Mỗi task là một savepoint nhỏ, tối đa khoảng 5 file. Code source giữ TypeScript/stack hiện có; harness Node chỉ phục vụ send-disabled. Không thêm framework hoặc package mới. Tên file **mới dự kiến** được ghi rõ; implementation có thể gộp khi thực sự nhỏ, không tách thêm layer chỉ để đúng sơ đồ.

Dependency: **B1.1 → B1.2 → B1.3 → B1.4 → B1.5 → B1.6**. Mỗi bước reuse kết quả/tests của bước trước; không gọi provider trước khi source, contracts và relevant checks hoàn tất. Các savepoint giữ candidate isolated và chạy được với fake ports; chưa nối entrypoint live ở bất kỳ bước nào.

### B1.1 — Khóa contract nguồn thật và current snapshot

**Làm:** xác định page/shop/channel, cấu hình đọc-only và nguồn đủ cho mẫu demo; định nghĩa mapping các existing evidence vào trusted context. Source config giữ ngoài Git. Lập danh sách thiếu dữ liệu theo field/nguồn cần bổ sung. Không sửa dữ liệu live trong task này.

**Chấp nhận:** (1) từng field có source/version/hash và freshness rule; thiếu/invalid không thành fact, không đổi observedAt thành now; (2) context giữ nhiều source version và true variant scope, hỗ trợ policy-only/clarification không bịa product, phân biệt profile thật với fixture; (3) cùng source không đổi phải tạo cùng snapshot identity, còn version/content/binding đổi phải làm PASS cũ mất hiệu lực. Timestamp của lần fetch không được tự gây snapshot mismatch.

**File dự kiến:** mới `apps/worker/src/single-agent-commerce-read-only-context.ts` và `.test.ts`; sửa boundary A và `.test.ts` chỉ khi cần nhận evidence nguồn thật. Không mở rộng contract shared nếu union/adapter nội bộ cùng existing types đã đủ.

**Verify:** RED quan sát cho real evidence bị từ chối/nguồn mất identity, rồi GREEN minimum; test stale/mixed source/wrong product/wrong variant/policy-only/same-source readback/version changed. Source readback không có quyền/credentials thì ghi BLOCKED riêng đường nguồn, không lấy fixture làm bằng chứng đã nối.

### B1.2 — Nối policy qua đường không ghi

**Làm:** composition local dùng existing policy source/resolver; đưa public `customerCare`/offer literals vào cùng context owner và verifier. Prompt chỉ yêu cầu đọc policy được cấp, không chứa số ngày/phí/điều kiện cụ thể của shop.

**Chấp nhận:** (1) không pin/audit DB write/outbound capability, marker của source không bị dùng làm quyền gửi; (2) đổi snapshot policy trong test làm context và điều khoản được kiểm đổi theo, không sửa prompt; (3) thiếu customerCare, hash sai, source sai page/channel/lifecycle hoặc đổi pointer trước final gate không dùng policy cũ. Test source swap không khẳng định response model khi chưa chạy provider.

**File dự kiến:** mới `apps/worker/src/single-agent-commerce-read-only-tools.ts` và `.test.ts`; context module/test từ B1.1. Tái sử dụng database/resolver qua interface, mặc định không sửa implementation shared.

**Verify:** fake source ghi nhận mọi invocation; test không gọi writer, không áp policy fixture/legacy vào source khác; resolver focused regression khi boundary đó thay đổi.

### B1.3 — Nối sản phẩm, giá/tồn và bounded refs

**Làm:** bổ sung search/read product vào module tools trên; nối adapter đọc có sẵn trong composition của harness. Cùng snapshot làm cơ sở cho facts; không trộn giá một version với tồn/BOM version khác. Dữ liệu source thiếu thời gian/authority không được tự nâng thành trusted profile.

**Chấp nhận:** (1) code cấp/resolve refs, unknown/wrong-shop/expired ref không I/O đặc quyền; (2) freshness/product/offer/variant/hash đúng, Qdrant không cấp giá/tồn; (3) một nguồn/tool thiếu không xóa facts độc lập đã xác minh, cũng không làm owner tưởng rằng mẫu/màu khác giải quyết opacity khi chưa có căn cứ.

**File dự kiến:** tools module/test; context module/test; mới `apps/worker/evals/single-agent-commerce-read-only/run.mjs` để composition read-only. Không import `realtime-server.ts` vì module đó khởi tạo worker/capability live.

**Verify:** fake readers + existing Redis business facts/catalog/product evidence tests; ref replay/cross-scope, stale POS snapshot, partial failure và dữ liệu policy/profile instruction-like. Các phép thử quyết định theo data/scope, không regex nội dung khách.

### B1.4 — Thêm native tool calling cho đúng conversational owner

**Làm:** viết continuation nhỏ, giữ nguyên recent dialogue, function call/result và source context. Existing A `gemini-inference.mjs` cố ý chỉ cho `tools=[]`/text-only nên **không sửa guard của A** hoặc giả vờ adapter đó đã hỗ trợ tool. B có adapter riêng hẹp, dùng lại `createServiceAccountAssertion`/`vertexGenerateEndpoint`, no-retry accounting và Codex verifier hiện có.

**Chấp nhận:** (1) chỉ tool allowlist/validated args chạy, final text tách khỏi tool-request turn; (2) cap 3 generations/2 rounds/6 tools được enforce và mọi error/call được đếm; (3) native continuation giữ nguyên provider parts/thought signatures cần thiết, không đưa chain-of-thought cho khách; final answer vẫn plain text + telemetry, không semantic proposal trung gian.

**File dự kiến:** mới `apps/worker/src/single-agent-commerce-read-only.ts` và `.test.ts`; mới `apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs` và `.test.mjs`; mới `apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt`. Prompt B giữ nguyên nguyên tắc tư vấn đã chốt, thêm cách gọi tool/đọc nguồn, không chép dữ liệu shop hoặc thêm ví dụ theo bài kiểm tra. Composition hoàn thiện ở B1.5/B1.6.

**Verify:** fake transport/native responses cho fast path, parallel policy+product, search→product, malicious tool/args, mixed text+tool, cap, incomplete response, auth/401/429/5xx/timeout và không retry. Kiểm docs provider chính thức trước implementation. [Google function calling docs](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/function-calling) đã được xem khi lập kế hoạch: khai báo tool, trả kết quả qua function response và bảo toàn provider content trong continuation. Chưa chứng minh request B chạy được bằng model/credential đã chọn.

### B1.5 — Nối exact final text vào verifier và gate hiện có

**Làm:** context được dựng từ source results; verifier nhìn đúng draft cuối. Ngay trước eligibility đọc lại đúng các identity/version/freshness/binding/permission có thể invalidate draft, không cấp thêm dữ kiện sau PASS. Reuse hard precheck/final gate, không thêm một gate ngữ nghĩa song song.

**Chấp nhận:** (1) mọi precheck survivor gọi đúng một verifier, không rewrite; (2) expiry/source pointer/profile/variant/state revision/permission/recipient/privacy đổi đều invalidate hoặc no-send theo boundary; (3) malformed/FAIL/UNCERTAIN/timeout/provider error vẫn terminal fail-closed, không action ngoài repo.

**File dự kiến:** owner loop/test, context/test; mới `apps/worker/evals/single-agent-commerce-read-only/prompts/verifier.vi.txt` cho contract ref rõ ràng, không đổi calibration bán hàng. Nếu cần sửa boundary/test thì tách savepoint riêng, không vượt 5 file bằng cách giấu thay đổi shared. Composition hoàn thiện ở B1.6.

**Verify:** RED→GREEN về source đổi sau verifier, current readback và exact draft; dùng existing boundary/protected-claims/reply-assembler regressions. Không đọc lại toàn bộ shop hoặc recheck identity ngoài read-set cần cho turn. Current readback không thành công thì không authorize draft cũ.

Lỗi A claimId/evidenceRef được xử lý đúng contract ở request B: chỉ rõ các ref parser hiện cho phép — claimId hoặc subject/policy/profile/receipt ref tương ứng, hoặc null. `provenance.evidenceRef` không phải verdict ref. Không tự map ref sai, sửa verdict, hoặc cho PASS đi qua parser rộng hơn. Freeze prompt/schema/context B riêng; giữ prompt và artifacts A bất biến. Đây là contract clarity, chưa chứng minh provider hết malformed.

### B1.6 — Focused integration, đọc nguồn thật và báo cáo

**Làm:** chạy checks ở §6, xác nhận composition không writer/send; sau code hoàn tất mới đăng ký một run B nhỏ ở §7. Ghi commands thực chạy, nguồn thực có/thiếu và kết quả. Không gọi B1 là promotion hoặc measured A GO.

**Chấp nhận:** (1) focused tests/typecheck/build/lint phù hợp đều xanh; (2) real-adapter readback xác minh được nguồn và scope, không dựa giả định constructor “reader”; (3) báo cáo đủ terminal/customer outcome, request/latency/error/token/cost và complexity, các phần chưa đạt không được đổi mẫu số hoặc giấu bằng fallback.

**File dự kiến:** B run composition; mới `apps/worker/evals/single-agent-commerce-read-only/manifest.json`, `cases.json`; sau đó report `RESULTS.md` và task plan/todo ở savepoint evidence. Manifest ghi exact models/config, prompt/schema/context/tools/bounds/fallback/case hashes và toàn bộ registered invocations. B source/run config được commit trước provider request; `bRunSourceSha` lấy từ clean HEAD tại runtime, không ghi ngược vào frozen source. Raw evidence lưu theo cơ chế existing harness, không dựng evidence framework mới.

## 6. Verification dự kiến khi triển khai

Các lệnh dưới đây **chưa chạy trong lượt lập kế hoạch**. Với B1.1–B1.5: test lỗi boundary mới phải RED thật trước, rồi GREEN; không viết test chỉ kiểm lại một câu prompt. B1.6 chạy một lần tổng hợp; chỉ lặp khi có source change/failure mới.

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts src/redis-business-facts.test.ts src/realtime-sales-catalog.test.ts src/realtime-product-facts-v2.test.ts
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs
$env:C3_CHECKPOINT_A_ROUND='68'
$env:C3_TEST_CODEX_TRANSPORT='1'
node --test --test-concurrency=1 apps/worker/evals/single-agent-semantic-verifier/codex-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/gemini-inference.test.mjs apps/worker/evals/single-agent-semantic-verifier/protocol.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts src/product-presentation.test.ts src/product-facts-v2.test.ts src/size-engine.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

Ba test worker B1 và test adapter B là file mới được tạo trong implementation; các test còn lại đã có ở planning base. Chạy `src/vertex.test.ts` nếu auth/endpoint helper bị thay đổi. Test transport phải dùng fake HTTP, không gọi generation thật; cấu hình environment riêng cho nhóm test A, không mang `C3_CHECKPOINT_A_ROUND` sang run B.

Nếu thực sự sửa shared package, chạy focused test và `typecheck`/`build` của package đó; ví dụ policy resolver ở `@lana/chat-runtime`, schema ở `@lana/contracts`, arithmetic ở `@lana/commerce-kernel`. Không mặc định sửa chúng hoặc chạy lại toàn bộ lịch sử eval. CI exact PR head theo `SOLO_PREPROD_MINIMAL`; docs self-review không thay CI cho implementation.

## 7. Đợt kiểm tra B đầu tiên, giới hạn chi phí

Đề nghị **8 scenario, mỗi scenario một turn N1**, không thêm repeats hoặc ca mới trong lúc chạy. Tối đa 24 owner + 8 verifier generations = **32 generation requests**, thường ít hơn nhờ fast path; auth/embedding/domain requests đếm riêng. Không chạy lại full A2/A3 chỉ để mở B. Đây là kiểm tra tích hợp phát triển; qualification/holdout và hành trình stateful đầy đủ thuộc B2/C.

Tám mục đích không trùng: (1) hỏi giá đơn giản; (2) giá và tồn biến thể qua một round độc lập; (3) tìm mẫu rồi đọc facts mẫu đó; (4) băn khoăn mua khi profile đủ dữ liệu; (5) hoàn cảnh đổi và cần đổi lời khuyên, không bịa công năng màu khác; (6) policy với tình trạng sử dụng làm khách không đủ điều kiện; (7) policy lookup từ version nguồn khác, không giữ điều khoản cũ trong prompt; (8) nhiều câu hỏi với một phần dữ liệu nguồn bị thiếu. Case 7 có thể dùng hai captured approved snapshots và case 8 fault injection, phải ghi đúng chế độ replay/injected, không sửa nguồn live hoặc gọi đó là real-adapter evidence. Injection/ref replay/expiry/cross-scope/cap/provider failures kiểm bằng deterministic tests trước, không cần nhân thành hàng trăm provider attempts.

Trước generation phải freeze exact source/model/config/prompt/schema/context/tool/case IDs/expected behavior/terminal map; case IDs, rubric và nhãn kỳ vọng chỉ ở evaluator projection. Test captured provider requests, kể cả continuation/tool results, không có evaluator-only labels. Dùng data sản phẩm sanitized và cùng truth cho owner/verifier. Thay nguồn thật bằng captured snapshot chỉ chứng minh snapshot replay, không gọi là real-adapter run.

Mỗi scenario được review trên **toàn bộ câu hỏi + lịch sử + exact terminal outcome**, sau đó mới ghi mười chiều đánh giá hiện có. Đọc xem tư vấn có giúp quyết định mua, lựa chọn có hợp lý, thông tin có đủ và lời nói có tự nhiên; không cấp điểm vì trích được một cụm từ hoặc có “câu chốt”. Một fact liên quan được nhắc lại để giải thích không tự thành lỗi liệt kê. Chỉ hỏi thêm khi thông tin có thể đổi lựa chọn; không ép thêm câu hỏi màu/size vào câu trả lời giá đơn giản. Review ghi cụ thể owner/context/tool/authority/state/guard/provider là nơi gây lỗi, không gộp thành “model kém”.

Báo cáo ghi đủ 8 registered outcomes kể cả lỗi; fallback/handoff/no-send là kết quả khách thực nhận, không chấm draft bị từ chối. Any observed unsafe send-eligible PASS phải dừng đợt provider để review; phần chưa chạy ghi NOT_RUN và giữ mẫu số đăng ký. Không majority vote, best-of-N, hidden retry hoặc tự tiếp tục sửa/chạy nhiều vòng. Có thiếu credential/source thì ghi BLOCKED tại bước đó, không substitute model hoặc simulate kết quả.

Terminal map kế thừa boundary hiện có: PASS + current gate hợp lệ → SEND_ELIGIBLE nhưng send-disabled; FAIL/UNCERTAIN/malformed/timeout/provider error hoặc budget cạn → static fallback; stale/binding/snapshot invalid → HANDOFF disposition; privacy/permission/recipient invalid → NO_SEND. HANDOFF không hứa đã chuyển người thật. Fallback B1 đề nghị giữ `C3_A_NONPROTECTED_V2`: “Phần này em chưa trả lời được, chị nhé.”, SHA256 `cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2`; freeze trước run, không nắn fallback theo kết quả.

## 8. B2/B3 phải làm gì tiếp và vì sao chưa gộp vào B1

**B2:** kiểm kê writable fields/state owner thực có trước khi thiết kế proposal. Same owner đề xuất SET/CLEAR/REPLACE nhỏ, code gắn source message + scope + expected revision, owner hiện có validate/CAS; dependent size/quote chỉ đọc accepted effective state. Test correction, bỏ số đo cũ, sai ref, “chưa chốt”, stale revision và ambiguous referent; không reset perfect state mỗi turn. Nếu state owner chưa có CLEAR hoặc persistence API đủ an toàn, chỉ bổ sung đúng contract thiếu, không mở semantic memory. Sau đó nối `recommendSize`/verified SIZE_FIT đúng subject/profile revision/fingerprint và quote bằng policy/arithmetic hiện có. Thiếu input thì hỏi đủ phần domain cần trước khi chốt size; không phát gợi ý “eo thuộc M” khi quyết định chưa đủ căn cứ.

**B3:** dùng permission/idempotency/CAS/fencing/receipts của commerce và messaging core. Tách intent mua khỏi committed cart/order; timeout không rõ commit thì reconcile bằng operation identity trước retry. Reply/verifier lỗi sau effect phải đọc committed state/receipt để acknowledgement/handoff/no-send, không replay mutation. Không cần model thứ ba hoặc verifier rewrite để xử lý recovery.

B2/B3 sẽ có task/files/checks cụ thể sau readback B1 và kiểm kê state/effect owner. Không đánh dấu chúng đã “planned for implementation” bằng skeleton hiện tại. Sau B1 lập đúng lát cắt kế tiếp, không lấy một lời duyệt B1 làm quyền triển khai toàn bộ commerce hoặc rollout.

## 9. Kết thúc B1 và tránh vòng lặp cũ

B1 hoàn thành ở phạm vi engineering khi source read-only đã được nối/chứng minh, relevant checks xanh và có báo cáo trung thực về replies/limits. Nếu source chưa available hoặc lời tư vấn còn lỗi, ghi rõ phần chưa đạt; không gọi là đủ chất lượng bán hàng hay replacement-ready. Một báo cáo B1 không thay owner quyết định bước tiếp.

Ghi verifier latency p50/p95, added/e2e latency, domain tool latency/rounds/calls, errors/timeouts/stream incomplete, actual generation requests, tokens/cost nếu có, fallback/handoff/no-send và dữ liệu thiếu. Chỉ báo cáo observed values, không hứa latency/cost giảm. Intermittent stream error vẫn mở: ba ca recheck PASS không chứng minh đã sửa; adapter test phải giữ incomplete/no-completion là lỗi, không chắp partial text thành PASS.

Complexity budget: chỉ một owner loop, ba tool đọc, một mapping nguồn vào existing evidence, một B-specific native provider adapter và reuse final gate. Mọi schema/mapper mới phải nêu invariant hiện cần mà kiểu có sẵn không chứng minh được. Không thêm enum giọng văn, classifier policy, câu mẫu theo case hoặc một verifier thứ hai. Prompt bổ sung cách dùng tool/nguồn, không nhét danh mục shop, điều khoản hay đáp án kiểm tra. Quality fixes và đổi nguồn/API không được thay đồng thời mà không ghi rõ ảnh hưởng phân phối đánh giá.

Delivery đề nghị: branch B riêng từ exact head có foundation A sau refresh main, ghi **cả main SHA và candidate foundation SHA**; hiện PR390 chưa merge nên không giả định boundary có sẵn trên main. Một source PR B1 với incremental savepoints; base/stack ghi rõ, không rebase/import PR387 runtime seam. Self-review + focused checks; không tạo chuỗi PR chỉ để mở gate hành chính. Không merge/deploy/live send trong scope kế hoạch này.

## 10. Evidence của lượt lập kế hoạch

Đã đọc specs/owner bypass, current plan/todo, project skill và source interfaces ở §3; đã refresh main. Source inspection đã tìm ra text-only Gemini adapter, fixture-only profile contract, optional customerCare và các nhánh pin/audit/cache write cần tránh. Đã tham khảo docs function calling chính thức; chưa xác minh bằng provider request.

Chỉ thay tài liệu và task pointers; không sửa prompt/runtime/eval/config hoặc evidence A. Commands và kết quả kiểm tra tài liệu được lưu trong delivery/PR. Worker tests/typecheck/build/lint và 8-case provider run trong kế hoạch **chưa thực hiện**.

Kiểm tra thực chạy: `git fetch origin main` / `git rev-parse origin/main` exit0, SHA ở đầu tài liệu; `git diff --check` exit0; `node C:/Users/nguye/AppData/Local/Temp/c3-phase-b-plan-doc-check.mjs <repo>` exit0. Readback xác nhận đúng3file tài liệu/task,6local links,13test paths hiện có/4test paths mới dự kiến, loader frozen A vẫn hợp lệ và A2FAIL/fullA3FAIL38/42/recheck3PASS không đổi; provider generations0. Self-review đã sửa tên test chưa có, làm rõ policy-only/variant scope, marker nguồn khác capability và budget continuation B khác một generation/A attempt.
