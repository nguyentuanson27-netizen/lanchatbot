# Phase B — kế hoạch sửa context ảnh và kết quả size

Revision 2 — đã sửa bốn finding của review revision 1, chờ cùng reviewer kiểm lại. Ngày 27/10/2026, Asia/Saigon.

Planning base: `b6099923747474a0ee2f71af6966b35113253e45`. Đây là kế hoạch candidate/evaluation trên branch PR391. Lượt này chỉ viết/review/sửa kế hoạch; chưa sửa runtime, dữ liệu shop hoặc chạy provider. APPROVE kế hoạch không đồng nghĩa implementation đã được kiểm hoặc B GO.

## 1. Mục tiêu và ranh giới

Bot bán hàng cần giúp khách chọn và mua thuận tiện. Vòng này sửa ba nguyên nhân có bằng chứng: metadata ảnh không đi đủ đường tới selector; owner tạo phụ thuộc ảnh không cần cho câu hỏi tư vấn; owner tự thêm size ngoài kết quả code. Giữ phần giỏ/state/quote/checkout/negotiation đang hoạt động. Giọng hơi dài hoặc máy móc được owner tạm chấp nhận; không mở thêm vòng tối ưu từ ngữ.

Giữ một conversational owner, tối đa một semantic verifier. Code quyết định identity/truth/freshness/state/permission/effects/receipts/privacy. Không regex theo câu tiếng Việt, classifier ảnh-bắt-buộc, semantic router, third model role, answer template theo case, repair/reverify loop hoặc generic framework. Verifier/final gate không nới. Thiếu dữ liệu shop thực sự cần cho yêu cầu → handoff im lặng; thiếu thông tin khách → hỏi bổ sung. Không cho model gắn cờ optional để tự bỏ qua lỗi ảnh. Một lookup media thật đã thất bại vẫn theo recovery hiện hành.

Không merge/deploy/live send, ghi Redis/Qdrant/Sheet/POS, publish pipeline hoặc đổi global CLI trong implementation candidate. Nếu cần sửa dữ liệu shop thật, lập patch cụ thể theo từng IMAGE_ID cùng nguồn xác nhận và readback; việc author source/publish không nằm trong task plan/review hiện tại.

## 2. Bằng chứng và chẩn đoán

Nguồn chính: [full report](../../apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/CHECKPOINT_B.md), [51 outcomes](../../apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/ACTUAL_TERMINALS.json), [review từng ca](../../apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/WHOLE_TURN_REVIEW.json), [media replay](../../apps/worker/evals/single-agent-commerce-read-only/compact-native-full-run-20261026/MEDIA_SOURCE_DIAGNOSIS.json).

- Source50753ec7:17controls PASS,51native đầy đủ,36eligible/11silentHANDOFF/4NO_SEND;140generation requests. Không lỗi provider. Sáu testDB đã drop. Đây là N1, không stability evidence.
- Canonical source có11ảnh, feedback=false ở tất cả; ProductImage chưa có màu từng asset. Có DETAIL/AO nhưng không có DETAIL gắn riêng SKIRT. Offline selector replay dùng capture controls, không giả là exact readback từng native turn.
- `p23c-jobs.ts` đã publish partsVisible/feedback_verified/metadata_verified và `image_visual_colors`. `qdrant.ts` map feedback/parts/hash/review nhưng không màu asset. **Màu nhìn thấy/AI gợi ý không phải bằng chứng ảnh thuộc biến thể màu bán.** Không đổi nghĩa image_visual_colors thành màu SKU đã xác minh.
- `single-agent-commerce-media.ts` chỉ xác nhận màu bằng product.colors duy nhất. Chỉ sửa prompt hoặc thêm nhãn ở một đầu không sửa được chuỗi dữ liệu này.
- `media-decision:ask`: khách ngại ren, không xin ảnh; owner gọi DETAIL/SKIRT rồi handoff DEPENDENCY_FAILURE. `requiredReadHandoffReason` hiện coi media lookup UNAVAILABLE là dependency cần handoff. Vòng này giữ rule đó, giảm việc owner tự tạo lookup không cần thiết.
- `sales-size-advice:height-weight`: profile đã có RELAXED; recommend_size cho M, alternativeSizes trong SIZE_FIT rỗng. Owner vẫn thêm “nhích lên L”; verifier chặn đúng. Size Engine đã xét fitPreference khi có nhiều candidates và đã có alternativeSizes. Exact FINAL owner wire của ca lỗi đã có SIZE_FIT với recommendedSizes=[M], alternativeSizes=[] và state.fitPreference=RELAXED. Tool response chỉ trả status/action/missingInputs/recommendedSizes là bất nhất presentation, **không phải bằng chứng owner thiếu các facts đó**. Hypothesis cần kiểm: owner đọc kết quả tool và tự lên size theo sở thích, không tuân tập đã xác nhận dù context có đủ; co-location tối thiểu có thể giúp nhưng chưa có model evidence.

## 3. Các quyết định đã chốt cho thiết kế

1. Dùng registry/pipeline/catalog hiện có; không dựng kho tri thức mới hoặc thêm nguồn suy luận sản phẩm.
2. Feedback thật, phần trang phục và màu biến thể của ảnh phải có chứng cứ cho đúng asset/hash/product. Không tự gắn APPROVED/VERIFIED từ ảnh nhìn có vẻ hợp hoặc từ tên file/URL/AI tags.
3. Media capability là gợi ý chọn tác vụ theo snapshot, không attachment, receipt, quyền gửi hoặc kết luận shop-wide absence. Selector/readback/delivery vẫn xác minh lại khi thực sự dùng ảnh.
4. Tóm tắt capability dùng cùng logic lọc approved/hash/TTL/host/type/component/color với selector, cùng product snapshot đã đọc. Không thêm retrieval/lượt đọc catalogue chỉ để dựng summary, không tải ảnh trong summary.
5. Kết quả size trình bày đúng tập code đã xác nhận; sở thích mặc rộng không cấp quyền lên một size ngoài tập đó. Khách tự chọn L vẫn được tiếp nhận đúng lựa chọn; không biến thành claim L vừa.
6. Prompt sửa đúng các đoạn ảnh/size liên quan bằng cách thay nội dung trùng lặp, không append ví dụ hoặc đáp án của benchmark. Giữ prompt policy/giọng/báo giá và verifier nguyên ngoài thay đổi tối thiểu cần cho field mới.
7. Default/legacy consumers giữ hành vi cũ; metadata mới optional và unknown khi không có. Candidate mới phải có identity mới, không dùng run cũ qualify.

## 4. S0 — audit đường dữ liệu và đóng contract trước sửa code

Đọc các writer/consumer trong repo, không truy cập credential hoặc ghi nguồn thật ở bước này. Lập bảng field → registry column → publisher → Qdrant payload/hash → ProductImage/validator → candidate selector/readback → owner projection. Trace cả `p23c-recognition-publisher.ts` vì whitelist/merge có thể làm mất field.

Files chính:
- `apps/worker/src/p23c-jobs.ts`, `p23c-hash-v3.ts`, `p23c-recognition-publisher.ts` và tests tương ứng.
- `packages/business-tools/src/types.ts`, `qdrant.ts`, validator `images` strict ở `search.ts`; tests `qdrant.test.ts`, `business-tools.test.ts` cho validator round-trip/reject.
- `apps/worker/src/single-agent-commerce-media.ts`, media-delivery/source readback.
- `apps/worker/src/single-agent-commerce-state.ts`, `packages/business-tools/src/size-engine.ts`; canonical SIZE_FIT→facts/state và tool descriptions trong `evals/single-agent-commerce-read-only/gemini-inference.mjs`.

Audit phải xác định:
- Feedback/parts đã có trong nguồn nhưng bị mất ở consumer nào, hay nguồn chưa có xác nhận. Không kết luận tất cả handoff là lỗi mapper.
- Có nguồn đã xác nhận màu biến thể của từng ảnh hay chỉ VISUAL_COLORS. Nếu chưa có, schema candidate cần hỗ trợ nhưng **không tạo metadata giả để báo đã sửa dữ liệu**.
- Khả năng đọc cùng product snapshot từ prepare/read_product/batch mà không thêm read. Initial product prepare cũng cần capability; nếu chỉ sau read_product thì ca chọn ảnh trực tiếp vẫn không được cải thiện.
- Response/context hiện đã có recommendedSizes/alternativeSizes ở đâu để không lặp thêm một cơ chế chọn size.

Deliverable S0: field map có file/line và contract cuối cùng. Matrix từ repo/frozen capture chỉ gắn product + asset URL/hash; ProductImage capture không giữ source IMAGE_ID nên cột IMAGE_ID phải ghi NOT_YET_RESOLVED, không tự dùng assetRef như registry ID. Matrix live cần đối chiếu đúng registry IMAGE_ID/readback khi có quyền đọc nguồn ở task implementation; audit repo/capture không phải live data-readiness proof. Giữ source capture/version/time của từng evidence, không suy kết quả hiện tại từ ảnh lịch sử. Nếu thiếu xác nhận màu/feedback/cận váy thật: DATA_NOT_READY cho phần dữ liệu, code có thể triển khai/test bằng fixture đã ghi rõ synthetic; chưa được gọi là real-source acceptance PASS. Không hỏi owner xác nhận lại các ranh giới đã chốt.

## 5. S1 — metadata ảnh xuyên suốt, không đổi nghĩa dữ liệu cũ

### 5.1 Contract màu asset

Đề xuất field mới khi S0 xác nhận chưa có tương đương: registry `VERIFIED_PRODUCT_COLOR` (chuỗi canonical color, max64) và `COLOR_BINDING_IMAGE_HASH` (SHA256 của chính asset đã được xác nhận màu). Chỉ VALID khi REVIEW_STATUS=APPROVED, VERIFIED=true, color hợp lệ, IMAGE_HASH hợp lệ và COLOR_BINDING_IMAGE_HASH bằng IMAGE_HASH. Contract phải giữ ba trạng thái xuyên publisher/adapter/validator: **ABSENT** (không có binding màu), **VALID** (binding đủ điều kiện) và **INVALID** (binding đã hiện diện nhưng partial, malformed, sai hash hoặc không được xác nhận). INVALID không được xóa thành absent/null trong adapter hoặc serializer. Không fallback từ VISUAL_COLORS, AI_VISUAL_COLORS, màu toàn product nhiều biến thể hoặc filename.

Publisher truyền optional payload `image_verified_product_color` và `image_color_binding_sha256`, cùng trạng thái INVALID khi raw pair hiện diện nhưng hỏng để adapter không mất dấu vết. Row thực sự không khai binding thì omit pair; partial pair phải giữ INVALID. Hash/source-version bao phủ pair và trạng thái; test phân biệt thay color/hash, xóa binding có chủ ý và invalid binding. Không thêm field vào embedding input nếu chỉ là provenance/eligibility metadata; test payload/provenance hash đổi đúng, không ép re-embed hoặc đổi vector/point ID chỉ để thêm delivery binding. Recognition publisher giữ field có provenance, không overwrite bằng AI output. `ProductImage` có optional binding kèm trạng thái discriminated ABSENT/VALID/INVALID và content hash. Validator `search.ts` strict được cập nhật đồng bộ: old missing field tương đương ABSENT, INVALID vẫn giữ trạng thái nhưng không chứa màu được phép dùng, unknown extra fields tiếp tục reject. Không tự repair invalid thành verified hoặc legacy missing. Không thêm version DB/migration để lưu field này ở candidate.

Selector: có binding hợp lệ thì khớp đúng color token qua normalizer hiện có, không thêm parser/synonym map tiếng Việt. Asset có binding xung đột phải bị loại khỏi query màu đó. Chỉ **ABSENT** được dùng compatibility fallback product-single-color hiện hành và đủ authority cũ. **INVALID không bao giờ được fallback để cấp quyền màu**; VALID trái query cũng không fallback. Generic query giữ điều kiện generic hiện hành, không tự coi INVALID màu là hợp lệ cho query màu hoặc cấm mọi ảnh generic. Nguồn cũ không có field vẫn hoạt động như trước.

### 5.2 Feedback và component

Giữ đường feedback_verified và partsVisible hiện có; sửa chỗ rơi field nếu audit chứng minh. FEEDBACK yêu cầu nguồn xác nhận khách mặc, không coi MODEL là feedback. DETAIL/SKIRT phải có asset DETAIL và binding phần váy đúng; FULL_SET/UNKNOWN hoặc ảnh size guide không trở thành cận váy. Không đổi enum cũ hoặc cho qua metadata thiếu duyệt/hash/TTL.

Một patch dữ liệu thật, nếu sau này được thực hiện, cần: IMAGE_ID, productId, URL/hash đang dùng, field trước/sau, nguồn xác nhận, review identity/version và readback Qdrant/adapter/selector. Không tự publish hoặc đánh dấu các ảnh hiện hành đã được duyệt trong task này. Code acceptance và data-source acceptance là hai kết quả riêng.

### 5.3 Readback và coverage

Màu/feedback/component/hash/review thay đổi giữa chọn ảnh và send eligibility phải đổi source identity và bị gate chặn. Generic quote vẫn chọn ảnh chung khi không có yêu cầu màu; không tự loại mọi ảnh cũ chỉ vì thiếu field màu mới. Không gắn màu requested vào output như bằng chứng khi selector chưa xác nhận.

## 6. S2 — capability đủ dùng trước khi owner tự gọi ảnh

Dùng một helper thuần, candidate-scoped, tái sử dụng predicate chọn ảnh của media tool. Không dựng second selector hoặc bảng mapping riêng cho vài mẫu. Input là đúng StableProductDocument đã prepare/read (batch tái dùng source promise); clock và allowedHosts hiện hành. Helper không I/O, không chọn attachment, không sửa state.

### 6.1 Observation và vòng đời

Cache request-local lưu **deep clone từ lần đọc thành công**, subject/binding đang có, mediaSourceHash, readAt và validUntil. Không lấy initial search result chưa qua source read thay snapshot đã xác nhận. prepareProduct/read_product/batch source đã read được truyền vào hook cập nhật cache, không media adapter fetch lần thứ hai. Initial prepare cũng phải có summary trước owner generation đầu.

`observedAt=readAt` bất biến. `validUntil` là min(readAt + MEDIA_FRESH_FOR_SECONDS, mọi transition tương lai khiến tập eligible thay đổi: source image observedAt, image expiry, hạn nguồn nếu có). Getter chỉ dùng snapshot tại readAt và clock hiện tại để quyết định còn hợp lệ; **không tính lại readAt, không renew TTL, không tạo hash mới từ snapshot cũ**. Một read mới thực sự thành công mới được thay observation.

Clear/omit observation khi source read mới lỗi/mismatch, hết validUntil, subject/binding không còn đúng, permission/privacy/owner không còn hợp lệ. Getter không trả false availability cho trạng thái đó; field absent và local reason UNKNOWN/EXPIRED/SOURCE_ERROR. Nếu thiếu điều kiện freshness để xác nhận snapshot, bỏ hint. Optional hint biến mất không chặn facts đã đủ; selected media vẫn theo observation/readback/gates hiện hành. Existing catalog/fact invalidations không được bỏ hoặc nới.

### 6.2 Shape, phạm vi và byte budget

Summary gồm schemaVersion, subjectRef, observedAt, expiresAt, mediaSourceHash và tuple `{intent, componentRole, color, status}`. status=MATCH_AVAILABLE/NO_VERIFIED_MATCH chỉ cho inspected query/snapshot; color=null chỉ nói ảnh chung. Không gộp riêng lists colors/components rồi suy tổ hợp. Sáu query cố định: GENERIC, FEEDBACK, DETAIL/TOP, DETAIL/SKIRT, DETAIL/PANTS, BACK; thêm tối đa một query color có rõ trong read_product args. Tối đa7tuples/product,8products. Ngoài tuple đã kiểm thì UNKNOWN, không suy shop-wide absence.

Byte contract: max1.024UTF-8 bytes/product, max4.096bytes toàn field. Nếu product summary vượt hạn, omit cả product; nếu tổng vượt4.096 hoặc base HTTP gần65.536bytes thì omit **toàn field mediaCapabilities**. Không truncate tuples/string để rồi biến phần thiếu thành NO_VERIFIED_MATCH. Không giảm history/facts/receipts/media attachments đã xác nhận để nhường chỗ hint. Nếu base request vốn đã quá hạn thì giữ error policy cũ; nếu chỉ hint làm vượt thì base request vẫn gửi được theo bounds cũ. Telemetry local ghi omission reason/bytes/coverage, không leak evaluator labels vào request.

Chỉ thêm **một** optional `mediaCapabilities` trên CommerceTools/OwnerRequest tương tự catalogImages, sanitize/project tường minh trong Gemini adapter cho ORIGINAL/CompactV2. read_product cập nhật cache từ source đã đọc; không chép lại nguyên hint vào mọi tool response/history, tránh phình context và phải xử lý omission nhiều nơi. Không đưa URLs/raw IDs/credentials vào hint. Wire/hash/preflight bao phủ field thực sự được gửi và việc omitted; report ca mục tiêu có thật nhận hint hay không, không claim improvement do hint nếu hint đã bị omit.

Hint không thêm protected business fact/receipt và không là customer-visible assertion. Không thêm invalidation chỉ vì hint thay đổi vào final protected snapshot của reply không dùng ảnh. Verifier nhận canonical trusted như trước; draft nói đã gửi/không có ảnh hoặc mô tả ảnh vẫn cần đúng observation/selection theo gate. Để gửi/xem/xác nhận ảnh phải gọi tool thật; hint không cấp quyền.

### 6.3 Cùng sửa mọi instruction surface liên quan

Thay đúng đoạn owner prompt và descriptions của **cả select_product_media/view_product_media** trong `gemini-inference.mjs`; phần mô tả hiện đang khuyến khích ảnh cho băn khoăn tư vấn cũng phải đồng bộ. Giải quyết nhu cầu từ dữ liệu đã đủ; ảnh có liên quan hỗ trợ khi capability phù hợp. Không xem việc khách phân vân là mặc định phải lookup/view ảnh. Không cấm chủ động dùng ảnh khi thực sự hữu ích và có nguồn.

Giữ form ảnh GENERIC trong báo giá đầu và ảnh khách yêu cầu cụ thể; thiếu ảnh cần thiết thì handoff im lặng như hiện hành. Không classifier khách-xin-ảnh, cờ optional miễn handoff, auto substitute hoặc đổi DEPENDENCY_FAILURE thành permissive outcome. Không thêm ví dụ/caseId/đáp án. Tool descriptions/schemas đổi phải freeze hash lại trước provider.

## 7. S3 — co-location kết quả size, không giả thiếu facts

Baseline exact final request của ca lỗi đã có recommended M, alternatives rỗng và fitPreference RELAXED. Do đó thay đổi này là **hypothesis về presentation/adherence**, không phải bổ sung kiến thức còn thiếu, và không hứa sửa chắc lỗi model. Trước implementation giữ request hash + extracted fields/paths từ raw final owner wire ngoài source; export chỉ phần public cần đối chiếu, không đưa raw profile IDs/fingerprints vào tài liệu. So trước/sau trên cùng frozen input, không ghi đè raw.

Chọn thay đổi tối thiểu: giữ object response recommend_size đang có; **thêm hai field** `inputFitPreference` từ effective profile và `alternativeSizes` từ verified claim, nằm cùng recommendedSizes. Không thêm third sizeDecision block, bảng chart, reasonCodes dài hoặc lặp raw profile identity/fingerprint ở owner. Canonical protected claims/binding và SIZE_FIT→facts của owner giữ nguyên. Chỉ hai field tool response co-locate để làm rõ đã nhận sở thích và tập thay thế, không append một khối prompt kể lại chúng.

Giữ thuật toán chart/bands/fitPreference và điều kiện SIZE_FIT; không heuristic lên một size. Tool response lấy alternatives từ **valid current claim**, kiểm recommendedSizes normalize đúng cùng claim/product/profile revision/fingerprint trong code. Không đưa các identity/fingerprint đó vào field owner mới. Khi claim không tạo được, response không quảng bá decision thô thành tập size được phép; alternatives=null/UNKNOWN phân biệt valid claim với alternatives=[]. ASK_MORE/AMBIGUOUS/OUT_OF_RANGE: candidateSizes chỉ hỗ trợ hỏi tiếp, không là alternatives đã xác nhận. Empty alternatives ở valid claim không có nghĩa shop không có L.

Profile changed/rejected ops/source changed/expiry vẫn invalidation cũ. Khách tự chọn L vẫn được nhận đúng lựa chọn theo capability, không khẳng định L vừa. Thay đoạn prompt size để phân công rõ code đã nhận sở thích; owner diễn đạt tập được xác nhận, không chọn lại theo kiến thức chung. Không nới verifier hoặc auto sửa/reverify final reply để cứu câu thêm L.

Acceptance tách hai phần: (1) deterministic wire/response đồng nhất, thêm đúng hai field, không mất dữ liệu/binding hay tăng hint trùng lặp; (2) provider thực sự trả lời ca M-only mà không tự thêm L hoặc gây handoff vì câu đó. Phần(1) PASS không được gọi là phần(2) đã sửa. Không đạt provider thì giữ finding/STOP; không tiếp tục append prompt để cứu kết quả.

## 8. S4 — tests RED→GREEN và self-review

Đây là acceptance dự kiến, **chưa chạy**. Quan sát RED trước khi sửa từng boundary; giữ minimum GREEN, không viết test chỉ assert có một câu prompt.

### Metadata/selector

- Nguồn cũ missing color binding giữ unknown/generic behavior.
- Visual/AI color có giá trị nhưng thiếu approved binding không cấp quyền query màu.
- Asset đúng màu đã duyệt đúng hash pass; sai màu/mixed product/changed hash/review revoked/expired/unsafe host fail.
- Product single-color + ABSENT giữ hành vi cũ; INVALID/partial/malformed/changed hash và VALID trái màu không được fallback cấp quyền. Generic eligibility không bị vô tình đổi.
- Feedback/parts giữ tới Qdrant→adapter→selector; FULL_SET/UNKNOWN không thành DETAIL/SKIRT.
- Image metadata đổi giữa lookup/view/final gate chặn toàn response group; không gửi sequence0 trước khi nhóm được chấp nhận.

### Capability/owner wire

- Cùng tuple/snapshot/clock/host: summary MATCH_AVAILABLE iff selector có eligible match. Không download/thêm catalog read; batch một source/product, initial prepare có summary. Getter không renew readAt/TTL/hash; read mới lỗi/mismatch, expiry hoặc permission/binding đổi phải clear/omit.
- Color-null không cấp match cho màu cụ thể; summary absent/expired/bounded không bị diễn đạt thành không có ảnh.
- Summary không tự tạo attachment/receipt; hint-only thay đổi không thêm invalidation cho reply dùng price, existing catalog/price invalidations vẫn giữ. Selected image thay đổi vẫn bị chặn. Near-bound base request được giữ bằng omit toàn hint; không drop facts/history hoặc truncate thành negative.
- Captured actual HTTP ở native có tool pairs/signatures/images/history nguyên thứ tự và đúng summary cho ORIGINAL/CompactV2. Malformed hint bị omit cùng local diagnostic, không qua verifier như business fact; oversized hint theo omission contract, không mất verified price/quote. Đo field bytes/omission coverage trước provider.
- Canary evaluator caseId/split/rubric/expected/required/forbidden labels không vào owner/verifier requests.

### Size và regression tác vụ

- Valid M-only + RELAXED: response alternatives rỗng, claim đồng nhất; tự thêm L vẫn bị verifier/final flow chặn.
- Hai candidate hợp lệ: preference chọn đúng engine, chỉ alternatives trong claim mới được tư vấn. Không dùng candidateSizes khi ambiguous làm allowed set.
- Thiếu inputs hỏi đúng phần; chart không có → handoff; customer tự chọn L được xử lý mà không giả fit.
- Profile correction/changed measurement binding/expiry/receipt/recipient/permission/privacy vẫn fail-closed.
- Hồi quy báo giá đầu có ảnh, hỏi lại không lặp ảnh, multipart đúng; stock/price partial và ảnh cụ thể thiếu vẫn handoff im lặng.
- Hồi quy state/cart/quote/negotiation, code question/preview, PURCHASE_CONFIRMED/HUMAN/event/tag/zero-new-Outbox-capture giữ nguyên. Không đánh NO_SEND có code output thành không rep.

Focused commands dự kiến (chỉ chạy khi implementation):

```powershell
pnpm --filter @lana/business-tools exec vitest run src/qdrant.test.ts src/business-tools.test.ts src/media-selector-v2.test.ts src/size-engine.test.ts src/size-claim-guard.test.ts src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker exec vitest run src/p23c-jobs.test.ts src/p23c-hash-v3.test.ts src/p23c-recognition-publisher.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-media-delivery.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-product-groups.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-session-silent.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
node --test --test-concurrency=1 "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm --filter @lana/business-tools typecheck
pnpm --filter @lana/business-tools build
pnpm --filter @lana/worker exec tsc -p tsconfig.json --noEmit
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Thêm đúng test file hiện hữu sở hữu validator/hash/consumer bị chạm sau S0, ghi tên chính xác trước code; không dùng command không tồn tại hoặc claim PASS khi chưa chạy. Shared contracts chỉ mở nếu thực sự phải sửa type chung; khi đó test/typecheck/build đúng package. Local persisted integration dùng database test có tên/cleanup theo harness hiện có; không migration database live. Authoring/publishing functions chỉ test qua fixtures hoặc mocks, không chạy publisher thật.

## 9. S5 — source seal và model qualification sau implementation

Không provider trong task viết/review kế hoạch này. Sau implementation, deterministic readiness và yêu cầu chạy: commit executable/config/corpus, require clean worktree, capture exact runtime HEAD ngoài source. Không ghi SHA ngược frozen source. Precheck đúng CLI0.159.2/hash/login trước **mọi** control generation; dùng scoped binary nếu global version đổi, không giả client identity hoặc downgrade global.

Giữ owner Gemini3.5FlashLite HIGH/verifier6.1Sol HIGH, Native CompactV2, N1/retry0 và existing51cases+17freshcontrols/cap217. Không tăng population/repetitions hoặc chạy failed-first rồi lại lặp chúng trong full. Controls fail → giữ evidence, STOP native. Controls PASS → chạy đủ51 như owner đã yêu cầu lần gần nhất; không ngắt vì giọng hơi kém. Infra/source identity failure giữ accounting/STOP, không hidden retry. Auth/HTTP/timeout/malformed giữ attempt denominator. Model identity/config thay đổi cần owner chọn, không substitute.

Preflight thêm field shapes/size/media summary/wire byte bounds và manifest/corpus/prompt/schema hashes trên final executable. Tách runtime/evaluator projection; không gửi mã ca hoặc rubric cho model. Có metadata fixture isolated thì registration ghi rõ source overrides/hash/evidence; không gọi đó là live-source proof. Không giả định đã có feedback/color chỉ để làm test pass.

Đánh actual terminal/capture sau run, đọc cả51; B1 eligibility-only tách30persisted. Ba mục tiêu có điều kiện rõ: (a) required requested media chọn đúng asset khi verified metadata thực sự có, còn thiếu thì handoff; (b) concern đủ dữ liệu tư vấn không handoff chỉ do tự lookup ảnh không cần; (c) M-only không thêm L hoặc handoff vì câu tự thêm L. Không đếm keyword/cách nói ngắn như quality proof. Tư vấn phải giúp chọn mua, lời/cách phối phù hợp và bước tiếp theo thực hiện được; hình thức giọng yếu ghi hạn chế, không cứu kết quả bằng sửa rubric.

Report đủ data readiness vs code correctness vs owner/verifier outcomes; false PASS quan sát trên tested population/config, không semantic safety proof. Ghi full denominator, owner/verifier/request/error counts, p50/p95/token/cost nếu expose, actual handoff/no-send/code output, testDB cleanup, CLI/version, source/input/prompt/schema hashes, commands và unknowns. Không lấy APPROVE plan làm implementation/model/fullB GO. Nếu không đạt, tổng hợp finding/STOP, không tự tiếp tục prompt/model fix→rerun loop.

## 10. Savepoints và rollback

S0 field map/data readiness → S1 metadata/selector → S2 capability/projection → S3 size response/prompt → S4 deterministic/persisted regression → source seal → model run khi được yêu cầu. Mỗi savepoint commit riêng kèm RED/GREEN/commands. Nếu metadata schema chưa có source proof, S1 code-only có thể pass nhưng data readiness vẫn NOT_READY; S2/S3 không bị giả thành BLOCKED toàn bộ.

Rollback code bằng revert savepoint trên branch; không viết lại evidence/run cũ hoặc dùng reset phá thay đổi người khác. Không có runtime activation. Nếu source patch sau này được phép publish, rollback từng field theo before/readback audit riêng; không xóa image_registry/Qdrant hàng loạt.

Review độc lập đọc kế hoạch + các code/evidence liên quan, trả REVISE với issue cụ thể hoặc APPROVE cho đúng revision/hash. Primary sửa rồi cùng reviewer kiểm lại tới APPROVE; không biến vòng review thành yêu cầu nới boundary hoặc tối ưu mã ngoài scope. Record đủ finding/resolution/hash trong review trail. Trạng thái hiện tại: REVISION_2_REVIEW_PENDING. Cả bốn finding revision1 phải được cùng reviewer kiểm lại, không tự coi việc đã sửa prose là APPROVE.
