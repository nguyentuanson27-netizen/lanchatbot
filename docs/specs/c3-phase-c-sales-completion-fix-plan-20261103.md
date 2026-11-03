# Phase C — kế hoạch hoàn thiện luồng bán hàng sau review 48 lượt

Trạng thái: **PROPOSED PLAN, chưa implementation/review độc lập/chạy model**. Planning base `788ce66dcc18e99195b86890fdf7755df6b300e2`. [Finding và review đủ 33 ca](c3-phase-c-whole-run-review-20261103.md) / [bằng chứng capture-clock](c3-phase-c-whole-run-review-evidence-20261103.json).

Mục tiêu: khách hỏi giá, chọn món/size, quyết định mua và chuyển tiếp checkout được xử lý bằng dữ liệu và tác vụ hiện có; thiếu dữ liệu shop cần thiết thì handoff im lặng, thiếu thông tin khách thì hỏi đúng phần thiếu. Không lấy số reply gửi được thay cho chất lượng bán hàng hoặc hoàn thành đơn.

Giữ một owner và tối đa một verifier; code sở hữu truth, freshness, binding, state, permissions, privacy, effects và receipts. Giữ sáu primitive units/hai tool rounds/ba owner generations, một verifier cho mọi final draft sống sót hard precheck, request bounds hiện hành và retry0. Không classifier câu khách, regex theo ca, prompt ví dụ fit benchmark, third online role, repair/reverify loop, tăng budget hoặc production wiring. Giữ silent handoff và whole-group send gate. Không sửa giọng hàng loạt, nới bốn semantic rejection hay rollback toàn Phase C.

## Phân công và thứ tự

| Savepoint | Việc | Kết quả phải bàn giao trước bước sau |
|---|---|---|
| S1 | Chốt inventory nguồn ảnh, màu, component và chart | Manifest đủ/thiếu theo tác vụ; candidate thay đổi nguồn có thể review; không tự sửa live |
| S2 | Chuẩn hóa danh tính món mua lẻ và lựa chọn giỏ | Cùng áo không bị nhân đôi; thiếu lựa chọn khách được phân biệt với thiếu nguồn shop |
| S3 | Nối size từng phần qua Size Engine và claim đúng target | PRODUCT/COMPONENT không cấp fit chéo; capability chỉ bật nơi có chart đúng authority |
| S4 | Giảm read thừa, xử lý bound và đường báo giá | Replay continuation thật và regressions vừa caps; ACK/phối đồ không tự thành tác vụ ảnh |
| S5 | Đi tiếp checkout sau khi khách đã muốn mua | Intake/preview/confirm qua code hiện có; không hỏi lại ý mua hoặc tự lấy PII vào model |
| S6 | Deterministic, real PostgreSQL, review và frozen model run | Bằng chứng riêng cho nguồn, code, owner/verifier và toàn hành trình; không tự GO |

S2/S4 có thể chuẩn bị trên fixtures trong lúc hoàn thiện S1, nhưng model acceptance cho đường bán hàng phải dùng nguồn đã kiểm tra. S3 không được giả lập nguồn chart để gọi là đã hoàn thành thật. Mỗi savepoint giữ diff riêng để hồi quy có thể quay đúng thay đổi, không rollback các nhánh đã đạt.

## S1 — chuẩn bị dữ liệu shop có thể sử dụng

### Ảnh: dùng lại cơ chế revalidation đã có

Phạm vi trước mắt: SQ2447, SV1561, V406, SD023; giữ SV2447 làm control đang có ảnh hợp lệ. Không cần làm lại registry hoặc pipeline ảnh.

1. Đọc đúng point/asset và dòng approved `image_registry`, kiểm product/component, URL, loại ảnh, partsVisible, feedback, colour binding, source hash và clock. Lập danh sách asset phục vụ GENERIC, DETAIL/cận ren và FEEDBACK/TOP riêng; không coi ảnh MODEL là feedback.
2. Dùng logic `revalidatePublishedMedia` trong `apps/worker/src/p23c-media-revalidation.ts` và source binding của `p23c-publisher.ts`. Chuẩn bị ảnh bằng đúng canonical route, đối chiếu hash với approved registry, reread nguồn trước khi tạo proof và readback sau ghi. Source/hash đổi hoặc approval bị thu hồi thì không cấp proof mới.
3. Chuẩn bị manifest review gồm exact pointIds, old/new proof, approved source hash và kết quả kiểm. Không chạy toàn publisher, restart job hoặc publish các điểm ngoài danh sách. Việc publish proof nguồn là một thao tác riêng, chỉ sau authorization cho exact manifest; yêu cầu lập kế hoạch hiện tại không cấp quyền ghi nguồn shop.
4. Sau publish/readback được phép, capture mới rồi chạy eligibility tại actual clock. Tối thiểu mỗi sản phẩm cần ảnh mở đầu có một GENERIC hợp lệ; V406 cần asset DETAIL đúng phần khách hỏi nếu muốn xếp ca cận ren vào SALES_READY. SD023 phải có clock/proof thật, không chèn thời gian vào file eval.
5. Không có approved feedback phù hợp thì giữ s16 làm source-gap/handoff control. Không thêm ảnh giả, đổi MODEL thành FEEDBACK hay dùng ảnh chung để thay yêu cầu ảnh khách mặc.

Không hứa rằng mọi asset đều revalidate được: đổi content/metadata phải qua review nguồn tương ứng. Source capture mới không thay thế revalidation; giữ nguyên media TTL và POS freshness.

### Màu và chart: inventory có authority

- Đối chiếu AO của SQ2447 và SV2447 qua `componentRef=SV2447-AO`, BOM/offer source và source version; liên kết từ cấu hình/nguồn đã xác nhận, không từ tên giống nhau.
- Chốt nghĩa vật lý của tuple `__NO_COLOR__` IN_STOCK so với BE PRE_ORDER. Không đổi token thành “bản tiêu chuẩn”, không tự map nó thành BE hoặc tự chọn loại có hàng. Chỗ nào nguồn không xác định màu thật thì đánh dấu SHOP_DATA_MISSING và giữ handoff; không đẩy câu hỏi nội bộ cho khách.
- Tìm source chart TOP/PANTS/SKIRT và applicability hiện có trước khi tạo mới. Snapshot vừa review chỉ có `size-chart:SQ2447`, category SET, role OTHER; approval dùng chung theo tên hiện tại cấp PRODUCT, chưa cấp COMPONENT. Không nhân chart SET thành ba chart chỉ bằng đổi nhãn.
- Chuẩn bị candidate applicability/chart cho từng phần cần bán; nếu nguồn shop không có đủ căn cứ thì ghi BLOCKED_AT_SOURCE cho phần đó. Không xin thêm số đo khách để che việc thiếu nguồn shop.

**Gate S1:** có inventory và source references rõ ràng; source-ready và gap controls được khai báo trước model result. Bản sửa code có thể được kiểm trên fixtures, nhưng không ghi “luồng đã fix” cho những phần source vẫn chưa sẵn sàng.

## S2 — cùng món mua lẻ và lựa chọn giỏ phải rõ cho model

File chính: `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce-selection-evidence.ts`, `realtime-sales-catalog.ts`, `single-agent-commerce-effects.ts`, composition trong `single-agent-commerce.ts`, owner presentation hiện hành.

1. Trong context code đã chuẩn bị, đưa danh tính canonical của component một lần, kèm các parent/offer liên quan và read targets có source binding. AO chung không thành hai áo để khách chọn. Giá/tồn/media của hai parent vẫn giữ nguồn riêng; không gộp chỉ vì cùng component hay tên. Metadata không nhất quán thì báo gap/conflict, không deduplicate mù.
2. Giữ `selectionOptions`/identityHash hiện có làm căn cứ, không thêm framework hay một registry mới. Phân biệt rõ: duy nhất một tuple hợp lệ; nhiều lựa chọn vật lý đã xác nhận; hoặc tuple thiếu thông tin shop. Quyết định phải dựa trên source hiện tại và ràng buộc khách đã cung cấp.
3. Duy nhất một tuple phù hợp thì code resolve theo quy tắc hiện có, không buộc owner viết sentinel. Nhiều lựa chọn thật thì trả `NEEDS_CUSTOMER_CHOICE` cùng các lựa chọn customer-visible đã xác nhận; không commit và không tự handoff như mất nguồn. Có lựa chọn unknown colour không thể trình bày/đối chiếu thì trả `SHOP_DATA_MISSING`; handoff im lặng. Phân biệt kết quả này ở tool và composition, không parse câu khách.
4. Khi khách chọn một option hiện có, dùng exact identity và binding/source version trong evidence hiện hành để resolve lại trước effect. Không nhận một ref/hash do owner tự tạo; stale/changed option không được commit. Chỉ thêm trường chọn option vào closed tool args nếu schema hiện tại không đủ biểu diễn, và chỉ trong hai tool cart liên quan.
5. Không bỏ filter BE rồi dùng tồn không ghi màu để đáp “đủ hai bộ be”. Có thể cung cấp thông tin tồn khác như thông tin khác, nhưng không nói nó thỏa yêu cầu màu của khách. Ranh giới verifier không thay đổi.

**TDD/controls:** h01/j1/j4 null-vs-canonical, hai size, BE preorder vs unrecorded in-stock, exact request BE không được rơi về no-colour, source/ref/revision bị đổi, hai parent chung áo, hai component khác nhau nhưng cùng tên, số lượng thay đổi và duplicate operation. Giữ p08 add→replace và tổng/stock receipts.

**Pass:** không còn phụ thuộc owner đoán cách viết null/sentinel; code không tự chọn giữa các variant khác nhau. Nguồn thiếu vẫn handoff, còn thiếu lựa chọn khách thật sự thì có câu hỏi trả lời được.

## S3 — size từng phần: nối đủ target, nguồn và claim

Không chỉ xóa nhánh `fitScope===COMPONENT` trong `single-agent-commerce-state.ts`.

1. Mở port sizeInput có target rõ `{parentProductId, componentProductId, componentRole}` lấy từ BOM/offer đã kiểm. Reuse `recommendSize`, chart eligibility và customer profile writer hiện có; không viết công thức size mới, parser tiếng Việt hoặc chọn size bằng model.
2. Reuse `commerceSizeSource`/`size-chart-eligibility.ts` để kiểm đúng chart/applicability cho target. Shared PRODUCT chart chỉ tiếp tục cấp PRODUCT. Source cho TOP không tự cấp PANTS/SKIRT; cùng tên không cấp identity hoặc applicability mới.
3. Thay từ chối vô điều kiện bằng đọc capability/target có nguồn. Thiếu customer inputs trả missingInputs từ engine; chỉ hỏi phần đó. Thiếu/expired/unverified component chart trả typed shop-source/capability gap và handoff, không fallback về PRODUCT.
4. Mở rộng evidence **riêng cho size** để giữ target chính xác. Thiết kế chọn hướng additive: legacy SIZE_FIT vẫn là PRODUCT; component SIZE_FIT phải có `fitTarget` bounded trong value, gồm parent/component/role. Không mở COMPONENT cho mọi claim type, không dùng variantId để giả làm componentId. Claim producer/guard phải kiểm engine decision, chart target, BOM relationship, profile revision và measurement fingerprint cùng target; model không được mint field này.
5. Map/cache fit theo target, không chỉ parentProductId; fit áo không bị ghi đè bởi fit quần và không cấp quyền chọn cả bộ. Profile correction invalidates mọi target bị ảnh hưởng; sửa chart hoặc BOM invalidates đúng claim cũ. Cập nhật trusted-context allowlist/serialization/schema hash và final-gate kiểm binding tương ứng, giữ caps hiện hành.
6. Chỉ sửa phần scope kỹ thuật trong verifier prompt khi contract thay đổi; không thay ranh giới tư vấn, phong cách hoặc thêm câu mẫu cho ca. Giữ hành vi PRODUCT, same-name product delegation đã được approve và việc khách tự chọn size không cần fit claim.

**Gói có thể bị tác động:** `@lana/contracts`, `@lana/business-tools`, worker state/context/boundary, callable/eval schema và consumers claim. Phải kiểm toàn chuỗi producer→serialization→verifier→final gate, không chỉ tool return.

**TDD/controls:** PRODUCT M không cấp TOP M; TOP M không cấp PANTS M; TOP/PANTS khác size; correction sau kết quả cũ; chart expired/wrong role/wrong component; source unknown không áp dụng profile patch ngầm; engine hỗ trợ chiều cao/cân nặng không bị ép xin ba vòng. Real source chưa có chart thì đánh dấu source BLOCKED dù fixtures GREEN.

## S4 — request vừa bound và owner chỉ làm việc cần cho lượt hiện tại

File chính: current owner context presentation/native codec, `candidate-provider.mjs`, `single-agent-commerce-read-only-tools.ts`, owner prompt hiện hành; các fixture discovery/continuation đang có.

### Code/context

- Reuse canonical component/view của S2 để bớt lặp mô tả cùng AO dưới hai parent, trong khi giữ các target giá/tồn khác nhau và evidence có nguồn. Dùng CompactV2 fixed-path/reference đã có, không thêm một bộ tóm tắt ngữ nghĩa do code hoặc model khác làm.
- Bổ sung exact captured s15 state+two-read continuation vào nhóm replay hiện có s02/s13; giữ native signed parts, history và round-trip expansion. Kiểm raw và presented frame đều nằm trong 65.536 byte, trusted vẫn trong bound. Không truncate, bỏ facts/receipts, tăng cap hoặc chuyển body lỗi sang request thử lại.
- Cho owner thấy những facts/targets đã có, source status và budget sau debit đúng như runtime; không nêu một capability đang unsupported như một kết quả có thể lấy được bằng cách hỏi khách thêm.
- p01 có ảnh READY nhưng owner vẫn gọi select_product_media rồi nhận MALFORMED_RESPONSE ở generation sau. Nêu selection đã chuẩn bị trong cùng context để owner dùng lại; test exact available actions/source reuse. Không quy provider finish reason thành lỗi JSON của mình hay hứa loại bỏ hoàn toàn malformed; lỗi còn xảy ra phải fail-closed, không hidden retry.

### Prompt — thay đoạn liên quan, không cộng thêm danh sách ví dụ

- Để owner nhận ra tin chỉ ACK/sở thích không phát sinh nhu cầu đọc lại hàng. Nếu có state update cần thiết thì dùng writer; tiếp tục trả ACK từ những gì đã có, không mặc định đọc cả hai parent.
- Với câu hỏi phối đồ đã đủ mô tả: tư vấn ngay, không tự biến việc lấy ảnh thành điều kiện. Khách xin ảnh hoặc quy tắc opening image code đang yêu cầu thì vẫn phải theo media gate; optional lookup không được khai thành mandatory task chỉ để sinh lời khuyên.
- Read chỉ cho một thông tin đang thiếu và cần trả lời. Dùng cùng component đã xác nhận thay vì hỏi khách chọn giữa hai parent không làm đổi món áo. Không dùng NOT_READ của field ngoài yêu cầu làm lý do tra cứu.
- Không sửa bảng tính từ/giọng hoặc thêm few-shot riêng cho cảm ơn, quần nâu, Thạch Thảo. Không chặn tool theo keyword ACK trong code.

**Kiểm chứng model riêng:** s15 ACK có thể có legitimate state write nhưng không đọc sản phẩm chỉ để đáp cảm ơn; s06 không phát sinh yêu cầu ảnh từ chính owner; s02/s13 có thể tới final/verifier mà không bound-block; p01 báo giá qua đường hiện có, mọi malformed vẫn nằm denominator. Test stub chỉ chứng minh mechanics, không gọi là đã sửa được hành vi model.

## S5 — khách đã muốn mua thì chuyển tới bước làm được

File chính: owner prompt, current tools/callable, `single-agent-commerce-effects.ts`, `single-agent-commerce-ingress.ts`, `realtime-sales-cycle.ts` và checkout/delivery tests hiện có.

1. Dùng trạng thái cart/checkout/receipt đang có để nêu bước tiếp theo. Sau khi khách yêu cầu mua và cart commit thành công, owner gọi bước checkout hiện hỗ trợ để code nhận việc thu thông tin; không kết thúc bằng câu hỏi có muốn chốt lại. Chỉ hỏi giá/tồn không được tự add hoặc checkout.
2. Nếu batch add→confirm đủ khả năng và budget thì dùng ordered executor hiện có. Nếu chưa thể gọi tiếp, trả bước thông tin có thể thực hiện ở lượt sau dựa trên public missingFields/capability, không hứa đã tạo đơn. Không thêm auto-confirm bằng cách code đọc câu khách hoặc bỏ quyền xác nhận preview.
3. PII tiếp tục đi private code path, không vào owner/verifier, context public hoặc logs. Code hỏi field còn thiếu; cập nhật COD phải có receipt và không tự coi là khách đã xác nhận mua theo preview.
4. Giữ việc hỏi tên lần hai khi khách chưa trả tên; không gọi đây là quên lịch sử. Chỉ sửa việc lùi về CTA xin ý mua lần nữa. Không sửa hàng loạt câu hỏi intake đã được kiểm.

**TDD/real-PG:** p08 add/replace không mất giỏ hoặc sai quote; j6 add→checkout invitation→private intake→preview→explicit confirmation, cart/source/permission/freshness đổi giữa các bước, duplicate inbound/operation, crash-after-commit, handoff giữ HUMAN, no duplicate effect/outbox, no private data tới model. Không tự mua sau ACK hoặc sau COD.

## S6 — acceptance và lượt model kế tiếp

### Deterministic trước provider

- TDD thật: ghi RED quan sát cho boundary thay đổi rồi GREEN tối thiểu.
- Chạy focused tests đúng producer/consumer bị chạm, protected claim/reply assembly, worker typecheck/build/lint. Thay shared claim/schema thì chạy tests/typecheck/build các gói shared và consumers bị tác động. Chạy canonical worker suite trước freeze nếu đã đổi runtime.
- Real PostgreSQL trên database thuộc eval: lựa chọn thiếu của khách vs shop gap, nhiều size, correction invalidates claims, cart add/replace/checkout, atomic media+text và bảy invariants persistence hiện có. Không gọi mock là real PostgreSQL; unavailable thì ghi BLOCKED.
- Kiểm nguồn/media actual-time theo đúng request của ca trước provider; stale/missing data giữ làm controls đã khai báo. Khi nguồn thay đổi sau seal, dùng identity mới; không ghi đè capture cũ.
- Build → self-review → fix → independent review → fix cho tới không còn blocker. Approval code không được coi là approval nguồn/live writes hoặc quality GO.

### Bộ ca, thứ tự và số lượt — không chạy trùng prefix

Giữ **33 ca / 48 lượt** hiện có làm population đối chiếu. Không viết lại câu hỏi để né lỗi hoặc thêm hàng loạt paraphrase.

Prefix ưu tiên: p01, p02, p06, p07, h01, s06, s07, s13, s15, j1, j2, j4, p08, j6: **14 ca / 23 lượt**, mỗi ca N1. Nếu phần source/capability của ca chưa ready, không kỳ vọng reply để ép PASS; ghi control đúng từ trước. Chỉ mở phần model prefix cần kiểm chức năng khi prerequisites liên quan đã qua deterministic/readiness.

Các đường cần nghiệm thu sửa trong vòng này (ảnh cho p02/p06/p07, lựa chọn cho h01/j1/j4, component fit cho p07/s07/j2) phải có prerequisites thật trước khi được ghi prefix SALES_READY. Nếu một trong các prerequisite này vẫn thiếu, nghiệm thu phần đó và lượt full dành cho nó BLOCKED_AT_SOURCE, không chạy lại cả bộ chỉ để thu thêm handoff rồi tuyên bố đã kiểm chức năng. Có thể hoàn tất code/tests và báo phần nguồn còn thiếu. s16 feedback thiếu thật và các handoff hậu mãi vẫn là controls hợp lệ, không bị buộc thành reply.

Sau prefix đạt các yêu cầu tương ứng, chạy **19 ca / 25 lượt còn lại**, không chạy lại prefix để tạo một “full” đẹp hơn. Nếu prefix có lỗi material, giữ toàn bộ lỗi/NOT_RUN và dừng để review, không tự thêm vòng fix/rerun. Handoff đúng nghiệp vụ, source-gap đã đăng ký không phải prefix failure; handoff giả do đường ready vẫn không làm được là failure.

Để thực sự kiểm full checkout, bổ sung đúng **một ca 7 lượt**, đăng ký riêng với customer branches tự nhiên theo field code đang yêu cầu, dữ liệu khách synthetic: chọn mua → yêu cầu xử lý/đáp field đã hỏi → tên → điện thoại → địa chỉ → COD → xác nhận preview. Branch phải lấy proof/status từ harness hiện có, không có customer model thứ ba hoặc phân loại prose. Khi owner đã chuyển intake sớm, branch trả field đang thiếu thay vì lặp ý mua. Nếu không tới được preview ở lượt xác nhận, ghi chưa hoàn tất, không coi lời “đồng ý” là receipt. Rà lại lời thoại và executable branches trước freeze; không thay giữa run.

Tổng kế hoạch đề xuất: **34 ca / 55 lượt native**, N1; 33 ca gốc/48 lượt và supplemental checkout1/7 giữ denominator riêng. Prefix14/23 nằm trong33/48, không cộng thêm. Cùng giới hạn tối đa3owner+1verifier cho mỗi native turn: tổng ceiling220generation records, thực tế thấp hơn ở private code path/handoff; không phải220request bắt buộc. Mọi error/zero-HTTP/NOT_RUN giữ nguyên. Không majority, best-of-N hoặc lấy run sau thay run lỗi.

Thứ tự prefix/remainder cần hai fixed development scope mới, bản gốc được giữ bất biến. Khóa cả customer scripts, order, branch policy, generation ceiling và nhóm nghiệm thu trước dispatch. Review prefix là bước offline giữa hai populations, không tham gia runtime, không rewrite/reverify reply và không trở thành conversational role thứ ba.

Owner Gemini3.5FlashLite HIGH; verifier GPT6.1Sol HIGH, cùng provider route hiện hành; không tự đổi model/effort. Seal exact executable/config/schema/prompt/corpus/world/helper hashes sau commit sạch, capture runSourceSha ở runtime, preflight lại actual-time. Mỗi generation tối đa1request/retry0; auth/quota/timeout theo existing stop policy.

### Chấm theo toàn kết quả khách thực sự nhận

- Đúng nhu cầu và món mua; giúp khách ra quyết định; bước tiếp theo làm được; logic giữa các lượt; safety/state/effect/privacy. Không chấm dựa vào có đủ từ khóa, không bắt nhắc lại số đo/điều kiện đã rõ hoặc chấm stylistic benefit bằng một từ riêng lẻ.
- Báo riêng SALES_READY task completion, đúng câu hỏi bổ sung thông tin khách, đúng source-gap/business handoff, provider failure và mọi NO_SEND sau handoff. Ca bị handoff từ lượt1 không được dùng để khẳng định đã test xong mutation/correction/thương lượng ở lượt sau.
- Ca p10/s04/s11/s13: giữ bốn draft sai cũ làm semantic boundary regressions. Câu trả lời mới không buộc phải handoff nếu có thể trả một reply đúng nguồn; không đổi nhãn cũ hoặc ép owner nhắc lại một câu mẫu.
- Hơi dài, nhiều tính từ hoặc hỏi size hơi form là hạn chế nhẹ được owner tạm chấp nhận, trừ khi làm bỏ việc khách cần hoặc hứa bước không làm được. Không mở vòng sửa giọng để tối ưu điểm.
- Giữ ngưỡng qualification Phase C owner đã chọn; development batch này không tự thay C3, không thay ngưỡng/denominator sau kết quả, không tự GO hoặc dispatch baseline comparison. GO còn cần protocol qualification và so sánh C3 đúng plan riêng.

## Điểm dừng và những gì không được gọi là đã hoàn thành

- Chỉ có fixtures GREEN nhưng chart/ảnh/màu thật vẫn thiếu: code mechanics có thể hoàn tất, source-dependent acceptance BLOCKED.
- Không có feedback đúng nguồn: tiếp tục handoff, không bịa ảnh để đạt sales metric.
- Provider malformed/401/429/timeout: giữ fail-closed attempt, không generation retry.
- Model run xong nhưng chưa có review toàn kết quả: không claim sales/quality PASS.
- Không sửa các packet lịch sử đã seal, không merge/deploy/live send hoặc ghi nguồn trong task kế hoạch. Mọi lệnh ở plan là **dự kiến**, chưa phải PASS.

## Các lệnh kiểm chứng dự kiến

Chạy từ repo root; thêm focused tests mới vào đúng nhóm thay đổi trong quá trình TDD. Các file dưới đây đã có trong repo. Chạy RED có chọn lọc trước khi sửa từng boundary; chạy GREEN theo nhóm sau sửa, không chạy lại vô ích khi không đổi code. Không có lệnh nào dưới đây đã được chạy trong task lập kế hoạch.

```powershell
pnpm --filter @lana/worker exec vitest run src/p23c-media-revalidation.test.ts src/p23c-publisher.test.ts src/single-agent-commerce-media-revalidation.test.ts src/single-agent-commerce-opening-media.test.ts src/single-agent-commerce-media-delivery.test.ts
pnpm --filter @lana/worker exec vitest run src/realtime-sales-catalog.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-selection-evidence.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-missing-information.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-discovery-feasibility.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-callable.test.ts
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-checkout.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-public-history.test.ts src/single-agent-commerce-handoff-delivery.test.ts src/single-agent-commerce-silent-fallback.test.ts
pnpm --filter @lana/contracts exec vitest run src/v2/customer-size-cart.test.ts src/v2/canonical-evidence-readiness.test.ts
pnpm --filter @lana/business-tools exec vitest run src/size-engine.test.ts src/size-claim-guard.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/contracts build
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/business-tools build
pnpm --filter @lana/worker test
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

Rebuild dependency dist trước khi focused consumer tests dùng build output bị thay đổi. Với real PostgreSQL, dùng credential/source wrapper và `isolated-integration.mjs` đã kiểm ở lượt trước, output directory mới và không flag provider. Sau khi thêm các composition cases, chạy full deterministic matrix để có cả bảy persistence invariants, xác nhận test DB dropped/provider0/sendfalse. Exact invocation và case count được ghi từ executable đã hoàn tất, không bịa command hay kết quả cho tests chưa viết. Bất kỳ shared consumer nào khác bị chạm thêm thì phải thêm focused checks/typecheck/build tương ứng trước seal.
