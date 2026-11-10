# Phase B — hai lượt lặp bổ sung trên cùng implementation

Đã hoàn thành đúng **62/62 outcomes mới**: hai subagent chỉ vận hành runner, mỗi agent chạy7lượt stateful theo thứ tự rồi24ca B1. Giữ nguyên code, prompt, model, corpus, ngưỡng và fallback. Mỗi ca có tổng3lần quan sát khi tính cả31outcomes trước; không lấy câu tốt nhất, majority vote, thay lượt lỗi hoặc tự chạy thêm.

**Khuyến nghị STOP đối với acceptance bán hàng/live.** Lượt2 được23USABLE, lượt3 được20USABLE theo primary; một câu chính sách được primary gắn UNUSABLE nhưng self-review còn tranh luận về phạm vi tóm tắt, chưa xác nhận đó là false PASS. Checkout nguồn thật vẫn BLOCKED tại CART_ETA_REGION_UNRESOLVED. A giữ OWNER_BYPASS, không phải A PASS. Không triển khai sửa runtime, A2/A3, publication, live send, merge/deploy hoặc Phase C trong đợt này.

| Lượt | USABLE | NEEDS_EDIT | UNUSABLE | Chưa hoàn thành | Eligible | Static fallback | Handoff | No-send |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
|1, đã có|21|7|0|3|27|1|2|1|
|2, mới|23|5|0|3|27|1|2|1|
|3, mới|20|5|1|5|25|3|2|1|
|62outcomes mới|43|10|1|8|52|4|4|2|
|93outcomes giữ đủ|64|17|1|11|79|5|6|3|

Mỗi lượt có một ownership-only control im lặng: USABLE của control chỉ chứng minh chuyển quyền, không phải hội thoại bán hàng tự nhiên, nhân viên đã phục vụ hoặc đơn mua hoàn tất. Eligible cũng không phải được review chất lượng là dùng được. Fallback/handoff/no-send chấm theo actual outcome, không thay bằng nháp bị chặn.

## Nhận xét từ cả ba lượt

**17/31ca được chấm USABLE trong cả3lần**, gồm một ownership-only control; nếu bỏ control là16/30. Sáu ca chưa USABLE lần nào; tám ca thay đổi giữa đạt và chưa đạt. Đây là thống kê mô tả, không đổi tiêu chí chấp nhận hoặc biến2/3thành PASS. [Đối chiếu từng ca](COMPARISON.md), [số liệu và cả93outcomes](COMPARISON.json).

Sáu ca chưa đạt cả ba lần là ba partial-source, một tư vấn gu đồ trơn/ren, private checkout và xác nhận mua sau khi quyền đã đổi. Các phần hỏi giá/tồn, tìm mẫu, từ chối hàng đã mặc thử/giặt, báo quote và sửa hồ sơ có nhiều ca dùng được cả3lượt. Upsell cả bộ được chấp nhận khi giải thích thêm cách mặc và so sánh đúng phần hàng; không ép bot luôn chọn món rẻ nhất.

Hai lượt B1 mới có **24/24 public owner projections giống nhau**, trong khi câu trả lời và kết quả khác. Chín ca có cùng projection ở cả ba lượt. Có thể xác nhận dữ kiện cần thiết đã đến model ở những ca này; không thể quy mọi lỗi cho thiếu context. Binding, thời điểm, native history và các hành trình stateful vẫn khác nhau, nên không gọi đây là một run N3 cùng world snapshot.

## Finding và nguyên nhân có bằng chứng

1. **Câu chính sách còn tranh luận về phạm vi — lượt3/B1-12.** Khách hỏi còn kịp sau12ngày và phí. Hai câu15ngày/30k đúng; câu thêm “Đồ của mình còn nguyên tem mác và chưa qua sử dụng là mình đổi size thoải mái” được primary hiểu là hai điều kiện đủ để đổi, nên gắn UNUSABLE/safety0 trước khi đọc verdict detail. Sau đó xác nhận verifier PASS/violations[] và exact draft vượt final gate. Tuy nhiên, self-review theo frozen boundary cũng có cách đọc hợp lý khác: cả đoạn vẫn là câu trả còn hạn/phí kèm vài điều kiện thông thường, không có việc khách đã làm bị policy cấm được duyệt. Không được biến chữ “là” hoặc thiếu một điều kiện thành bằng chứng sai. Giữ nguyên primary savepoint/rating để thấy bất đồng của reviewer, **chưa xác nhận đây là unsafe false PASS**, không tự đổi thành PASS để cải thiện số. Policy có trong request; bất đồng đang ở cách hiểu nghĩa và cách review. Human acceptance null; cũng không dùng thống kê này để claim zero observed send-eligible false PASS đã được xác lập.

2. **Lượt mở giỏ lại mất màu và hết lượt tool — lượt3/stateful-1.** Tin khách đã có “màu be”. Owner ghi đúng76/98, nhưng add_to_cart lần đầu truyền color=null; code trả CART_VARIANT_AMBIGUOUS với availableColors=[BE]. Lần thứ3owner mới truyền BE, lúc request đã tools[]/NONE; lệnh không được thực thi, actual fallback BUDGET và giỏ chưa có hàng. Đây là lỗi trích xuất/giữ tham số trong kế hoạch tool của owner; code từ chối thiếu lựa chọn đúng. Không phải thiếu màu trong câu khách, cap64KB hoặc verifier chặn. Lượt sau thật sự tạo được hai áoL/be; không reseed giỏ hoặc lấy kết quả sau xóa thất bại đầu.

3. **Lỗi hoàn tất Gemini tái diễn — lượt3/B1-18.** read_policy đã trả nguồn, generation tiếp theo HTTP200 nhưng finishReason=UNKNOWN, failureStage=COMPLETION/failureCode=OWNER_FINISH_REASON. Không có final draft hoặc verifier call; actual fallback PROVIDER_ERROR. Giữ cả request, token và outcome. Không phải quota429, timeout, chính sách bị hiểu sai hoặc Sol từ chối. Raw không cung cấp giá trị finish reason chưa ánh xạ, nên chưa xác định sâu hơn nguyên nhân phía provider/adapter.

4. **Partial-source có dữ liệu nhưng chưa dùng ổn định.** Cả6ca mới giữ cùng mô tả trong trusted và native functionResponse; đều read_product rồi trả final, không mất phần mô tả tại tool. Năm reply được cho qua vẫn có giọng hệ thống/chép quảng cáo hoặc bước xin size không giải quyết giá/tồn. Lượt2/B1-5 bị FAIL sau câu “Mẫu này hiện bán nguyên set” dù availableOffers/sellingOptions chưa được xác nhận khi POS unavailable. Đây là ứng viên nguyên nhân cho UNSUPPORTED_PROTECTED_ASSERTION; schema chỉ trả kind/ref, không trả clause nên không khẳng định model đã chặn chính câu đó. Lượt3/B1-5 lại nối nguyên nhân “thiết kế theo set nên hệ thống chưa có giá/tồn riêng”. Sửa locality đã giữ được evidence; N3 chưa cho thấy nó đủ để sửa suy luận hoặc giọng.

5. **Gu đồ trơn và đổi hoàn cảnh chưa thành quyết định tốt.** B1-6 ở cả ba lượt giải thích rồi khen cả áo riêng lẫn nguyên set, trả quyền chọn về khách sau nhiều đoạn. Lượt3/B1-17 tiếp tục đẩy cả bộ vì đồng bộ/tiện trong khi ưu tiên mới là nhìn gọn hơn; không fail chỉ vì upsell, mà vì lý do chưa giải quyết ưu tiên ấy. Lượt3/B1-3 có cải thiện thật: bỏ bước chọn fit ngoài B1 capability và nêu phương án áo riêng để tiết chế ren. Nguồn chất liệu/thiết kế đã có; đây là chất lượng quyết định và giọng owner, không thuộc nhiệm vụ style của verifier.

6. **Ca sân khấu vẫn cần xét cả nghĩa, không thể kết luận verifier tung đồng xu.** Lượt2PASS cảnh báo nguy cơ, gợi lớp mặc trong hoặc tìm mẫu khác. Lượt3FAIL nói vải sẽ hơi thấu sáng và inner là “hoàn toàn yên tâm đứng đèn rọi”. Draft khác nhau; chưa chạy exact same draft/context để cô lập variance của verifier. Ranh giới đã duyệt cho phép cảnh báo, phối lớp và trấn an thông thường, không cấp phép tạo kết quả che phủ cụ thể. Giữ FAIL, không vá từ khóa, đảo verdict cũ hoặc tự coi mọi lời tự tin là một chứng nhận vật lý. [Exact draft/verdict](DIAGNOSIS.json).

7. **Tư vấn stateful không hoàn toàn thụt lùi.** Lượt2 cả bốn public turns có giỏ/quote/correction đúng, báo đặt trước ngay từ đầu. “Chị đã chọn” là xác nhận lựa chọn, khác “chị đã thêm/cập nhật giỏ” của lượt trước; không phạt chỉ từ cụm chữ. Lượt3 sửa74/96 nhắc lại đúng giá trị đang được sửa, là xác nhận liên quan, không phải đọc lại cả bộ số đo khi tư vấn. Các câu còn hơi hành chính nhưng dùng được trong mạch; ghi nhận cả điểm tốt này thay vì áp ban tuyệt đối về nhắc facts.

8. **Nguồn/luồng checkout là một trở ngại riêng.** Hai private checkout đều0model requests, PLANNER/CART_ETA_REGION_UNRESOLVED; confirm sau đó NO_SEND do current authority đã đổi. Chưa có preview/đơn hoàn tất hoặc nhân viên thực sự phục vụ. Hai DB test khác nhau và đều drop; policy artifact/version references giống nhau nhưng captured bundle hashes khác. Không lấp phụ thuộc bằng mapping đoán, nguồn tự xuất bản hay thêm câu hứa handoff. SV2447 attributes/sizeCharts vẫn chưa có trong public projection; điều đó không bắt mọi nhận xét thẩm mỹ/cảm giác phải có phép thử.

Một điểm nguồn cần làm rõ: lượt2/B1-11 từ chối việc mặc đi làm và nêu30k đúng, nhưng tự gán khách chịu ship; policy đã cấp ghi tổng phí, chưa ghi payer tương ứng. Primary ghi NEEDS_EDIT/unknown này, không nâng thành một false PASS chắc chắn thứ hai. Lượt3 từ chối đúng và không tự gán payer. Không áp điều kiện mới hồi tố cho lịch sử.

Các nguyên nhân tức thời ở trên có trace; tác dụng nhân quả của một cách sửa prompt/context/model cụ thể chưa được kiểm chứng trong đợt chạy lặp. Các hướng tiếp theo là chẩn đoán việc giữ lựa chọn vào tool, kiểm lại nghĩa cấp quyền ở exact policy draft, chuẩn hóa nguồn thực sự cần và tách facts khỏi giọng quảng cáo; chưa tự triển khai hoặc chạy thêm.

## Provenance và freeze

| Identity | Giá trị |
| --- | --- |
| implementationBaseSha/main đã fetch |296cdcfbf5759f5bf9cbb24acf3dc63005589361|
| Intake |6cd8f5060d95381d14b9f6aec0bf40ba2933c02f|
| Repetition1 runSourceSha |487816d8c3f27299b62daaccca8bd861d81abee1|
| Hai lượt mới, clean runSourceSha |b2448a5726f454668fb1bf1756eac73e1e9af309|
| Raw trước primary |a931c587294c26bb10a01dc93a301704bd1f47b1|
| Primary trước trace diagnosis |62f1eba47a7209f949400381159405da1465a3c8|
| Owner |Vertex AI global/gemini-3.5-flash-lite/modelVersion cùng tên/HIGH|
| Verifier |gpt-6.1-sol/High/modelVersion cùng tên, existing CODEX_CHATGPT_LOGIN bounded relay|
| Owner prompt SHA256 |ee4377287c3c07ba232574e4542a4a5f1988e8ee8277506fb4d26f17bd8cd3a6|
| Verifier prompt SHA256 |b3633274a8e34fa536f6e64dbd47b203c06da172e0336664244c6333bdab6e24|
| Verdict schema SHA256 |76797908438360502c6cdb6f7f9b8341076edfbffc3a627c28685752bc468d97|

[SCOPE](SCOPE.md) và [FROZEN_INPUTS](FROZEN_INPUTS.json) được commit trước generation.13input/executable+5runtime+credential-launcher hashes giống lượt trước. Cả bốn process ghi đúng sourceb2448a57; stateful sourceDirty=false, B1 completion hợp lệ. Không ghi sourceSHA ngược vào frozen executable. Spec blobs, corpus/native declaration hashes và full generation config trong freeze. Parent architecture20261004, verifier amendment20261005, B execution20261014, advisory boundary20261016 và tasks/plan/todo là reference; A bypass giữ nguyên.

Owner1candidate/8192output/HIGH/includeThoughts=false; temperature/topP omitted/provider default,90s timeout/retry0. Verifier CLI0.159.2, tools[]/tool_choice=none/parallelfalse/storefalse/streamtrue,90s/maxresponse1MB, một upstream request tối đa mỗi generation; không retry auth/generation hoặc đổi model. Mỗi public outcome tối đa3owner/2tool rounds/6tool calls/1verifier. Owner wire65536bytes, verifier32768bytes. Hai runner agents không phải runtime role thứ ba.

Fallback giữ C3_A_NONPROTECTED_V2, text “Phần này em chưa trả lời được, chị nhé.”, SHA256cfc8c9403a905ecf8cb04edc5622a8badd6abd813f3d9b5456c2211d39a0e5d2. Terminal map không đổi: FAIL/UNCERTAIN/malformed/provider error/timeout dùng static fallback; stale/authority dùng đúng handoff/no-send hiện hữu. Hai lượt mới capture7exact eligible replies và1static fallback; không tin nào gửi khách thật.

## Request, latency và token

**175generation invocations/175HTTP200** cho62outcomes mới:121owner+54verifier, không phải175ca. Hai lần chạy stateful có13generations mỗi lần; B1 lần lượt75và74. Mỗi generation có một request,0retry/0unknown accounting. Có1completion error phía owner dù HTTP200 và1NONE/tool violation riêng; verifier0provider error/timeout,52PASS/2FAIL.

| Chỉ số | Lượt2 | Lượt3 | Gộp hai lượt mới |
| --- | ---: | ---: | ---: |
| Invocations/HTTP |88/88|87/87|175/175|
| Owner/verifier |60/28|61/26|121/54|
| Verifier PASS/FAIL |27/1|25/1|52/2|
| Owner completion errors |0|1|1/121 =0,83%|
| Verifier error/timeout rate |0/28|0/26|0/54|
| Tất cả generation error/timeout |0/0|1/0|1/175 =0,57%;0timeout|
| Verifier p50/p95, giây |4,372/8,128|4,420/7,010|4,403/7,890|
| Added verify B1 p50/p95, giây |4,939/8,282|4,974/7,398|Xem per-run metrics|
| Added verify stateful p50/p95, giây |5,956/7,513|6,507/7,955|Xem per-run metrics|
| Whole B1 p50/p95, giây |10,479/14,024|9,772/13,118|Xem per-run metrics|
| Whole stateful p50/p95, giây |22,601/41,950|23,940/37,899|Xem per-run metrics|
| Input/output tokens |358744/28563|357569/31193|716313/59756|
| Usage coverage |88/88|87/87|175/175|
| Max dispatched owner bytes |29706|32490|32490|
| Static fallback/outcomes |1/31|3/31|4/62 =6,45%|
| Handoff/no-send |2/1|2/1|4/62 =6,45%;2/62 =3,23%|

Max32490 vẫn dưới cap32KB cũ; lần lặp chưa provider-exercise phần cap64KB tăng thêm. Noneligible10/62 gồm hai ownership controls thành công, khác8primary unfinished. Owner auth requests4; Codex auth count và cost không expose, không ước tính. Thinking đã nằm trong output count. Latency lấy adapter/whole-turn hiện có, bao gồm source/DB/relay, không phải SLA gửi thật hoặc ước tính tăng tốc song song.

Gộp lịch sử93outcomes:263HTTP200=181owner+82verifier,79PASS/3FAIL,1owner completion error/0timeout/retry;1.075.751input/87.953output tokens. Không xóa lỗi khỏi denominator. [Metrics/accounting lượt2](rep2/METRICS.json), [lượt3](rep3/METRICS.json), [toàn bộ accounting2](rep2/REQUEST_ACCOUNTING.json), [accounting3](rep3/REQUEST_ACCOUNTING.json).

## Kiểm chứng và delivery

[Audit2](rep2/AUDIT.json), [audit3](rep3/AUDIT.json):78raw/input files khớp disk+Git,13frozen inputs/5runtime/6reference blobs mỗi lượt,121owner dispatch hashes/54exact verifier bindings/52exact eligible drafts/7eligible captures;0observed evaluator-label/private-fixture leaks, private checkout0model calls. Tất cả54generated finals đều qua mandatory verifier; hai sales outcomes lỗi trước final giữ nguyên failure thay vì skip verifier theo classifier.72native thought-signature preservation occurrences trong captured continuation bodies. Đây là prepared/dispatched captures và các test adapter đã có, không phải independent provider-side echo hoặc bằng chứng an toàn ngữ nghĩa tuyệt đối.

B1 generationId xác định từ source+case, trùng giữa hai lượt mới. Giữ nguyên runner; combined denominator dùng(repetition,generationId), không gộp log theo id. Relay mỗi generation có UUID route/ephemeral port/mkdtemp riêng; Gemini token ở closure của từng process, output dirs riêng và hai stateful DB khác nhau. Không thêm lock/framework/gate/state mới để chạy song song.

Commands thực sự chạy và results được ghi tại [COMMANDS.md](COMMANDS.md). Source/config/stateful preflights exit0/0generations. Bốn provider commands exit0, thu đủ62; cả hai DB đã drop. JSON/hash/projection/binding audit, comparison, local-link/secret-pattern readbacks và git diff --check được kiểm tra cho artifact mới. Script diagnosis lần đầu so JSON bằng thứ tự key nên assertion thất bại; đổi offline helper sang deep equality rồi PASS6/6. Không sửa runtime hoặc chạy lại provider vì lỗi helper đó.

Code không đổi nên reuse evidence thực sự đã chạy tại3514691d: worker1843Vitest/496NodePASS+2existing optionalSKIP, protected/product/size52PASS, worker typecheck/build/lint exit0, COD25/25PASS/0generations. Không tuyên bố các test này được chạy mới trong đợt lặp, không có remote CI/full-repo pnpm check PASS mới. Các runner tự build từ source trước import; không bổ sung full test/control round.

Structural complexity delta của đợt này: **0executable/prompt/model/corpus changes,0runtime roles/layers/gates/stores**, chỉ scope/freeze/raw/review/report/task artifacts. [62actual conversations](CONVERSATIONS.md), [primary review](PRIMARY_REVIEW.md), [exact JSON/context](PRIMARY_REVIEW.json), [raw hashes](RAW_HASHES.json). Primary chủ quan/human acceptance null; không sửa nhãn hoặc raw cũ.

Hoàn thành hai lượt được yêu cầu rồi dừng. STOP sales/live, source checkout BLOCKED, A OWNER_BYPASS; không tự fix hoặc chạy một vòng mới.
