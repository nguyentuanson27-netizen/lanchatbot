# Phase C — kế hoạch đóng task bán hàng và kiểm khả năng thực thi

Revision 2, 01/11/2026; sửa hai blocking findings R1/R2 của independent review revision1. Plan base `9c5b8387f517e1e16a8a124379912c749886c6c3`; executable/run source gần nhất `1427d2f17028e007df442c73a8d555990a3dc6ee`. Phạm vi yêu cầu hiện tại: lập kế hoạch → review độc lập → sửa kế hoạch → cùng reviewer review đến APPROVE. Chưa authorize một implementation/model run mới trong task kế hoạch này.

Căn cứ: [chẩn đoán 5 batch / 102 ca / 148 lượt](../../apps/worker/evals/single-agent-commerce-qualification/context-publication-run-20261101/ROOT_CAUSE.md), [evidence](../../apps/worker/evals/single-agent-commerce-qualification/context-publication-run-20261101/ROOT_CAUSE_EVIDENCE.json), [independent approval và giới hạn attribution](../../apps/worker/evals/single-agent-commerce-qualification/context-publication-run-20261101/ROOT_CAUSE_REVIEW.md), [qualification contract hiện hành](c3-phase-c-qualification-plan-20261028.md). Review chẩn đoán chưa approve thiết kế bên dưới.

## 1. Mục tiêu và những gì giữ nguyên

Bot cần giúp khách chọn và mua đúng món, thực hiện được thao tác đã nhận, báo giá đúng quy định và kết thúc đúng khi không thể phục vụ. Ưu tiên lỗi làm hỏng hành trình; giọng dài/tính từ ở một số ca giữ là accepted limitation, không mở vòng sửa giọng mới.

Giữ một conversational owner, tối đa một semantic verifier, code sở hữu identity/truth/freshness/state/permission/effects/receipts/privacy. Verifier chỉ xem protected-language semantics của exact final draft; không biến verifier thành người định tuyến task hoặc kiểm format báo giá. Không router đọc tiếng Việt, regex câu khách/reply, role thứ ba, tự sửa function call, retry generation, repair/reverify loop hoặc ví dụ fit từng case. Không broad rollback các binding/publication fixes đã đúng.

Giữ models/config, 2 tool rounds / 6 primitive calls / 3 owner generations, owner text cap 65536 byte và existing image/verifier limits. Owner Gemini 3.5 Flash Lite HIGH, verifier GPT-6.1 Sol HIGH, một upstream generation/registered attempt, retry=0. Không tự đổi sang model khác. Fallback tiếp tục silent handoff có commit/readback; không nhắn khách và HUMAN follow-up NO_SEND. Thiếu thông tin khách thì hỏi; thiếu dữ liệu shop thật sự cần cho task thì handoff. Không replay mutation đã commit chỉ vì verifier/provider lỗi.

Không nguồn shop write, TTL renewal, source approval, production wiring, merge/deploy/live send. Phase C qualification vẫn BLOCKED, C3 comparison NOT_RUN, B_NOT_GO. Các kết quả cũ bất biến.

## 2. P0 — đổi lựa chọn mua trên một dòng giỏ

### 2.1 Chứng minh và giữ nguyên nhân native

Files dự kiến: `apps/worker/src/realtime-sales-cycle.ts`, `single-agent-commerce-effects.ts` và tests tương ứng; `packages/chat-runtime/src/sales-cycle-runtime.ts`, `packages/commerce-kernel/src/canonical-cart-engine.ts` cùng consumer/DB guards thực sự bị tác động.

Trước code fix, thêm actual native regression dùng cart một dòng SET_VAY → AO, đúng frozen refs/clock/policy của P08. Ghi observed RED: chuỗi hiện tại bị reject, cart/receipt không đổi. Kernel CART_EMPTY đã chứng minh nhưng historical raw thiếu inner reason; native regression mới phải giữ exact domain reason, không nhận CART_EMPTY là nguyên nhân duy nhất đã biết của historical rejection.

Trả failure reason từ closed allowlist có stage (validation/authority/source/domain/commit/readback), không chuyển raw exception/PII. Unknown reason vẫn fail closed. Phân biệt pre-commit rejection, CAS conflict và commit outcome unknown; không retry effects ở nhóm cuối.

### 2.2 Một replacement được kiểm và commit như một thay đổi giỏ

Thiết kế đích: bổ sung một mutation `REPLACE_LINE` trong canonical mutation boundary hiện có và một action có cấu trúc ở tool giỏ hiện có. Không thêm framework task hoặc một provider round. Args dùng CART_LINE ref hiện hành và PRODUCT/offer ref đích đã bind, size/color/quantity theo cấu hình khách chọn; không dùng tên tự do để gộp sản phẩm. Đây là **shared contract change bắt buộc**, không chỉ thêm internal union: native/persisted evidence hiện dùng closed action/payload/reason và DB replay kiểm authority line của hành động cũ.

Chốt contract trước code:

- Payload `REPLACE_LINE` gồm `lineId` cũ và `line` đích là CartLineV1 đầy đủ do code dựng; `line.lineId` phải bằng `lineId`. Giữ stable line ref, thay toàn bộ product/offer/components/price provenance của dòng ấy; không giữ stale component/source của set. Cart ID và các dòng khác không đổi. Version của cart tăng một; old fit/selection/price receipts không được gắn lại vào target bằng stable lineId.
- Authority action là `REPLACE_LINE`, `productId/offerId` ràng buộc **target**. Thêm replacement-only old-line binding gồm lineId + canonical before-line hash + old product/offer ID vào authority/evidence hashing và require đúng iff action REPLACE_LINE; mọi kind cũ giữ shape/validation hiện hành. Command/payload/authority hashes phải ràng buộc cả target exact tuple/quantity/source và old line trong exact before-cart/revision. Không dùng payload hash để bỏ qua kiểm identity của một phía.
- Native path dùng existing `NATIVE_TOOL_PERMISSION` từ authority port đã kiểm scope/quyền, không coi args của model là permission; không dùng remove classifier cho replacement. Canonical buying-intent/readiness action phải có mapping riêng cho replacement và exact target scope; không tự cho `ADD_TO_CART` hoặc `REMOVE_FROM_CART` authorize đổi một dòng khác. Legacy text-intent/classifier không được cấp replacement chỉ từ trùng tên/keyword.
- Mutation/reprice reason là `LINE_REPLACED`, không rơi vào default QUANTITY_CHANGED hoặc OTHER. Giữ negotiation state/tier theo replay policy hiện có; giá/ship/discount/preview thay đổi có evidence và invalidate đúng.

Chain phải sửa và kiểm cùng nhau: `packages/contracts/src/v2/canonical-commerce-bindings.ts` (action/payload/authority/receipt/reason và hashes), `canonical-evidence-readiness.ts` (intent/readiness/evidence action/target binding), `context-v2.ts` và observability allowlists nếu consumer dùng; kernel canonical mutation + `negotiation-transition.ts`; business-tools exports/negotiation evidence; chat-runtime command/trusted-port/reprice; worker tool args, actual native readiness/receipt producer trong realtime-sales-cycle, persistence/selection refresh; **cả event-vs-receipt guard và transaction replay guard** trong `packages/database/src/realtime-runtime.ts`. Audit consumer exhaustiveness trước build; không chọn nhánh mặc định của các action cũ cho action mới.

DB replay phải tìm old line trong locked/replayed before-cart và đối chiếu old binding, đồng thời đối chiếu target authority với `mutation.line`, không chỉ dùng old authorityLine cho cả replacement. Replay kernel + negotiation cho ra exact after-cart/hash/line target và source checks trước transaction commit. Không cần DDL migration cho kế hoạch này; nếu audit phát hiện cần migration/authority-mode switch thì dừng, trình phạm vi riêng. Giữ parse/replay compatibility của tất cả existing actions/receipts, unknown action fail closed; không thay dữ liệu persisted cũ.

Preflight **trước commit**: validate cả old line/cart revision và target selection; đọc exact price/stock/BOM/source applicability; kiểm scope, quyền/recipient/owner/privacy/freshness và nhu cầu stock toàn giỏ cuối. Phần khách không đổi giữ từ selection có authority, không suy size mới từ size cũ hoặc tự bỏ màu. Không có target tuple/claim hợp lệ thì reject/handoff, giữ nguyên old cart. Đổi offer không tạo đơn POS hoặc checkout confirmation.

Tạo complete proposed cart thay đúng một dòng trong bộ nhớ, validate toàn giỏ với kernel/policy hiện có, commit qua **một CAS/transaction và một effect receipt** hiện có. Không persist giỏ rỗng, không remove rồi add thành hai effects, không nới CartV1 min1. Giữ identity/receipts các dòng không đổi. Tổng tiền/ship/discount/checkout preview phải được tính lại hoặc invalidate theo các guards hiện hành; receipt cũ không cấp quyền cho cart mới. Repeated same request dùng idempotency hiện có, không nhân dòng/receipt.

Nếu native/domain/DB port không thể biểu diễn replacement nguyên tử theo cấu trúc hiện tại, implementation phải báo CAPABILITY_BLOCKED với regression evidence và dùng silent handoff; không tuyên bố đã hoàn tất P08. Không sửa prompt thành “thêm trước xóa sau” để coi là atomic fix. Thay invariant/state schema hoặc thêm writer khác nằm ngoài phương án này.

### 2.3 Acceptance bắt buộc

- One-line set→áo và multi-line thay một dòng; giá/tồn/BOM/fit-scope đúng target, các dòng khác giữ nguyên; 1 cart version advance/1 receipt, không quan sát empty cart.
- Target thiếu/hết hạn/sai price/stock/màu/BOM, insufficient aggregated stock, permission/recipient/binding đổi, stale revision: zero mutation, old cart intact.
- Fault trước commit, CAS conflict, transaction rollback; lỗi sau commit trước response/readback: phân loại outcome unknown, không double-apply; request replay không nhân effect.
- Shared contract/native/DB negative controls: tráo old lineId/before-line hash/old product/offer; tráo target product/offer/variant/quantity/source hoặc replacement lineId; đổi payload sau authority hash; reason/action/receipt/evidence mismatch; receipt từ cart/revision khác; thiếu một phía authority. Tất cả bị reject trước commit, không tạo cart giả hợp lệ nhờ schema mới. Positive controls chứng minh after-cart/negotiation replay trùng persisted state và unchanged-kind receipts còn hợp lệ.
- Actual PostgreSQL: transaction failure không để remove-only/add-only; concurrent update chỉ một winner; receipt/cart/state/Outbox behavior theo boundary hiện có. Mutation success không đồng nghĩa reply được gửi nếu final gate hoặc handoff/delivery guard fail.
- Existing ADD/REMOVE(two→one)/quantity/component change, mixed M/L stock, checkout invalidation và silent handoff giữ đúng. Thiếu input khách phải hỏi, không tự chốt size để thực hiện replacement.

## 3. P1 — callable schemas và headroom cho continuation thật

Files dự kiến: `apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs`, native request types/builders/driver và tests; chỉ thêm runtime projection ở producer nếu dữ kiện đã có không đủ để tính callable. Giữ legacy path mặc định tương thích.

Tách `availableTools` (danh mục khả năng cấu hình, tên ngắn) khỏi schemas thực sự callable của generation. Dùng duy nhất dữ kiện có cấu trúc từ code: valid bound refs, cart-line refs/cart status, conversation owner/permission, budget, capability config, pending handoff. Không dùng text khách, caseId/family/expected labels, hoặc phân loại intent. Cùng phép tính dùng cho declared schema, native allowed names và runtime admission; model gọi tên ngoài callable vẫn reject trước I/O.

Matrix phải xét **dependency closure của các chuyển trạng thái hợp lệ trong cùng batch**, không chỉ snapshot trước generation. Effects hiện chạy tuần tự sau independent/state tools; một tool có thể trở nên hợp lệ sau tool đứng trước. Dùng closed dependency table từ existing batch contract và remaining primitive budget, không kế hoạch ngôn ngữ của model: giữ schema của tool hiện callable **hoặc conditionally callable trong một legal batch**. Nếu thiếu dữ kiện để chứng minh không thể reach, giữ schema thay vì tiết kiệm bằng cách cắt đường hợp lệ. Native declared names và invocation policy cùng dùng manifest này; trước **mỗi invocation**, refresh scope/refs/state/permission/budget rồi validate thực tế, conditional visibility không cấp authorization.

Matrix tối thiểu: chưa có PRODUCT nhưng search có thể bind trong batch thì giữ những schema có arguments/refs thực sự dùng được theo existing contract, không assume ref tạo sau luôn có thể đoán trước; còn search/read-policy/handoff và state intake hợp lệ. Có PRODUCT thì read/size/media/add theo configuration; không có cart đầu batch nhưng có add_to_cart hợp lệ và budget thì **giữ confirm_purchase** cho add→confirm. Cart mutation chỉ lược khi không có CART_LINE ref hợp lệ hiện tại và cũng không có đường tạo/bind ref hợp lệ trong batch. State-update→dependent size/read và mutation→quote giữ đúng thứ tự/guard hiện hành; không require customer fields trước khi khai báo tool vốn có thể hỏi bổ sung. State write chỉ loại khi code xác định không có quyền, không vì đoán khách không cần. Không loại task đang cần chỉ để vừa cap. Human/terminal/budget hết giữ đường terminal hiện có. Chuẩn bị/prerequisite bên trong task vẫn debit primitive work đúng, kể cả lỗi/partial execution.

Acceptance bổ sung cho callable matrix: actual batch no-cart add→confirm, apply_customer_state→recommend_size/read, multi-effect trên existing cart và replacement→cart quote/continuation; tên conditional callable được declared và per-invocation authority/source guards vẫn bắt source/state đổi giữa các bước. Sai ordering/ref hoặc predecessor fail không được successor commit. Test before/after schema set và native/runtime parity, không chỉ assert byte giảm. Không thể đạt headroom mà giữ closure thì báo P1 BLOCKED, không siết batch semantics để qua test.

Đo request ở **mọi generation** trước auth/HTTP: raw text + actual presented wire, system/schema/trusted/dialogue/signature bytes, declared/callable names và rejection stage. Bảo toàn opaque signatures trong AUTO continuation, tool errors/results, receipts, admitted facts và raw transcript. Không truncate history/facts hoặc bỏ evidence để giảm bytes. Không giảm prompt/đổi presentation model trong scope này.

Observed RED trước: s08 continuation với actual 11024-character signature/actual tool responses vượt 67258/65536. Test cùng world/clock/envelope rồi GREEN chỉ khi structural pruning làm actual wire vừa và capabilities cần vẫn callable. Historical second request không được capture thì gọi đó là constructed replay, không exact original body. Giữ thêm P09, hai products selected đọc stock/size/policy/media và terminal-handoff continuation. Boundary limit-1/limit/limit+1, source-changed/read-conflict và duplicate-not-equal controls phải giữ fail-closed/equality.

Trước implementation claim “đã sửa bound”: lập bảng worst observed request ở từng supported task và phần headroom còn lại. Không thể bảo đảm mọi valid request tối đa luôn vừa chỉ bằng một replay; request lớn hơn vẫn zero-HTTP fail-closed. Nếu s08 chưa vừa hoặc phải bỏ capability cần thiết mới vừa, P1 chưa hoàn tất, không mở provider batch để thử vận may hoặc nâng cap.

Byte acceptance phải chạy trên **final combined implementation** gồm REPLACE_LINE schemas, dependency closure và final prompts/config; không dùng cached declarations hoặc replay chỉ trên source1427 để nhận headroom của source mới.

## 4. P2 — quy tắc báo giá, tool args và việc owner thực sự phải làm

### 4.1 Chốt đường bảo đảm báo giá trước khi code

`quote_product` hiện bảo đảm giá+ảnh **khi được gọi**, nhưng P02 firstContact=true vẫn FINAL không gọi tool. Không nhận việc củng cố tool wrapper là đã đóng bypass. Đồng thời existing control firstContact + hỏi ETA FINAL hợp lệ không cần ảnh phải giữ; firstContact một mình không được trigger lookup/ảnh/handoff.

Bước P2a là design/proof gate cụ thể: trace những entry/source adapters hiện có có thể cấp **quote requirement đáng tin** (ads/first-contact rule, selected product/offer/source) trước owner; phân biệt trusted requirement với owner tự khai intent/tool choice. Ghi table producer→runtime→response group→delivery guard. Nếu trusted entry chỉ có `firstContact/fromAd` mà không xác định được quote task, không tự tạo một classifier từ câu khách, không dùng nhãn evaluator để bổ sung entry, không dùng owner-declared marker làm authority rồi gọi là không thể bypass.

Với task có trusted requirement đã xác lập: ràng buộc response group bằng quote requirement + selected eligible media/source version. Mọi đường early FINAL/read_product/quote_product đều phải qua cùng code check trước send eligibility: exact product/offer price sources và required image hợp lệ, final freshness/binding/delivery readback còn đúng. Thu thập prerequisite trong budget hiện tại; không auto generation retry, không send text trước image gate. Thiếu nguồn required → silent handoff, không gửi giá trần. Handoff/no-send không bị ép kèm ảnh.

**Nếu không có producer đáng tin để áp dụng rule cho free-text first-contact quote**, P2a phải ghi phần này là **DESIGN_BLOCKED**, retain P02 bypass RED và đưa phương án contract nhỏ nhất ra review trước implementation. Không mở rộng semantic verifier thành format/intent judge; không ép mọi first-contact FINAL thành quote, hoặc giấu thiếu guarantee bằng prompt mới. Gate chỉ được đóng khi cả bypass P02 và non-quote ETA/ACK controls cùng đạt qua actual runtime. APPROVE PLAN không được diễn giải là producer hoặc giải pháp này đã tồn tại.

### 4.2 Read args và chẩn đoán lỗi

Giữ một discriminated selection surface `SINGLE / COMPARE / DETAILS_ONLY`; schema, decoder và domain mapping dùng chung closed values và tổ hợp fields, tránh hai biểu diễn mâu thuẫn. Không đổi toàn bộ API nếu shared definition đủ. Test every branch cùng provider-declared schemas, invalid/missing/extra/null/conflicting fields; malformed call không chạy source/effect, không sửa args rồi gọi lại. Đối với lỗi tương lai chỉ giữ bounded safe enum/shape diagnostic (field present?, branch, allowed value or invalid type), không retain arbitrary raw arguments/private text. Không suy đoán exact invalid value s09 lịch sử.

### 4.3 Owner selection residuals

ACK không cần facts mới thì owner có thể FINAL, không tự tra ảnh/giá/size. Code không đọc prose để tự phân loại ACK. Sau P0/P1/P2 contract và input đủ, đo s15 cùng care/clarification/recommendation controls qua provider, phân loại owner tool decision riêng. Chưa có provider run thì MODEL_NOT_RUN, không nhận structural tests chứng minh model hết over-action. Không thêm câu mẫu riêng cho s15/s09; không nới media/color source guards để cứu lookup thừa.

## 5. P3 — readiness theo capability và ngữ cảnh judge đầy đủ

Files: `source-readiness.mjs` / tests, corpus binder/registered customer histories, public blind-packet builder và rubric/import validation. Runtime projection không chứa check results/labels. Giữ firewall trên actual captured requests.

Readiness kiểm **task scope + capability + source**, không chỉ có PRICE/chart. Quy định rõ PRODUCT fit supported; COMPONENT fit vẫn unsupported và phải handoff cho đến khi một capability riêng được build/review. j2 không được coi SALES_READY component chỉ nhờ chart cấp product. Profile/source chart delegation theo exact configured mapping; không gộp giá/tồn/chart theo trùng tên ngoài approval sẵn có. Màu/ảnh kiểm exact role/intent/colour/ref + TTL/approval, không dùng fresh asset sản phẩm khác thay scope thật.

P06 giữ unresolved lịch sử. Ca mới mua ba món phải có genuine accepted history hoặc current customer text xác định áo/quần/váy, source BOM thực sự ba garment types và các offers bán được; variant refs không thay proof composition. Nếu source không có combo đúng thì control source gap hoặc chưa đăng ký sales case, không chế SKU/chart. Mua riêng/đổi offer/size từng phần/ambiguous name có expected task result rõ trước run.

Public judge packet phải có rule báo giá kèm ảnh, nghĩa màu sentinel, chart delegation/scope supported và semantics handoff thực; chỉ cấp thông tin shop/public runtime đã được phép, không expected label/family/caseId/model arm. Validate packet đầy đủ trước seal. Judge đọc actual terminal text/media/real receipts disposition, không chấm rejected draft như đã gửi.

Báo riêng: (a) sales completion trên SALES_READY supported tasks; (b) clarification đúng với thông tin khách thiếu; (c) proper silent handoff trên shop/capability gaps; (d) safety/state/effect/privacy; (e) whole-reply quality theo SINGLE/JOURNEY. Một handoff đúng không nhận là đã bán xong; một source gap không bị gọi là model trả sai nếu code làm đúng. Mọi registered attempt/errors/NOT_RUN vẫn hiện trong denominator/accounting, không bỏ mẫu xấu.

Đây là development report cải thiện attribution, **không đổi công thức qualification** để cứu điểm. Owner thresholds đã chốt 90% quality riêng SINGLE/JOURNEY, 90% safe usability, zero hard failures, net win ≥10 điểm phần trăm vs pinned C3 main296cdcf vẫn giữ. Muốn đổi official success definition phải là protocol/owner decision riêng trước formal registration. Chưa có fresh holdout/parity/baseline execution thì không claim Phase C GO.

## 6. Mapping regression và thứ tự build

| Evidence/purpose | Công việc | Bằng chứng phải có | Residual không được che |
|---|---|---|---|
| P08 last-line replacement | P0 | Native RED→GREEN + actual PG atomicity/concurrency/faults | historical inner rejection chưa đủ attribution; blocked port không phải success |
| s08 bound / P09 two designs | P1 | Actual-signature replay bytes + callable parity + zero-HTTP overflow | Không proof mọi worst-case theoretical envelope |
| P02 / H01,H02 | P2a+P3 | Trusted requirement provenance + bypass/nonquote/media source controls | Không có trusted producer thì DESIGN_BLOCKED |
| s09 care | P2b | Schema/decoder roundtrip + unchanged policy publication controls | Provider malformed residual MODEL_NOT_RUN |
| s15 ACK | P2c | No gratuitous dependency in actual owner outcome; no parser | N1 không chứng minh ổn định |
| P07 / j2 | P3 | Scope/capability readiness + expected silent handoff controls | Chưa có component-fit service, không bịa chart |
| P06 combo | P3 | Genuine referent history + exact BOM types/options | Source thiếu thì SOURCE_BLOCKED |
| j6 provider failure | Regression | Cart/receipt retained, silent handoff, no mutation replay | Operational failure không sửa bằng prompt |
| Existing B/C pass controls | All | Same input/world/clock deterministic comparison; end-to-end native checks | Quality giữa worlds/N1 khác nhau không causal proof |

Implementation sau owner yêu cầu: (1) P0 native diagnostics/replacement feasibility và P2a trusted-producer proof gate; (2) P0 atomic commit nếu feasible; (3) P1 schema pruning; (4) P2 boundary/schema; (5) P3 readiness/packet; (6) focused + actual PG + self-review; (7) cùng independent reviewer → fix → review đến APPROVE IMPLEMENTATION. Incremental commits cho từng risk boundary, không trộn prompt cleanup hoặc broad refactor. Nếu một P0/P2 proof gate BLOCKED, ghi evidence và thiết kế residual riêng; không cho model run làm bằng chứng thay capability/gate còn thiếu.

## 7. Verification sẽ thực hiện khi build, chưa chạy trong task này

Quan sát RED trước fix, giữ exact command/output/source; GREEN minimum rồi regression bị ảnh hưởng. Các commands dưới đây là kế hoạch, **chưa phải PASS**. Chạy tại repo root trừ nhóm Node/PG đã ghi workdir. Tên test mới cụ thể sẽ bổ sung khi build, cùng contract/consumer coverage thực sự thay đổi.

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-effects.test.ts src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-quote.test.ts src/single-agent-commerce-preparation.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-commerce-silent-fallback.test.ts
pnpm --filter @lana/worker exec vitest run src/track-b-protected-claim-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker test:evals
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
pnpm --filter @lana/commerce-kernel test
pnpm --filter @lana/commerce-kernel typecheck
pnpm --filter @lana/commerce-kernel build
pnpm --filter @lana/chat-runtime test
pnpm --filter @lana/chat-runtime typecheck
pnpm --filter @lana/chat-runtime build
```

Nếu chạm contracts/database/business-tools, thêm focused contract/consumer tests và package test/typecheck/build tương ứng trước accept, không chỉ build worker. Actual isolated PostgreSQL dùng harness hiện có `apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs`: bổ sung native replacement/fault cases; full deterministic invocation dự kiến tại repo root là `node apps/worker/evals/single-agent-commerce-read-only/isolated-integration.mjs <new-evidence-dir> COD`. Giữ tên thư mục mới được resolve cụ thể trong actual command evidence khi build; không có provider flags; `C3_B_TEST_ADMIN_DATABASE_URL` chỉ lấy qua credential route đã có, không in giá trị. DB riêng, live send disabled, provider generations=0, drop/readback cleanup, existing validator invariants phải đạt. Đây là required gate P0 vì writer/effect thay đổi; pure kernel test không thay thế.

Pure request-wire/firewall/schema checks phải kiểm cả read-only/terminal/provider adapters. Boundary freshness/draft/snapshot/revision/recipient/permission/privacy và exact verified reply không thay đổi. Prompt/verifier không thay trong kế hoạch; nếu implementation có lý do buộc thay protected-language semantics, phải review riêng và chạy lại focused A2 trước coi safety population mới đã kiểm.

## 8. Run mới và tiêu chí dừng

Task hiện tại dừng tại **APPROVE PLAN**, không tự chạy build/provider. Khi owner yêu cầu implementation/run: chỉ dispatch sau code+verification+independent approval, commit/clean executable+config, runtime source SHA riêng; nguồn thật còn hiệu lực trước run; frozen task prerequisites/corpus/public judge packet/config/hashes/firewall và source readiness phải qua preflight. Giữ models/config/N1/retry0 hiện hành; không tự tăng repetitions/attempts.

Chọn regression đã có, ưu tiên lỗi P08/s08/P02/s09 rồi các controls nguồn/ACK; deduplicate theo purpose, không cộng thêm một loạt paraphrase. Full population và attempt/generation ceiling phải freeze từ executable corpus trước inference, chưa ghi một con số tưởng tượng khi source/capability chưa chốt. Trả cả NOT_RUN và error counts. Thiếu một nhóm source thì giữ SOURCE_BLOCKED/unavailable controls được đăng ký trước; không đổi cohort sau outcome. Actual captured owner/verifier requests không chứa evaluator labels.

Run stop ngay khi có unsafe send eligibility, wrong state/effect/privacy, mutation uncertainty không được containment hoặc hard snapshot invariant failure. Provider/auth/timeout/malformed là fail-closed outcome, không hidden retry/current-attempt refresh; committed state không replay. Ordinary silent handoff đúng protocol không tự biến thành quality PASS hay lý do bỏ denominator. Sau batch, full raw accounting→blind judge khóa trước unmask→independent report audit; không tự mở thêm fix/run.

Chỉ claim phần đã đo: native task/capability completion, request headroom trên tested envelopes, observed safety/configuration. Plan approval không phải IMPLEMENTATION APPROVE, model quality PASS, stability proof, qualification GO hoặc rollout authorization.
