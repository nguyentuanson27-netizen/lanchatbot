# Phase B — sửa luồng mở đầu và cách dùng dữ liệu để bán hàng

Trạng thái mới: đã [implementation + self-review](c3-phase-b-opening-and-advice-implementation-20261022.md) theo [review độc lập APPROVE](c3-phase-b-opening-and-advice-independent-review-20261022.md). Model diagnostic/native chưa chạy; source gaps giữ mở. Nội dung dưới lưu kế hoạch gốc trước triển khai.

Ngày 22/10/2026. **PROPOSED — chưa implementation hoặc provider run.** Plan base `f93777c4a3a4b6610e70e4757dc7f8ddbeff51e4`, branch `feat/c3-phase-b-commerce-20261014`. Nguồn: [review đủ39 ca](c3-phase-b-full39-conversation-review-20261022.md), [review19target+4prerequisite](../../apps/worker/evals/single-agent-commerce-read-only/fallback19-rerun-20261022/REVIEW.md), [kế hoạch sửa contract trước](c3-phase-b-contract-and-advice-fix-plan-20261022.md) và [implementation/reviews](c3-phase-b-contract-and-advice-implementation-20261022.md).

## Mục tiêu và nguyên tắc giữ nguyên

Khách được giúp chọn và mua đồ từ shop: lời khuyên có hướng rõ, lý do liên quan đến việc khách đang phân vân, tác vụ thật được làm và báo đúng kết quả. Giá/tồn/policy/state không sai là điều kiện cần; chưa đủ để gọi tư vấn bán hàng tốt.

Giữ 1 conversational owner Gemini 3.5 Flash Lite HIGH và 1 verifier GPT-6.1 Sol HIGH, model/version/credential/config hiện hành; 3 owner generations / 2 tool rounds / 6 calls / 1 verifier. Code giữ identity/truth/freshness/state/permission/effects/receipts/privacy và final gate. Verifier kiểm protected semantics của exact final text, không chấm giọng, chọn mua, rewrite hoặc gọi tool. A OWNER_BYPASS, B chưa GO.

Không thêm role/router/intent JSON/obligation object/generic parser/regex theo case/repair/reverify/framework/durable state. Không mở 12 image experiment hoặc các journey chưa đăng ký. Không live registry/policy write, deploy, Meta send hoặc tạo đơn POS trong gói này.

## Bài học từ các vòng trước

| Cách sửa không hiệu quả | Thay bằng gì trong vòng này |
| --- | --- |
| Thấy câu chưa hay rồi thêm một điều cấm/ví dụ sản phẩm vào prompt | Xác định dữ liệu thiếu, contract lệch hay owner bỏ qua dữ liệu; chỉ sửa phần chịu trách nhiệm, không thêm ví dụ tương ứng từng ca. |
| Ép câu đủ rubric/keyword, cấm mọi nhắc lại hoặc dấu ngoặc | Review nguyên đoạn theo việc khách cần làm. Chọn size khách yêu cầu, xác nhận giỏ và giải thích hai giá vẫn được phép. |
| Nới verifier mỗi khi gặp fallback | Giữ verifier; tách lỗi quota, lỗi factual thật và trường hợp chưa rõ span. Không lấy PASS làm điểm chất lượng. |
| Rút gọn prompt/context đồng loạt rồi mất thông tin hữu ích | Không cắt theo phần trăm/ký tự, không bỏ điều kiện hoặc history. Chỉ bỏ trùng cơ học hoặc thay đoạn trùng nghĩa; giữ source khi chưa có dữ liệu cấu trúc thay thế. |
| Tăng tool budget hoặc đọc mọi candidate để cứu lựa chọn kém | Query theo nhu cầu, đọc sâu món định khuyên và offer liên quan, giữ bound; không thêm planner model. |
| Rerun nhiều lần rồi chọn câu đẹp; full liên tục trong khi không biết vì sao lỗi | Một lần kiểm nhỏ khả năng tư vấn, sau đó một campaign39 cố định; không auto-fix/run hoặc tăng repetitions. |
| Sửa nhiều thứ rồi quy toàn bộ tăng PASS cho prompt | Báo riêng source/contract/UX/owner; diagnostic tư vấn không được gọi là full-runtime feasibility hoặc causal A/B. |

Các sửa contract trước có hiệu quả phải giữ: state enum/field errors, xử lý commit chưa rõ, media-only scope, resolver miền Nam dùng chung, recovery giữ ưu đãi đã commit. Không rollback chúng để giọng bớt “hệ thống”.

## T0 — audit nguồn và chốt điều cần sửa, không generation

**Đầu ra:** một bảng readback ngắn trong evidence hiện có, không tạo schema/gate/operator mới. Mỗi finding ghi nguồn/version, dữ liệu runtime thực nhận, điểm bị mất/lệch, confirmed hay hypothesis.

1. Size: đọc active SIZE_CHART pointers và chart scope; đối chiếu product/offer/component, `sizeChartTarget` và `evaluateSizeChartEligibility`. Hàm target hiện dựa title/category và gán parent/component cùng productId; phải kiểm set/áo/chân váy trước khi kết luận shop chưa có bảng size. Không thêm regex tên mẫu để chữa một case.
2. Ảnh: đối chiếu approved asset, parent/component, hash và color/variant binding; phân biệt ảnh chung hợp lệ với ảnh đúng màu. Không lấy màu suy từ Qdrant/ảnh để cấp POS binding.
3. Handoff: đọc current matrix hoặc default fallback áp dụng cho CUSTOMER_REQUESTED_HUMAN/SIZE_RULE_UNAVAILABLE; tách first handoff với already-HUMAN. Đính chính ca32 đã ghi trong review, không dùng post-state HUMAN làm bằng chứng pre-state HUMAN.
4. ETA: xác định nguồn định nghĩa ngày vận chuyển từ mốc nào, có preorder/processing không, calendar hay business days. Timestamp snapshot không thay mốc bắt đầu giao. Kiểm clock/timezone code đang có, không suy từ giờ máy chạy evaluation.
5. Product evidence: đối chiếu `ProductAttributesV1`, source content, chart và ảnh đang có. Hai ca POS_UNAVAILABLE vẫn giữ fault đã đăng ký; không “sửa” bằng bỏ fault.

Nếu dữ liệu có trong nguồn nhưng chưa nối đúng thì sửa adapter/mapping. Nếu không có nguồn hợp lệ thì ghi cụ thể và giữ hành vi thiếu dữ liệu; không tự điền hoặc sửa facts để qua bài kiểm tra. Chỉ phần source-dependent đó bị giới hạn, không chặn các sửa contract độc lập khác.

## T1 — size đi đúng chart của món khách đang hỏi

**Phụ thuộc:** kết quả size audit T0. **Điểm sửa:** existing `size-chart-target.ts`, `size-chart-eligibility.ts`, ingress sizeInput; chỉ sửa nơi evidence cho thấy mismatch. Chia mapping và consumer thành hai savepoint nếu cần, khoảng2–4 file/savepoint.

- Reuse target/scope contract hiện có. Với set/mua lẻ, không lấy chart của một component để cấp fit cho cả bộ; không sửa rule mặc định toàn hệ thống từ một tên sản phẩm.
- Nếu chart verified dùng height/weight, cho Size Engine dùng đúng 158/52 và fitPreference; không mặc định xin ba vòng. Nếu engine trả missingInputs, hỏi đúng các field đó. Nếu NO_VERIFIED_CHART, xin thêm số đo không giải quyết được nên đi handoff đúng nguồn.
- Chart/metadata thiếu ở nguồn thật: dùng luồng quản trị đã có để chuẩn bị candidate hợp lệ; không tự tạo ngưỡng size hoặc đưa bảng từ evaluation fixture vào facts shop.

**RED→GREEN:** đúng parent/offer/component chọn đúng chart, chart không liên quan bị loại, height/weight được dùng khi chart hỗ trợ, thiếu field khác với thiếu chart, profile correction làm fit cũ mất hiệu lực. Chỉ thêm test cho mismatch thật; reuse tests hiện có cho authority/fingerprint.

**Hoàn tất:** hoặc recommend_size trả fit đúng scope/hồ sơ bằng nguồn thật, hoặc báo rõ source gap và handoff có thông báo theo T3. Không coi handoff là size advice thành công; hai trạng thái phải báo riêng.

## T2 — đáp ứng yêu cầu ảnh theo đúng khả năng nguồn

**Phụ thuộc:** asset audit T0. **Files:** existing source/media adapter và tests, declaration/projection khi cần; không đổi selector framework.

- Có ảnh approved đúng màu đã bind: select đúng ref, TEXT+IMAGE đi chung existing final gate/Outbox; có capture ảnh thực, không chỉ có câu “đây là ảnh”.
- Chỉ có ảnh chung approved: chỉ dùng với scope GENERIC_PRODUCT rõ ràng; không báo đó là ảnh màu be. Owner có thể đề nghị/xem ảnh form chung nếu có ích với yêu cầu, không lấy nó làm bằng chứng màu hoặc công năng.
- Thiếu ảnh/binding: nói gọn phần chưa đáp ứng và dùng hỗ trợ hiện có nếu policy/capability cho phép. Không tự chèn giá, kể chất liệu và hỏi chung để giả đã giải quyết yêu cầu ảnh; không hứa sẽ gửi sau khi không có luồng theo dõi.
- Không tạo mapping thủ công riêng cho SV2447 hoặc một fixture. Nguồn metadata hợp lệ phải đi qua đường registry/selector đang có, kèm source version/hash thật.

**Kiểm:** đúng màu, generic rõ scope, không có ảnh, wrong component/unapproved/stale; actual group/capture và chống duplicate. Giá/tồn độc lập không mất khi media unavailable. Không viết test bắt nguyên câu tư vấn.

## T3 — báo cho khách khi chuyển nhân viên lần đầu

**Phụ thuộc:** handoff audit T0; không đợi có chart/ảnh mới. **Reuse:** `handoff-matrix.candidate.json`, existing matrix resolver, `createPersistedCommerceHandoffPort`, isolated DB/capture. Không sửa default mọi reason hoặc published matrix trực tiếp.

- Đề xuất candidate chỉ đổi customer-message policy của CUSTOMER_REQUESTED_HUMAN và SIZE_RULE_UNAVAILABLE sang holding-reply-then-handoff; giữ reason/tag/authority và các rule khác.
- Nội dung ngắn từ policy, ví dụ “Em chuyển nhân viên hỗ trợ chị nhé.” Chỉ queue cùng successful handoff transaction; commit chưa rõ/thất bại thì không báo đã chuyển.
- Already-HUMAN và replay cùng nguồn vẫn không gọi model, không queue thêm acknowledgement. Không có generation tự do sau handoff và không hứa thời gian nhân viên phản hồi.
- Candidate matrix phải đi qua existing typed/versioned resolver trong DB cô lập. Source đang có custom matrix thì giữ và tạo delta ứng viên rõ ràng, không dùng overlay để bỏ qua hash/lifecycle hoặc giả như published policy đã đổi. Không mở thêm một policy manager.

**RED→GREEN:** first handoff commit có đúng1holding capture; duplicate/replay không thêm; current HUMAN im lặng; CAS/commit failure không có holding; handoff đổi hàng/purchase-confirmation/private routing giữ behavior cũ. Chỉ chứng minh event/tag intent/capture, không gọi đó là staff delivery receipt thật.

## T4 — cấp mốc thời gian cho câu hỏi deadline

**Phụ thuộc:** ETA audit T0. **Giữ nguyên:** resolver miền Nam, range ETA, preorder rules, TTL, binding và final gate.

1. Tận dụng clock/request scope hiện có, lấy processing time một lần khi bắt đầu turn, timezone shop cấu hình rõ; không coi sourceMessage occurredAt hoặc snapshot observedAt là ngày hiện tại nếu chúng cũ.
2. Cấp cùng bounded turn-time metadata cho owner/verifier trong request hiện tại. Reuse requestId/closure; không ghi state, không tạo clock receipt hoặc gate mới. **Không đặt Date.now biến động vào trusted world snapshot/factSnapshotVersion** khiến readback khác chỉ vì thời gian trôi. Các vòng owner trong một turn dùng cùng time anchor, freshness gate vẫn dùng clock hiện tại ngay trước eligibility.
3. Cấp ETA anchor/day convention chỉ từ nguồn đã xác nhận. Nếu chưa có mốc tính, giữ unknown; không mặc định hàng bắt đầu giao ngay hôm nay. Không đổi business days thành calendar days.
4. Owner hiểu deadline từ hội thoại theo clock đã cấp; không viết parser ngày tiếng Việt. Còn mơ hồ thì hỏi đúng ngày; không chỉ đọc4–8ngày, không tự khẳng định kịp/trễ, không bảo khách tự chuẩn bị đồ khác. Chỉ giới thiệu món thay khi nguồn có ETA phù hợp.

**Files dự kiến:** `single-agent-commerce-read-only.ts` (request interfaces/closure), `gemini-inference.mjs`, verifier `protocol.mjs` và focused tests. Tách plumbing/consumer savepoints nếu vượt5file; không đổi provider API/config.

**Kiểm:** cùng turn-time ở các generation, verifier nhận cùng anchor, request mới có time mới; gần nửa đêm/timezone; input cũ/replay; metadata thời gian không tự gây snapshot mismatch; fact hết hạn sau verifier vẫn bị final gate chặn. Nếu cần mở allowlist metadata thì mở đúng field bounded này, không đưa toàn bộ scope/private data vào model.

Kiểm các consumer OwnerRequest/VerifierRequest trước khi đổi contract. Diagnostic replay dùng capturedAt làm time anchor đúng mode, không lấy Date.now rồi gọi captured evidence là fresh live; các consumer cũ không được tự suy thời gian từ timestamp của một fact bất kỳ.

## T5 — sửa contract kết quả giao dịch và text recovery hiện có

**Phụ thuộc:** không cần đợi T1–T4. **Lỗi xác nhận:** declaration record_negotiation hứa trả cartQuote; runtime trả cart + cartItems, owner adapter bỏ cart khi có cartItems, còn quote nằm ở trusted.state. Không thiếu số tiền nhưng kết quả thao tác đang không trình bày đúng contract mô tả.

### T5a. Current quote ngay trong kết quả thao tác

- Trả public cartQuote gọn từ cùng current cart đã commit/readback cho các mutation tiền đang hỗ trợ; dùng chung phép chiếu đã dùng ở snapshot thay vì viết công thức tiền thứ hai. Giữ cartId/cartVersion, subtotal/discount/shipping/grandTotal.
- Owner adapter giữ phần quote gọn này khi bỏ full cart. Quote của thao tác vừa hoàn thành phải khớp snapshot/readback tại lúc tạo response; lỗi hoặc unknown commit không cấp quote/receipt success. Native history vẫn giữ quote/version của thao tác cũ: không ghi đè nó bằng quote mới khi dựng request hoặc ép mọi historical response bằng current state.
- Không thêm “lợi ích cần nói”, narrative intent, plan JSON, concession counter hoặc duplicate source authority. Không tính lại discount bằng code mới; không lấy current discount làm chứng cứ “giảm thêm” nếu không có delta hợp lệ.
- Chỉ sửa một mô tả tool nếu cần cho khớp shape thật. Không thêm nhiều chỉ dẫn điều khiển lời tư vấn theo từng event.

**Files:** `single-agent-commerce-effects.ts` + test, `gemini-inference.mjs` + test; có thể chia hai commit. **Kiểm:** successful/stale/unknown-commit/duplicate, same quote in context+response cho current operation, hai mutation trong một batch giữ đúng từng historical quote/version, hỏi tổng không phát sinh negotiation mới. Proof là numeric equality/receipt đúng thời điểm, không bắt câu trả lời chứa từ “ưu đãi”.

### T5b. Recovery giữ thông tin mua, bỏ cách gọi như biên bản

- Chỉnh formatter đang có để dùng tên món/offer khách hiểu; không “1 áo (mẫu Set váy...)” khi source có component title rõ. Reuse offer labels/title hiện hữu, không regex xóa chữ trong tên cha hoặc đoán tên component. Một line đã rõ trong hội thoại có thể xác nhận selection gọn; nhiều món cần giữ đủ identity để không nhầm. Không thêm logic riêng theo mã mẫu.
- Quote/discount/current stock vẫn chỉ được nói dưới các điều kiện receipt/readback/policy/source hiện có. Tổng và ưu đãi liên quan được nêu trước phần tóm tắt dư; không mất PRE_ORDER hoặc làm ưu đãi thành giảm thêm.
- Không cắt câu trong draft bị reject để gửi phần có vẻ an toàn; không gọi model rewrite. Chỉ sửa text code-owned recovery hiện hữu.

**Kiểm:** existing recovery authority tests giữ nguyên; thêm assertions về đúng offer identity/numeric fields và không thêm facts khi source không đủ. Wording shop có thể review như static UX, không biến câu mẫu thành template tư vấn cho owner.

## T6 — sửa cách trình bày thông tin và giọng theo phạm vi nhỏ

**Phụ thuộc:** T0 phân biệt có/thiếu source; không đổ việc tạo fact cho prompt. **Giới hạn:** tối đa1candidate owner-prompt delta trong gói, verifier giữ nguyên.

### Product/context

- `staticEvidence` đã verify/pass-through ProductAttributesV1. Kiểm vì sao source đang trả null hoặc verification không nhận trước; đường đã đúng thì giữ nguyên. Chỉ sửa chỗ mất mapping đã xác nhận, dùng fields có sẵn: materialComponents, designAttributes.waist/silhouette, occasions, wearProperties... Không dựng lại adapter đang hoạt động, tạo bảng “mọi lợi ích được phép nói” hoặc nguồn tư vấn thứ hai.
- Không có attributes: giữ content source và unknown, không code parse/chuyển quảng cáo thành fact, không cắt description theo số ký tự rồi làm mất điều kiện. Không tự thêm “thủ công”, cạp chun, độ kín hoặc ít nhăn để giúp owner bán được.
- Dữ kiện cấu trúc giúp tư vấn nhưng không thay lời khuyên. Nhận xét định tính về phối đồ/cảm giác dự kiến từ chất liệu/thiết kế vẫn được phép theo ranh giới owner đã chốt; không yêu cầu một phép thử riêng cho mọi lợi ích hoặc SIZE_FIT cho mọi lời khuyên phom.

### Owner prompt

Đọc từng đoạn hiện hành trước khi sửa; giọng/quyết định mua đã có rule nên không ghi root cause giả là “chưa có hướng dẫn”. Chỉ thay phần hiểu khách/tư vấn và giọng bị trùng hoặc kéo model về việc giải thích mọi phương án; giữ policy/state/permission/effects/bounds và material-claim boundaries. Không xóa44%/rút gọn toàn prompt, không đổi sang tiếng Anh, không thêm few-shot sản phẩm/caseId/rubric/đáp án.

Candidate cần diễn đạt rõ công việc của lượt:

- Khách nhờ chọn: shop chọn một hướng và nêu điểm làm hướng đó đáng chọn hơn; phần giải thích phục vụ quyết định, không kể đầy đủ đặc điểm. Phương án phụ phải có đánh đổi hữu ích; không kết thúc bằng việc giao lại cùng quyết định cho khách.
- Khách hỏi/sửa việc cụ thể: đáp việc đó. Sửa thông tin nền mà giỏ không đổi thì nhận lời tự nhiên, không báo cáo lưu/cập nhật hồ sơ. Xác nhận variant/quantity khi khách vừa nhờ thay là có ích, không cấm nhắc lại facts.
- Sau tác vụ: dùng kết quả current operation/quote để nói khách được gì; không quảng cáo một policy chung thay cho việc vừa xử lý. Upsell có ích vẫn được phép, không mặc định chọn rẻ nhất hoặc luôn bán cả bộ.
- Không mở đầu giải thích lại yêu cầu đã rõ; dùng từ nói chuyện thông thường, bỏ lời khen cùng ý. Không ép số câu, số tính từ, CTA hoặc blacklist “nếu/thì/giúp em”. Danh sách/ngoặc dùng được khi giúp phân biệt giá/lựa chọn.

Đây là tổ chức lại phần chỉ dẫn đang có, **chưa có bằng chứng sẽ cải thiện giọng**. Mỗi đoạn thay phải chỉ ra instruction cạnh tranh/trùng đang bỏ hoặc contract vừa sửa đang được sử dụng; không thêm một đoạn tương đương chỉ để gọi là đã fix. Ghi chênh lệch độ dài và số rule để phát hiện phình prompt; không đặt quota cắt byte hoặc bỏ yêu cầu hữu ích để làm prompt ngắn. Existing wire bounds vẫn giữ nguyên. Lưu diff/hash để review trước provider.

## T7 — kiểm tư vấn nhỏ trước, rồi một lượt native cố định

### Bước1: diagnostic tư vấn4ca, N1

Reuse `advice-diagnostic.mjs` cho4 input B1 đã có captured public context/capturedAt: `b1-buying-concern`, `b1-changed-occasion-v2`, `b1-buying-concern-v2`, `b1-buying-concern-v3`. Không tạo biến thể lời khách mới, không đưa required/forbidden/rubric vào request. Không bơm facts/description thủ công theo case.

Tools OFF theo chế độ diagnostic hiện hữu; owner chỉ viết exact final text từ evidence đã cấp; verifier/gate replay theo captured clock. Tối đa4outcomes,8generation requests, không retry. Label rõ DIAGNOSTIC_ONLY: không kiểm tool planning, state mutation, current live freshness, handoff hay end-to-end send eligibility; không thay full39. So với bản cũ chỉ là paired qualitative reference, không causal A/B vì mode/history không hoàn toàn giống native generation cũ.

Đánh giá nguyên đoạn trước khi xem rejected draft: có giúp quyết định, lý do liên quan, không tự thêm fact, tự nhiên và gọn theo việc khách cần. Cùng các lựa chọn mua được owner chấp nhận, không ép áo lẻ/cả bộ là đáp án duy nhất. Polish nhỏ không làm dừng phần chức năng đã sửa; thiếu quyết định hoặc chỉ còn đọc description là failure thực chất của diagnostic.

Nếu vẫn không đưa được lời khuyên dùng được khi evidence đã đủ: lưu đúng input/output và dừng treatment owner này sau một lượt. Không tự thêm ví dụ, tăng effort, đổi model, nới verifier, chạy lại để chọn câu đẹp hoặc chạy full để hy vọng xác suất tốt. Việc nào chưa chứng minh được ghi unknown, không kết luận model không có năng lực từ N1.

### Bước2: full39 N1, ưu tiên lỗi nhưng không chạy trùng

Nếu diagnostic không còn lỗi tư vấn thực chất và deterministic checks đã qua, đăng ký đúng39slots hiện có, không đổi corpus/rubric. Thứ tự:

1. **18outcomes ưu tiên:** B1 slots1,9,15 (3) + stateful8 theo thứ tự thật + openings4 + negotiation3. Gồm10 ca mục tiêu (9finding mở + negotiation objection) và8 prerequisite/controls thật.
2. **21B1 còn lại:** ranges2:8,10:14,16:24. Không chạy lại18ca đầu trong cùng campaign; toàn bộ39ca đúng1lần.

Reuse run.mjs ranges và isolated-integration; giữ actual cart/history/code private intake. Không dùng scripted provider setup, gán cart giả hoặc tools-OFF replay làm kết quả stateful native. Mọi prerequisite đã nằm trong39, không có hidden setup thêm.

Không patch/prompt/source change giữa39slots hoặc dừng vì vài câu văn chưa hay. Runtime từng attempt fail-closed như hiện hành. Nếu identity/privacy/source invariant hỏng thì dừng dispatch, ghi rõ số chưa chạy. Nếu quota thực sự cạn, không đốt tiếp các generation biết sẽ lỗi: giữ attempt đã dispatch và mọi case chưa chạy là NOT_RUN/BLOCKED_QUOTA; không claim đủ39, không hidden retry hay thay model.

**Ngân sách đề xuất:** tối đa4diagnostic +39native =43outcomes; native có38public provider turns và1private code-only turn (0generation), cap152; diagnostic cap8, tổng tối đa160generation requests. Đây là hai population báo riêng, không gọi43là43ca native. Source reads/embedding và request auth accounting tách riêng. N1 không chứng minh ổn định; không tự tăng repetitions ở vòng này.

## Verification, provenance và cách kết luận

Trong implementation: TDD cho logic thay đổi, observed RED rồi GREEN nhỏ nhất. Không tạo thêm một bộ gate/reviewer/test harness. Reuse existing focused tests và DB readback cho risk đang sửa.

Commands dự kiến, **chưa chạy trong planning**:

```text
pnpm --filter @lana/worker exec vitest run src/size-chart-eligibility.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-handoff.test.ts src/single-agent-commerce-persistence.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-state.test.ts src/single-agent-semantic-verifier-boundary.test.ts
node --test --test-concurrency=1 "apps/worker/evals/single-agent-semantic-verifier/*.test.mjs" "apps/worker/evals/single-agent-commerce-read-only/*.test.mjs"
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
```

Thêm target-file test nếu T0 xác nhận sửa size-chart-target; full worker `pnpm --filter @lana/worker exec vitest run src` một lần cuối khi runtime thay đổi. Shared package chỉ kiểm thêm nếu thật sự chạm. Isolated COD/BANK integration dùng runner và credential/source routes hiện có, giữ guard DB name, readback và cleanup; không migration live.

Trước provider: implementation và inputs/config hoàn thành → commit → clean executable/config → capture runtime SHA riêng của diagnostic/native → preflight. Không ghi SHA ngược vào frozen source. Candidate data/policy diff và hashes phải công khai; unknown giữ unknown. Dùng existing read-only quota read, không generation để dò quota, không consume credit/reset hoặc đổi route.

Captured requests phải chứng minh evaluator labels không leak, provider/model/effort đúng và mỗi generation tối đa1request. Body/IDs/errors/tokens/latencies/cost nếu expose đều giữ; errors và no-send/handoff nằm trong denominator. Không scoring rejected draft như đã gửi; receipt recovery là kết quả code riêng.

Review cuối theo39actual outcomes và cùng T0, tách: chức năng/an toàn, quyết định mua, giọng, source gap, provider availability. Các ca giá/tồn/policy/checkout đang tốt phải không bị regression. Đính chính scoring có lý do và giữ primary cũ; không thay criterion để cứu con số. Không gọi các kết quả ghép từ nhiều source/run là full39 PASS.

## Điều kiện dừng chống vòng lặp và phần không làm

- Một candidate prompt delta, một diagnostic4, tối đa một native39; không tự fix rồi chạy vòng2/3. Tương ứng từng finding phải chỉ rõ sửa ở đâu và bằng chứng nào cho thấy đã đóng.
- Source không đủ: không chữa bằng wording; contract sai: sửa contract; quote đã đủ nhưng bỏ qua: không tìm thêm nguồn discount; voice kém: không sửa validator để ép câu.
- Verifier giữ nguyên ở gói này. Một PASS còn bị nghi unsupported phải giữ issue/trace; không thêm regex để cứu case hoặc kết luận zero-risk từ mẫu nhỏ.
- Không tăng bound để che query kém. Nếu không tìm được món phù hợp thì ghi hạn chế coverage, không gán “khách chưa cung cấp đủ” tùy ý hoặc bắt xin số đo không giải quyết vấn đề.
- Không thêm một nguồn chuẩn cho mọi suy luận tư vấn; chỉ nối facts đã có và bổ sung dữ liệu bán hàng thực khi xác nhận thiếu. Không lấy phép thử ảnh12 chưa chạy làm lời hứa sẽ sửa giọng.
- Không thực hiện N3b terminal focus, N6b customer-image privacy/search, staff image readback hoặc promotion trong gói này; hạn chế cũ vẫn mở. Không dùng việc xử lý9finding để tự nhận toàn bộ B GO.

## Self-review của kế hoạch

1. Không lặp prompt-only: T1–T5 sửa source/contract/customer outcome; T6 chỉ delta hẹp, được diagnostic độc lập với tool orchestration.
2. Không cắt context mù: không có attributes thì giữ source; không thêm code trích nghĩa hay một model tóm tắt.
3. Clock mới bảo vệ rủi ro hiện tại (deadline thiếu anchor), chỉ là request metadata; không thuộc mutable world state để tránh self-invalidating snapshot.
4. Handoff thay policy ứng viên trong đường hiện có; không send trước commit, không phá HUMAN silence, không giả published behavior đã đổi.
5. Không re-run phình denominator: native18+21=39, gồm1private turn không gọi model, diagnostic4 riêng; lỗi cũ chạy trước mà không được tính hai lần hoặc bỏ lượt lỗi.
6. Không hứa fix được model bằng một câu chỉ dẫn: prompt đã có nhiều rule đúng; nếu treatment vẫn không cải thiện, kết thúc bằng finding đủ input/output thay vì nối rule thứ nữa.

Đây là đề xuất triển khai và kiểm tra, không phải evidence đã sửa/chạy hoặc được independent reviewer approve.
