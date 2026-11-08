# Phase C — kế hoạch thống nhất contract tool và hoàn thành tác vụ

**Trạng thái: revision 3 — PENDING INDEPENDENT REVIEW.** Đây là kế hoạch, chưa sửa executable, prompt, corpus hoặc chạy provider. Planning base `076d39694d2c068283b28d76a9550d2cb8eaedbb`. Reviewer `/root/post_contract_plan_review` yêu cầu sửa bản phương án trong chat; [review revision 2](evidence/c3-tool-contract-plan-20261109/review-r2.md) đã đóng các blockers cũ và yêu cầu tách VIEW khỏi outbound constraint, khóa sibling allowlist. Revision 3 sửa đúng hai điểm đó. Approval của kế hoạch không thay implementation review hoặc qualification.

## 1. Mục tiêu và giới hạn

Khách nhận được câu trả lời và bước mua dùng được, không handoff chỉ vì producer/decoder/executor có contract khác nhau. Giữ các điểm mạnh Phase B, J2 state recovery, P08 hỏi màu, J1 báo tổng trước giỏ và checkout. Không hạ mức kiểm fact/state/effect để làm tỷ lệ PASS đẹp hơn.

Giữ một conversational owner và tối đa một verifier; code là authority về identity/truth/freshness/state/permission/effects/receipts/privacy. Verifier chỉ kiểm protected-language semantics của exact final text, không tool/rewrite/send. Giữ tối đa 3 owner/1 verifier, 6 primitive/2 tool rounds, request/result/image bounds và generation retry0. Không parser/router, role thứ ba, case regex/template, repair/reverify loop, generic framework, production wiring, migration, live write/send, merge hoặc deploy. Không đổi prompt tư vấn/verifier hoặc thêm ví dụ benchmark. Chỉ đổi technical tool contract và dữ liệu producer cần thiết.

Nguồn review: [full 34/55](../../apps/worker/evals/single-agent-commerce-qualification/post-contract-full-run-20261109/REPORT.md), [bảy ca](../../apps/worker/evals/single-agent-commerce-qualification/post-contract-full-run-20261109/FAILURES.md), [implementation trước](c3-phase-c-post-full-contract-repair-implementation-20261108.md). Giữ nguyên nhãn/evidence lịch sử; không đổi thất bại cũ thành PASS.

## 2. Những gì đã xác nhận và giả thuyết

| Nhóm | Bằng chứng | Đích sửa / giới hạn kết luận |
|---|---|---|
| S04/S09 | Public schema cho DETAILS_ONLY+offerType, decoder cấm; HTTP200 nhưng OWNER_TOOL_OUTPUT | Đồng nhất schema và decoder; model vẫn có thể vi phạm schema, chưa hứa hết malformed |
| S15/J4 | Các call riêng lẻ có shape hợp lệ, quoteBatchWork cấm write+quote nên dừng trước I/O | Mở đúng sequence writer-first có dependency rõ; không mở mọi mixed batch |
| S15 sau batch | Replay frozen world: GENERIC/be của SV2447 lỗi MEDIA_COLOR_BINDING_UNVERIFIED; GENERIC không màu có 2 ảnh | Không chỉ bỏ batch gate rồi mắc ảnh. Tách price filter khỏi photo obligation nhưng vẫn giữ báo giá mở đầu có ảnh |
| P06 | BOM có 3 món nhưng QD001/OTHER chưa có tên/loại từ nguồn | Cấu trúc đủ không nghĩa nhãn đủ. Không suy loại từ SKU; tổng không cần biết tên mọi component |
| S16 | Feedback=true/DETAIL không xác nhận khách đang mặc; projection mới hard-code NOT_RECORDED | Chưa có positive customer-wearing source. Không tự nâng giả định test; đăng ký source-gap control nếu không bổ sung trước freeze |
| J2 | Profile và RELAXED/fit đã đúng, owner transport lỗi sau đó | Thêm diagnostics tối thiểu; nguyên nhân mạng cụ thể chưa biết, không sửa size/prompt hoặc retry |

## 3. W1 — public read contract duy nhất, bảo toàn selection write

Đích chính: `product-read-selection.mjs`, `gemini-inference.mjs`, consumer tests; internal read/state API giữ nguyên. Không thêm tool name.

Public `read_product` dùng **subjectRef + offerTypes**, bỏ selection và singular offerType. `offerTypes` là field bắt buộc, array unique tối đa 3. Vắng hoặc null là invalid, không alias hoặc đoán default. Có ba nhánh schema được sinh từ cùng một định nghĩa như decoder:

| Nhánh | Fields hợp lệ | Mapping / tác động |
|---|---|---|
| Mô tả | subjectRef, offerTypes=[] | Internal detailsOnly=true; không ghi lựa chọn, không đọc giá/tồn/ETA/fit |
| Đọc offer | subjectRef, offerTypes có 1–3 phần; optional color/size/deliveryRegion | 1 phần → internal offerType; 2–3 → internal offerTypes. Không ghi lựa chọn |
| Ghi lựa chọn vừa được khách nêu | Như đọc offer nhưng đúng 1 phần và customerSelected=true | Giữ internal customerSelected, writer/CAS/source grounding/retained-target/receipt hiện có; không thêm giỏ/chốt mua |

`customerSelected=false/null` không nhận; field vắng là read-only. Mô tả không nhận filter hoặc customerSelected, kể cả filter=null: schema phải cấm, không decoder âm thầm bỏ. Ở nhánh offer, color/size/deliveryRegion là string có bound hiện hành hoặc null; null chỉ chuẩn hóa thành bỏ filter như contract hiện có, không chứng minh màu/size không tồn tại. size filter chỉ kiểm tồn, không tự cấp fit.

Dùng public JSON-schema branch support đang có ở adapter, không chỉ thêm mô tả bằng chữ. Schema wire và runtime decoder dùng cùng definitions/constraints; kiểm actual serialized declaration. Nếu provider route hiện hành không biểu diễn được các nhánh cần thiết thì dừng W1 để sửa thiết kế, không phát một schema rộng rồi cấm ngầm trong decoder. Trước API implementation phải kiểm documentation chính thức hiện hành; không đổi provider/model.

Phân loại write trong batch dựa domain call đã decode, không chỉ tool name. `read_product(customerSelected=true)` vẫn là writer. Không tự suy customerSelected từ câu khách hoặc set cờ chỉ vì đọc giá. Giữ enum subject refs, source/version pins, current readback, bounds và native content/thoughtSignature nguyên vẹn. Không sửa transcript cũ để hợp thức output cũ.

Acceptance W1: schema-valid → decoder-valid cùng public constraints; sai tổ hợp reject trước I/O; 0/1/2/3 offer mapping có differential result/source proof với internal API cũ trên cùng world/clock. Chọn AO không giỏ → lượt sau vẫn AO; metadata không ghi selection; compare không thành selection; source/permission/expiry conflict vẫn block. Test []+filters, []+customerSelected, nhiều offers+customerSelected, null/vắng array, unknown fields, duplicate/overbound offers, nullable filters; control giữ fit correction và opening image.

## 4. W2 — mixed quote batch có thứ tự và dependency đóng

Không refactor toàn bộ effect/state executor. Với batch chứa quote_product, sửa đúng `quoteBatchWork`, dispatch trong `runCommerceTurn` và quote wrapper. Đường batch không có quote giữ nguyên (kể cả coalesce identical size patches). Wrapper quote gọi **base.invoke từng call theo thứ tự input**, không gửi cả batch xuống `effects.invokeBatch` vì lớp đó regroup reads/effects/quote_cart. Giữ per-operation authorize/CAS/readback và diagnostics hiện hành.

Phạm vi mới được mở: không có writer, hoặc **đúng một writer ở vị trí đầu**, sau đó chỉ các siblings trong allowlist đóng: **quote_product, read_product không customerSelected, read_policy, select_product_media, view_product_media**. Writer được phép là apply_customer_state, read_product(customerSelected=true), hoặc record_negotiation. Không nhận writer thứ hai, writer sau read/quote, cart mutation, confirm_purchase hoặc handoff sibling. **Mọi recommend_size, kể cả không ops, đều bị loại khỏi nhánh quote mới** vì có thể CAS retained target; quote_cart, search_products và unknown capabilities cũng không phải sibling hợp lệ. Reject toàn batch trước I/O, không tự reorder/split/đổi tool; các capability đó vẫn dùng được qua đường non-quote cũ hoặc lượt tool tiếp theo trong cap. Không dùng nhãn chung “read-only” để suy thêm capability ngoài allowlist.

Preflight toàn batch: shape, domain write classification, configured/callable capability, số target quotes không trùng và <=2, resource reservation, phạm vi refs có thể kiểm được trước I/O. Nguồn và quyền được kiểm lại ở từng invocation, không coi preflight là receipt hoặc authorization đã commit.

| Kết quả writer | Có thể chạy read/quote tiếp? | Authority và điều phải giữ |
|---|---|---|
| State write OK + current readback/receipt | Có, dùng snapshot mới | Không xóa pending/uncertainty hoặc dùng fit cũ; quote không chứng minh size |
| Selection write OK + retained selection readback | Có, target/binding mới | Không tự đọc lại phần khách bỏ; không cấp purchase receipt |
| Negotiation OK + cart/receipt readback | Có, nhưng pre-cart quote vẫn là pre-cart | Current cartQuote là tổng sau concession; không dùng pre-cart quote thay nó |
| record_negotiation trả NEGOTIATION_CONTEXT_REQUIRED với proof chưa CAS/effectCommitted=false | Có cho read/quote độc lập | NOT_EVALUATED/UNKNOWN; không nói không có hỗ trợ, không tạo giỏ/ưu đãi |
| Bất kỳ REJECTED khác, source failure, state pending hoặc không đủ proof no-commit | Không mở nhánh continuation mới | Giữ recovery hiện hành; không suy mọi REJECTED là an toàn để tiếp tục |
| Unknown/response-lost commit, partial effect, quyền/recipient/binding/revision đổi | Dừng và fail-closed | Không replay write, không chạy quote để cứu câu, không clear uncertainty |

Proof no-commit là kết quả code-owned từ validation trước transaction, kèm current authority không đổi và không receipt/CAS; không tin field do model tự gửi. Không dùng tên reason đơn độc để bỏ qua uncertainty ở wrapper ngoài. `NEGOTIATION_CONTEXT_REQUIRED` là nhánh duy nhất mới cho phép tiếp tục sau writer không OK trong revision này.

### 4.1 Tổng trước giỏ và tổng sau hỗ trợ

Giữ hai authority khác nhau:

- quote_product: giá/tổng tham khảo cho exact product/offer/quantity từ code; không phải tổng cart sau thương lượng. Giữ calculation policy và bound price/source/current cart-state hash hiện có; không tự đưa objection count/concession vào pre-cart calculator.
- record_negotiation thành công: current cartQuote/receipt trả từ effect là authority cho tổng giỏ sau hỗ trợ. Nếu owner cần tính lại giỏ, dùng quote_cart qua đường hiện có trong lượt sau, không tự đổi call quote_product thành quote_cart.

Khi có cart cùng target và negotiation vừa thành công, quote_product result phải ghi rõ calculationBasis=PRE_CART_POLICY, appliesNegotiationReceipt=false và currentCartQuoteRef trỏ đúng current context nếu có. Cùng meaning phải có trong trusted quote evidence cho verifier; ref không tự là effect permission. Nếu cartQuote thiếu/đã đổi thì không cấp tổng sau hỗ trợ. Scope khác giữ độc lập, không cộng lẫn. Không áp ưu đãi chưa có receipt, không phát sinh thêm concession để hợp một test.

Acceptance W2 dùng PG đối chiếu sequence explicit invokes cùng source/state, không chỉ mock: state+quote, selection+quote, negotiation-no-cart+quote, negotiation-success+quote (hai authority tách rõ), quote-before-write bị reject không CAS, failed writer, response lost sau commit, current source/revision đổi. Test quote+recommend_size với/không ops, quote+search/quote_cart/unknown đều reject trước bất kỳ I/O/CAS nào; không cấp exemption vì tool không mang state ops. Kiểm CAS/receipt không nhân đôi, final gate không gửi total mâu thuẫn, không hồi quy J1/P08/J2/checkout. Chưa hứa owner sẽ chọn total đúng chỉ từ marker; native phải chấm toàn câu và cart thực.

## 5. W3 — ảnh mở đầu do code gate, không phụ thuộc ẩn của quote

**Quyết định bảo toàn:** không chấp nhận báo giá mở đầu thiếu ảnh do context có nhiều refs. Ngoài unique-ref/cart đã duyệt, giữ đúng nghĩa vụ ảnh mà quote hiện đang áp dụng: **mỗi PRODUCT target của quote mở đầu thành công cần một ảnh sản phẩm hợp lệ**, kể cả một quote target trong pool nhiều candidates hoặc ACK có quote thừa. Đây là chuyển obligation hiện có từ quote vào gate chung, không tăng/giảm phạm vi theo việc code đoán câu khách.

Quote không trực tiếp select ảnh/handoff do ảnh. Sau khi price/source validation thành công, code ghi request-local quote target proof (max2 PRODUCT targets), ràng buộc request/binding/recipient, source/offer identities và observed proof. Model không được truyền `required=true`, reply type hoặc danh sách nghĩa vụ. Chỉ source-validated quote event được ghi, invalid/failed quote không tự tạo positive proof. Không persist field hoặc tạo knowledge store mới.

Opening gate hợp nhất unique PRODUCT refs, current cart và các quote target proofs trong request; chỉ firstContact=true. firstContact=null vẫn fail-closed khi nghĩa vụ cần entry identity. firstContact=false không tạo nghĩa vụ quote-opening mới. Quote target proof không bị một unrelated state write hoặc media REPLACE xóa. Giữ final response-group gate trước sequence0; không có ảnh/reply sau handoff. Không đọc final prose để chọn target.

Tách hai loại constraint:

- **Màu lọc giá/tồn** của quote/read không tự là yêu cầu ảnh đúng màu. Opening image cho quote-only target là GENERIC, không gắn nhãn ảnh màu khách thích và không dùng ảnh xác nhận màu bán.
- **Giỏ có màu vật lý** và **explicit select_product_media query theo màu/loại** giữ exact matching như hiện tại. SELECT ảnh màu/loại thất bại không được gate thay bằng generic. Invalid/unknown cart color không mượn ảnh chung. Chỉ được ảnh chung khi request ảnh chung/khách đồng ý theo contract hiện có; không code phân loại câu khách.

**VIEW là observation nội bộ, không là yêu cầu chọn/gửi ảnh.** view_product_media giữ xác minh exact query/bytes riêng; thất bại không cấp visual facts, không chứng minh thiếu ảnh outbound và không tạo/thu hẹp obligation gửi. VIEW/be thất bại không cấm một lookup GENERIC cho quote obligation, vì đây là query/mục đích khác, không retry VIEW hoặc giả đã xem ảnh be. Nếu owner xác định việc thiếu visual evidence ảnh hưởng yêu cầu khách thì explicit handoff vẫn hoạt động; code không suy mức liên quan từ prose. Ngược lại, explicit SELECT/be thất bại vẫn không được chuyển thành GENERIC để gửi thay. Phân loại bằng operation do code đã thực thi, không bằng cờ “optional/required” model tự cấp.

Thay đổi `colors()` phải giữ provenance từng constraint, không union price filter hoặc VIEW observation thành media requirement. Generic obligation không xóa explicit outbound SELECT restriction/failure hoặc cart constraint. Không retry cùng media lookup trong gate để biến lỗi thành success. Internal photo preparation dùng APPEND và source revalidation; ảnh owner đã chọn đúng scope được reuse. Hai quote targets cần ảnh cả hai; code bảo toàn source-level photo obligation, **không claim bảo đảm text-media coherence** nếu owner cuối chỉ giới thiệu một mẫu. Native comparison phải kiểm cả text và nhóm ảnh; incoherent outcome là fail, không sửa câu chữ sau verifier.

### 5.1 Primitive accounting

Không giữ debit2 cho quote rồi lại charge ảnh lần nữa. Version quote-task contract mới: mỗi quote/read invocation 1 primitive; mỗi media selection thực chạy ở gate 1 primitive. Trước batch I/O, feasibility reserve thêm một đơn vị cho mỗi quote target mới chưa có covering photo trong opening context; reservation không là dispatch/charge. Actual dispatch charge bằng PreparationControl hiện có, tổng toàn turn <=6, tool rounds<=2 và owner<=3 như cũ. Reuse photo không charge lại; không cộng allowance dự phòng vào cap. Hai offers của một parent cần một photo obligation nhưng giữ actual quote read work; quote sau hết budget bị reject trước write. Keep diagnostics riêng reserved vs dispatched, không hidden I/O.

Gate chạy trước owner tiếp theo và final eligibility; khi thiếu budget/source để phủ nghĩa vụ thì silent handoff/no-send đúng authority. Nếu không thể chứng minh reservation đầy đủ trên wrappers hiện có, W3 phải dừng sửa accounting trước provider, không tăng cap hoặc trừ bớt charge để test xanh.

Acceptance W3: nhiều refs/quote một target phải ảnh; quote hai targets phải hai product scopes; ACK+quote thừa vẫn có generic photo theo policy; quote/read màu be nhưng không explicit image request có generic photo, không claim matched color; VIEW/be thất bại nhưng generic photo có nguồn vẫn phủ generic quote obligation, không có visual fact của VIEW lỗi; SELECT/be thất bại không được generic substitute; cart màu cụ thể vẫn exact; no-stock hoặc unlabelled cart không né binding; photo bị REPLACE bỏ nghĩa vụ thì final gate chặn/chuẩn bị trong cap. Nguồn ảnh revoked/hash/recipient/permission đổi vẫn block toàn group. Test 6 vừa đủ/7 phải reject trước write, reuse, unknown entry, returning reply, no duplicate on delivery restart.

## 6. W4 — dữ liệu component và ảnh, không thêm retrieval runtime

### 6.1 P06

Giữ BOM multiset/order-insensitive đã sửa; không sửa catalogComponentRole bằng regex mới cho QD001. Tách các facet: cấu trúc/count có nguồn, tên/loại component có hoặc chưa có. Không dùng status AVAILABLE của BOM như xác nhận mọi label.

Chỉ dùng tên/loại component đã có trong **cùng frozen product map/catalog evidence** hoặc snapshot field được adapter hiện hành xác nhận theo exact component ref. Không network lookup con trong provider turn. Tối đa3 distinct component refs/offer, giữ parent-product/evidence bounds hiện có; label tối đa128 UTF-8 bytes/ref, tổng thêm <=1024 bytes/product, đo actual owner/verifier wire admission trước publication. Không tạo PRODUCT binding hoặc protected numeric fact mới chỉ từ label.

Nếu QD001 không có nhãn nguồn, giữ unknown; owner view không trình bày raw SKU như tên món, nhưng identity refs vẫn đầy đủ ở trusted/internal binding. Dùng opaque ref đã bind cho component chưa có label thay cho chữ gợi đoán loại; không che identity khỏi verifier hoặc engine. Mapping bảo toàn được round-trip/differential source identity, không tạo ref dựa text model. Báo tổng 989.000đ/3 món không cần mô tả đó là quần. Không sửa lại giá/role để đạt ca; chưa hứa owner sẽ hết suy diễn chỉ nhờ projection.

Nếu muốn thêm nguồn POS ngoài capture hiện có, phải làm data-preparation riêng trước freeze, lưu provenance và source hashes, review lại scope; không coi đó là phần W4 runtime của revision này.

### 6.2 S16

**Không có owner approval mới cho customer-wearing assumption.** Trong revision này giữ asset feedback test hiện hành là feedback classification, không gọi nó là ảnh khách mặc. Không tự biến DETAIL/MODEL/feedback flag thành provenance người mặc. Bỏ cách hard-code một kết luận phủ khắp khi có source facet hợp lệ: producer chỉ project các facets nguồn thực sự đã có; trường hợp hiện hành vẫn NOT_RECORDED, không nghĩa ảnh chắc chắn không có người.

Nối cùng scoped meaning/asset hash/product/component vào selector result, hints và trusted verifier context. Không thêm tool/intent/ontology chỉ để ép S16 PASS trong lượt này. Trước run, S16 phải được đăng ký **SOURCE_GAP_CONTROL** cho yêu cầu customer-wearing, kỳ vọng silent handoff; historical MATERIAL_FAIL giữ nguyên. Report so sánh phải tách cohort mới khỏi các sales-ready cases, không tăng chất lượng nhờ đổi denominator. Owner vẫn có thể viết khẳng định sai rồi bị verifier chặn: giữ unsafe draft riêng, không coi đó là owner hiểu nguồn tốt.

Nếu trước freeze tìm được nguồn xác nhận người mặc/asset test được owner duyệt rõ, phải ghi exact asset/hash/part/approval, cập nhật shared projection và review input lại; không thay sau verdict. Không mở broad media metadata migration ở revision này. Acceptance: feedback/detail flag-only chưa đủ customer-wearing; source absent/contradictory →unknown; nguồn khác product/component/hash không chứng minh target. Một positive fixture chỉ chứng minh projection nếu facet được cấp qua contract nguồn có sẵn, không tạo positive shop fact giả; không có positive source thì ghi chưa triển khai positive capability.

## 7. W5 — transport diagnostics, không sửa state

Đích Gemini inference catch/telemetry. Giữ failure stage và bổ sung transportCause theo closed allowlist như CONNECT_TIMEOUT, HEADERS_TIMEOUT, READ_RESET, DNS, OTHER; map từ error/cause code đã allowlist, không raw exception/URL/header/token/body. Ghi monotonic elapsed, generationId/requestHash đã có, response request ID nếu provider thực expose và giá trị qua bound/allowlist. Không giả một error code đã xác nhận nguyên nhân mạng nếu chưa có evidence.

Không thêm retry/refresh-and-generation-retry, đổi timeout/model/credential hoặc chung provider framework. Test lỗi trước response, mid-body và timeout đều <=1 upstream generation/attempt, accounting giữ mẫu số, không response modelVersion thì unavailable. State/receipt đã commit trước generation lỗi vẫn giữ, không replay hoặc reset profile. J2 vận hành có thể tiếp tục fail; không đánh đồng với regression pending fields.

## 8. Thứ tự triển khai và RED→GREEN

1. W1 và technical contract tests, giữ domain/state tests xanh.
2. W2/W3 trong cùng acceptance trước provider vì bỏ batch gate đơn lẻ vẫn vướng ảnh S15. Implement savepoints riêng được nhưng không chạy native giữa chừng để quy kết.
3. W4/W5 theo giới hạn trên; cập nhật source admission/firewall/accounting/diagnostics consumers.
4. Self-review rồi independent exact implementation review/fix; không dùng plan approval làm approval code.

Định nghĩa test RED từ bản hiện hành trước executable change; GREEN tối thiểu và đối chứng meaningful. Không tạo test chỉ lặp lại implementation hoặc expected câu bán hàng. State/quote/media cần actual PG/CAS/accepted Outbox/delivery restart, stub owner/verifier được ghi rõ deterministic-only.

Lệnh focused dự kiến (chưa chạy trong planning):

```text
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce src/realtime-sales-catalog.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts --reporter=dot --maxWorkers=2 --no-file-parallelism
node --test apps/worker/evals/single-agent-commerce-read-only/product-read-selection.test.mjs apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/quote-task.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts --reporter=dot
pnpm --filter @lana/worker build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker lint
pnpm check:dataset-boundary
```

Kiểm đường dẫn test thật khi implementation; không claim command PASS nếu chưa chạy. Actual PG qua disposable harness hiện có, source/permission/unknown-commit controls, generation0 và DB cleanup; ghi exact commands/output/hash trong implementation report. Shared package nếu chạm phải kiểm tests/typecheck/build tương ứng, không mở drive-by refactor.

## 9. Gate đo đường sửa trước model/full run

Planning này không authorize provider run. Sau implementation được yêu cầu và review đạt, trước run phải commit/seal sạch source/config/schema/world/source readiness và exact models như hiện hành. Không ghi runtime SHA ngược vào source đang seal. Đăng ký trước case IDs, scripts, cohorts, repetitions N1, request caps, stop rules và reviewer/scoring; runtime projection không nhận evaluator labels.

Development screen dùng 7 ca lỗi vừa quan sát + đối chứng giữ điểm mạnh: J1, P08, P07 fit từng phần, P09 retained/product referent, full checkout và comparison media. Exact population phải được review input trước dispatch, không tự thêm hàng trăm ca theo variant. Synthetic deterministic controls không là native denominator. Không thay câu khách để ép model chọn tool mới.

| Mục | Evidence bắt buộc | Không tính là đã kiểm khi |
|---|---|---|
| W1 | Actual owner wire dùng schema mới; S04/S09 tới valid read đúng facts; retained selection control persist/reuse | Model chỉ ACK/handoff hoặc không gọi read |
| W2 | Native S15/J4 hoặc control đã preregister thực thi tới writer + quote, kết quả/receipt/prerequisites đúng; code không reorder | Dừng trước writer/quote, hoặc model không dùng mixed batch |
| W3 | Code ghi validated quote target, gate chọn/reuse đúng ảnh dù nhiều refs; màu query và actual media scope đối chiếu | Không gọi quote hoặc không có affected photo requirement |
| W4 P06 | Count/total và labels-known/unknown ở wire đúng source, actual reply không bịa tên | Handoff do draft bịa dù metadata đã cấp |
| W4 S16 | Source-gap cohort đã freeze, actual silent terminal; draft unsupported được ghi riêng | Đổi nhãn nguồn sau kết quả hoặc coi verifier chặn là owner thành công |
| W5 | Diagnostic fault-injection qua adapter; native error nếu có giữ account/unknown model version | Không có native transport error; không suy native network reliability từ stub |

Mỗi item có trạng thái EXERCISED_PASS / EXERCISED_FAIL / NOT_EXERCISED / SOURCE_GAP. NOT_EXERCISED không tự qua gate và không được chạy thêm lặp lại để săn một sample. Nếu native không exercise mixed path, giữ evidence đó, dùng deterministic evidence chỉ cho component; chưa mở full trên lý do “ca PASS”. Muốn một targeted rerun phải đăng ký mới và owner yêu cầu; không automatic fix/rerun loop.

Chỉ chạy phần full còn lại một lần khi screen đáp ứng đủ gate đã freeze và được owner yêu cầu. Những screen cases đã chạy không chạy lại trong cùng denominator; nếu dùng registration full mới thì ghi rõ attempt mới, không gộp best-of. Hard authority/privacy/unknown commit/accounting failures dừng theo policy, mọi lỗi ở denominator; không majority hoặc best-of-N. N1 không là stability qualification. So source/context phải cùng frozen world hoặc ghi khác biệt, không quy mọi cải thiện cho patch từ snapshot khác.

## 10. Điều kiện duyệt kế hoạch

Reviewer kiểm: không mất ảnh quote trong nhiều refs; không nhầm total trước giỏ/sau concession; không mất customerSelected/retained target; schema không rộng hơn decoder về shape; known no-commit có proof; cap ảnh không double-charge hoặc hidden I/O; S16 không tạo provenance test mới; mỗi acceptance có thể thực hiện trên harness hiện có. Nếu implementation phát hiện điều kiện không thực hiện được trong cap/boundary, dừng work item và sửa kế hoạch trước native, không tự relax guard hoặc tăng budget.

Chưa có bước nào trong bản kế hoạch này là thực thi code/provider. **PENDING INDEPENDENT REVIEW** cho exact hash của revision 3.
