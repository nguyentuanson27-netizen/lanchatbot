# Phase C — kế hoạch hoàn thiện luồng bán hàng sau review 48 lượt

Trạng thái: **REVISION 3 — sửa blocker intake/interrupt của review 2, chờ cùng reviewer kiểm lại; chưa implementation/chạy model**. Planning base `788ce66dcc18e99195b86890fdf7755df6b300e2`; bản đầu được review tại `91d86587660a9e1b30abfa90f91dda27744d553e`. [Finding và review đủ 33 ca](c3-phase-c-whole-run-review-20261103.md) / [bằng chứng capture-clock](c3-phase-c-whole-run-review-evidence-20261103.json) / [review độc lập](c3-phase-c-sales-completion-independent-review-20261103.md).

Mục tiêu: khách hỏi giá, chọn món/size, quyết định mua và chuyển tiếp checkout được xử lý bằng dữ liệu và tác vụ hiện có; thiếu dữ liệu shop cần thiết thì handoff im lặng, thiếu thông tin khách thì hỏi đúng phần thiếu. Không lấy số reply gửi được thay cho chất lượng bán hàng hoặc hoàn thành đơn.

Giữ một owner và tối đa một verifier; code sở hữu truth, freshness, binding, state, permissions, privacy, effects và receipts. Giữ sáu primitive units/hai tool rounds/ba owner generations, một verifier cho mọi final draft sống sót hard precheck, request bounds hiện hành và retry0. Không classifier câu khách, regex theo ca, prompt ví dụ fit benchmark, third online role, repair/reverify loop, tăng budget hoặc production wiring. Giữ silent handoff và whole-group send gate. Không sửa giọng hàng loạt, nới bốn semantic rejection hay rollback toàn Phase C.

## Phân công và thứ tự

| Savepoint | Việc | Kết quả phải bàn giao trước bước sau |
|---|---|---|
| S1 | Chốt inventory nguồn ảnh, màu, component và chart | Manifest đủ/thiếu theo tác vụ; candidate thay đổi nguồn có thể review; không tự sửa live |
| S2 | Chuẩn hóa danh tính món mua lẻ và lựa chọn giỏ | Cùng áo không bị nhân đôi; thiếu lựa chọn khách được phân biệt với thiếu nguồn shop |
| S3 | Nối size từng phần qua Size Engine và claim đúng target | PRODUCT/COMPONENT không cấp fit chéo; capability chỉ bật nơi có chart đúng authority |
| S4 | Giảm read thừa, xử lý bound và đường báo giá | Replay continuation thật và regressions vừa caps; ACK/phối đồ không tự thành tác vụ ảnh |
| S5 | Kiểm khả năng xử lý ngắt checkout trước khi mở rộng intake sớm | p08/j1/j4 vẫn sửa giỏ/thương lượng được trong pending checkout, PII không vào model; chưa chứng minh được thì S5 BLOCKED, không bật early-intake mới |
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

### Contract bắt buộc cho toàn chuỗi fitTarget

Expected target là dữ liệu code resolve độc lập từ request scope, exact PRODUCT ref, BOM/offer và chart applicability hiện hành; không lấy target trong claim làm expected target cho chính claim đó. Không suy ra target từ prose. Khi reply được phép dùng nhiều kết quả fit, code truyền tập expected targets đã resolve, mỗi kết quả có key target riêng; nó không cấp cho PRODUCT consumer quyền dùng bất cứ component nào cùng parent.

| Điểm truyền | File/consumer | Quy tắc implementation phải giữ |
|---|---|---|
| Target và quyết định engine | `single-agent-commerce-state.ts`, `single-agent-commerce-product-groups.ts`, `packages/business-tools/src/size-engine.ts` | Port/producer nhận target đã code resolve. Kiểm parent/component/role với decision và chart trước khi mint claim. Target/hash được bind vào provenance; không lấy field owner tự khai làm authority. |
| Legacy recommendation claim | `packages/contracts/src/index.ts`: `SizeRecommendationProtectedClaimV1Schema`; `VerifiedSizeRecommendationClaimInput` và `createVerifiedSizeRecommendationClaim` | Thêm bounded discriminated fitTarget cho legacy SIZE_RECOMMENDATION; giữ claim PRODUCT cũ không có target tương đương **PRODUCT-only**. Đường COMPONENT bắt buộc target explicit và khớp source. Không mint claim COMPONENT rồi bỏ target để vừa strict schema cũ. |
| Protected claim projection | `packages/business-tools/src/protected-claims.ts`, `packages/contracts/src/v2/canonical-evidence-readiness.ts` | Chuyển nguyên target đã kiểm sang `SIZE_FIT.value.fitTarget`, scope PRODUCT vẫn chỉ xác định parent. Không biến parent scope thành kết luận fit cả sản phẩm. COMPONENT thiếu/mất target ở projection phải reject, không âm thầm downgrade PRODUCT. |
| Trusted target và fingerprint | state/context serializer/allowlist; `single-agent-semantic-verifier-boundary.ts` | Lưu expected target, profile/measurement fingerprint và chart/BOM source binding theo key PRODUCT hoặc COMPONENT độc lập. hardPrecheck/readback kiểm key và target hiện tại; không lookup component chỉ bằng parentProductId như hiện tại. Map có bound, không tăng giới hạn context/subject. |
| Authorization và request matching | `realtime-protected-claim-boundary.ts`: authorization input, `claimMatchesRequest` và claim-request key | Bổ sung expectedFitTarget do caller code cung cấp. SIZE_FIT request không có target tiếp tục nghĩa PRODUCT-only; request COMPONENT cần exact target. Matching/key phải gồm target để hai kết quả cùng parent khác phần không trùng nhau. Source/ref/profile/revision checks hiện có vẫn giữ. |
| Consumer PRODUCT-only cũ | `packages/business-tools/src/guard.ts` và mọi caller chưa được nâng cấp target | **Reject component claim** trước kiểm parent; không nhận một kết quả component chỉ vì productId trùng. Chỉ target-aware consumers được dùng component fit. Không bắt legacy consumer đoán hoặc tự strip field mới. |
| Verifier và final gate | verifier trusted payload/schema/prompt scope kỹ thuật; final deterministic readback | Verifier đọc rõ kết quả cấp cho phần nào, không cần tự tính size. Trước eligibility, code kiểm lại expected target/chart/BOM/profile/fingerprint sau mọi await; PASS cũ không authorize target hoặc world mới. |

Negative gates phải có RED quan sát: component claim + expected PRODUCT; PRODUCT claim + expected COMPONENT; thiếu target trong đường COMPONENT; sai parent/component/role; hai targets cùng parent bị overwrite hoặc request-key collision; projection/serialization làm mất target; target lấy từ claim tự khớp chính nó khi expected source khác; target/claim/chart bị tamper; profile/chart/BOM đổi sau verifier; legacy PRODUCT-only guard nhận nhầm COMPONENT. Giữ regressions claim PRODUCT cũ và từ chối unknown extra fields ngoài extension đã version/hash.

Mọi consumer của SIZE_RECOMMENDATION/SIZE_FIT phải được liệt kê trong change manifest với disposition **TARGET_AWARE** hoặc **PRODUCT_ONLY_REJECT_COMPONENT** trước khi bật capability. Có consumer chưa phân loại hoặc còn parent-only authorization thì S3 chưa GREEN/ready, không để việc này thành một lời hứa “sẽ cập nhật consumers” sau implementation.

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

File chính: owner prompt, current tools/callable, `single-agent-commerce-effects.ts`, `single-agent-commerce-ingress.ts`, `single-agent-commerce-session.ts`, `realtime-sales-cycle.ts`, privacy projection/history và checkout/delivery tests hiện có.

**Trạng thái tại kế hoạch: FEASIBILITY_REQUIRED, chưa chứng minh có route ngắt intake an toàn.** `pendingCheckout` hiện ép inbound vào private code path; public request đổi giỏ/thương lượng có thể chỉ nhận lại câu hỏi tên. Không mandate mọi add→intake, không bật prompt thay đổi hành vi theo hướng đó trước gate dưới đây. Giữ khả năng first-turn checkout hiện có và các đường đã đạt; không tắt feature để làm test đẹp hơn.

### Gate S5-A — kiểm chứng ngắt checkout trước

1. Tạo RED từ composed ingress/session/real PostgreSQL: sau khi cart+clarification đã commit và checkout đang pending, chạy đúng p08 đổi set→áo, j1 đổi số lượng/hai size và j4 thương lượng. Phải quan sát mutation/negotiation receipt đúng và reply trả việc khách cần, không chỉ một câu hỏi private field có proof. Kiểm cả pending FULL_NAME/PHONE/ADDRESS/PAYMENT_METHOD và ORDER_PREVIEW, không chỉ fake pending flag.
2. Candidate tối thiểu được phép khảo sát: reuse **privacy validation/extraction hiện có** để phân biệt input private hợp lệ, public continuation đã có bằng chứng an toàn, và unknown/mixed. Không đọc customer prose để gán intent đổi giỏ/thương lượng trong code; cùng owner hiện tại hiểu yêu cầu từ public input được phép.
3. Private fields hợp lệ tiếp tục qua private code path hiện có. Chỉ route public continuation sang owner khi privacy boundary cấp typed positive proof gắn đúng inbound/request/recipient/revision, không có private commit/effect trong inbound đó và input public đã kiểm/redact đúng contract. `!isPrivateCommerceText` hoặc parser không lấy được field **không tự là proof public**. Không dùng kết quả detector âm tính đơn lẻ để đưa raw pending text cho model. Không có positive proof phù hợp thì UNKNOWN, giữ private/fail-closed policy, không fallback raw sang owner.
4. Mixed input không được vừa commit private fields vừa khởi động một owner turn với budget mới. Candidate vòng này không tạo chuỗi hai luồng cho cùng inbound: giữ private xử lý được theo contract; ambiguous/unsupported thì handoff/no-send đúng authority. Không model phân loại private/public, không thêm NLP parser/router, keyword exceptions hoặc role mới. Nếu cần những thứ này mới cho public route chạy thì candidate không đủ điều kiện.
5. Khi public mutation được phép, same-owner dùng đúng cart tools và một budget hiện hành. Domain/CAS/receipts phải invalidate preview/quote cũ, rebind hoặc giữ intake đúng cart revision theo hành vi domain được kiểm; không giữ preview/confirmation cho giỏ trước. Phải giữ các private fields đã lưu ở kho private và không đưa chúng vào public history/owner/verifier. Stale/unknown commit latches như trước; không lách route để tiếp tục effect.
6. Kiểm PII/mixed/adversarial controls: bare names, phone/address, dữ liệu private lẫn yêu cầu đổi món, malformed fields, dữ liệu private chưa được parser nhận diện, stale/replayed privacy proof, concurrent cart change, authority/recipient đổi và HUMAN-owned conversation. Không mở route chỉ vì ba câu regression cụ thể pass. Chứng minh không raw PII tới models/public history/report/log; không reset tool rounds/generation cap hoặc thêm retry.

**Quyết định gate:** chỉ triển khai mở rộng early-intake khi route tối thiểu trên có contract và tests/real-PG GREEN, được review độc lập. Nếu privacy boundary hiện có không cấp được positive public proof hoặc không giữ được mutation/negotiation/PII/caps, ghi **S5 BLOCKED_AT_PRIVACY_OR_INTERRUPTION_CONTRACT**; không bật blanket early-intake và không sửa prompt để tăng tần suất gọi intake sớm. S1–S4 có thể hoàn tất riêng, nhưng không gọi S5/full sales-completion đã đạt. Không thêm router/parser để ép qua gate; muốn đổi kiến trúc hoặc scope phải có kế hoạch/owner decision riêng.

### S5-B — chỉ sau Gate S5-A

- Dùng cart/checkout/receipt để đi tới đúng bước hiện hỗ trợ, thay CTA hỏi lại ý mua. Chỉ hỏi giá/tồn không được tự add hoặc checkout. Add→intake là lựa chọn có điều kiện sau khi khả năng ngắt đã được chứng minh, không phải nghĩa vụ mặc định của mọi add.
- Intake/preview/confirmation vẫn qua code hiện có; không hứa đã tạo đơn trước receipt, không tự mua sau ACK hoặc COD và không bỏ explicit preview confirmation. PII vẫn ở private path.
- Giữ việc hỏi tên còn thiếu khi khách chỉ cung cấp COD. Ngược lại, câu hỏi tên lặp lại khi khách đang đổi giỏ/thương lượng không được chấm là tiến trình checkout thành công.
- Kiểm full j6 intake→preview→explicit confirmation, cart/source/permission/freshness đổi giữa các bước, duplicate inbound/operation, crash-after-commit, no duplicate effect/outbox và no private data tới model. Bật early-intake mà làm hỏng p08/j1/j4 là regression material, dù output được capture thành CODE_OWNED_SEND.

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

Để thực sự kiểm full checkout, bổ sung đúng **một ca 7 lượt**, đăng ký riêng với customer branches tự nhiên và dữ liệu khách synthetic. Chọn **evaluator-only typed witness selector mới**; không giả rằng harness hiện có đã làm được việc này. Đường selector cũ `REGISTERED_ALTERNATE_HUMAN_SELECTED` chỉ nhận actor HUMAN và chỉ được giữ cho lựa chọn thật của human.

### Evaluator extension bắt buộc trước checkout model run

File chính: `customer-branches.mjs`, `native-population.mjs`, `native-terminal.mjs`, `diagnostic.mjs`, `qualification.mjs`, corpus/scope/schema/hash validators và tests tương ứng.

1. Từ raw native result, codeOwned witness, actual captured Outbox, after-state, authority và committed receipts, collector kiểm proof rồi tạo **public typed branch witness**. Không lấy missingFields/preview chỉ từ reason hoặc text của terminal. Không chuyển tên, điện thoại, địa chỉ hay giá trị private vào witness. Bridge chỉ phục vụ evaluator; không đi vào conversational owner/verifier hoặc quyền tool/effect/send.
2. Các trạng thái được bridge cấp: cart đã commit/chưa mở intake; field còn thiếu; preview hợp lệ đang chờ xác nhận; purchase đã confirm; handoff đã commit. Field chỉ thuộc FULL_NAME/PHONE/ADDRESS/PAYMENT_METHOD. Mỗi loại kiểm operation/receipt đúng command, cart/version, revision, request/source-message binding và recipient/ownership tương ứng; preview phải khớp preview proof và after-state, confirmation phải có PURCHASE_CONFIRMED receipt. Missing/invalid/unknown proof không được suy thành một trạng thái thuận lợi.
3. `native-population.mjs` truyền witness đã verify và hash cho branch selector, ngoài prior actual terminal. `customer-branches.mjs` thêm kind/actor riêng **EVALUATOR_CODE_PROOF**, không gán HUMAN. Policy mới chỉ cho supplemental checkout đã đăng ký; giữ human-selector behavior và policy của 33 ca gốc không bị migrate.
4. Mọi branch phải thuộc frozen policy, khớp đúng turn index, policy hash, prior actual outcome hash và typed witness hash. Recheck prior state/version trong collector trước dispatch; stale/tampered/missing witness, branch ngoài policy hoặc điều kiện không khớp thì ghi lỗi evaluator và giữ lượt chưa dispatch NOT_RUN/BLOCKED, không dùng default để phát câu xác nhận mua. Chọn branch chỉ từ typed conditions, không đọc prose, không gọi model khác, không thêm lượt.
5. Cố định 7 lượt bằng branch policy: bắt đầu chọn mua; nếu chưa mở intake nhưng có cart proof thì nhờ lên đơn; khi có missing-field proof thì trả field đang thiếu; chỉ nói xác nhận sau PREVIEW_READY proof; sau PURCHASE_CONFIRMED thì lượt còn lại dùng ACK tự nhiên đã đăng ký. Nếu tới lượt 7 vẫn đang cung cấp field thì ghi chưa hoàn tất checkout. Không ép câu “đồng ý” vào trạng thái chưa có preview, không replay hành trình để cứu kết quả. Rà lời thoại từng branch trước freeze.
6. Chỉ sau Gate S5-A và khi actual prospective flow cần intake sớm mới thay **hardcode cũ** j6 `[1,2]` trong admission của scope mới; không bỏ code-owned validation. Candidate allowlist để review/freeze: h01 `[0]`, p08 `[0,1]`, j1/j4/j6 `[0,1,2]`, supplemental checkout `[0..6]`; những ca khác giữ `[]`. Đây là vị trí output có thể có, không quyền effect và không buộc ca phải CODE_OWNED_SEND. Allowlist không giải quyết việc public request bị hút vào private intake. Nếu S5-A chưa qua, không activate bảng này hoặc dùng nó để claim full acceptance; giữ S5 BLOCKED. Nếu actual flow cần vị trí khác thì sửa/review executable corpus trước seal, không thêm sau outcome.
7. `diagnostic.mjs` kiểm allowlist này từ exact fixed-scope manifest; `qualification.mjs` chỉ công nhận code-owned turn đã đăng ký khi capture validator và receipt/authority/source hashes đúng. Giữ `clarificationCapture`, `previewMediaCapture` và confirmation checks; thêm validator hẹp cho confirmation nếu consumer hiện chưa có. Không blanket allow mọi code text/private output hoặc coi allowlist là quyền effect. Historical j6 `[1,2]`/scopes/grades vẫn byte-identical; extension development này không tự sửa qualification population hoặc baseline C3.
8. Freeze customer policy kind/hash, allowlist và bridge contract hash cùng executable/config. Test có default/human branches cũ, evaluator-code branch đúng proof, proof thiếu/sai/stale, wrong recipient/cart/revision/receipt, preview không còn current, confirmation không receipt, early intake/early complete, ACK sau confirm không tạo effect/đơn thứ hai, branch không freeze, code-owned ngoài allowlist, output có allowlist nhưng proof không hợp lệ. Kiểm synthetic private markers không xuất hiện trong model requests hoặc report/log công khai; chứng cứ private chỉ ở đúng lớp lưu trữ được phép.

Nếu bridge/selector/admission mới chưa triển khai và kiểm xong, ca 7 lượt là **NOT_EXECUTABLE**, không được đăng ký như đã sẵn sàng. 33 customer scripts gốc và packet cũ không sửa; metadata/prospective allowlist mới có version riêng và không thay historical scores.

Tổng kế hoạch đề xuất: **34 ca / 55 lượt native**, N1; 33 ca gốc/48 lượt và supplemental checkout1/7 giữ denominator riêng. Prefix14/23 nằm trong33/48, không cộng thêm. Cùng giới hạn tối đa3owner+1verifier cho mỗi native turn: tổng ceiling220generation records, thực tế thấp hơn ở private code path/handoff; không phải220request bắt buộc. Mọi error/zero-HTTP/NOT_RUN giữ nguyên. Không majority, best-of-N hoặc lấy run sau thay run lỗi.

Full acceptance và supplemental checkout đòi Gate S5-A, các source prerequisites và evaluator bridge đã qua kiểm chứng. Nếu S5 BLOCKED, không tự chạy 55 lượt rồi gọi những câu hỏi tên là thành công; báo phần code/source đã hoàn tất và blocker còn lại. Một development diagnostic hẹp cho S1–S4 khi đó cần scope/registration và authorization riêng, không tự sửa denominator/kỳ vọng của campaign này.

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
