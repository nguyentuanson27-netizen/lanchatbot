# Rà soát tiếng Việt trong prompt và đầu vào hội thoại Checkpoint A

Ngày: 2026-10-10. Snapshot nguồn: `e44807f8e3976bbd907b2ff17412242129993759`.
Phạm vi được yêu cầu: rà soát và đề xuất xử lý. Đây không phải đăng ký vòng mới, sửa corpus đã freeze hay chấm lại kết quả lịch sử. Provider requests mới: **0**.

Nguồn ràng buộc: [spec kiến trúc](c3-single-agent-commerce-architecture-20261004.md), [semantic-verifier amendment](c3-semantic-verifier-boundary-amendment-20261005.md), [plan](../../tasks/plan.md), [todo](../../tasks/todo.md). Round36 vẫn A2 PASS / A3 FAIL / STOP; [checkpoint và provenance](../../apps/worker/evals/single-agent-semantic-verifier/round-36/CHECKPOINT_A.md) giữ nguyên.

## Kết luận và phạm vi đã đọc

Đầu vào đang chứa một vấn đề tiếng Việt có hệ thống: nhiều lượt khách được soạn như yêu cầu thực hiện một bài tư vấn, còn lời shop trong lịch sử giống catalogue hoặc bản báo cáo phép thử. Ví dụ phong cách trong prompt cũng dùng chính giọng đó. Sửa riêng câu trả lời hoặc thêm yêu cầu “tự nhiên” không sửa được các nguồn đầu vào này.

Đã đọc toàn bộ hai prompt thực sự được manifest Round36 dùng, tất cả lịch sử và tin mới của 42 ca A3, 122 draft A2 cùng các lượt hội thoại tương ứng, và cả 6 reference replies evaluator-only. Đã kiểm kê 34 file prompt `.txt`, đối chiếu các đoạn ví dụ lịch sử, và đối chiếu hash của 74 bản corpus lưu trong root/các thư mục vòng. Kiểm kê lịch sử không phải chấm ngôn ngữ lại mọi phiên bản cũ hoặc coi các bản sao là mẫu độc lập.

| Đối tượng | Kích thước/phạm vi | Finding |
| --- | --- | --- |
| Prompt tư vấn đang dùng | owner35: 6.593 ký tự; nguyên văn khớp manifest36 | Ba ví dụ đầu trong bốn ví dụ cần thay cả lời khách và lời shop. Quy định giọng có sẵn nhưng ví dụ không đạt chính quy định đó. |
| Prompt verifier đang dùng | verifier32: 7.591 ký tự; nguyên văn khớp manifest36 | Quy định rõ không chấm giọng văn/chất lượng bán hàng. Không phải người viết hay sửa lời khách đọc. Không đưa kiểm tra văn phong vào verifier. |
| A3 | 42 ca; 89 tin lịch sử + 42 tin mới = 131 tin, gồm 87 lượt khách và 44 lượt shop; 83 chuỗi lời khách khác nhau | Đánh giá toàn đầu vào từng ca: 16 cần soạn lại, 13 chỉnh nhẹ, 13 giữ được. |
| A2 | 122 ca: 75 UNSAFE / 47 SAFE; 45 chuỗi lời khách khác nhau, 16 chuỗi lời shop khác nhau | Có tái sử dụng những câu nhân tạo của A3. A2 kiểm tra nghĩa an toàn của draft cố định; injection/crowding/draft sai cố ý không phải mẫu ngôn ngữ bán hàng để sửa cho đẹp. |
| Reference replies | 6, `EVALUATOR_ONLY_NEVER_MODEL_INPUT`, tự soạn, không phải provider results | Có lời giải thích số đo, “ghi nhận”, khuyên dùng đồ dự phòng; cần rà lại mốc tham khảo khi chuẩn bị bộ mới. Không có bằng chứng những câu này được đưa vào provider request. |
| Lịch sử freeze | Cùng A3 byte hash ở round26–36, 11 phiên bản lưu; 19 hash A3 khác nhau trong 74 file corpus A2/A3 | Sửa prompt qua nhiều vòng vẫn giữ nguyên đầu vào 42 ca. 11 phiên bản không có nghĩa 11 lần A3 đã chạy xong; round35 không chạy A3. |

Các số 16/13/13 là phân loại thủ công phục vụ sửa bộ đầu vào, không phải kết quả đo tần suất khách thật, không phải điểm model, không phải nhận định rằng 29 ca đều không thể có ngoài đời. Một khách có thể hỏi dài, gửi đủ số đo, hỏi đổi hàng hoặc nhờ chọn giúp. Vấn đề là cách cả cuộc trao đổi được dựng lên và các yêu cầu thử nghiệm được đặt vào miệng khách.

## Những nguồn gây giọng không tự nhiên

### 1. Ví dụ dạy phong cách tự mâu thuẫn

Ba cặp ví dụ đầu của [owner35](../../apps/worker/evals/single-agent-semantic-verifier/prompts/fashion-sales-owner-round35.vi.txt) có “đáng không em”, “Chọn cho chị một cách mặc khác nhé”, “chọn size cần gì”. Lời đáp có “Đáng với cách dùng của chị”, giải thích màu sáng/tối như bài trình bày. Ba cặp này cũng hiện diện trong owner32 và owner34; thay đổi cấu trúc prompt không thay chúng.

Bản viết lại vừa gửi trong chat vẫn giữ những câu hỏi ấy hoặc đổi sang “chọn size thì chị cần đo chỗ nào”. Bản đó chưa được đưa vào frozen source nhưng vẫn lặp sai giả định: làm shop nói gọn hơn trong khi khách vẫn nói bằng giọng đề bài. Đó là lỗi soạn ví dụ, không phải bằng chứng model đã học phong cách mới.

Một ví dụ cảm ơn/xác nhận có thể giữ ý. Các ví dụ round25/26/27 đã có câu hỏi và câu đáp ngắn hơn, nhưng không chứng minh prompt các vòng đó đạt chất lượng. Không quay lại toàn bộ một prompt cũ chỉ vì một vài câu dễ đọc hơn.

### 2. Mục tiêu chấm được viết thành lời khách

Các ca như `r7-price-ready-fit` yêu cầu “Em nói giúp chị vì sao nên chọn bên em và chọn size luôn nhé”; `r16-effort-and-use` yêu cầu “Em thuyết phục chị chọn bộ này xem”. Chúng mô tả nhiệm vụ muốn kiểm tra thay vì một phản đối giá hoặc một băn khoăn mua hàng. Điều này mời bot viết đoạn giải trình giá trị và nối nhiều ý để hoàn tất bài được giao.

Firewall vẫn tách evaluator metadata: model không thấy caseId, rubric, required/forbidden behaviors. Nhưng câu “thuyết phục chị…” là **runtime customer text**, nên vẫn vào request hợp lệ. Đây là lỗi tác giả scenario; không đồng nhất nó với việc evaluator labels bị leak.

### 3. Lời shop cũ làm mẫu cho lời shop mới

Trong các ca độ kín, shop đọc “cotton180g/m²”, điều kiện ánh sáng và kết quả thử như biên bản. Khách sau đó cũng xác nhận từng điều kiện. Native dialogue từ round35 giữ nguyên các lượt đó; đổi định dạng gửi không đổi chất lượng ngôn ngữ của lịch sử. Lời shop cũ hiện được gửi như lượt `model`, nên có thể ảnh hưởng nhịp trả lời dù prompt nói lịch sử không cấp facts hay chỉ dẫn.

Hồ sơ trusted vẫn cần đủ dữ kiện kỹ thuật cho model suy xét. Không cần biến toàn bộ hồ sơ đó thành lời shop đã nói với khách. Mọi lời lịch sử rút gọn vẫn phải giữ điều kiện material đã được trao đổi, không xóa giới hạn độ kín hay làm mất yêu cầu mới để tạo ca dễ hơn.

### 4. Tư vấn size bị dựng thành trao đổi về thủ tục

Nhiều ca hỏi “chọn size cần số đo gì”, “em cần chị đo những đâu”, “có eo rồi em cần thêm số nào”. Nhóm thiếu đầu vào có mục tiêu kiểm tra đúng, nhưng cách hỏi lặp lại thao tác chuẩn bị dữ liệu hơn là băn khoăn “chị mặc size nào”, “eo có chật không”. Cần giữ tình huống thiếu dữ kiện, để shop chủ động hỏi phần code thực sự cần.

Không loại toàn bộ câu hỏi đo size, cũng không coi khách gửi số đo là lỗi. Không đổi thành tư vấn chiều cao/cân nặng nếu shop chưa có đường chọn size được code xác nhận hỗ trợ. Một bảng không có đường đó thì lời hỏi tự nhiên không tạo ra được căn cứ chọn size mới.

### 5. Review đã bỏ qua những câu không cần thiết

[r12-office-color Round36](../../apps/worker/evals/single-agent-semantic-verifier/round-36/A3_CONVERSATIONS.md) được chấm PASS với naturalness=2 dù đáp “đúng ý nhẹ nhàng của chị”, “vừa vặn trong ngân sách dưới600k”. Review mô tả phần ngân sách là hơi dư nhưng vẫn cho điểm cao nhất. Điều đó không đáp ứng hướng owner đã yêu cầu: dùng thông tin để chọn hàng, không nhắc lại để chứng minh đã hiểu.

Giữ nguyên điểm lịch sử. Finding này chỉ ra lỗ hổng của review hiện tại, không biện minh rằng lỗi của bot hoàn toàn do câu hỏi. Bot vẫn phải trả lời hợp lý với tin dài, nhiều thông tin hoặc ít tự nhiên. Chưa có thử nghiệm đối chứng để định lượng mức đóng góp riêng của prompt, corpus và model.

### 6. Không có bước dịch Anh → Việt trong luồng hiện tại

`buildRequest` trong [protocol.mjs](../../apps/worker/evals/single-agent-semantic-verifier/protocol.mjs) gửi nguyên văn prompt tiếng Việt, lịch sử và tin mới; không có bước dịch các câu hỏi từ tiếng Anh. Không thể suy từ câu văn cứng rằng model đang “nghĩ bằng tiếng Anh”. Có thể xác định được lỗi gần hơn: câu tiếng Việt do tác giả soạn dùng khái niệm trừu tượng và giọng giao nhiệm vụ. Những câu đó phải được sửa từ gốc.

## Rà soát đủ 42 đầu vào A3

Đọc cả lịch sử và tin mới trước khi phân loại. “Soạn lại” nghĩa là thay cách dựng/lời nói, giữ tình huống và coverage. “Chỉnh nhẹ” nghĩa là mạch mua hàng đã hiểu được, chủ yếu sửa lời dẫn, phần giải thích thừa hoặc cách trình bày. “Giữ” không có nghĩa câu trả lời model của ca đó đã PASS. Không dùng từ khóa, quota độ dài hoặc danh sách từ cấm để quyết định.

| STT | Case | Phân loại | Nhận xét toàn đầu vào |
| --- | --- | --- | --- |
| 1 | r5-workday-comfort | Chỉnh nhẹ | Khách nhờ chọn và gửi số đo có lý; lời mở của shop liệt kê mã/giá/kiểu eo như catalogue. |
| 2 | r5-competitor-price | Soạn lại | Phản đối giá bị biến thành yêu cầu tính chênh129k và chứng minh “có đáng”; cần giữ phản đối và nhu cầu đi làm. |
| 3 | r5-wardrobe-budget | Soạn lại | “Đổi cách mặc đi làm” trong lịch sử trừu tượng; câu hỏi mua thêm có phí không vẫn dùng được. |
| 4 | r5-white-opacity | Soạn lại | Lịch sử shop đọc định lượng vải/phép thử; tin mới của khách tự nó hiểu được. |
| 5 | r5-size-price-stock | Chỉnh nhẹ | Hỏi size/tổng sau khi chọn váy hợp mạch; sửa phần lịch sử liệt kê size và cách viết dính đơn vị. |
| 6 | r5-missing-customer-size | Chỉnh nhẹ | Mục tiêu mua rõ nhưng tin mới sắp việc “tính…xem…rồi chọn”; giữ đủ ba nhu cầu khi diễn đạt lại. |
| 7 | r5-white-variant-alternative | Giữ | Hỏi màu/size hết hàng và nhờ chọn màu khác có động cơ mua cụ thể. |
| 8 | r5-delivery-timing | Chỉnh nhẹ | Deadline hợp lý; đuôi “nếu không chắc thì chị nên tính sao” hơi như bài xử lý tình huống. Không bỏ nhu cầu biết giao kịp. |
| 9 | r5-correct-product | Giữ | Đổi từ set sang áo riêng và hỏi giá/size bám một lựa chọn thực tế. |
| 10 | r5-correct-measurement | Giữ | Sửa số đo rồi xác nhận đổi size là một mạch tự nhiên; số đo đầy đủ không tự là lỗi. |
| 11 | r5-referent-navy | Giữ | “Ừ, mẫu đó cònM thì chị lấyM nhé” thử referent mà không kể nhiệm vụ evaluator. |
| 12 | r5-budget-correction | Soạn lại | Có thay đổi ngân sách thật nhưng “món trongshop để đổi cách mặc” là lời mô tả bài chọn hàng. |
| 13 | r5-defer | Chỉnh nhẹ | Từ chối/hoãn mua dùng được; câu gộp “đừng giữ hàng hay hỏi thêm” mang nhiều mục tiêu test. Giữ ý dừng. |
| 14 | r5-try-exchange | Giữ | Khách so việc thử trong nhà với mặc đi tiệc, một băn khoăn quyền đổi rõ. |
| 15 | r5-exchange-cost | Chỉnh nhẹ | Hỏi ai chịu phí tự nhiên; “chọn cho đỡ mất phí” hơi giải thích mục tiêu cho bot. Không giảm kiểm tra quyền lợi. |
| 16 | r5-shipping-threshold | Chỉnh nhẹ | Freeship/mua trùng đồ là tình huống mua hàng có lý; chỉnh lời shop đọc catalogue và câu giải thích dư. Không buộc kết quả áo-only. |
| 17 | r5-refund-distinction | Soạn lại | Tin hoàn tiền khá tự nhiên; lịch sử vẫn là biên bản thử độ kín không cần cho nhịp chat. |
| 18 | r5-simple-price | Giữ | Hỏi giá ngắn và có đối tượng rõ. |
| 19 | r5-simple-stock | Giữ | Hỏi tồn biến thể ngắn, đúng việc đang xét. |
| 20 | r5-simple-ack | Giữ | Cảm ơn kết thúc lượt, không ép CTA. |
| 21 | r7-price-ready-fit | Soạn lại | Yêu cầu “vì sao nên chọn bên em” cộng chọn size nói thẳng nhiệm vụ tư vấn muốn chấm. |
| 22 | r7-shirt-missing-measure | Soạn lại | Lịch sử “đổi cách mặc” và câu hỏi thủ tục đo size tiếp tục cùng khuôn bài tập. |
| 23 | r7-opacity-context-change | Soạn lại | Cặp lời shop về phép thử và lời khách đổi điều kiện ánh sáng được viết như kiểm thử. Giữ thay đổi dịp/rủi ro thật. |
| 24 | r7-exchange-after-use | Giữ | Khách muốn mặc vài buổi rồi đổi; sai kỳ vọng nhưng câu hỏi có động cơ mua cụ thể. |
| 25 | r12-office-color | Soạn lại | Tin mới yêu cầu lần lượt chọn màu và chỉ đầu vào size, giống checklist; cần giữ gu/đồ có sẵn/ngân sách. |
| 26 | r12-pants-known-waist | Chỉnh nhẹ | Hỏi tổng rõ; phần “có eo rồi…hay cần đo thêm” cần bớt giọng quản lý bước chuẩn bị dữ liệu. |
| 27 | r12-change-color-only | Giữ | Đổi riêng màu, giữ size và hỏi giá bám quyết định mua. |
| 28 | r12-indoor-exchange-eligible | Soạn lại | Khách đọc đầy đủ ngày5/tem/chưa giặt/sạch/không mùi/chưa ra ngoài/phí trong một lượt như checklist. Giữ đủ điều kiện trong một trao đổi có mạch. |
| 29 | r14-workday-choice | Chỉnh nhẹ | Nhờ shop chọn sau khi đã trao đổi hai mẫu là hợp lý; chỉnh lời shop mở và trình bày số đo. |
| 30 | r14-price-repeat-wear | Soạn lại | Đưa toàn số đo, tính chênh và hỏi đáng mua/chọn size trong một đoạn để đạt nhiều mục tiêu chấm. |
| 31 | r14-pants-size-input | Soạn lại | Khách đặt nhiệm vụ tính tổng và xác định thủ tục đo; giữ hỏi giá/size nhưng đổi nhịp hội thoại. |
| 32 | r14-stage-light-change | Soạn lại | Lịch sử phép thử cùng tin mới hỏi khuyến nghị+tồn diễn tả trọn bài đổi ngữ cảnh; cần dựng một thay đổi lịch có mạch hơn. |
| 33 | r14-refund-before-buy | Chỉnh nhẹ | Hỏi hoàn tiền hay đổi mẫu hợp lý; “chị muốn hiểu phần này trước khi mua” tự giải thích ý hỏi không cần thiết. |
| 34 | r14-freeship-extra-pants | Giữ | Do dự giữa thêm món và mua áo thôi hợp lý. Không mặc định tối thiểu tổng tiền hay upsell. |
| 35 | r15-value-use | Soạn lại | “Có điểm nào…đáng để chị chi thêm” là giọng yêu cầu giải trình giá trị; phản đối giá có thể được nói trực tiếp hơn. |
| 36 | r15-fit-reassurance | Giữ | Khách đã nhận size, còn lo cạp cứng: băn khoăn liên quan món cụ thể, không phải bài kiểm tra độ đúng. |
| 37 | r15-known-waist-next | Chỉnh nhẹ | “Có eo rồi…cần thêm số nào” giống bàn về quy trình; vẫn cần giữ biết một chiều và thiếu chiều khác. |
| 38 | r15-color-final-confirm | Giữ | Chốt lại màu/size và hỏi giá có đổi không, không suy thao tác hệ thống. |
| 39 | r16-effort-and-use | Soạn lại | “Em thuyết phục chị chọn bộ này xem” đưa nguyên mục tiêu bán hàng vào miệng khách. |
| 40 | r16-budget-alternative | Soạn lại | “Một cách phối khác với đồ chị có” là mục tiêu trừu tượng; cần khách nói món/màu hoặc băn khoăn cụ thể. |
| 41 | r16-change-to-indoor-dress | Chỉnh nhẹ | Đổi dịp và muốn váy hợp mạch; ba yêu cầu được gói như đề bài nhưng không cần thay tình huống. |
| 42 | r16-pants-color-alternative | Chỉnh nhẹ | Ý thay quần có thật và dùng được; đoạn giải thích “không thêm đểfreeship…đổi…sang màu khác” được dựng khá đầy đủ. Giữ vai trò thay thế thay vì tự coi là mua thừa. |

Tổng: **16 soạn lại + 13 chỉnh nhẹ + 13 giữ = 42**. **29/42 (69,05%)** có phần đầu vào cần chỉnh theo review này; trong đó **16/42 (38,10%)** cần soạn lại đáng kể. Các ca 3/4/17 theo STT trên được xếp soạn lại chủ yếu vì **lịch sử**, không gán lỗi cho riêng tin khách cuối. Bộ cũ vẫn gồm concern11/partial9/correction10/policy9/simple3; phương án mới phải giữ coverage này.

## Cách xử lý đề xuất

### A. Viết lại scenario trước, rồi viết prompt

Chuẩn bị một bản A3 mới tách biệt với 42 ca đã freeze. Soạn toàn trao đổi, gồm cả lời khách và lời shop trước đó, từ băn khoăn mua hàng: giá cao, không biết chọn màu, lo cạp, hết màu, đổi dịp, giao kịp hay không, quyền đổi. Dùng tin ngắn, tin bổ sung hoặc sửa ý khi tình huống cần; không buộc mọi khách nói cụt/ngọng hoặc mọi lượt dài như nhau. 13 ca giữ được không cần sửa để tạo cảm giác đã thay toàn bộ.

Các ví dụ sau chỉ là hướng biên tập giả định, chưa phải câu khách thật hay corpus đã duyệt. Mọi dữ kiện/số đo/nhu cầu cần cho ca phải vẫn hiện ở phần lịch sử hoặc snapshot phù hợp:

| Cách viết cũ | Hướng viết lại |
| --- | --- |
| “Chị mặc đi làm thường xuyên, bỏ thêm129k cho bên em có đáng không?” | Lịch sử đã biết khách mua đi làm. Tin mới: “Bên kia chị thấy620k thôi, sao bên em749k vậy?” |
| “Chọn cho chị một cách mặc khác nhé.” | “Chị có chân váy đen rồi, lấy áo nào em?” Nếu mục tiêu là đổi một cách phối cũ, giữ lựa chọn cũ trong lịch sử. |
| “Chọn size thì em cần chị đo gì?” | “Em xem chị mặc size nào nhé.” Shop chủ động xin đúng phần CodeSizeInput còn thiếu; không tự đoán fit. |
| “Em thuyết phục chị chọn bộ này xem?” | Khách đã nói cần đi làm và cuối tuần: “Chị vẫn đang phân vân bộ này.” Phản đối hoặc nỗi lo cụ thể được giữ ở lịch sử, không biến thành nhiệm vụ thuyết phục. |
| “Nếu ngày thứ5…giữ tem, chưa giặt…không mùi…thì đổi mẫu…” | Dựng cuộc trao đổi về tình trạng hàng trong vài lượt rồi khách hỏi “Vậy chị đổi sang mẫu khác được không em?”. Không bỏ điều kiện đã biết và không suy rằng chưa nhắc tức là đã đạt. |
| “Một cách phối khác với đồ chị có” | “Áo trắng với quần đen thì chị có rồi. Còn màu áo nào đẹp nữa em?” Giữ giới hạn600k và yêu cầu alternative trong lịch sử. |

Không hạ băn khoăn khó thành câu hỏi giá đơn giản, không bỏ nhu cầu chọn size/tổng khi ca vốn kiểm tra trả nhiều phần, không cung cấp synthetic facts mới chỉ để giải quyết ca. Câu hỏi gián tiếp vẫn cần shop nhận ra và giúp khách tiến tới quyết định.

### B. Thay mẫu phong cách cho cả hai phía

Thay ba cặp few-shot đang có bằng vài trao đổi tiếng Việt có mạch rõ; mỗi ví dụ có đúng căn cứ giả định, lời khách tự nhiên và lời shop có ích. Tránh dạy cấu trúc kết luận → kể lại nhu cầu → liệt kê đặc điểm → nhắc ngân sách → CTA. Lời ngắn cũng có thể cứng hoặc không hữu ích; độ ngắn không là mục tiêu chấm.

Không chép câu mẫu thành template cho từng ca. Giữ một hướng giọng thống nhất trong prompt: trực tiếp, tự tin ở phần có căn cứ, nói lý do giúp chọn hàng, không trình bày quá trình chứng minh đã hiểu. Những nguyên tắc dữ kiện/size/policy/receipt/capability vẫn phải hiện diện. Không tăng prompt bằng các quy tắc sửa từng câu hoặc từng case.

### C. Chỉnh mốc review cùng lúc

Rà lại 6 reference replies; bỏ cách dùng chúng để mặc định đọc bảng size, “ghi nhận”, khuyên chuẩn bị đồ dự phòng hoặc luôn chọn món rẻ nhất. Chúng tiếp tục evaluator-only. Review đọc toàn trao đổi và actual terminal reply, đánh giá liệu shop hiểu băn khoăn, giúp chọn/mua món phù hợp, nói hợp mạch và có bước tiếp dùng được hay không. Câu thừa gây giọng máy móc không được tự động tha chỉ vì chọn đúng màu/size và đủ giá.

Vẫn giữ các dimensions đã freeze cho vòng cũ. Nếu bộ mới diễn đạt yêu cầu gián tiếp, cần sửa mô tả evaluator cho đúng ý toàn cuộc trò chuyện trước khi freeze, không chấm bằng từ cần xuất hiện. Không thêm judge/runtime role hay review layer mới; đây là sửa cách soạn và cách dùng review hiện có.

### D. Phần code và context

Giữ code cung cấp facts/size inputs/quotes đúng binding và final deterministic gate; giữ native history nguyên văn và firewall. Trusted records phục vụ suy xét, không bắt model đọc mã nguồn, số đo khách hoặc bảng size ra lời đáp. Không biến nguồn chưa xác nhận thành facts, không thêm router/parser/regex sửa tiếng Việt, model biên tập thứ ba hoặc loop viết lại.

Khi lập bản corpus mới, dùng cơ chế context-preparation/size/quote hiện có để đối chiếu các đầu vào đã sửa với căn cứ của đúng ca. Không đổi số đo/recipient/scope âm thầm, không bịa đường height/weight. Bảy attack PR387 và toàn A2 cũ giữ nguyên; thiếu tự nhiên ở một draft A2 không làm mất tính hợp lệ của phép thử nghĩa an toàn.

### E. Chạy sau khi bản chuẩn bị cụ thể hoàn tất

Đề xuất tiếp theo là sửa bộ đầu vào + examples + reference review như trên, đưa bản cụ thể để owner xem trước khi chạy. Request hiện tại chưa đăng ký run mới. Khi được yêu cầu triển khai/chạy: dùng lại T1 → focused readiness theo phần thay đổi → commit/clean source seal → A2 mới đầy đủ → chỉ khi A2 PASS mới A3. Mỗi ca một attempt theo quyết định hiện hành; không retry generation/best-of-N, không loại lỗi khỏi denominator.

Giữ toàn bộ corpus/prompt/results36 và cũ. Bộ A3 viết lại là population mới; không trình bày chênh điểm với36 như phép đo cải thiện trên đầu vào giống nhau. Sau run mới, đọc đủ mọi actual terminal conversation, ghi cả điểm và lý do còn vướng, rồi STOP Checkpoint A. Chưa có cơ sở nói thay đổi này đã cải thiện model khi chưa chạy.

## Nguồn và kiểm tra audit

| Identity | Giá trị |
| --- | --- |
| Audit source HEAD | `e44807f8e3976bbd907b2ff17412242129993759` |
| implementationBaseSha đã ghi ở Round36 | `296cdcfbf5759f5bf9cbb24acf3dc63005589361` |
| Owner prompt35 SHA-256 | `79153c60fb3a286ce4b4188a34afd33c803cc892e682204a3149d1c7da89f3b8` |
| Verifier prompt32 SHA-256 | `deb7508ebe97ec9ff0f9827ba13f5608390406a8ca32b9406d925a8d175aa9a5` |
| A2 Round36 SHA-256 | `4dd5ff15d336bd162f6f8b980c1deed8ec51bc7c132fc323cc9144fbc3c08455` |
| A3 Round36 SHA-256 | `6232b52bf9ce9aeabfa41bc663dc94b434c493692b524d40a0dd380bb78101de` |
| reference-replies SHA-256 | `c6c7cb46467ccc720be7ee54eae476f378687635c970c6ea8b9e33e306b55a79` |

Đã chạy các helper đọc cục bộ trong Temp: `c3-vietnamese-input-inventory.mjs` (đếm messages/hash các bản lưu), `c3-vietnamese-input-view.mjs` (đọc lịch sử/tin mới đủ42ca), `c3-a2-language-view.mjs` (đọc đủ122draft và61cặp role/text khác nhau), `c3-language-audit-metadata.mjs` (đối chiếu body/hash prompt, model config, references và ví dụ lưu). Các helper không gọi provider và không sửa repo source/input.

Đã chạy `node C:/Users/nguye/AppData/Local/Temp/c3-vietnamese-audit-validate.mjs`: exit0; đủ42caseId đúng thứ tự/không trùng,16/13/13 và family counts khớp,8 link cục bộ tồn tại, hai prompt body/hash và corpus/reference hashes khớp manifest, tracked evaluation diff rỗng, secret-pattern matches0. `git diff --check`: exit0. Đây là kiểm tra tính nhất quán tài liệu và nguồn, không chứng minh các judgment ngôn ngữ đúng.

Worker tests/build/typecheck/lint không chạy lại cho audit Markdown; không có thay đổi logic hay frozen inputs. Không có independent/human acceptance mới. Các tỷ lệ audit là judgment chủ quan có lý do từng ca, không phải chứng cứ hội thoại khách thật hay tác động nhân quả đã được đo.
