# Phase B — sửa phân công model–code và kiểm riêng tư vấn

Ngày 2026-10-19. **EXECUTED; STOP readiness.** [Báo cáo51 lượt](../../apps/worker/evals/single-agent-commerce-read-only/model-code-division-run-20261019/CHECKPOINT_B.md): fix → independent REVISE → fix →119 provider requests, không retry; B1 và advice-only cùng8/12 USABLE. Nội dung dưới giữ kế hoạch đã khóa ở c2c535b0; câu “chưa” trong mô tả kế hoạch là trạng thái lúc chuẩn bị, không thay kết quả thực thi. Source run d699bb4a, primary lock dc0f4401. Không tự chạy thêm.
Owner chọn: giữ kiến trúc, sửa phân công model–code, kiểm riêng khả năng tư vấn. Planning source: `689e1e434be4a17b52e5e8525cb2a337bbda4cff`, branch `feat/c3-phase-b-commerce-20261014`, PR391. Đây không phải run source SHA. implementationBaseSha lịch sử giữ nguyên `296cdcfbf5759f5bf9cbb24acf3dc63005589361`; không khẳng định đó là main mới nhất.

Kế hoạch này thay các đề xuất **chạy tiếp** ở đầu tasks/plan.md và tasks/todo.md. Không thay kết luận hoặc dữ liệu lịch sử. A vẫn OWNER_BYPASS; B chưa đạt, sales/live STOP. Đã sửa theo [review độc lập REVISE](c3-phase-b-model-code-division-independent-review-20261019.md) của bản f5b8f209; revision base là c9c777d07e1c7b4e5e2dde346de359bac9bd1ee8. Chưa có verdict độc lập mới trên bản sửa. Phạm vi lượt hiện tại: sửa và self-review kế hoạch; các bước implementation/provider bên dưới chưa thực hiện.

## 1. Bằng chứng và giới hạn kết luận

Nguồn bắt buộc:

- [Architecture](c3-single-agent-commerce-architecture-20261004.md), [verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [Phase B](c3-phase-b-read-only-integration-plan-20261014.md).
- [93 lượt nền](../../apps/worker/evals/single-agent-commerce-read-only/bounded-source-repeat-2x-20261018/REVIEW_93.md).
- [F1–F3 implementation](c3-phase-b-contract-fixes-implementation-20261018.md), [lượt execution-contract thất bại](../../apps/worker/evals/single-agent-commerce-read-only/execution-contract-run-20261018/CHECKPOINT_B.md), [lượt post-review đã rollback](../../apps/worker/evals/single-agent-commerce-read-only/post-review-run-20261018/CHECKPOINT_B.md).
- [Implementation đang có](c3-phase-b-agreed-fixes-implementation-20261018.md), [66 kết quả gần nhất](../../apps/worker/evals/single-agent-commerce-read-only/isolated-agreed-run-20261018/CHECKPOINT_B.md) và [toàn bộ hội thoại/điểm](../../apps/worker/evals/single-agent-commerce-read-only/isolated-agreed-run-20261018/CONVERSATIONS_AND_REVIEW.md).

| Finding đã quan sát | Quyết định cho vòng này |
| --- | --- |
| Bỏ checklist: usable 14→13/21; sửa search: usable 8→8/12 dù fallback giảm | Không lấy giảm fallback làm tiêu chí thành công; không gắn quan hệ nhân quả cho mẫu nhỏ và source khác nhau. |
| Sai đường dẫn WAIST_CM/HIPS_CM, sửa state + đọc lại chiếm hai vòng; add tới lúc NONE | Đổi giao diện field model phải viết; chuẩn bị dữ liệu của sản phẩm đã bound trước owner. Đây là giả thuyết cần đo, chưa phải nguyên nhân nội tại model đã được chứng minh. |
| Read tổng AO rồi khẳng định tồn be/M; không thực hiện add | Giữ scope tồn tổng/biến thể rõ; không coi preload là đã chọn biến thể, thêm giỏ hoặc chứng minh vừa. |
| Sân khấu: nguồn tới owner nhưng không có độ kín áo; hai lớp có thể thuộc váy | Kiểm tư vấn riêng trên chính nguồn đó; không bổ sung fact giả và không nới verifier để cho kết luận sản phẩm thiếu căn cứ qua. |
| POS lỗi đôi lúc bị diễn giải thành shop không bán lẻ | Giữ SOURCE_UNAVAILABLE và phần mô tả có thật; kiểm khả năng trả phần biết mà không bịa quy định/hẹn theo dõi. |
| Sai quan hệ trước/sau giảm hoặc làm tròn 978.100 thành 978.000 | Code đã có cartQuote đúng. Đo lỗi diễn đạt tiền riêng, không bổ sung máy tính hoặc tool quote thứ hai. |
| PASS nhưng STALE; log chỉ có snapshot IDs | Bổ sung phần khác nhau của context công khai vào evidence eval hiện có; không nới gate khi chưa biết trường nào đổi. |
| Preview mới, MIEN-NAM, receipt recovery, source errors đã có lợi ích/code proof | Giữ các phần này. Sáu preview edits ở so sánh mới thuộc formatter cũ được cố ý giữ; không sửa lại formatter đã hoàn thành. |

## 2. Phân công sau sửa

| Phần việc | Owner model | Code |
| --- | --- | --- |
| Hiểu lời khách | Hiểu tham chiếu, sửa ý, chọn sản phẩm/offer/màu/size khách yêu cầu, tư vấn và chọn bước bán hàng | Không suy ý bằng regex/router; không tự chọn màu, offer hoặc size từ tồn |
| Chuẩn bị nguồn | Tìm sản phẩm khi chưa xác định; tìm món thay theo nhu cầu | Chuẩn bị content/availableOffers và trạng thái đọc của tối đa một sản phẩm đã bound; không preload giá/tồn/biến thể |
| Số đo | Chọn loại số đo, giá trị và trích dẫn tin hiện tại | Chuyển mã field hữu hạn sang đường dẫn lưu trữ; kiểm nguồn, giá trị, CAS và receipt như hiện tại |
| Mua/sửa giỏ | Gọi add_to_cart/change_cart_item với lựa chọn khách | Kiểm selection/giá/tồn/quyền, commit, tính tổng và readback như đã có |
| Tư vấn/giọng | Tạo exact final text, quyết định lời khuyên và bước tiếp phù hợp | Không viết sẵn câu tư vấn, không sửa ngầm draft sau verifier |
| Kiểm gửi | Một verifier kiểm protected semantics của exact reply | Freshness/binding/revision/permission/recipient/privacy/receipt/hash và terminal outcome |

**Không xây lại executor:** `single-agent-commerce-effects.ts` đã gọi selection trong add/change, xử lý CAS/receipt, chạy state/read trước effects và quote sau effects. Giữ nguyên những trách nhiệm này; không thêm tool “xử lý mọi việc”, planner JSON, model role, durable state hoặc repair loop.

## 3. Thứ tự thực hiện

### P0 — khóa dữ liệu và chuẩn so sánh

Đăng ký case IDs, lịch sử, nguồn công khai, capabilities, rubric và config trước generation. Dùng các ca đang có; không viết câu hỏi mới chỉ để kích đúng tool. Các câu cần nối intake phải tự nhiên và phản ánh đúng hành trình.

Giữ Gemini 3.5 Flash Lite HIGH owner / GPT-6.1 Sol high verifier, credential routes và generation config từ manifest hiện hành. Không đổi model/effort/verifier/policy/giọng trong cùng vòng này. Kiểm route/version thực tế trước dispatch; khác identity thì ghi BLOCKED, không thay ngầm.

Dùng reader live hiện có cho integrated B1/stateful/baseline opening; lưu source versions, statuses và khác biệt nguồn thực tế. Baseline dùng lịch sử/initial state/config tương ứng nhưng **không gọi paired causal comparison** vì chưa pin đồng bộ catalog/POS selector/policy. Không xây frozen replay toàn hành trình trong vòng này.

Chỉ advice-only dùng snapshot replay: chạy integrated B1 trước, capture public context đầy đủ tại checkpoint định trước ở P3, rồi dùng chính capture đó. Không phục dựng snapshot lịch sử còn thiếu từ owner wire projection. Clock replay và readback được chốt tại capture; giữ observedAt/expiresAt gốc, không làm mới nguồn. Kết quả replay không chứng minh freshness live.

Evaluator-only labels/rubric/expected behavior không vào owner hoặc verifier. Freeze request projection, cấu hình nguồn, checkpoint/capture rule, config/prompt/schema/corpus hashes rồi commit, require clean executable/config worktree, capture HEAD ở runtime. Không ghi run SHA ngược vào frozen source. Context sinh từ integrated run là evidence: ghi hash sau capture và khóa trước advice dispatch, không sửa executable/config để nhét hash ngược lại hoặc chọn capture sau khi xem điểm.

### P1 — code chuẩn bị sản phẩm đang được xác định

**Sửa ở reader/composition/runner hiện có**, dùng `single-agent-commerce-read-only-tools.ts`, `single-agent-commerce.ts`, `single-agent-commerce-read-only.ts` và owner projection `gemini-inference.mjs`; không thêm service hoặc tool cho model. Dùng chung phần source validation/static evidence/offer literal hiện có, thêm nhánh preparation hẹp trước các side effects của full read. Không gọi full read_product rồi xóa claims/subjects/read-set để che dependency đã tạo.

1. Sau input/privacy/permission checks, preload currentProductId nếu khớp PRODUCT binding hiện hành và đúng shop/scope. Audit cho thấy read-only context mặc định currentProductId=null dù initialProducts đã bind: nếu chỉ có đúng một PRODUCT bound, được đọc sản phẩm đó như dữ liệu tham khảo, **không gán nó thành lựa chọn khách/currentProductId**. Không có hoặc có nhiều PRODUCT mà thiếu current binding thì không preload; không chọn sản phẩm đầu tiên. Đây là quy tắc dữ liệu đầu vào, không phân loại ý khách.
2. Materialize **content/attributes đã được reader xác minh và availableOffers** của tối đa một sản phẩm; giữ provenance và offer literal hiện có. Không resolve PRICE/STOCK/ETA/SIZE_FIT, thêm VARIANT subjects, chọn offer/màu/size hoặc đăng ký full read-product query chỉ vì preload. Không làm mất facts/subjects hợp lệ đã có trước preparation. Khi owner cần giá/tồn hoặc mua hàng, dùng read_product/effect selector hiện tại.
3. Truyền public preparation result vào cùng owner product projection: subjectRef, phần đã thử đọc, status/reason allowlisted và dữ liệu thành công. Content đọc được vẫn giữ khi POS/offer source lỗi; availableOffers=null vẫn là chưa xác nhận cách bán. Giá/tồn không được đọc phải phân biệt với đọc thất bại; không nói POS lỗi nếu chưa có lỗi quan sát được. Giữ provenance/binding trong context nội bộ, chỉ chiếu public result cần thiết ra wire. Không dựng functionCall/functionResponse giả cho preload; không đưa exception/URL/credential vào context. Kết quả đọc mới hợp lệ thay trạng thái cũ trong cùng scope.
4. Khi đã có snapshot cùng nguồn còn hợp lệ trong lượt, dùng lại; không đọc lại chỉ để phục vụ preload. Readback preparation kiểm lại **đúng content/offer projection đã sử dụng** bằng reader hiện có; không vô tình nâng thành full read. Giá/tồn thuần túy không được thêm vào dependency chỉ vì preparation, nhưng source identity, version, freshness hoặc offers/content thực sự đổi vẫn phải qua gate hiện tại. Không bỏ version/expiry để ép PASS: refresh source metadata có thể vẫn làm gate chặn, phải ghi giới hạn đó. Effect selector và final readback giữ trách nhiệm cũ.
5. Preload tính vào trần 6 logical tool operations của lượt và thời gian end-to-end; không tăng budget 2 tool rounds/3 owner generations. Một preload mới tiêu thụ một call, không gọi generation để yêu cầu model đọc lại. Trần 6 không phải trần mọi I/O nội bộ: selector/readback vốn có source reads riêng, phải đếm riêng và không che tăng chi phí. Không retry tự động. Lỗi lúc preparation không xóa content độc lập hợp lệ; đã có evidence rồi bị invalidated ở readback vẫn phải theo gate.
6. Không preload toàn catalog/history. Search mới vẫn do owner chọn truy vấn; không tự dịch “đi sân khấu” thành bộ lọc độ kín hoặc chọn mẫu thay. Món tham khảo đã bound có thể không còn liên quan tin mới; giữ preparation nhỏ, không buộc owner phải dùng nó hoặc thay lựa chọn khách.

Kỳ vọng: ngay lần đầu owner biết sản phẩm bán các offer nào, có mô tả gì; có thể gọi state + add trong batch hiện hữu khi khách chọn đủ. **Không bảo đảm owner sẽ làm vậy.** Nếu vẫn đọc thừa/không add/sai màu, bác bỏ kết luận preload đã giải quyết tool planning.

RED→GREEN:

- source-bound đúng/sai/trống, một PRODUCT khi currentProductId=null không đổi lựa chọn/state, nhiều PRODUCT không tự chọn; permission/privacy reject không preload; một read tối đa và accounting.
- First owner wire khi POS lỗi vẫn có content hợp lệ + scope/status lỗi, không fake tool call; chưa đọc giá/tồn không bị ghi thành lỗi/hết hàng.
- Preparation không thêm protected prices/stock/VARIANT hay full-query read-set; không xóa facts/selection trước đó. Khách đổi sản phẩm/occasion hoặc hỏi policy không bị ép quay lại món cũ; search/read tiếp không vượt subject bound do variants do preparation sinh thêm.
- Readback không đọc/so giá/tồn không được preload. Content/offers/source identity/expiry đổi thật vẫn fail-closed; phân biệt thay đổi giá/tồn ngoài projection với thay đổi metadata được gate bảo vệ, không hứa mọi thay đổi nguồn đều cho qua.
- Cùng-turn state→add, state reject→dependent effect reject, no mutation khi preload. Điểm tích hợp sau guards và trước owner đầu tiên; không chạy I/O sớm hơn guards khi khởi tạo tools.

Nếu làm preparation hẹp đòi thêm dependency framework/loại bỏ identity check, dừng riêng P1 và báo giới hạn; không âm thầm quay sang full preload hoặc nới gate. Diagnostic và P2 không phụ thuộc việc phải chứng minh P1 thành công.

### P2 — model không phải viết đường dẫn lưu trữ số đo

Sửa `gemini-inference.mjs` và test adapter; giữ tên tool `apply_customer_state`, domain writer `single-agent-commerce-state.ts` và source checks.

Wire contract mới dùng field enum mã số đo `HEIGHT_CM/WEIGHT_KG/BUST_CM/WAIST_CM/HIPS_CM`; code map hữu hạn sang `measurements.*` trước domain invocation. Các field fitPreference/preferences phải có mapping chính xác được chốt cùng schema. Native schema, owner state projection, measurements, fieldErrors **và unresolvedFields** trả về cùng một từ vựng; domain/revision/receipt và verifier context giữ contract nội bộ.

Đây là **thay contract wire**, không là nhánh “thấy args sai thì đoán sửa”. Chỉ chấp nhận enum đã khai báo; không nhận thêm alias/path tự do, không fuzzy match. Giữ nguyên SET/REPLACE/CLEAR, giới hạn ops, một trích dẫn đúng nguồn/giá trị, atomic batch, unresolvedFields và CAS. Model vẫn phải hiểu eo hay mông, của ai, khách đang sửa gì; code không tự suy từ văn bản.

Giữ raw native functionCall trong content, call ID và thoughtSignature; map riêng calls[].args cho domain và kết quả trả owner về vocabulary mới. Lưu raw native args cùng domain args đã map trong evidence hiện có, không ghi đè lịch sử. Unknown field phải trả rejection hoặc fail toàn generation trước mutation; không lặng lẽ bỏ state call rồi chạy dependent effect. Chỉ thay những câu prompt/schema mô tả field để khớp contract, không thêm ví dụ ca lỗi hoặc hướng dẫn giọng mới.

RED→GREEN: mapping hai chiều request/result, value/sourceQuote không bị biến đổi, unknown field reject trước write, duplicate target reject, CLEAR, preference, nhiều số trong quote vẫn reject, không nhận history làm nguồn mới, source conflict vẫn chặn dependent effects. Kiểm raw provider request không rò evaluator labels/PII.

P1/P2 là hai savepoint riêng. Lượt provider đánh giá gói hai thay đổi, **không quy phần tăng điểm cho riêng P1 hoặc P2** nếu chưa có so sánh tương ứng.

### P3 — kiểm riêng tư vấn, không phải kiến trúc runtime mới

Dùng runner/projection/verifier hiện có, thêm mode eval tối thiểu nếu cần. Với bốn ca đã có:

- `b1-changed-occasion`: đổi từ tiệc trong nhà sang sân khấu;
- `b1-partial-source-v2`: mô tả có, nguồn giá/tồn lỗi;
- `b1-buying-concern`: ngại ren cầu kỳ khi dự tiệc ban ngày;
- `b1-search-read`: exact lookup làm control giá/phạm vi món.

**Thứ tự execution: integrated B1 → khóa capture → advice-only.** Chuẩn bị capture trước run trong owner callbacks của run.mjs/stateful-provider.mjs khi liên quan; không lấy log buildGeminiCommerceRequest để tái dựng TrustedContext. Với bốn ca B1, lưu bản đầy đủ của **public TrustedContext trước projection**, original customer/shop history + latest, source provenance và clock. Không lưu raw private state/PII/secrets, không lấy hội thoại stateful/private input làm diagnostic ở vòng này.

Quy tắc chọn capture khóa trước generation: request owner đầu tiên có toolsAllowed=false; nếu turn kết thúc mà chưa có request đó, dùng request owner cuối cùng thực sự đã dispatch của chính attempt. Không chọn theo PASS, câu hay hoặc số facts. Mỗi integrated case/repetition ghép đúng một advice attempt; không lấy capture của rep khác. Nếu không có capture hợp lệ: giữ slot advice NOT_RUN/BLOCKED, không bù bằng lượt sinh mới.

Advice nhận original history/latest và public context này qua projection hiện có; tools=[]/NONE, một owner generation, không re-read live và không thêm tool transcript/draft/verdict/đáp án mẫu của integrated run. Giữ capability giới hạn rõ, đặc biệt B1 không có follow-up executor. Sự khác biệt về tool transcript và số vòng reasoning phải ghi trong báo cáo; đây không phải phép đo chỉ thay một biến.

Mỗi advice attempt có request/generation identity mới, giữ link/hash capture gốc; bind exact draft mới qua protocol hiện có, không dùng lại verifier PASS. Eval clock cố định tại capture và readback clone snapshot đã capture cho phép kiểm semantics/binding trên thế giới đó. Giữ observedAt/expiresAt gốc; ghi terminal outcome là **replay**, không phải send eligibility live. Không mô phỏng nguồn live đã qua hoặc phục dựng selector/checkout.

Không tự bổ sung độ kín/mẫu thay hay SIZE_FIT còn thiếu. Nếu không có context đủ để trả điều khách hỏi, vẫn giữ ca, chấm phần thông tin thiếu riêng và xem owner xử lý được tới đâu. Không “làm đủ facts” bằng nội dung tưởng tượng.

Chấm draft độc lập về tư vấn, rồi chạy verifier/final gate và chấm terminal outcome replay riêng. Integrated run vẫn chấm actual terminal outcome; không gộp hai bảng. Câu hay nhưng bị block không được tính là khách nhận câu hay. Câu PASS nhưng lời khuyên kém vẫn kém. Context sau tool có thể thuận lợi hơn lúc đầu; tools bị tắt và transcript cũng khác, nên đây là phép thử **khả năng tư vấn khi đã nhận nguồn**, không chứng minh toàn bộ kiến trúc tốt hơn.

Bảng kết luận:

- Advice-only vẫn kém, nguồn liên quan có đủ: vấn đề còn ở quyết định/diễn đạt của owner.
- Advice-only tốt, integrated kém: đối chiếu tool trace/context checkpoint để tìm lỗi acquisition/execution hoặc diễn đạt; chưa quy ngay cho tool vì cách cấp history/tool transcript và reasoning rounds khác nhau.
- Hai nhánh cùng thiếu dữ kiện ảnh hưởng quyết định: thiếu nguồn; không sửa prompt thành biết điều chưa có.
- Draft phù hợp nhưng verifier chặn: kiểm exact text, scope, context trước khi kết luận verifier quá chặt.
- Verifier PASS nhưng gate block: đọc public context diff; không đổ cho giọng hay nới gate.

### P4 — đo tích hợp và giữ giọng bán hàng

Không sửa prompt giọng diện rộng trước kết quả P3. Reviewer đọc toàn cuộc trao đổi và tin khách thực nhận; kiểm:

- Có chọn/giải quyết điều khách cần, thay đổi lời khuyên khi hoàn cảnh đổi?
- Lý do có giúp mua hàng và gắn đúng sản phẩm/phần đồ? Cho phép nhận xét thẩm mỹ, cách phối, cảm giác dự kiến; không đòi test cho mọi lợi ích.
- Có hỏi lại điều đã biết, trả quyết định về khách, hẹn không có executor, hoặc tạo đặc tính cụ thể chưa biết?
- Câu có giống shop đang chat: tự nhiên, không thuật “hệ thống/ghi nhận/điểm đánh đổi”, không chép mô tả thành quảng cáo?
- Nhắc số đo/lựa chọn để xác nhận sửa hoặc giải thích thực sự được chấp nhận; không chấm theo số keyword hay cấm lặp mọi fact.
- Tiền phải đúng cả số và quan hệ đơn giá/tạm tính/giảm/ship/tổng; thao tác và quyền lợi đúng receipt/policy.

Minor polish không tự thành FAIL. Khóa USABLE / NEEDS_EDIT / UNUSABLE / OWNERSHIP_CONTROL trước khi đọc rejected draft/verdict detail; draft diagnostic là bảng riêng. Khác biệt nguồn/budget phải hiện trong kết luận.

Dùng nhóm stateful cũ, thêm **một lượt yêu cầu checkout trước private-input turn**, không thay fixture private thành bằng chứng owner đã mời checkout. Quan sát owner gọi confirm_purchase → code invitation → synthetic private input chỉ đi qua code → preview mới → confirmation; policy handoff/receipt/fence giữ nguyên. Nếu invitation thất bại thì các bước phụ thuộc không được ghi đạt nhờ fixture; đánh dấu BLOCKED/NOT_RUN theo manifest, vẫn chạy controls độc lập. Không gửi thật.

Cập nhật đồng bộ hardcoded counts ở stateful-provider.mjs (7 outcomes/6 public/24 generations hiện tại) và isolated-integration.mjs (7 outcomes) theo manifest mới, bao gồm request accounting trước dispatch. Tám lượt mỗi nhóm không phải tám lượt cùng một hội thoại: human-request là journey riêng. Dùng một nguồn counts của registration hiện có, không thêm registry/framework. Test bounds, invitation thất bại và case độc lập không bị bỏ.

STALE: lưu các đường dẫn public đã thay đổi + before/after allowlisted trong log eval hiện có, gồm evidence identity/freshness, permission/recipient dưới dạng hash khi cần. Không lưu raw PII, secrets hoặc full private state. Nếu chưa có readback thì vẫn ghi UNKNOWN, không suy nguyên nhân.

## 4. Phạm vi chạy có trần

Đây là đăng ký dự kiến cho bước execution, **chưa chạy**. Hoàn tất manifest cụ thể và commands trước dispatch; không tự mở rộng khi có failure.

| Nhóm | Số terminal outcomes tối đa |
| --- | ---: |
| Advice-only: 4 ca ×3 | 12 |
| Baseline HEAD cũ: ca mở giỏ ×3, clean initial state/live reads, so sánh mô tả | 3 |
| Candidate stateful: 8 lượt/nhóm ×3, gồm intake mới và control journey riêng | 24 |
| Candidate B1: 4 ca trên ×3 | 12 |
| Tổng | **51** |

Không gọi 51 outcomes là 51 hội thoại độc lập; đây là 51 slots đăng ký, slot không chạy vẫn giữ trạng thái riêng. Ba candidate opening nằm trong 24, không chạy lần nữa. Tối đa **180 generation requests**: advice12×2 + baseline3×4 + stateful24×4 + B1 12×4; code-only controls thực tế dùng ít hơn. Nguồn/embedding requests, tokens, latency và errors đếm riêng. Không hidden retry/best-of; mọi lỗi nằm denominator.

Sau readiness/seal, thứ tự cố định: baseline opening ×3 → candidate stateful ba nhóm, mỗi nhóm theo thứ tự hội thoại → integrated B1 12 lượt → khóa captures → advice-only 12 slots tương ứng. Ca mở giỏ đứng đầu mỗi nhóm stateful; không đảo lượt hoặc giữ session mở để xen advice. Dừng phần phụ thuộc nếu vi phạm authority/PII/receipt hoặc mất identity; ghi các lượt chưa chạy. Source live thay đổi được ghi nhận và final gate vẫn xử lý, không bỏ attempt để giữ so sánh đẹp. Không tự chạy full45/conditional16 hay mở vòng tiếp. Historical STOP/FAIL giữ nguyên.

Mục tiêu vòng hẹp:

- Candidate opening 3/3 đúng ý khách, receipt/cart đúng, không hỏi lại/không tool muộn; variant/correction giữ màu và size khách đã chọn.
- 3/3 hành trình đi qua actual code invitation/preview/confirmation đúng phạm vi; control handoff/no-send giữ đúng.
- Exact lookup/partial-source controls không hồi quy về truth, nguồn thiếu hay hẹn không có khả năng.
- Báo từng ca/lần và cả draft/terminal; chỉ gọi một ca ổn định trong mẫu này nếu 3/3 USABLE. 2/3 là chưa ổn định, không majority PASS.
- Bất kỳ protected false PASS quan sát được phải ghi riêng và STOP readiness; không bỏ khỏi mẫu vì advice được xem là hay.
- Đây là quyết định tiếp tục nghiên cứu Phase B, không phải GO production hoặc chứng minh đạt Checkpoint A.

## 5. Verification và savepoints

P1/P2/P3 quan sát RED trên test hành vi trước sửa; GREEN tối thiểu. Không viết test kiểm sự tồn tại của câu prompt. Dùng tests hiện có; chỉ thêm ca chứng minh contract thay đổi và hồi quy liên quan.

Commands dự kiến (chưa chạy trong lượt lập kế hoạch):
```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce.test.ts src/single-agent-commerce-state.test.ts src/single-agent-commerce-grounded-state.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-read-only.test.ts src/single-agent-commerce-read-only-tools.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-commerce-session.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/realtime-reply-differential.test.ts --maxWorkers=2 --minWorkers=1
node --test apps/worker/evals/single-agent-commerce-read-only/gemini-inference.test.mjs apps/worker/evals/single-agent-commerce-read-only/protocol.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-comparison.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```
Worker lint hiện là tsc --noEmit; ghi đúng tên command, không đếm lại thành một lần typecheck khác đã chạy. Nếu thêm test file mode diagnostic phải đăng ký command exact trước seal. Provider entrypoints hiện có: run.mjs và stateful-provider.mjs; chưa bịa CLI cho mode chưa được triển khai.

Savepoints: kế hoạch → P1/tests → P2/tests → diagnostic/registration/tests → executable seal → raw evidence → whole-turn review/report. Commit riêng không đồng nghĩa thêm approval gate. Mỗi phần có thể revert riêng; giữ F1–F3/MIEN-NAM/preview/intake/receipt recovery và dữ liệu lịch sử.

Complexity budget: không thêm runtime role, durable state/table, generic framework hay gate. Một nhánh preparation hẹp trong reader/composition + public result projection, mapping enum tại adapter và capture/diagnostic mode tại eval; reuse validation/executor. Không làm frozen whole-journey replay hoặc dependency framework. Chưa có lý do sửa shared package. Nếu cần tách tool tư vấn/transaction thành kiến trúc khác hoặc thêm semantic parser thì dừng thiết kế đó, không giấu trong P1/P2.

## 6. Self-review kế hoạch

- Đã loại đề xuất “code tự kiểm giá/tồn rồi thêm giỏ” vì executor làm sẵn.
- Không coi schema/NONE/prompt nhắc lại là fix mới; P2 thay wire contract chính thức, không sửa args sai theo heuristic.
- P1 không chọn size/màu/offer hoặc chuyển lỗi nguồn thành quy định shop; source reads vẫn có budget/accounting.
- Không bỏ dependency block chỉ vì khách tự chọn size; state lỗi vẫn không được lờ đi.
- Không nhồi thêm ví dụ/bài mẫu; giữ owner prompt ngoài đoạn field bắt buộc tương thích và giữ verifier.
- Diagnostic không cấp thêm model role/runtime bypass, không oracle facts, không đồng nhất draft tốt với terminal tốt.
- Causal limit, unknown STALE, missing historical snapshot và chưa có provider proof intake được giữ rõ.
- Mẫu 51 có trần, không tự nhân full suite; tiêu chí whole-conversation/giọng và nguồn sai được tách.
- Chưa có bằng chứng P1/P2 sẽ cải thiện hành vi. Nếu thất bại, báo giả thuyết không được ủng hộ, không nối tiếp bằng thêm lời nhắc cùng nội dung.

## 7. Xử lý review độc lập

| Finding của review tại f5b8f209 | Sửa kế hoạch lần này |
| --- | --- |
| Preload result/error chưa đến owner | P1 public preparation scope/status trong first owner wire; không fake functionResponse, không coi chưa đọc là lỗi |
| Full preload tăng subjects/read dependencies | P1 chỉ content/attributes/offer mapping; không PRICE/STOCK/ETA/VARIANT/full-query read-set. Thêm changed-product/policy/independent-source controls; giữ metadata/freshness fail-closed |
| Frozen replay/clock/capture chưa khả thi | Integrated B1 trước → public TrustedContext capture → advice replay; không dựng từ lossy wire, không pin cả journey; live opening chỉ so sánh mô tả |
| Mapping/failed state batch chưa đủ rõ | Map unresolvedFields; giữ raw content/call IDs/thoughtSignature; không drop state call rồi thực thi effects |
| Counts/intake/test command | Đồng bộ runner registration; invitation lỗi chặn phần phụ thuộc; human-request journey riêng; thêm read-only runner tests |

Self-review bản sửa: giữ 51 slots/180 generation upper bound, không thêm provider mẫu phụ; không mặc định P1/P2 chữa được mất màu/bỏ add/opacity; không sửa giọng/verifier để cứu kết quả. Kế hoạch đã xử lý review nhưng **chưa có independent re-review ACCEPT hoặc runtime/provider verification mới**.
