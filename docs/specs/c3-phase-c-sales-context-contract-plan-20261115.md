# Phase C — kế hoạch sửa nguồn lời văn và bước thương lượng

Revision 2 · 15/11/2026 · DRAFT, chờ review độc lập.
Implementation base `7cdd2e80b0ebda08f0176082ea09885a63a76fe2`.
Tài liệu này triển khai hướng xử lý sau phép đo §23. Đích là giúp khách chọn và mua được bằng tin nhắn tự nhiên, đúng dữ kiện và bước mua shop làm được.

## 1. Bằng chứng và điều còn phải kiểm

[VOICE và OFFERS](../../apps/worker/evals/single-agent-commerce-qualification/sales-voice-run-20261115/REVIEW.md) chạy tại `3357270a`, 43 cặp, Gemini 3.5 Flash Lite High, chấm mù Sol 6.1 High.

| Vấn đề | Đã quan sát | Giả thuyết cần kiểm |
| --- | --- | --- |
| Rút hướng dẫn | Commit `31b436dc` bỏ chỉ dẫn trực tiếp về đọc lại hồ sơ và chuỗi tính từ. J2 sửa số đo từ 3/5 xuống 1/5 về giọng, size đúng 5/5 | Khôi phục nguyên tắc bị mất có giúp trên cùng đầu vào |
| Lịch sử | Cả năm input J2 có câu trước đọc lại chiều cao/cân nặng | Lịch sử đó khuyến khích câu sau đọc lại hồ sơ |
| Dữ liệu sản phẩm | Header S15/S08 có văn quảng cáo; đầu ra dùng lại nhiều cụm tương tự | Phần mô tả đó kéo cách nói và làm chìm dữ kiện mua hàng |
| Thương lượng | `SUPPORT_NOT_EVALUATED_MEANING` hướng dẫn khách phải hỏi lại sau khi có giỏ | Bỏ bước hỏi lại có thể dùng cơ chế provenance và command hiện có |

Các dữ kiện trên chưa tách được ảnh hưởng độc lập của từng nguyên nhân. Năm mẫu J4 hỏi tổng ở §23 cùng dùng đầu vào của lần 1. Native mới phải đi từ đầu từng hành trình để đo kết quả của lịch sử do chính bản đang thử sinh ra.

## 2. Phạm vi và cách làm

Một conversational owner và tối đa một semantic verifier. Dữ kiện, quyền, state, effect, receipt, privacy và send eligibility do code cấp và kiểm. Lời tư vấn, lựa chọn và diễn đạt do owner thực hiện. Verifier đánh giá protected semantics của exact final draft. Các giới hạn hiện hành 3 owner + 1 verifier / lượt, work và tool rounds được giữ trong mọi native attempt.

Làm W0 → W1/W2 → W3 → W4. Mỗi thay đổi có savepoint riêng và phép kiểm riêng. Gói kết hợp chỉ được xét sau các phép kiểm. Review kế hoạch ở lượt hiện tại, triển khai và chạy model thuộc các bước thực hiện sau.

## 3. W0 — khóa đầu vào và đường đi trước khi sửa

Ghi `implementationBaseSha`, hash prompt baseline/treatment, owner/verifier model/config, source snapshot/clock, policy, media, runner, script, thứ tự attempt, rubric và quy tắc tính mẫu số trong manifest trước provider request.

- Xuất inventory cho SV2447 và các offer đang dùng, SQ2447 nếu tham gia nguồn chung, V168, V039. Với từng field cần tư vấn ghi path nguồn, value, product/offer/component, source version/hash và trạng thái còn hiệu lực. Bao gồm chất liệu, kiểu dáng, lớp/lót, cách bán, giá, tồn, đặt trước, chart và media.
- Đánh dấu field cấu trúc và mô tả tự do. Ghi cụ thể chỗ dữ kiện chỉ tồn tại trong mô tả. Giá, tồn và đặt trước dùng claims hiện có, đúng offer/size/màu.
- Truy đường `sourceMessages → negotiationSources → record_negotiation → NEGOTIATION_EVENT → receipt → quote`. Đã kiểm ingress chỉ cấp messages của batch hiện tại. Domain ở `packages/chat-runtime/src/sales-cycle-runtime.ts` còn yêu cầu message không sớm hơn `cart.createdAt`. Hai ràng buộc này cùng phải được giải quyết trong W3.
- Lập bảng đối chiếu trường phục vụ người dùng trước/sau cho header, kết quả tool và nguồn đầy đủ. Liệt kê cả hạn chế, caveat, phủ định, unknown và claims chỉ nằm trong mô tả. Với field mất, sai nghĩa hoặc mất đường đọc thì chặn nhận projection.
- Kiểm source/media bằng clock thật trước native. Ca nguồn thiếu/hết hạn đi đúng control handoff và vẫn ở mẫu số đã đăng ký, giữ lý do chuẩn bị. Tái capture hoặc thay nguồn phải đăng ký run mới trước generation.

W0 đầu ra là inventory và sơ đồ code có đường dẫn, giúp W2/W3 có quyết định triển khai cụ thể. Phép đo giả thuyết chỉ dùng dữ liệu đã lưu ở clock cũ để nghiên cứu, không cấp quyền gửi hiện tại.

## 4. W1 — phục hồi nguyên tắc diễn đạt đã bị mất

Sửa mục Giọng chat trong `apps/worker/evals/single-agent-commerce-read-only/prompts/owner.vi.txt` từ baseline hiện tại, rồi cập nhật hash manifest bằng cơ chế hiện có.

- Viết rõ việc nhắc một dữ kiện khách chỉ có ích khi nó giải thích lựa chọn, làm rõ thay đổi hoặc xác nhận điều khách cần. Khi size đã tính vẫn như cũ, báo kết quả đó. Việc đọc lại toàn bộ hồ sơ chỉ để dẫn vào kết luận tạo lời thừa.
- Khôi phục yêu cầu dùng từ chat và bỏ chuỗi lời khen không giúp khách quyết. Nhận xét thẩm mỹ và cách phối vẫn được phép trong ranh giới owner đã duyệt.
- Giữ form báo giá mở đầu từ ads đúng phạm vi khách mới hỏi giá. S15 và tư vấn so sánh chỉ lấy phần giúp việc đang nói.
- Bỏ các dòng trùng tương ứng trong mục hiện có. Không thêm mục cho J2, S15, S08 hoặc câu trả lời mẫu. Không đặt giới hạn số câu, danh sách từ cấm hoặc điều kiện phát hiện văn phong bằng regex.

Người review nhận diff prompt, bảng nguyên tắc nào giữ/mất và số byte trước/sau. Không nhận thay đổi chỉ nhờ prompt ngắn hơn. Nếu chỉnh lần này vượt hai mục Giọng chat/Báo giá thì phải giải thích phụ thuộc và review lại scope.

## 5. W2 — trình bày dữ liệu để tư vấn mà giữ đủ căn cứ

Đường sửa là owner projection trong `gemini-inference.mjs` và Compact V2 hiện có. Nguồn gốc/trusted context/verifier vẫn dùng các record ban đầu. W2 kiểm tác dụng của cách sắp xếp, ưu tiên và bỏ lặp dữ liệu. Từ quảng cáo còn trong nguồn gốc, nên phép đo này chưa chứng minh tác dụng của việc loại chúng khỏi toàn bộ đầu vào.

- Dùng các trường cấu trúc sẵn có của sản phẩm để trình bày chất liệu/kiểu dáng và giới hạn đã ghi. Gắn cùng product/offer/component với tên, giá và tình trạng bán đã xác minh. Mỗi giá trị phải truy ngược đúng path nguồn.
- Khóa allowlist theo field/schema trong inventory W0. Field cấu trúc hiện có được trình bày phía trước, cùng identity/provenance. Code chỉ kiểm schema, equality và scope, không quyết định nội dung nào đủ cho một tình huống dựa trên câu khách.
- Giữ nguyên mô tả gốc và caveats trong cùng request bằng phần nguồn gốc riêng theo product/component/source hash. Việc chuyển mô tả từ header hoặc kết quả tool sang phần nguồn phải giữ nguyên bytes và có reference một nghĩa. Chỉ bỏ bản lặp khi cùng bytes, scope và source identity. Nếu không thể chứng minh tương đương thì giữ nguyên phần cũ. Không cắt đoạn theo từ khóa hoặc dùng parser tiếng Việt để tự chuyển lời quảng cáo thành fact.
- Phần nguồn gốc được chèn sau projection đúng một lần và được kiểm sau Compact V2. `read_product` với `offerTypes=[]` hoặc đường internal `detailsOnly` vẫn giữ full description, cả khi đi qua builder này. Test request thực chứng minh model nhận được đầy đủ nguồn ngay khi không còn tool round. Không đặt lời kỳ vọng hay rubric trong phần nguồn.
- W2 dùng structured fields đã có, có thể vắng field. Lượt triển khai này không bổ sung snapshot nội dung mới chỉ để làm đẹp arm W2. Nếu inventory cho thấy cần dataset enrichment để có tác dụng thì ghi thiếu đó và dừng nhánh để lập revision riêng. Khi có enrichment được duyệt, seal cùng nguồn mới cho cả hai arm trước đo, ghi rõ thay đổi dữ liệu. Không chuyển lời quảng cáo thành verified claim về độ kín, độ bền hoặc cảm giác mặc.
- Xử lý giá/đặt trước bằng representation hiện có và điều kiện binding của `owner-offer-terms.mjs`. Giữ trường hợp một màu sẵn, một màu đặt trước, khách đã được báo trạng thái, trạng thái thay đổi, proof thiếu/hết hạn.
- Mọi transform phải làm tại đường dựng request owner. Function call/response có chữ ký, claim IDs, bindings và biên nhận được bảo toàn theo contract. Harness kiểm phần được phép đổi cùng hash phần còn lại.

Acceptance offline gồm giữ đủ thông tin cần cho báo giá ads, fit, lựa chọn kín/thoáng, so sánh và giá/đặt trước. Thiếu field vẫn có đường đọc chính xác trong cùng giới hạn tool, không tự tạo handoff do projection che mất dữ kiện. W2 dùng được cho mọi sản phẩm có cùng schema, không phụ thuộc case ID hoặc mã sản phẩm.

## 6. W3 — nối yêu cầu hỗ trợ đang chờ với giỏ được tạo sau đó

Điểm sửa là `single-agent-commerce-owner-view.ts`, executor `single-agent-commerce-effects.ts`, ingress, adapter `gemini-inference.mjs` và extension hẹp trong contracts/chat-runtime cho yêu cầu hỗ trợ chưa đủ điều kiện xét. Giá, chính sách giảm và công thức quote giữ authority hiện hành. Đây là thay đổi contract có state/effect cần review implementation, không thể hoàn thành chỉ bằng câu dẫn tool.

- Thay ý “khách hỏi lại sau khi đã có giỏ” bằng trạng thái thật và điều kiện còn thiếu. Kết quả trả về cho owner nêu rõ hỗ trợ đã xét hay chưa, căn cứ đang thiếu và công cụ còn gọi được. Không giao model hứa giảm hoặc diễn giải UNKNOWN thành không được giảm.
- Khi model gọi `record_negotiation` trước giỏ, lưu một pending evidence ref có schema hẹp bằng đường state/commit hiện có. Bao gồm sourceMessageId và thời điểm gốc, scope page/conversation/customer, sales episode, product/offer được xác định, intent từ declaration của owner, source hash/version và trạng thái chưa xét. Target chưa duy nhất thì trả phần còn thiếu, không lưu một ref dùng cho mọi món. `record_negotiation` cần target rõ trong nhánh pre-cart, code kiểm target đã bound trong context. Lưu pending ref không cấp ưu đãi và không phải receipt thương lượng đã thành công.
- Code xác thực đúng câu của khách và target, giữ cả message gốc lẫn evidence ref. Provenance của text không tự chứng minh khách muốn mua. Việc tạo giỏ vẫn cần yêu cầu mua hợp lệ của khách và kiểm quyền hiện hành. Khi khách thực sự mua, bổ sung lựa chọn thiếu và giỏ được tạo, ref đủ điều kiện được nối vào đường event/quote hiện có, không bắt khách nhắn lại câu xin hỗ trợ.
- Extension domain chỉ nhận nhánh pending evidence đã commit, cùng product/offer/episode và chưa tiêu thụ. Command kích hoạt có pending ref, original message identity/time, cart creation receipt, expected cart/revision/policy và current authorization. Domain giữ kiểm `notBefore: cart.createdAt` cho event thông thường. Nhánh pending kiểm message gốc xảy ra trước ref/giỏ theo đúng thứ tự đã xác nhận, receipt tạo giỏ là mới và target khớp, rồi tạo event/receipt tại lần kích hoạt. Không sửa `observedAt` nguồn thành giờ mới và không bỏ kiểm thời gian toàn cục.
- Tái sử dụng command/receipt/idempotency hiện có ở nhánh apply negotiation. Key pending và key kích hoạt gắn source identity, target, episode, cart identity và loại command, source được consume một lần bằng CAS. Duplicate/redelivery đọc lại receipt, không tăng lần phản đối hoặc giảm lần nữa. Ghi riêng trạng thái pending/activated/invalidated và fail-closed khi commit/readback không rõ. Mỗi state write và activation tính vào work/batch/provider bounds hiện hành, không có side effect ẩn ngoài receipt.
- State cũ chưa có pending ref vẫn đọc được và đi nhánh negotiation thường. Thêm trường bằng schema tương thích, default rỗng, kiểm dữ liệu đã tạo trước thay đổi. Mọi ghi pending đi cùng revision/authority guard và readback của đường commit hiện có. Không dùng migration xóa/đổi dữ liệu cũ để hỗ trợ phép thử.
- Khi khách chỉ hỏi giá/hỗ trợ, giữ đường quote không cần giỏ. Không tạo giỏ chỉ để xét giá và không tự coi màu trả lời để hỏi thông tin là lệnh mua.
- Nguồn message phục vụ activation đọc qua ref đã commit và nguồn inbound đã xác thực, cùng page/conversation/customer. Không mở mọi historical message cho executor, không dùng assistant text hoặc free-form summary làm nguồn. Pending ref không giữ PII và không cấp thêm thời gian sống cho nguồn, episode hoặc giỏ.
- Khách đổi sản phẩm/offer, hủy mua, nguồn hết hiệu lực, quyền/revision đổi hoặc source ambiguous phải vô hiệu phần tái sử dụng tương ứng. Không chuyển yêu cầu hỗ trợ của món cũ sang món mới.
- Hết budget thì kết thúc theo quyền hiện hành, không tạo thêm continuation hoặc retry. Lưu trace cho biết đang thiếu dữ kiện, hết quyền hay hết lượt. Chỉ tính hoàn thành thương lượng khi nhận biên nhận và tổng hiện hành.

Regression RED→GREEN bắt buộc trong chat-runtime/contracts/worker gồm message trước cart bị từ chối ở event thường, pending đúng được kích hoạt sau giỏ, pending chưa commit/giả receipt bị chặn, source time bị đổi, target khác, stale/switch/cancel, chỉ hỏi giá, chỉ trả lời màu để hỏi thông tin, hai đơn vị so với một set, duplicate/redelivery/concurrent activation và lỗi commit/readback/budget. Ghi rõ schema và touched package ở revision implementation trước code review. Native J4 gốc vẫn giữ nguyên lời khách và đi đủ lượt.

## 7. W4 — đo từng thay đổi rồi đo hành trình thật

### 7.1. Kiểm code và nguồn trước model

Chạy focused tests cho owner view/effects/ingress, adapter Compact V2, replay, protected claims/reply assembly và final boundary; worker typecheck/build/lint. Chạy focused shared package checks nếu chạm package. RED→GREEN cho lỗi contract mới, giữ log thực tế.

Các control xác định phải chứng minh output nghiệp vụ, source identity, budget và chữ ký giữ hợp lệ. Bao gồm ads text+ảnh atomic, quote trước giỏ, size theo khoảng/max đã duyệt, đổi số đo rồi fit theo profile mới, thương lượng idempotent và checkout. Không dùng scripted model để nhận giọng/tư vấn PASS.

### 7.2. Replay chẩn đoán có kiểm soát

12 cặp, mỗi cặp 2 request owner và 1 judge, tổng tối đa 24 owner + 12 judge. Dùng ba đầu vào đầu tiên theo thứ tự đăng ký cũ của mỗi nhóm dưới đây, không chọn theo câu hay điểm cũ.

| Nhóm | Ba cặp | Phần duy nhất khác |
| --- | --- | --- |
| Khôi phục nguyên tắc | J2 sửa số đo | Prompt hiện hành ở 7cdd2e80 và prompt W1 |
| Trình bày dữ liệu | S15 | Cùng prompt W1, projection gốc và W2 |
| Trình bày dữ liệu | S08 | Cùng prompt W1, projection gốc và W2 |
| Đối chứng form mở đầu | Ads | Cùng prompt W1, projection gốc và W2, ba lần cùng input control đã đăng ký |

N=3 chỉ dùng để sàng lọc giả thuyết. W1 cần ít nhất 2/3 giọng đạt và thắng ròng dương trên J2. W2 cần dữ kiện thiết yếu 3/3 mỗi nhóm, giọng không thua ròng S15/S08 và đạt hành vi ads 3/3. Mọi material regression mới chặn gói. Cả hai qua mới ghép W1+W2 vào native. Nếu một nhánh không đạt thì ghi STOP, giữ kết quả cả hai, không chỉnh prompt rồi chạy lại cho tới may mắn.

### 7.3. Native từ lượt đầu

Đo ảnh hưởng lịch sử bằng cách để owner tự sinh các lượt trước. Không viết lại, rút gọn hoặc thay câu đã gửi trong lịch sử. Các arm dùng cùng dữ liệu, clock protocol, policy và model. Bản control là 7cdd2e80, candidate là W1+W2+W3. So sánh J2 cho biết tác dụng của cả gói trong hành trình, không quy riêng cho ảnh hưởng lịch sử.

- J2 chạy hai arm, mỗi arm 5 hành trình × 3 lượt = 30 lượt khách.
- S15, S08 và J4 chạy candidate, mỗi ca 5 hành trình, tổng (1+1+3)×5 = 25 lượt.
- S16 source-gap handoff im lặng chạy candidate 5 lượt.
- Bốn control/candidate cho cảm ơn thuần, đã báo đặt trước, hai đơn vị đủ ưu đãi, báo giá ads. Control hai đơn vị dùng 3 lượt để kiểm W3 từ đầu, ba control còn lại 1 lượt. Tổng native **34 attempt / 66 lượt**.
- Control hai đơn vị giữ sản phẩm có giá/tồn/màu đủ nguồn. Lượt 1 khách muốn mua hai áo và xin bớt nhưng chưa chọn màu. Lượt 2 khách chọn đúng màu còn thiếu. Lượt 3 khách hỏi tổng. Bộ lời thoại tự nhiên được khóa trước run. Trace phải có pending chưa grant, cart creation được khách cho phép, kích hoạt yêu cầu cũ một lần và tổng từ receipt mới. Nếu owner không đi qua đường đó thì ghi NOT_EXERCISED và không nhận W3 hoàn thành, không suy từ testcase scripted.
- Trần native 198 owner + 66 verifier + 24 judge = 288 generation. Judge J2 chấm mù theo cặp hành trình 5 packet, J4/S15/S08 mỗi ca 5 packet, bốn control 4 packet. Mỗi packet chứa toàn bộ lịch sử và actual terminal của attempt.
- Tổng tối đa toàn chiến dịch **222 owner + 66 verifier + 36 judge = 324 generation**. S16/control có thể kết thúc bằng code trước provider, accounting ghi thực tế. Không tăng số ca hoặc N sau khi thấy kết quả.

Sáu lượt đích ở §23 vẫn cần giọng/tư vấn ≥4/5 ở mỗi lượt. S08 báo đúng trạng thái liên quan việc mua 5/5. S15 đúng áo, J2 đúng size/hồ sơ mới, J4 đúng phạm vi hỗ trợ/tổng và S16 handoff im lặng cần 5/5. Bốn control giữ hành vi đúng. Mỗi ca bán hàng candidate cần ít nhất 4/5 hành trình hoàn thành; hard safety/state/effect/privacy/media failures bằng 0.

Đối chứng J2 cần candidate không thua ròng về cả hai lượt đích, có cải thiện giọng ở ít nhất một lượt, và không giảm hoàn thành. Các ca chỉ chạy candidate ghi theo ngưỡng tuyệt đối, không công bố thắng nhân quả so với lịch sử. Kết quả này là screening, chưa thay qualification hoặc C3 comparison.

### 7.4. Protocol và report

Giữ Gemini 3.5 Flash Lite High cho owner, GPT-6.1 Sol High cho verifier và judge offline độc lập theo cấu hình hiện hành. Trước dispatch kiểm lại manifest, đóng băng identity chính xác, prompt/schema/input/corpus hash, runSourceSha sau commit và clean executable/config tree. Provider API dùng adapter hiện có, mọi thay đổi API cần kiểm tài liệu chính thức.

Mỗi registered attempt theo policy transport hiện hành đã khóa, tổng 3 owner/1 verifier mỗi native turn đã tính mọi generation retry. Replay và judge một request/arm hoặc packet, không retry. Error/timeout/malformed/tool-call mới trong replay giữ mẫu số. Auth refresh tính riêng, không đổi model hoặc giấu request.

Judge đọc toàn hội thoại và kết quả terminal thật, chấm ý nghĩa và giá trị mua hàng. Nhắc một số đo hữu ích, ngoặc có mục đích, lời chào hoặc câu ngắn đều có thể đạt. Không chấm bằng số từ khóa hay số tính từ. Ghi giọng/tư vấn, đủ dữ kiện và an toàn riêng, ghi lý do cụ thể cho cả cặp hòa. FAIL/timeout/handoff/no-send được chấm theo kết quả khách thật sự nhận.

Case ID, arm, expected, rubric và lý do review ở evaluator-only. Test và captured-body audit kiểm cả owner và verifier. Report đăng đầy đủ mọi attempt, fail, missing, request/usage/latency/cost khi có, script thực chạy, provenance và nhận định còn chưa chứng minh. Handoff im lặng không có tin nhắn. Không tuyên bố ổn định hoặc Phase C GO chỉ từ lượt sàng lọc.

## 8. Savepoint và tiêu chí dừng

1. W0 inventory, baseline và protocol.
2. W1 nguyên tắc bị mất và W2 projection có evidence, mỗi phần một commit.
3. W3 đường thương lượng và focused regression, review implementation trước provider.
4. Seal replay, chạy một lần nếu được yêu cầu và đủ gate.
5. Seal native mới khi replay đạt, chạy trọn bộ đăng ký rồi review một lần.
6. Báo STOP khi thiếu nguồn chuẩn bị, sai contract, gate không đạt hoặc hết budget. Giữ kết quả và root cause, không tự mở vòng vá tiếp.

Nhánh PR392 nhận savepoint theo authorization hiện hành. Triển khai được duyệt bằng review code và tests. Chất lượng chỉ được nhận theo kết quả đã khóa trước run.

## 9. Commands kiểm triển khai dự kiến

Các lệnh sau là phần acceptance khi triển khai. Lượt lập kế hoạch chưa chạy những kiểm tra này.

```powershell
pnpm --filter @lana/worker exec vitest run src/single-agent-commerce-owner-view.test.ts src/single-agent-commerce-effects.test.ts src/single-agent-commerce-ingress.test.ts src/single-agent-commerce-read-only-context.test.ts src/single-agent-semantic-verifier-boundary.test.ts src/track-b-protected-claim-boundary.test.ts
node --test --test-concurrency=1 apps/worker/evals/single-agent-commerce-read-only/owner-data-compact.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-result-meaning.test.mjs apps/worker/evals/single-agent-commerce-read-only/owner-offer-terms.test.mjs apps/worker/evals/single-agent-commerce-qualification/sales-voice-replay.test.mjs apps/worker/evals/single-agent-commerce-qualification/native-wire.test.mjs apps/worker/evals/single-agent-commerce-qualification/bc-control.test.mjs
pnpm --filter @lana/business-tools exec vitest run src/protected-claims.test.ts src/reply-assembler.test.ts
pnpm --filter @lana/contracts exec vitest run src/v3/sales-cycle.test.ts
pnpm --filter @lana/contracts typecheck
pnpm --filter @lana/contracts build
pnpm --filter @lana/chat-runtime exec vitest run src/sales-cycle-runtime.test.ts src/sales-cycle-runtime-contract-mismatch.test.ts
pnpm --filter @lana/chat-runtime typecheck
pnpm --filter @lana/chat-runtime build
pnpm --filter @lana/worker typecheck
pnpm --filter @lana/worker build
pnpm --filter @lana/worker lint
git diff --check
```

Nếu W3 cần đổi shared contract/database package, thêm focused tests và typecheck/build của chính package trong revision implementation trước khi nhận code. Provider dispatch dùng đúng entrypoint/harness sau khi triển khai, đăng ký CLI thực tế và preflight đã chạy trong run report.
