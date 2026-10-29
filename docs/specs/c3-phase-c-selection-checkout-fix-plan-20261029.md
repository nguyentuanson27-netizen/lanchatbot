# Phase C — kế hoạch sửa selection và private checkout sau diagnostic

Revision1 — **APPROVE PLAN độc lập tại `a5e6270ae7ac5b3195e6d0da03e6841a7fe41e81`**;2findings tạibd5031a0 đã đóng. Planning base `b79fd3da2c3af2ad6a0d10f619593b4ee5906f8f`. Đã hoàn tất lập kế hoạch→review độc lập→sửa→review APPROVE; chưa implementation hoặc chạy model. Approval chỉ áp dụng kế hoạch, không thay implementation review/readiness. [Review record](c3-phase-c-selection-checkout-plan-review-20261029.md). [Diagnostic source6c5023ab, đủ6ca/20requests](../../apps/worker/evals/single-agent-commerce-qualification/diagnostic-20261029/REPORT.md), [toàn bộ hội thoại](../../apps/worker/evals/single-agent-commerce-qualification/diagnostic-20261029/CONVERSATIONS.md), [kế hoạch remediation trước](c3-phase-c-remediation-plan-20261029.md), [qualification](c3-phase-c-qualification-plan-20261028.md). Main/C3 reference giữ296cdcf; primary grades source36 và diagnostic cũ bất biến. Phase C BLOCKED/B_NOT_GO/AOWNER_BYPASS/C3NOT_RUN unchanged.

## 1. Mục tiêu và ranh giới

Khách chọn món/size có nguồn đủ thì bot tiến được đến giỏ đúng và lấy thông tin đặt hàng, không handoff vì adapter đưa thông tin mâu thuẫn. Khách cung cấp phương thức thanh toán bằng cách nói phổ biến thì code ghi nhận được và tiếp tục hỏi phần còn thiếu. Thiếu dữ liệu shop cần thiết→handoff im lặng; thiếu dữ liệu khách→hỏi bổ sung.

Giữ1owner Gemini3.5FlashLite HIGH, tối đa1verifier GPT6.1Sol HIGH. Code giữ identity/truth/freshness/state/permission/effects/receipts/privacy. Mọi model final draft sống qua hard precheck vẫn verifier mandatory +final gate; code-owned question chỉ theo producer/receipt/outbox đã duyệt. Không nới verifier, không đổi thresholds/repetitions/tool-generation caps. Không thêm model/router/repair/reverify, generic Vietnamese parser, semantic memory hoặc policy viết cứng vào prompt.

Vòng này không sửa rộng giọng văn s06, không thay FAQ/media policy đã đạt, không thay baseline C3 hoặc production entrypoint. Không mở raw private checkout cho model. Chỉ planning trong lượt hiện tại; implementation/tests/provider ở các bước sau không được ghi thành đã chạy.

## 2. Bằng chứng và nguyên nhân cần xử lý

| Vấn đề | Chứng cứ | Thay đổi phải giải quyết |
|---|---|---|
| j1 bị chặn từ lượt chọn áoL | read_product có stock chưa phân màu; add_to_cart(color:null)→INVALID/CART_VARIANT_AMBIGUOUS nhưng availableColors:[BE]; NO_COLOR_L9/BE_L0. Model nói Be có sẵn; verifier FAIL đúng | Đồng nhất tuple biến thể/khả năng đáp ứng giữa read/selection/error/trusted context; không sửa prompt để model tự giải quyết contract mâu thuẫn |
| j6 bỏ sót COD | Sau “Chị muốn trả khi nhận hàng”,0owner/0verifier, PRIVATE_CODE_PATH; paymentMethodnull; hỏi tên count1→2 | Sửa existing code-owned intake/payment recognition và progress accounting, không đổ lỗi model hoặc sửa renderer để che state |
| Clarification dùng sai ngân sách | Câu khách cung cấp thông tin hữu ích bị xem như chưa trả lời tên | Field đã ghi nhận thực sự phải phản ánh vào draft/missing fields; retry budget phân biệt tiến bộ đã commit với lặp lại không có tiến bộ |
| s06/s11 | Reply phối đồ dài; s11schema hợp lệ N1 nhưng handoff biến thể không tìm thấy | s06 tạm giữ; s11 là regression cho contract mới, không ép SEND khi nguồn không chứng minh đúng màu/offer/quantity |

Nguồn code: `realtime-sales-catalog.ts` availableValues/failed/verifiedVariantFromSnapshot/cartSelectionFromSnapshot; `single-agent-commerce-effects.ts` selection; `single-agent-commerce-ingress.ts` pendingCheckout→privateInput; `single-agent-commerce-session.ts` advancePrivateCheckout; `realtime-sales-cycle.ts` checkoutDetails/requestCheckoutClarification; `single-agent-commerce-public-history.ts`.

## 3. F1 — một cách hiểu biến thể cho candidate

### 3.1 Audit producer trước khi đổi lựa chọn

Đối chiếu snapshot với producer `pos-snapshot-core.ts` buildIndex/mapping/BOM. NO_COLOR là nhãn thiếu color từ source; không tự đổi thành Be, cũng không mặc định nó là aggregate hoặc biến thể riêng. Kiểm inventory_source, component/parent SKU, size, stock_status, stock_quantity và source release/hash cho row đã thấy. Không cộng NO_COLOR với các dòng màu, không tự sửa/publish dữ liệu POS/Redis/Qdrant.

Chỉ chọn row không phân màu khi code chứng minh đó là một lựa chọn bán độc lập theo identity/BOM hiện có. Nếu không chứng minh được, ghi rõ DATA_CONTRACT_BLOCKED và giữ ambiguity/handoff; không thay expected để buộc j1PASS. Cần bằng chứng cả read và effect dùng cùng row/identity.

### 3.2 Sửa contract tại candidate adapter, giữ default legacy

Chuẩn hóa một bounded view của **tuple product+offer+size+color+variant/BOM identity**, từ validated source hiện có. View chỉ là dữ liệu nghiệp vụ, không semantic plan/router. Read, chọn giỏ, lỗi chọn và final readback cùng dùng cách phân biệt identity đó. Ưu tiên sửa worker/candidate adapter; nếu phải sửa helper chung, giữ mặc định legacy và test mọi caller bị ảnh hưởng, không tạo hai resolver độc lập có kết quả trái nhau.

- Tách nhãn có trong source với bằng chứng còn hàng. availableValues không phải stock proof. Candidate projection không tiếp tục đưa raw availableColors/availableSizes như danh sách có thể mua khi status INVALID/UNKNOWN; thay projection gây hiểu nhầm, không chỉ thêm disclaimer cạnh nó.
- Mỗi option được đưa cho owner phải gắn đúng tuple, sourceVersion/observedAt/expiresAt, tình trạng stock và khả năng đáp ứng **quantity yêu cầu**. Không tạo tích chéo màu×size từ hai mảng độc lập; không lấy màu của SKU/offer khác.
- IN_STOCK, OUT_OF_STOCK, PREORDER theo policy và UNKNOWN/INVALID phải phân biệt. Stock0 không chứng minh có sẵn; preorder không bị xóa khỏi nghiệp vụ và không được đổi thành IN_STOCK. Error hint không nâng thành protected claim/receipt.
- Khách chưa nói màu, source có đúng1option bán được sau các kiểm identity/freshness/permission/quantity hiện có: có thể chọn option đó; không thêm màu vật lý chưa xác minh. Nhiều option hợp lệ→hỏi lựa chọn khách còn thiếu. Ambiguity của dữ liệu shop→silent handoff.
- Khách đã chỉ định màu/offer/size: tuyệt đối không tự đổi sang NO_COLOR, sản phẩm khác hoặc offer khác để tạo READY. Thiếu quantity hoặc hidden stock không phải đủ hàng. Khác giá/BOM/identity vẫn ambiguity, không collapse vì cùng tên hoặc cùng số lượng tồn.
- Lỗi không còn dẫn owner tới “Be còn hàng” khi BE0; vẫn giữ đủ source facts để verifier chặn draft cũ. Không bỏ dòng stock0 khỏi audit/trusted source để làm mất chứng cứ đối chiếu.
- Selection chỉ là chuẩn bị thao tác. Authorize/commit/readback giữ nguyên guards; source/permission/revision/recipient đổi thì không dùng PASS/selection cũ. Không sửa cart/receipt lịch sử hoặc phát lại mutation sau unknown commit.

## 4. F2 — ghi nhận thanh toán trong private checkout hiện có

### 4.1 Giữ privacy boundary và domain owner

Không bỏ `pendingCheckout` khỏi private routing. Bare name hoặc text không được detector nhận ra vẫn có thể là PII; không dùng “detector không báo” làm quyền gửi tin pending checkout vào owner. Không gửi raw text/quote/tên/phone/address/attachment sang model, verifier, telemetry hoặc public history. Không thêm payment vào apply_customer_state/customer profile; checkout/payment thuộc domain riêng theo spec§8.

Chọn hướng nhỏ nhất: **sửa bộ nhận dạng phương thức của existing checkoutDetails**, giữ code-only private intake, reuse CHECKOUT_DETAILS_CAPTURED/clarification/preview/commit hiện có. Không thêm tool/model call hoặc nâng literal extractor thành semantic classifier. Đây là recognizer đóng cho1field/2enum, không module hiểu câu tiếng Việt tổng quát.

Consumer/mode phải được khóa trước sửa, không đổi default của helper dùng chung:

| Consumer | Payment behavior trong vòng này |
|---|---|
| Candidate executor/evaluateRealtimeSalesCycle có code-owned checkoutCollection:SINGLE_FIELD | Dùng closed recognizer. AMBIGUOUS/UNSUPPORTED/NO_SIGNAL không được modelPaymentMethod/salesSignals nâng thành RESOLVED; chỉ code xác định theo grammar và policy |
| Realtime legacy không có candidate collection mode | Giữ nguyên matching/fallback modelPaymentMethod và các guard source evidence đang có; không bị opt-in vào recognizer mới chỉ vì gọi chung checkoutDetails |
| isPrivateCommerceText/privacy routing | Giữ nguyên name/phone/address/whole-message guards; payment recognition không được cấp quyền vượt pendingCheckout/private route |
| Public checkout projection, preview và confirm | Chỉ đọc committed domain state; tôn trọng pending PAYMENT_METHOD xuyên lượt như mục4.4, không tự parse hay suy method |

Tái dùng candidate mode code-owned hiện có, không cho model chọn mode và không thêm generic framework. Nếu helper cần options nội bộ, mặc định phải là legacy; thêm differential tests với legacy salesSignals thật/giả và field parser name/phone/address. Payment-only segment đã được nhận dạng không đồng thời được coi là bare name/address; mixed labeled fields vẫn được capture private theo field tương ứng.

### 4.2 Contract nhận dạng đóng, có giới hạn rõ

Refactor cặp regex paymentMethod hiện tại thành một hàm field-level có kết quả RESOLVED(method)/AMBIGUOUS/UNSUPPORTED/NO_SIGNAL. Không có confidence threshold hoặc state do model đặt. Runtime chỉ áp dụng method thuộc allowedPaymentMethods của policy đúng scope/version.

- Nguồn accepted forms phải được liệt kê một lần từ cách gọi thanh toán hiện có trong repo/shop, theo nhóm COD/trả tiền khi nhận và BANK_TRANSFER/chuyển khoản; không lấy caseId, sản phẩm, rubric hoặc đáp án mẫu làm grammar. Giữ các dạng cũ COD/tiền mặt/nhận hàng trả/CK/chuyển khoản.
- Hỗ trợ một **biểu thức khẳng định lựa chọn phương thức** hoặc một dòng thanh toán được gắn nhãn, sau chuẩn hóa Unicode/case/whitespace/punctuation. Dạng phổ biến “Chị muốn trả khi nhận hàng” phải được nhận, cùng các biến thể độc lập về cách xưng hô và trật tự nói trong cùng grammar đã freeze.
- Chỉ RESOLVED khi toàn bộ payment segment khớp một lựa chọn xác định. Không tìm keyword giữa câu rồi mặc định là lựa chọn. Phủ định, câu hỏi, giả định/điều kiện, hai phương thức chưa chọn, mâu thuẫn hoặc phần dư ngoài grammar→không tự ghi method. Không dựng parser suy luận negation/condition tự do để cứu các dạng chưa hỗ trợ.
- Với message nhiều dòng, chỉ dùng field thanh toán được tách theo cấu trúc intake hiện có; PII của những field khác vẫn xử lý private. Không strip tên/địa chỉ rồi gửi phần còn lại cho model. Message không phân tách được giữ private và hỏi bổ sung theo nhánh hiện có.
- AMBIGUOUS/UNSUPPORTED khi có payment segment chưa quyết được→hỏi chọn trong các phương thức policy cho phép, không chọn method đối lập và **chặn dùng method cũ** theo4.4. NO_SIGNAL thật sự không có payment segment→tiếp tục xử lý các field khác, giữ trạng thái unresolved trước đó nếu có. Nếu policy chỉ cho một method vẫn không tự suy khách đã đồng ý chọn nó.
- Không đưa text mẫu diagnostic vào prompt. Future phrase ngoài grammar không được mở thêm rule tự động; giữ unknown/clarification và báo coverage gap để quyết định có cần thay intake flow trong plan mới. Không tuyên bố hiểu mọi cách nói COD.

### 4.3 Commit, correction và tiến bộ hội thoại

RESOLVED đi vào CHECKOUT_DETAILS_CAPTURED của domain hiện tại, chỉ update checkoutDraft.paymentMethod; source/inbox/revision/policy/recipient/owner guards và atomic commit/readback giữ nguyên. Draft không phải đã thanh toán hoặc đơn đã xác nhận. Customer còn phải thấy method trong preview và xác nhận qua flow cũ trước effect cuối.

- j6: null→COD phải có persisted event/receipt; missing field thanh toán biến mất, FULL_NAME/PHONE/ADDRESS vẫn thiếu. Tiếp tục hỏi tên, không báo đã lên đơn hay đã thu tiền. Public checkout projection chỉ expose enum đã commit cùng provenance, không raw payment quote.
- Correction chỉ áp dụng explicit, unambiguous RESOLVED theo policy và state hiện hành. Phản đối/withdrawal/chưa chọn hoặc mâu thuẫn payment segment chưa RESOLVED phải invalidate readiness của lựa chọn cũ, không tự chọn method đối lập. Không diễn giải silence thành xác nhận; invalidation readiness không phải xác nhận đã xóa/đổi phương thức.
- Không tiêu hao retry “khách chưa trả lời tên” khi message vừa điền thành công một required field đang thiếu. Chỉ tính progress sau commit+readback khi tập required missing giảm thực sự. Duplicate/replay/giá trị giống cũ hoặc correction không điền field còn thiếu không reset ngân sách. Không tăng cap3 hoặc thêm vòng hỏi không giới hạn.
- Lỗi commit/conflict/unknown giữ state cũ/uncertainty đúng flow, không báo đã ghi, không replay mutation để cứu lời trả lời. Code-owned question vẫn cần producer/source/receipt/accepted Outbox proof, không tạo ngoại lệ cho model text hoặc claim thanh toán thành công.

### 4.4 Unresolved payment là trạng thái nghiệp vụ phải tồn tại qua lượt sau

Tái dùng clarification PAYMENT_METHOD của domain đã persist, ưu tiên làm rõ phương thức trước khi tiếp tục hỏi field khác khi payment segment mới ambiguous/unsupported. Không chỉ có local boolean rồi mất ở turn sau; không cần thêm semantic memory hoặc writable profile field.

- Persist CLARIFICATION_REQUESTED với PAYMENT_METHOD và source/revision hiện tại. Old method nếu còn trong draft chỉ là giá trị trước đó, **không đủ readiness**. Public checkout view không trình bày nó như lựa chọn đã giải quyết; expose pending PAYMENT_METHOD/enum null trong view tương ứng, audit vẫn giữ sự thật lịch sử.
- Candidate planner, native confirm bridge và domain PREVIEW_CREATED/CONFIRM_PURCHASE phải block khi PAYMENT_METHOD clarification chưa resolve, kể cả draft đã đủ name/phone/address và còn COD cũ. Guard phải bảo vệ cả direct domain call, không chỉ một early return của private handler.
- Lượt gửi field khác có thể capture field đó private, nhưng không được dùng missingCheckout()==0 để tự CLARIFICATION_RESOLVED hoặc tạo preview bằng method cũ. Duplicate/replay và source superseded không bỏ pending blocker.
- Chỉ một RESOLVED payment selection mới, thuộc source/revision/policy hợp lệ và có CHECKOUT_DETAILS_CAPTURED commit/readback tương ứng, mới được resolve PAYMENT_METHOD rồi tính lại missing fields. Tying resolve với actual captured payment evidence là bắt buộc; không dùng timestamp của update tên/địa chỉ làm proof đã chọn lại phương thức. Nếu adapter/guard hiện tại chưa mang được proof này, bổ sung tối thiểu domain contract của clarification resolution và test contracts/runtime; không dựng một parser/semantic state machine khác.
- Khi preview cũ đã tồn tại: payment unresolved làm preview/confirmation không còn đủ eligibility; không send/confirm preview cũ. Không giả rollback order/payment effect đã commit; nếu PURCHASE_CONFIRMED thì giữ xử lý after-sale/handoff cũ thay vì sửa payment bằng intake. Transaction pin/current policy/effect receipts giữ binding hiện có.
- Câu hỏi payment không rõ có thể cần xác nhận lại dù method trước đã tồn tại; đây là giới hạn usability được khai báo của recognizer đóng. Không tự phân loại mọi câu có từ COD là withdrawal; NO_SIGNAL không chặn thêm. Full payment segment có ý chưa quyết được thì fail-closed theo nhánh này, không hứa hiểu ngôn ngữ tự do.

## 5. TDD và regression bắt buộc cho task implementation sau

RED phải tái hiện đúng error/source path trước fix; GREEN minimum. Unit/synthetic không được gọi model hoặc gắn nhãn là campaign evidence.

| Nhóm | Trường hợp cần kiểm và kết quả |
|---|---|
| Selection thực tế | Source AO NO_COLOR_L9/BE_L0, quantity1: không có positive BE hint/claim; READY NO_COLOR chỉ nếu producer identity chứng minh hợp lệ; nếu không, documented BLOCKED |
| Không đổi ý khách | ExplicitBE0 không fallback NO_COLOR; khác offer/size/product, quantity vượt tồn, hidden/stale stock không được cấp proof có sẵn |
| Tuples và fulfillment | Nhiều tuple đủ hàng→clarify; không Cartesian product; preorder giữ nghĩa riêng; BOM/price identity mâu thuẫn không collapse |
| Binding/receipt | Stock/permission/recipient/revision thay trước commit hoặc trước send→block; duplicate và unknown commit không replay; giữ transaction pin/current policy contract |
| Intake grammar | COD/CK cũ và ≥3paraphrases/2methods mới trong grammar; Unicode/case/punctuation; private mixed labeled fields; source/revision bindings |
| False-positive intake | “không COD”, “chưa chọn”, hỏi phương thức, “COD hay chuyển khoản”, điều kiện, negated correction, contradictory batch→không wrong method/effect; unresolved cần hỏi đúng field; candidate salesSignals đề xuấtCOD không override kết quả chưa xác định |
| Old method xuyên lượt | COD cũ→phản đối/ambiguous→gửi tên/địa chỉ hoặc source replay: persistPAYMENT_METHODpending và direct PREVIEW_CREATED/CONFIRM_PURCHASE đều bị chặn; explicit fresh selection+capture receipt mới resolve. Preview cũ cũng mất eligibility |
| Progress | j6 persistedCOD và NAMEquestion vẫn đúng; count1 không tăng vì accepted new missing payment field; replay/same value không tạo giả progress; cap3/no-progress vẫn hoạt động |
| Privacy/legacy | Bare tên, phone/address, mixed PII/payment, ảnh và người khác gửi→0raw PII tới model/verifier/log/public history; payment-only không thành tên; candidate closed vs default legacy/model fallback có differential tests; private handlers/attachment handoff không yếu đi |
| Khả năng cũ | CareFAQ, code-owned receipt/capture, public history, image/text bounds, silent handoff và whole-reply verifier/gate vẫn PASS |

Trước provider: focused tests cho catalog/read/effects/session/intake/ingress/public-history/boundary và existing protected-claims/reply-assembler; protocol/provider/diagnostic focused Node; worker typecheck/build/lint. Nếu shared package thực sự đổi, chạy tests/typecheck/build tương ứng. Actual disposable-PG phải có j1 selection/commit/replay/changed-source, j6 naturalCOD/private progression/duplicate/unknown, accepted outbox witness; giữ7named real-adapter invariants. Exact clean source, DBdrop,0provider trước readiness; không thay bằng mock rồi claim real-PG PASS.

## 6. Thứ tự, review và đo bằng model ở task sau

1. Commit plan đã được reviewer approve; không sửa runtime trong task lập kế hoạch.
2. F0 trace/fixtures và producer semantics→F1 candidate contract→F2 private intake/progress→focused+real-PG. Incremental savepoints; không sửa voice prompt/verifier/schema/policy để làm đẹp kết quả.
3. Independent implementation review→fix→review đến APPROVE exact executable source. Approval code không thay model outcome; giữ failures đã quan sát.
4. Chỉ khi owner giao task implementation/run và readiness đạt mới freeze diagnostic mới. Một batch development **giữ6case purposes,9native turns+1probe,N1,max37generation**; same models/config/caps. Giữ lời thoại tự nhiên và default/alternative branches cũ; source facts thực còn hạn, initial-state artifact đúng source và code-owned branches freeze trước request. Không thêm model cases cho mọi contrast đã có deterministic tests.
5. Cases j1/j6 là regression/dev đã thấy; không gọi là fresh qualification. Preregister thứ tự j1→j6→s09→s06→s11→probe, chỉ dispatch trong cap từng case/turn/role/batch; muốn đổi thứ tự cần cập nhật diagnostic scope validator+tests+review trước seal, không giả collector hiện tại đã cho phép thứ tự mới. Không retry/best-of-N hoặc automatic multi-round.
6. Hard stop như diagnostic hiện hành: privacy/effect/source/freshness/binding/accounting uncertainty hoặc unsafe send-eligible false PASS→dừng batch, giữ remainingNOT_RUN. Known provider/malformed error giữ denominator, không tạo slot thay thế. Final draft qua hard precheck vẫn verifier bắt buộc; static bounded code question dùng đúng receipt/witness đã duyệt.
7. Whole-customer-outcome review sau batch: j1 có đúng giỏ M+L và tổng nguồn hay dừng ở đâu; j6 có method đã persist, missing fields/attempt count đúng, không giả đã tạo đơn; s09retained; s11 xử lý đúng data readiness; s06 chỉ báo residual, không ép voicePASS. Audit cả rejected drafts/terminal/no-send/state/effects/privacy; request counts/errors/usage/latency/cost unavailable và label firewall.
8. Nếu residual còn: STOP/replan, không tự thêm regex/prompt/examples hoặc chạy tiếp. Chỉ sau candidate readiness và full development exposure/mappings/near-duplicate review+fresh source-bound holdout mới mở qualification 24SAFETY/16SINGLE/6JOURNEY theo planC; candidate absolutePASS và matched parity đủ mới so C3main296. Không bypass gate, giảm ngưỡng hoặc đổi primary grades.

## 7. Tiêu chí approve kế hoạch và điểm dừng hiện tại

Reviewer cần xác nhận: giải quyết root contract thay vì đổi wording; NO_COLOR không được bịa nghĩa; code-only private intake không mở PII; recognizer chỉ1businessfield với accepted/unknown rõ và không thành generic parser; no-progress budget không tăng do successful new field; không phá caller legacy/preorder/receipt/final gate; verification/model population có trần và giữ contamination distinction.

Task này hoàn tất tại **APPROVE PLAN** với review record và tasks updated. Implementation, deterministic tests, real-PG và provider run của kế hoạch này đều NOT_RUN; không merge/deploy/live send hoặc auto mở campaign.
