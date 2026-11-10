# Phase B — sửa hợp đồng công cụ và kiểm riêng tư vấn

Ngày 22/10/2026. **PLAN_APPROVED_AFTER_INDEPENDENT_RE_REVIEW — chưa implementation/provider run.** Base `47b0cd995952eb7ac7e0c51174a853220698d17e`, branch `feat/c3-phase-b-commerce-20261014`. Dựa trên [review xuyên suốt](c3-a-to-b-longitudinal-review-20261022.md), [review độc lập REVISE → APPROVE](c3-phase-b-contract-and-advice-independent-review-20261022.md) và [campaign 39 lượt](../../apps/worker/evals/single-agent-commerce-read-only/full-b123-connections-20261022/CHECKPOINT_B.md). Đã sửa kế hoạch, self-review và được chính reviewer vòng trước re-review: APPROVE ở mức kế hoạch. Sau verdict, parent bổ sung rõ hai lưu ý kiểm thử của reviewer; không đổi thiết kế hoặc phạm vi. Giữ toàn bộ kết quả lịch sử; A OWNER_BYPASS, B chưa GO.

## Mục tiêu và phạm vi

Khách tìm đồ, xin ảnh, hỏi size, thời gian nhận và trả giá phải được xử lý bằng khả năng thật của shop. Lời tư vấn giúp khách quyết định mua, không dừng ở báo dữ liệu hoặc kể giới hạn hệ thống. Làm đúng chức năng và tư vấn hay là hai kết quả phải báo riêng.

Giữ một owner Gemini 3.5 Flash Lite HIGH và một verifier GPT-6.1 Sol HIGH, credential route/config hiện hành. Code giữ authority, privacy, CAS/fencing, receipts, final gate và exact draft. Không tăng 3 owner generations / 2 tool rounds / 6 calls / 1 verifier. Không thêm router, parser, repair/reverify, model role, durable state, framework hoặc câu tư vấn sản xuất riêng theo case. Không live send/deploy/đơn POS.

Gói chức năng T1–T4 không sửa phần hướng dẫn giọng/quyết định mua hay verifier. Có thể sửa mô tả tool cùng hợp đồng tương ứng. Review implementation yêu cầu sửa đúng một clause operation contract trong owner prompt đang nói mọi reject đều chưa ghi; freeze hash mới, không đổi phần giọng/quyết định mua. T5 là phép thử tư vấn riêng sau đó. Không ghép thay prompt, ảnh, model và rubric thành một treatment.

## T0 — cố định cách review trước khi đổi kết quả

Đọc lại các cặp actual replies đã bị chấm khác nhau: báo giá cả bộ kèm giá lẻ; ACK sửa số đo; lựa chọn áo/cả bộ. Ghi một ghi chú ngắn trong review hiện có, dùng nguyên đoạn và lịch sử, không tạo schema chấm mới.

- **Lỗi chức năng/an toàn:** sai món/tiền/quyền, claim mới không có nguồn, không thực hiện yêu cầu dù có capability, hoặc khách nhận fallback/im lặng ngoài intended control. Ghi rõ tầng gây lỗi; không coi lỗi provider là lỗi prompt.
- **Lỗi tư vấn thực chất:** khách nhờ chọn nhưng không nhận được hướng mua có lý do; đề xuất bỏ qua ưu tiên đã nêu; câu cuối phủ định lời khuyên trước mà không có đánh đổi; hỏi lại thứ đã biết; bước tiếp không dùng được.
- **Polish:** vẫn trả đúng và giúp khách xử lý việc đang hỏi nhưng có câu thừa, giọng thông báo hoặc từ gượng. Không tự nâng thành lỗi an toàn hoặc điều kiện dừng toàn bộ phần chức năng.

Danh sách giá, hai lựa chọn, một số đo hay từ “nếu” không tự là lỗi. Upsell có ích được chấp nhận. Với câu hỏi đơn giá, báo giá chính rõ rồi thêm ngắn lựa chọn thật có thể dùng được; mở một quyết định không cần thiết là điểm cần sửa về trọng tâm, phải áp cùng chuẩn cho baseline và candidate. Với ACK đúng state, “đã cập nhật” là vấn đề giọng nếu không gây hiểu sai thao tác; ghi riêng thay vì lúc PASS lúc FAIL không giải thích.

Đánh giá actual terminal trước rejected draft; policy theo nguồn và quyết định owner hiện tại, không áp lại chuẩn cũ đã bị thay. Không đổi primary lịch sử. Khi so candidate/control, ẩn tên arm trong tài liệu review nếu làm được bằng runner hiện có; không gọi đó là independent/human review.

## T1 — state tool nói đúng miền dữ liệu mà code nhận

**Lỗi xác nhận:** wire `apply_customer_state.ops[].value` chấp nhận number/string/string-array chung, nhưng fitPreference domain chỉ nhận FITTED/REGULAR/RELAXED. Tiếng Việt hợp nghĩa bị reject cả batch; error STATE_OR_DOMAIN_INPUT không giúp model sửa đúng field.

**Files chính:** `apps/worker/evals/single-agent-commerce-read-only/gemini-inference.mjs` và test; `apps/worker/src/single-agent-commerce-state.ts` và test. Đọc/reuse `CustomerProfileV1Schema`/measurement schemas, chưa cần đổi shared contract.

1. Mô tả theo từng nhóm field trong cùng tool: số đo là number theo miền hiện hành; fitPreference là enum hiện hành; preferences là array string; CLEAR không cần giá trị mới. Reuse enum/schema của domain, tránh hai bảng giá trị tự viết dễ lệch. Chỉ dùng cấu trúc JSON Schema provider hỗ trợ; kiểm official docs trước implementation adapter. Không mặc định oneOf/discriminator được hỗ trợ nếu chưa kiểm.
2. Mô tả fitPreference là cách model diễn đạt ý khách bằng enum, sourceQuote vẫn nguyên văn. Code không dịch “rộng một chút” thành enum bằng regex, không tự suy sở thích thay owner.
3. Validation lỗi input trước ghi trả `fieldErrors` với field/reason và miền hợp lệ công khai; không trả stack/exception/private input. Chỉ dùng `applied:false` khi biết thao tác chưa ghi. CAS trả false, lỗi input và commit/readback chưa xác định phải phân biệt; không gom thành STATE_OR_DOMAIN_INPUT.
4. Nếu CAS đã ghi nhưng readback lỗi/khác, hoặc CAS throw mà chưa biết đã commit hay chưa: giữ status lỗi và reason phù hợp, không khẳng định applied:false hoặc applied:true. Reuse pending/dependency block trong turn, bỏ receipt/fit/quote cache không còn chứng minh được; không hướng owner gửi lại patch như cách sửa lỗi enum. Không tự retry write, ghi bù hoặc thêm durable state. Thông báo chưa xác nhận được không được biến thành lời báo đã cập nhật.
5. Giữ atomicity của validation batch: một field sai trước commit thì không ghi các field còn lại. Pending chỉ hết khi đúng fields được giải quyết theo semantics hiện có; trường hợp commit chưa rõ tiếp tục chặn tác vụ phụ thuộc trong turn, không được xóa pending bằng một patch mới. Không cho bỏ fitPreference lỗi rồi báo toàn bộ update đã xong. Không tự tăng rounds để model sửa nhiều lần.

**RED→GREEN:** valid number+enum batch ghi đúng; invalid enum không ghi phần nào, trả đúng field; CLEAR hợp lệ; stale source/CAS vẫn reject; CAS thực ghi rồi readback throw/khác không báo chưa ghi, không có success receipt, không cấp fit/quote dựa effective state cũ; CAS throw chưa biết kết quả không tự ghi lại. Test cả khi đã có receipt/fit từ thao tác trước trong turn để không giữ chứng cứ cũ sau lỗi. Sau lỗi, gọi tác vụ phụ thuộc và thử patch tiếp trong cùng turn để chứng minh pending không bị xóa; fixture phải thực sự ghi store trước lỗi readback, không chỉ cho CAS giả trả true. state→recommend_size dùng revision/fingerprint mới trong budget hiện tại. Kiểm batch ordering hiện có trước khi sửa orchestration. Nếu schema đúng mà model vẫn đọc thừa/gọi tool sau NONE, giữ evidence và phân loại owner reliability, không che bằng tool tự động hoặc retry.

**Hoàn tất:** test chứng minh contract đồng nhất và model run cho thấy hai ca discovery/height-weight không còn mắc enum. Size engine trả missingInputs/no chart phải báo đúng, không biến thành fit hoặc coi đó là đủ điều kiện tư vấn size thành công.

Trước khi đổi error shape, kiểm mọi consumer đọc `applied`/`unresolvedFields`, gồm owner projection và dependency checks; missing applied không được mặc định false hoặc success. Dùng reason và pending hiện có để biểu diễn chưa xác nhận được, không thêm enum trạng thái toàn hệ thống chỉ phục vụ một tool.

## T2 — tách kết quả tìm ảnh khỏi dữ kiện màu bán

**Lỗi xác nhận:** media selector trả NO_VERIFIED_MATCHING_MEDIA cho nhiều nguyên nhân; owner lấy việc chưa chọn được ảnh màu be làm căn cứ shop không có màu be.

**Files:** `single-agent-commerce-media.ts`/test và declaration/projection trong `gemini-inference.mjs`/test.

1. Giữ status hiện có. Trong reason/data công khai của tool, phân biệt source unavailable, không có ảnh approved đúng intent, và không chứng minh được binding màu/component. Trả lại đúng subject/requested criteria để model hiểu phần nào chưa đáp ứng. Không coi metadata ảnh là xác nhận tồn/màu bán.
2. OK cho ảnh chung nói rõ scope ảnh chung, không có lời khẳng định đã khớp màu nếu chưa bind. Thiếu ảnh theo màu không được cấp một ảnh khác như đã thỏa yêu cầu màu.
3. Dùng ảnh chung để minh họa form chỉ khi reply phân biệt đúng với yêu cầu ảnh màu; ảnh đúng màu cần dữ liệu binding thật. Không tạo mapping Qdrant visual color→POS variant theo suy đoán. Thiếu nguồn này là limitation cụ thể, không cần mở dự án nhận dạng ảnh mới để qua case.
4. Giữ TEXT+IMAGE group gate, hash/freshness/permission/asset bounds. Draft bị chặn thì không gửi lén ảnh của group đó. Không tách group chỉ để tránh verifier.

**RED→GREEN:** có màu bán nhưng thiếu ảnh binding; có ảnh chung; đúng màu đã bind; ảnh expired/unapproved; wrong component; source lỗi. Test kiểm facts/selection và actual group, không match câu mẫu.

**Hoàn tất:** model không nói “không bán màu đó” từ lỗi ảnh; không gửi sai màu. Nếu vẫn chưa có binding màu, báo rõ yêu cầu ảnh đúng màu còn chưa hoàn thành dù reply đã dùng được hơn.

## T3 — dùng cùng quy tắc vùng ở hỏi ETA và checkout

**Finding code:** `realtime-sales-catalog.ts` có `southernDestination`; `single-agent-commerce-read-only-tools.ts` hiện truyền deliveryRegion thẳng vào `resolveCatalogFacts` và dùng lại chuỗi đó để bind ETA. Chưa đủ trace để nói đây là nguyên nhân duy nhất của ETA_DATA_MISSING_OR_EXPIRED; source thật có thể hết hạn.

1. Read-only đối chiếu input Cần Thơ, keys `shipping_eta`, fulfillment/preorder/mốc tính, synced_at và eta_valid_until của nguồn đúng offer. Không sửa nguồn shop hoặc timestamps để chạy qua.
2. Nếu mismatch tên tỉnh/vùng được xác nhận: reuse đường resolveRegion hiện có của checkout, kể cả `southernDestination`, bằng một helper dùng chung hẹp nếu cần; không copy bảng địa danh hoặc viết resolver song song. Thứ tự hiện hành là CONFLICT → không resolve; configured region match theo cách chọn hiện có → dùng key đó; nếu chưa match và địa chỉ miền Nam → MIEN-NAM; cuối cùng fallback vùng toàn quốc/default đã cấu hình. Giữ thứ tự này cho cả hỏi ETA và checkout; không map mọi tỉnh miền Nam sang MIEN-NAM trước configured match. Dùng cùng key đã resolve cho query, claim filter, readback và hash. UNKNOWN không tự là miền Nam, nhưng có thể dùng nationwide fallback đúng cấu hình.
   Quyết định owner là miền Nam dùng chung transit: nếu read-only audit thấy configured tỉnh cụ thể có transit khác MIEN-NAM, ghi mâu thuẫn nguồn và chưa nhận ca đó đã đạt; không tự sửa policy/source hoặc ưu tiên khác nhau giữa hai đường để che mâu thuẫn. Fixture kiểm priority dùng cùng transit cho tỉnh miền Nam; fixture xung đột được ghi riêng là data inconsistency.
3. Nếu nguồn thiếu/hết hạn: giữ unavailable và ghi đúng field/source cần bổ sung. Không viết thời gian giao vào prompt hoặc dùng ETA lịch sử. Chung transit miền Nam không bỏ thời gian chuẩn bị preorder.
4. Giữ handoff matrix hiện tại trong lượt này. Silent ETA handoff là thiếu sót trải nghiệm đã biết, nhưng không tự đổi tất cả silent rules. Một quyết định riêng về holding reply có thể dùng cơ chế hiện có; nó không thay việc sửa ETA và không được báo chuyển trước commit.

**Files:** `single-agent-commerce-read-only-tools.ts`/test, `realtime-sales-catalog.ts`/test nếu cần dùng chung resolver, reuse `southern-delivery-region.ts`; source/config chỉ thay nếu đã xác định lỗi thuộc candidate, không mutation nguồn thật.

**RED→GREEN:** Cần Thơ/TP.HCM và key trực tiếp dùng cùng nguồn vùng hợp lệ; có cả configured tỉnh và MIEN-NAM thì read/checkout cùng chọn đúng priority; nationwide fallback giữ đúng semantics; ngoài vùng/địa chỉ xung đột không bị gán miền Nam; ETA expired/preorder/mốc bắt đầu vẫn được giữ; revalidation vẫn chặn nguồn đổi.

**Hoàn tất:** model có ETA đúng vùng khi nguồn đủ; khi nguồn thiếu, báo data limitation cụ thể. Không lấy handoff đúng kỹ thuật làm bằng chứng đã trả lời được deadline.

## T4 — phục hồi sau thao tác đúng và chẩn đoán STALE

Tách hai sửa nhỏ, không xây recovery engine mới.

**T4a — trả giá đã ghi thành công:** dùng receipt `effect === NEGOTIATION_UPDATED` trong `single-agent-commerce-effects.ts`, processed command và `cart.discountTotalVnd`/`grandTotalVnd` đã có. Chỉ khi thỏa đầy đủ điều kiện recovery hiện hữu về policy, quote, selection, revision, recipient và freshness, formatter mới nói khoản ưu đãi hiện hành cùng tổng thanh toán. Trong scope này không nói “giảm thêm”, vì tổng discount không chứng minh delta của lượt hiện tại. Không gọi khoản giảm giá là freeship nếu source không nói vậy. Không hứa giá cuối cùng hay thêm thêu tay/công năng.

Không thêm receipt/effect type hoặc durable field chỉ để chọn câu. Giữ formatter của các effect khác; discount=0 không báo có ưu đãi; thiếu quote/policy hợp lệ chỉ được ACK trong phạm vi receipt hiện có. Tiền/receipt/selection còn phải qua boundary hiện có. Test ưu đãi bằng 0, ưu đãi hợp lệ, quote stale, recipient/revision đổi, nhiều effect cùng lượt và objection trùng không cấp hai lần. Không đổi actual text lịch sử hoặc dựng lại before quote bằng phép trừ để chứng minh giảm mới.

**T4b — STALE:** `single-agent-commerce-read-only.ts` đã trả `currentPublicContext` khi có diagnostic. Đối chiếu nó với trusted context thực sự đã gửi verifier trong captured request, trên chính attempt; ghi diff công khai vào diagnosis eval hiện có, không thêm capture runtime hoặc đổi finalGate signature/hash. Chỉ dùng allowlist facts, source identity/timestamps, revision và binding không có PII; không dump customer profile, history, asset bytes/URLs hoặc receipt payload. Diff tối đa20paths/4096bytes, ghi truncated khi vượt; thiếu before/after thì báo không đủ bằng chứng, không đọc nguồn lần ba để suy lại trạng thái cũ. Test formatter diff và giữ các final-gate tests: giá không đổi nhưng observation/version đổi và giá thực đổi đều vẫn chặn theo exact binding.

**Hoàn tất:** recovery giúp khách hiểu ưu đãi hiện có; chẩn đoán STALE chỉ ra public field khác khi captured before/after đủ. Nếu khác biệt nằm ngoài allowlist hoặc thiếu evidence thì báo chưa xác định, không mở rộng dump tùy tiện. Không hứa đã sửa nguyên nhân stale trước khi có evidence; không đưa lại old PASS cho world mới.

## T5 — so ảnh cấp sẵn với quyền tự gọi xem ảnh, giữ nguyên prompt

Đây là phép thử có giả thuyết, không tuyên bố ảnh sẽ chữa giọng. Kế hoạch ảnh trước đã có nhưng chưa chứng minh chất lượng tư vấn; hiện đường `view_product_media` đã nối nên có thể thử mà không xây thêm model role.

**Giả thuyết:** với băn khoăn ren nhiều/điệu/gọn/phối món có sẵn, có ảnh catalog đúng nguồn ngay trước generation đầu có thể giúp owner đưa lý do theo chi tiết nhìn thấy, so với để owner tự quyết định gọi xem ảnh. Đây là kiểm thời điểm/cách cấp context ảnh, không mặc định control không có ảnh hoặc chứng minh ảnh tốt hơn text. Nó không chứng minh ít nhăn, độ kín dưới đèn, cảm giác ngoài trời, độ vừa hoặc nguồn hàng.

- Giữ nguyên owner prompt, verifier, business facts, lịch sử, model và giới hạn generation/tool. Candidate nhận thêm prepared images cùng `vision:` literal, asset/hash và metadata cần thiết theo code hiện hữu. Canonical snapshot/hash giữa hai arm được phép khác vì treatment đó; không gọi chúng là cùng snapshot. Không thêm caption đánh giá, style labels, đáp án nên chọn hoặc rubric vào model context.
- **Runner cụ thể:** mở rộng `run.mjs` và protocol/registration hiện có bằng một chế độ eval ảnh có cấu hình freeze riêng. Không dùng `owner-comparison.mjs` vốn so hai model, không thêm runner/framework mới. Đường mặc định24B1 giữ nguyên. Với chế độ này, truyền media input vào `createCommerceTools` cho cả hai arm; registration hash phải lấy effective declarations gồm media, không dùng hash readOnlyDeclarations cũ.
- **Preload:** sau prepare sản phẩm đã bound, candidate gọi `view_product_media` hiện hữu cho đúng một initial PRODUCT của case, intent GENERIC và host allowlist/bounds hiện hành. Không chọn sản phẩm theo rubric hoặc kết quả model. Data đi qua catalogImages/vision binding và readback chuẩn; không inject inlineData tự do hay giả native tool history. Control không preload nhưng có cùng media tools, được tự gọi xem ảnh. Preload là source preparation công khai, không generation; ghi riêng số calls/bytes/latency, không gộp vào tool calls do owner sinh hoặc tuyên bố giảm tổng I/O. Hai arm vẫn có cùng tối đa6 owner tool calls/2 rounds; ảnh sau preload và các view tiếp theo cùng chịu bound ảnh hiện có.
- Cả hai arm chỉ dùng catalog công khai, cùng allowlist và cùng cơ chế revalidation; bytes/hash preload được giữ trong evidence để kiểm với đăng ký. Không dùng dữ liệu ảnh khách gửi. Nếu chuẩn bị ảnh làm một business source hết hạn trước generation, giữ outcome thiếu nguồn; không refresh tuổi fact trong eval. Giới hạn2ảnh hiện hữu có thể khiến candidate còn ít chỗ xem món khác hơn control; ghi rõ đây là đánh đổi của preload, không nới bound để làm treatment có lợi.
- **Corpus:** một file eval riêng gồm6 runtime cases theo dạng input hiện có và evaluator projection tách biệt, kèm registration12slots (case/arm). Bổ sung nhánh validation nhỏ trong protocol cho registration này; không sửa đè cases.b1.json, REGISTERED_CASE_COUNT của baseline hoặc đánh tráo24case bằng alias. Mỗi case có đúng một initial product. Ba ca kiểu dáng hiện hữu dùng exact IDs `b1-buying-concern`, `b1-buying-concern-v2`, `b1-changed-occasion-v3`; ba ca chuyển giao trên sản phẩm khác trong catalog có ảnh hợp lệ. Viết và freeze ca mới trước output, lời khách tự nhiên; không chọn sản phẩm sau khi biết model trả tốt. Không dùng ca nóng/nhăn để chấm hiệu quả ảnh.
- **Prerequisites:** trước đăng ký provider kiểm đủ6case có asset approved, đúng product và bytes dùng được. Thiếu thì chưa chạy12, ghi prerequisite; không thay ảnh/sản phẩm sau khi đã xem output. Lỗi tải/thay bytes sau registration vẫn giữ trong denominator và fail closed; không tự biến candidate thành control hoặc retry generation.
- 6 ca × 2 arm × 1 lần = **12 outcomes**. Xen kẽ arm; cùng nguồn text/history, pin bytes ảnh. Source mismatch vẫn giữ attempt nhưng ghi không đủ điều kiện kết luận nhân quả. Không gọi 12 outcomes là bằng chứng ổn định.
- Đọc cả đoạn: shop đã đưa hướng mua chưa, lý do có liên quan băn khoăn không, có chuyển lại quyết định cho khách không, giọng có bớt giải thích thừa không. Ghi tie/candidate better/control better và lý do trong review hiện có; không chấm bằng keyword, không ép mua áo hay mua bộ. Một cặp tốt hơn phải cải thiện quyết định/lý do/bước mua và giọng không kém hơn, hoặc cải thiện rõ giọng khi nội dung đã giải quyết nhu cầu; ít fallback đơn thuần không đủ chứng minh giọng hay hơn.
- Chỉ cân nhắc giữ candidate để đánh giá tiếp nếu ít nhất4/6 cặp tốt hơn, trong đó ít nhất2/3 ca mới; không có regression thực chất còn lại hoặc lỗi protected mới xác nhận được. Phải có đủ6cặp đối chiếu với business source tương đương; mismatch/lỗi thiếu outcome vẫn nằm trong12denominator nhưng kết luận là chưa đủ bằng chứng, không chia lại tỷ lệ trên phần còn lại. Đây là sàng lọc, không qualification thống kê/B GO và không auto đưa preload vào runtime mặc định.

**Kiểm trước provider:** request-level test cho cả hai arm: prompt/model/effective tools giống nhau, baseline business facts/history không mất; candidate chỉ thêm image input cùng binding/metadata bắt buộc; signed native history không bị viết lại; preload không làm owner nhận evaluator labels; cả hai qua final readback/gate. Kiểm preparation chỉ chạy một lần trước preload, không lặp preparation hoặc làm lệch accounting/tool budget. Test dispatch đúng12slots/effective hashes/cap48, baseline vẫn24case; ảnh stale/wrong product/hash reject, tổng ảnh/request bytes không vượt bounds. Chỉ sửa runner/protocol và tests liên quan, không test câu trả lời mẫu.

Nếu không đạt, giữ prompt hiện tại; không viết thêm ví dụ/câu cấm để cứu đúng sáu ca. Ca ACK “đã cập nhật”, giọng báo lỗi nguồn và nóng ngoài trời vẫn được track riêng; ảnh không phải fix cho chúng. Không bỏ các finding đó khỏi báo cáo chỉ vì đổi phạm vi thử.

## Thứ tự và số lượt chạy đề xuất

1. T0 và deterministic RED→GREEN T1–T4, self-review diff; đọc official provider docs khi sửa schema. T4b ưu tiên chẩn đoán lại campaign39 đã lưu ngay, không chờ một lượt STALE mới. Không generation để phát hiện lại lỗi domain có thể test trực tiếp.
2. Commit executable/config/frozen inputs sạch, capture runtime runSourceSha, preflight bằng route hiện hành. Chạy **đúng 39 lượt** như campaign trước, mỗi ca 1 lần; openings chạy trước ở DB riêng để thấy lỗi sớm, baseline/stateful/negotiation giữ thứ tự nội bộ. Hoàn tất tất cả registered lượt, không dừng vì polish hoặc một quality FAIL; lỗi infrastructure ngăn chạy phải giữ NOT_RUN rõ. Không retry, mẫu bù hoặc sửa giữa run.
3. T5 hoàn thành executable/corpus/registration và checks riêng rồi commit, require clean source, capture một runSourceSha riêng. Chỉ chạy12 khi prerequisites ảnh đủ và39không lộ lỗi authority/privacy/commit chưa giải quyết liên quan đường thử; polish/finding ngoài nhánh ảnh không tự chặn phép thử. Tổng tối đa **51 customer outcomes**, không thêm full39 lần thứ hai hoặc ×3 tự động. Gọi đây là baseline32 + selected connections7 + comparison12, không full toàn bộ12journeys/A2/A3. Nếu T5 chưa đủ điều kiện, báo39đã chạy/12chưa đăng ký hoặc chưa chạy đúng trạng thái, không nhận51hoàn tất.
4. Chốt report: từng finding trước/sau, actual outcome, source/tool/owner/verifier/provider attribution, denominator/request count, latency/token và unknowns. Không dùng tổng USABLE để che thiếu capability. Nếu có lỗi protected xác nhận được, ghi rõ và không đề nghị B GO; không thêm repair loop.

39 outcomes tối đa156 generation requests theo trần4/turn; 12 comparison tối đa48, tổng cap204, actual có thể thấp hơn do private intake/handoff. Embedding/media-fetch/auth tính riêng. Corpus IDs, config/schema/prompts/hashes và disposition được freeze trước mỗi campaign. Khóa review actual trước xem rejected draft. Không tự nhận authorization chạy model từ việc lưu kế hoạch này.

## Verification dự kiến, chưa chạy

Từ repo root, chạy bộ tương ứng với files thực chạm; không claim lệnh PASS khi mới liệt kê:

```text
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/sales-journeys.test.mjs
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-media.test.ts src/single-agent-commerce-read-only-tools.test.ts src/realtime-sales-catalog.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Reuse disposable COD/BANK harness cho recovery/state/checkout bị ảnh hưởng; ghi actual counts và drop DB. Nếu shared package thay đổi thì thêm focused checks/build tương ứng; chưa mở scope shared chỉ để sửa adapter. Tests prompt không chứng minh chất lượng câu nói. T5 dùng binding/byte limit/label firewall tests hiện có và test treatment preservation, không test expected câu trả lời.

## Self-review sau khi sửa theo review độc lập

Đã đối chiếu lại đường state CAS/readback, media composition, runner B1, region resolver, receipt recovery và evidence final gate. Các điểm dưới đã được sửa trong chính bản kế hoạch này; chưa phải kết quả test hay implementation.

| Điểm phát hiện khi self-review | Điều chỉnh đã thực hiện |
|---|---|
| Chỉ bỏ applied:false chưa ngăn consumer hiểu thiếu field là false, hoặc dùng receipt/cache cũ | T1 kiểm consumer, giữ pending/block, bỏ chứng cứ không còn xác nhận; thêm fault case có receipt/fit trước lỗi. |
| Giữ priority vùng có thể che mâu thuẫn với quyết định miền Nam chung transit | T3 kiểm hai đường cùng resolver và ghi source inconsistency nếu tỉnh riêng có transit khác; không tự sửa policy/nguồn. |
| Preload ảnh khác cả binding, thời gian chuẩn bị và dung lượng ảnh còn lại | T5 khai báo đúng treatment, effective schema hash, source I/O/latency và ảnh cap dùng chung; không claim cùng snapshot hoặc không ảnh ở control. |
| Ba ca mới không hợp đường đọc24case cố định, dễ thay nhãn hoặc lỏng validation | T5 có corpus/registration riêng6case/12slots trong runner hiện có; baseline24 giữ nguyên và kiểm riêng. |
| Sau39lượt còn sửa executable cho T5 thì run SHA cũ không dùng được | Chốt/commit/freeze SHA riêng cho12comparison; evidence mỗi campaign giữ identity riêng. |
| Bỏ cặp lỗi/nguồn đổi có thể làm đẹp tỷ lệ thắng | Giữ đủ12denominator; thiếu6cặp tương đương thì chưa đủ bằng chứng, không loại hoặc chạy bù. |

Lịch sử: self-review này chưa có independent APPROVE; sau đó chính reviewer vòng trước đã re-review và trả APPROVE ở mức kế hoạch. Hai lưu ý triển khai được ghi rõ trong RED→GREEN T1 và kiểm trước provider T5. Verdict không xác nhận runtime, tests hoặc chất lượng model đã đạt.

- Không lặp cắt context/nhồi ví dụ đã thử: gói chức năng không đổi prompt tư vấn; nhánh tư vấn thay đúng input ảnh và có đối chứng.
- Không nhận schema fix giải quyết mọi tool failure: discovery còn SUBJECT_BOUND cần đọc trace; chỉ sửa nếu thấy code nhân bản/đăng ký subjects sai. Nếu model đọc quá nhiều offer, không cắt source âm thầm hoặc tăng bound.
- Không nhận mapping vùng bảo đảm ETA dùng được: preflight kiểm source/hạn/offer; thiếu thật được ghi data gap.
- Không hứa gallery đủ màu khi chưa có asset binding, hoặc tự duyệt customer-image privacy. N3b focus sau so sánh, staff image readback và 28 slot chưa đăng ký vẫn ngoài bằng chứng hoàn tất.
- Không đổi silent handoff, static fallback toàn cục hoặc verifier để làm đẹp tỷ lệ. Recovery chỉ dùng code/receipt sẵn có.
- Chưa có fix đã chứng minh cho giọng correction và quyết định nóng/nhăn; kế hoạch nêu rõ thay vì gọi một rule chung là root fix. Sau phép thử không tốt, dừng hypothesis đó và báo owner, không tự mở vòng sửa tiếp.

Complexity dự kiến: sửa schema/feedback, selector semantics, reuse geography, formatter recovery, diff evidence sẵn có và nhánh eval ảnh nhỏ trong runner/protocol hiện có; không service/table/gate/model mới. Không thêm runtime capture cho T4b hoặc framework đăng ký chạy mới. Các phần tư vấn chưa có fix chứng minh vẫn được giữ là finding mở, không nhận kế hoạch này hoàn tất toàn bộ B.


Implementation được owner yêu cầu sau APPROVE: [savepoints, RED→GREEN và review](c3-phase-b-contract-and-advice-implementation-20261022.md). T5 executable được chuẩn bị trước full run để cùng reviewer kiểm toàn bộ; treatment chỉ bật ở12slots riêng sau39, không bật ở baseline. Hai campaign vẫn có clean source SHA riêng.
