# Review toàn bộ 39 ca gốc và đối chiếu lượt chạy lại

## Phạm vi và phương pháp

Đọc đủ 39 ca gốc tại source `6e38c54104010c7e137481a560b99da21e961e73`: câu hỏi, lịch sử, actual customer captures, committed state, owner drafts và captured tool/provider requests. Đối chiếu 19 target + 4 prerequisite ở rerun source `24d8ec62457f95865c80719a2e0c08fea697c657`. Không chạy model hoặc sửa code/prompt/policy trong review này.

Nguồn: [39 hội thoại](../../apps/worker/evals/single-agent-commerce-read-only/contract-advice-run-20261022/CONVERSATIONS.md), [raw outcomes](../../apps/worker/evals/single-agent-commerce-read-only/contract-advice-run-20261022/OUTCOMES.json), [metrics gốc](../../apps/worker/evals/single-agent-commerce-read-only/contract-advice-run-20261022/METRICS.json), [review rerun 23 lượt](../../apps/worker/evals/single-agent-commerce-read-only/fallback19-rerun-20261022/REVIEW.md). Runtime/shared source không có diff từ source full39 đến thời điểm review; thay đổi selector eval không đổi hành vi model/runtime.

Chấm actual outcome trước; draft chưa gửi chỉ dùng chẩn đoán sau đó. Không coi một câu có đủ keyword, đủ điều kiện hoặc dài/ngắn theo số câu là đạt. “Dùng được” cho phép polish nếu quyết định mua và thông tin chính vẫn tốt. Review thủ công của agent, N1/non-blind, không independent panel hoặc qualification.

## Kết quả gốc và một nhận xét cần sửa

| Loại | Số ca |
| --- | ---: |
| Actual dùng được, gồm code checkout/recovery/handoff có thông báo | 15 |
| Cần sửa tư vấn/giọng/đáp ứng yêu cầu | 3 |
| Static fallback | 19 |
| Handoff đã commit nhưng không có lời báo cho khách | 2 |
| Tổng | 39 |

19 fallback = 17 lỗi quota verifier + 2 verdict FAIL. Bốn lượt verifier lỗi quota khác có code receipt recovery nên không thành static fallback. Không quy 17 lỗi quota thành lỗi hiểu của owner, cũng không coi unchecked owner drafts là câu khách đã nhận.

**Đính chính ca 32:** primary/report gốc gọi `stateful-human-request` là OWNERSHIP_CONTROL do “đã HUMAN”. Bằng chứng không hỗ trợ cách giải thích đó. Case này có `journeyId=handoff`, khác hành trình `sales`; harness tạo conversation riêng. Raw ghi 1 owner generation, owner gọi `request_handoff(CUSTOMER_REQUESTED_HUMAN)`, `commitStatus=COMMITTED`, `enqueued=0`, capture rỗng. Vì vậy đây là **handoff lần đầu không có customer acknowledgement**, không phải im lặng trước một tin nhắn tiếp theo ở hội thoại đã HUMAN. Phân loại review hiện tại là SILENT_HANDOFF; raw metrics và primary lịch sử được giữ nguyên, không sửa ngược evidence.

Không suy từ silence thành Outbox làm mất tin: handoff port dựng tin từ `decision.customerMessages`; default non-after-sales trong `handoff-fallback-v2.ts` vốn dùng SILENT_HANDOFF. Snapshot của exact historical matrix decision không được lưu đủ để quy cho một admin rule cụ thể. Trước khi sửa phải xác định policy áp dụng, không cho owner tự nhắn tiếp sau chuyển quyền.

## Review đủ 39 ca

Số thứ tự khớp file hội thoại gốc. FB-Q = actual static fallback do verifier quota; FB-S = actual static fallback sau semantic FAIL. Cột draft/rerun không thay đổi đánh giá actual của run gốc.

| # | Case | Actual gốc | Nhận xét và đối chiếu |
| --- | --- | --- | --- |
| 1 | b1-changed-occasion | FB-S | Khách không được giúp chọn món. Draft cũ chuyển sang mẹo thay/treo đồ, không đáp yêu cầu tìm mẫu đỡ nhăn. Verifier chỉ trả ref, không chỉ span. Rerun có chọn SQ675 và PASS, nhưng lý do về nhăn chưa vững, tư vấn vẫn cần sửa. |
| 2 | b1-current-policy | Dùng được | Đúng 15 ngày/30k thay ký ức 7 ngày của khách; xét đúng nhận 10 ngày, chỉ ướm và còn tem. Không bắt đọc checklist chỉ để chứng minh đã hiểu policy. Không rerun. |
| 3 | b1-partial-source | Dùng được, polish | Trả chất liệu, không bịa giá/tồn trong POS_UNAVAILABLE. “Hệ thống chưa hiển thị” và mô tả nhiều tính từ là giọng nội bộ; chưa thành lỗi chọn mua. Không rerun. |
| 4 | b1-price | Dùng được | Giá set 799k rõ; thêm ngắn giá áo/chân váy là cách mua có thật. Không mặc định giới thiệu mua lẻ là lỗi hoặc bắt chỉ trả đúng một con số. Không rerun. |
| 5 | b1-component-stock | Dùng được | Đúng áo lẻ size M, còn hàng, giá 499k; không nhầm giá set hoặc bảo đảm fit. Không rerun. |
| 6 | b1-search-read | Dùng được | Tìm đúng SD375, phân biệt áo 929k/cả bộ 1.065k. Danh sách hai giá phục vụ lựa chọn, không phải liệt kê vô ích. Không rerun. |
| 7 | b1-buying-concern | Dùng được, polish | Đã trả lời có thể lấy bộ đi tiệc ban ngày và giá trong ngân sách. Trấn an thẩm mỹ được phép; không cần phép thử cho “không rườm rà”. Lời giải thích vẫn nặng chất liệu/tính từ. Không rerun. |
| 8 | b1-policy-used | Dùng được, polish | Hiểu đã mặc đi làm thì không đổi. Phí 30k được đặt trong tình huống hàng đủ điều kiện, không cấp lại quyền cho ca bị loại. Có thể rút gọn nhưng không thiếu checklist. Không rerun. |
| 9 | b1-changed-occasion-v2 | Cần sửa | Khách dễ nóng, tiệc chuyển ra sân vườn; bot trả lại việc quyết định bằng “chị cân nhắc... độ chịu nhiệt”. Có mô tả mềm/thoáng nhưng chưa dùng để đưa lời khuyên mua/mặc có ích. Không phải cần thêm một phép thử cho mọi cảm giác. Chưa rerun. |
| 10 | b1-current-policy-v2 | Dùng được | Đúng 12 ngày còn trong 15 ngày, phí hiện tại 30k thay 25k cũ. Không giả định thêm vi phạm khách chưa nói. Không rerun. |
| 11 | b1-partial-source-v2 | FB-Q | Actual không giúp được khách. Draft có chất liệu và thiếu giá/tồn; không dùng nó để cho actual PASS. POS_UNAVAILABLE có chủ đích. Rerun dùng được, vẫn có giọng hệ thống. |
| 12 | b1-price-v2 | FB-Q | Draft giá set 799k ngắn, nhưng không được gửi do quota. Rerun PASS/dùng được. Không có bằng chứng cần sửa prompt giá. |
| 13 | b1-component-stock-v2 | FB-Q | Draft đúng chân váy lẻ M/449k; actual vẫn fallback. Rerun PASS/dùng được. |
| 14 | b1-search-read-v2 | FB-Q | Draft tìm đúng Khánh Trang 999k, giá mua lẻ 499k. Rerun PASS/dùng được, có mở thêm lựa chọn chưa cần. |
| 15 | b1-buying-concern-v2 | FB-Q | Draft cũ dài, bảo vệ cả mua bộ lẫn mua lẻ, chưa chọn dứt khoát cho khách quen đồ trơn. Rerun cũng dài/lưỡng lự: đây là finding owner lặp lại, độc lập với quota. |
| 16 | b1-policy-used-v2 | FB-Q | Draft hiểu mặc thử khác ướm bên ngoài; không thấy lỗi “cho phép rồi đọc điều kiện”. Rerun PASS, từ chối đúng. Không dùng quota làm bằng chứng model hiểu sai policy. |
| 17 | b1-changed-occasion-v3 | FB-Q | Draft đã đổi sang áo lẻ theo việc gặp khách buổi sáng; actual vẫn fallback. Rerun PASS/dùng được, còn nhiều tính từ. Không bắt mọi đổi hoàn cảnh đều phải đổi sang sản phẩm mới. |
| 18 | b1-current-policy-v3 | FB-Q | Draft trả đúng 9 ngày vẫn trong 15 ngày hiện hành. Rerun PASS/dùng được; không bắt nhắc đủ mọi điều kiện khi hỏi thời hạn. |
| 19 | b1-partial-source-v3 | FB-Q | POS_UNAVAILABLE; draft không bịa giá/tồn nhưng kể trạng thái hệ thống. Rerun dùng được với cùng điểm yếu diễn đạt. |
| 20 | b1-price-v3 | FB-Q | Draft giá 799k ngắn/đúng; rerun PASS/dùng được. |
| 21 | b1-component-stock-v3 | FB-Q | Draft áo lẻ M còn/499k đúng; rerun PASS/dùng được. |
| 22 | b1-search-read-v3 | FB-Q | Draft đọc đúng SQ223 và ba cách mua, kết thúc bằng hỏi chọn bộ/lẻ. Rerun PASS với cấu trúc tương tự; danh sách giá không tự là lỗi, câu hỏi thêm có thể bỏ. |
| 23 | b1-buying-concern-v3 | FB-Q | Draft cũ chọn cả bộ 799k vì có thêm phối đồng bộ lẫn tách áo; rerun chọn áo lẻ 499k để dùng chân váy đen đang có. Hai hướng không tự là đúng/sai theo giá thấp nhất; phải xét lợi ích món mua thêm. Chưa có evidence actual của run gốc để chấm owner draft thành kết quả bán hàng. |
| 24 | b1-policy-used-v3 | FB-Q | Draft từ chối do cắt tem/giặt đúng tình huống; rerun PASS/dùng được. Không cần mở thêm phần policy không liên quan. |
| 25 | stateful-open | Dùng được nhờ code | Thêm đúng áo be M, quote 529k, có preorder; verifier quota nhưng receipt recovery giữ kết quả. Rerun owner/verifier PASS. Không suy nhận size khách chọn thành bảo đảm vừa. |
| 26 | stateful-variant-quantity | Dùng được nhờ code | Giữ màu, đổi L và 2 chiếc, tổng 978.100đ đúng. Rerun cũng đúng; code giữ hai mutation, không bắt khách lặp lại lựa chọn không đổi. |
| 27 | stateful-quote | FB-Q | Draft tổng 978.100đ đã đúng; actual static fallback. Rerun PASS/dùng được; cần gọt phép tính/ngoặc nếu không giúp thêm. |
| 28 | stateful-correction | FB-Q | Đã lưu đúng 74/96 và giữ L. Draft cũ đọc lại giỏ/tổng/preorder thay cho nhận lời sửa thông tin; rerun không đọc số đo nhưng chuyển sang báo cáo “ghi nhận... giữ nguyên”. Lỗi giọng chưa đóng; không phải lỗi state. |
| 29 | stateful-request-checkout | Dùng được | Raw NO_SEND là model path; code đã capture câu hỏi một field. Không phải khách nhận im lặng. Text evidence đã redact nên không đánh giá tinh tế giọng từ placeholder. Không rerun. |
| 30 | stateful-private-checkout | Dùng được | Code preview đúng 2 áo L, giá/giảm/ship/tổng, preorder, ETA và đề nghị xác nhận; PII không đi vào hai model. Fixture cung cấp private bundle một lượt: không gọi đây provider coverage cho toàn bộ hành trình khách lần lượt gửi từng field. Không rerun. |
| 31 | stateful-confirm | Dùng được | Có holding reply chuyển nhân viên kiểm tra/lên đơn, handoff commit; không giả đã tạo POS order bên ngoài. Event/tag intent không phải bằng chứng nhân viên thật đã nhận hoặc xử lý. Không rerun. |
| 32 | stateful-human-request | Silent handoff | Conversation riêng, owner gọi tool và handoff COMMITTED, không có customer capture. **Sửa nhận xét OWNERSHIP_CONTROL cũ**: không phải vì đã HUMAN từ ca 31. Cần xem customer-message policy cho lần chuyển đầu; chưa thấy evidence Outbox mất một tin đã tạo. Chưa rerun. |
| 33 | sales-discovery-advice:need | FB-S | Draft cũ chọn set quần short và cam kết không bó bụng/dễ chịu suốt ngày. Verifier FAIL không có reason span. Rerun đổi sang bộ quần khác nhưng vẫn cam kết không bó từ “form nhẹ”, tiếp tục FAIL. Cả selection lẫn căn cứ của lời trấn an cần xem; không chỉ đổi vài từ giảm nhẹ. |
| 34 | sales-product-gallery:overview | Cần sửa + thiếu binding ảnh | Khách xin ảnh màu be, nhận giải thích hệ thống + giá/chất liệu + câu hỏi chung, không có ảnh. Media tool trả MEDIA_COLOR_BINDING_UNVERIFIED; thiếu binding đúng màu không có nghĩa không bán màu đó. Verifier PASS không làm yêu cầu ảnh hoàn tất. Chưa rerun. |
| 35 | sales-size-advice:height-weight | Silent handoff + thiếu chart | 158cm/52kg/RELAXED được hiểu và ghi; recommend_size trả NO_VERIFIED_CHART/missingInputs=[] rồi handoff, không có reply. Không phải thiếu ba vòng hoặc verifier chặn: verifier không được gọi. Chưa chứng minh shop ngoài đời không có chart; chỉ biết nguồn runtime chưa nhận chart verified. Chưa rerun. |
| 36 | sales-southern-delivery:deadline | Cần sửa + context thời gian cần kiểm | Đã lấy đúng Cần Thơ → ETA 4–8 ngày, nhưng chưa trả lời khả năng đáp ứng sáng thứ Sáu. Request có source timestamps; chưa thấy current time/timezone hoặc mốc bắt đầu ETA rõ để so lịch. Vì vậy không quy hết cho owner bỏ qua một deadline code đã tính. Chưa rerun. |
| 37 | negotiation-cart-setup | Dùng được nhờ code | Giỏ áo be M/preorder/529k đúng, code recovery sau quota. Rerun PASS; giọng preorder song ngữ có thể gọn hơn. |
| 38 | negotiation-price-objection | Dùng được nhờ code | Code báo ưu đãi 30k/tổng 499k sau quota. Draft gốc cũng đã dùng được khoản ưu đãi. Rerun owner lại bỏ ưu đãi hiện tại và nói mua thêm giảm 5%, tự thêm “thủ công”; verifier FAIL, code tiếp tục cứu actual. Không nói owner luôn thiếu thông tin hoặc chưa bao giờ hiểu ưu đãi. |
| 39 | negotiation-total-control | FB-Q | Draft tính đúng 499k cả ship; actual fallback vì quota. Rerun PASS, tier/version/evidence không tăng thêm; không có dấu hiệu câu hỏi tổng tạo một lần giảm mới. |

## Những finding bổ sung so với chỉ review 19 fallback

### A. Cả bốn opening đều chưa đạt trọn vẹn mục đích của khách

Đầu vào mở gồm tìm bộ đi làm, xin ảnh, tư vấn size và cần hàng theo deadline. Kết quả: một static fallback, một không có ảnh và trả lời lạc sang mô tả, một silent handoff, một chỉ báo ETA mà chưa hỗ trợ quyết định kịp hẹn. Hai opening SEND_ELIGIBLE vẫn cần sửa chất lượng.

Do đó nhóm giá/tồn/giao dịch đang tốt hơn khả năng tiếp một nhu cầu mua mở. Chỉ nhìn tổng eligible sau rerun sẽ bỏ sót phần quan trọng của chatbot bán hàng.

### B. Handoff đúng authority chưa đồng nghĩa khách biết chuyện gì xảy ra

Ca 32 và 35 đều không có acknowledgement; ca 31 lại có holding reply đúng chức năng. Đây là khác biệt customer-message policy/decision hiện có, không phải yêu cầu thêm model trả lời. Cần phân biệt:

- chuyển lần đầu: khách cần biết shop đã tiếp nhận/chuyển việc, nếu policy cho phép;
- tin tiếp theo khi HUMAN đã sở hữu: bot phải giữ im lặng theo ownership;
- nhân viên thật đã nhận/xử lý: chưa được provider/capture test này xác minh.

Đổi UX phải dùng handoff policy/holding reply và transaction hiện có; không viết lời hứa “đã chuyển” trước commit hoặc thêm generation sau handoff.

### C. Lỗi dữ liệu/context có ba loại, không thể chữa cùng một cách

| Loại | Evidence | Việc đúng tầng |
| --- | --- | --- |
| Source có chủ đích không khả dụng | B1 partial-source POS_UNAVAILABLE | Trả phần biết, nói gọn phần thiếu; giữ nguyên fault trong evaluation, không giả có giá/tồn. |
| Runtime chưa nhận dữ liệu có thẩm quyền | NO_VERIFIED_CHART; MEDIA_COLOR_BINDING_UNVERIFIED | Truy ngược mapping/source hiện có theo product/offer hoặc asset/color; chỉ bổ sung dữ liệu khi thiếu thật. Không bịa size, gán màu ảnh từ suy đoán, hoặc xin thêm số đo khi vấn đề là chart. |
| Thông tin đã có nhưng chưa dùng tốt | Rerun negotiation có receipt và cartQuote giảm30k; owner bỏ qua | Chỉnh ưu tiên dùng kết quả thao tác hiện tại và cách trình bày; không cần thêm nguồn coupon nữa. |

Ca deadline là phần cần kiểm riêng: min/max ETA đã đúng, còn current time, timezone, cách hiểu thứ Sáu và anchor ETA chưa được cung cấp/diễn đạt rõ trong captured request. Source timestamp không tự là mốc đơn bắt đầu giao. Sửa nhận định quá gọn trước đây rằng đây chỉ là owner không dùng số 4–8; cũng không cần mặc định thêm nhiều field ETA hoặc parser ngày tiếng Việt.

### D. Giọng đã có chỉ dẫn nhưng vẫn lặp các kiểu đáp không giống shop

- **Giải thích thay quyết định:** ca 9 “chị cân nhắc... độ chịu nhiệt”; draft ca 15 và rerun tương ứng bảo vệ nhiều phương án rồi đẩy việc chọn lại cho khách.
- **Kể công cụ thay phục vụ nhu cầu:** ca 3/34 và partial drafts dùng “hệ thống chưa hiển thị”; ca 34 thêm mô tả sản phẩm để bù cho ảnh chưa gửi được.
- **Copy description:** ren, độ bay/rũ, thanh thoát, nhã nhặn, tinh tế được xếp liên tiếp; điều liên quan nhất đến băn khoăn của khách lại mỏng.
- **Báo cáo trạng thái không cần thiết:** correction draft cũ nhắc lại tổng/preorder; rerun dùng “đã ghi nhận... vẫn được giữ nguyên”.

Không biến các quan sát này thành blacklist. Ca 6 có list hai giá là hợp lý; ca 19 của rerun tách tiền có thể giúp minh bạch; nhắc một lựa chọn để xác nhận thao tác là cần thiết. Cần xét cả đoạn có giúp mua/hiểu/đi tiếp ở đúng lượt đó không.

### E. Không phải mọi lựa chọn khác nhau giữa hai lượt đều là regression

Ca 23 draft gốc chọn cả bộ, rerun chọn áo lẻ. Giá nằm trong ngân sách không đủ để thuyết phục mua thêm, nhưng mua bộ có thể có ích nếu khách thực sự dùng thêm chân váy. Không cố định nhãn tốt = rẻ nhất hoặc tốt = upsell. Chấm lý do và giá trị của phần mua thêm, không ép model giống một đáp án.

Tương tự, draft gốc ca 38 đã nói khoản giảm hiện tại, rerun lại bỏ qua. Điều này cho thấy hành vi chưa vững trong hai captured contexts, không chứng minh model không có năng lực hiểu ưu đãi. Prompt/model giống nhau nhưng history, snapshots và prior captures không byte-identical; chưa tách được nhiễu generation với ảnh hưởng context.

## Các vấn đề vẫn mở trên 39 kịch bản sau khi đọc cả hai lượt

Đây là danh sách theo kịch bản, **không phải campaign ghép hoặc tỷ lệ PASS full39 mới**. 23 kịch bản có evidence rerun (19 target + 4 prerequisite), 16 chỉ có kết quả gốc.

| Kịch bản còn vấn đề | Trọng tâm |
| --- | --- |
| b1-changed-occasion | Chọn món thay và lý do về nhăn chưa vững; PASS mới chưa chứng minh lời tư vấn đã tốt. |
| b1-changed-occasion-v2 | Concern nóng còn trả quyết định lại cho khách. |
| b1-buying-concern-v2 | Chưa chọn rõ hướng mua cho người quen đồ trơn. |
| stateful-correction | State đúng, giọng báo cáo hồ sơ/giỏ còn cứng. |
| sales-discovery-advice:need | Tiếp tục fallback; selection và lời bảo đảm độ thoải mái vượt phần nguồn đang có. |
| sales-product-gallery:overview | Thiếu binding ảnh đúng màu và reply không hoàn thành việc khách xin. |
| sales-size-advice:height-weight | Không có chart verified trong runtime; handoff không lời báo. |
| sales-southern-delivery:deadline | ETA chưa thành quyết định theo ngày cần nhận; cần kiểm context lịch/anchor. |
| stateful-human-request | First handoff không acknowledgement; review cũ phân loại nhầm. |

## Ưu tiên xử lý đề xuất

1. **Sửa trải nghiệm opening bằng các luồng đang có:** audit mapping chart/ảnh từ nguồn hiện có, xác định customer-message policy khi chuyển lần đầu, kiểm current time/timezone/ETA anchor cho deadline. Không gom ba thiếu hụt này thành một prompt “tư vấn tự nhiên hơn”.
2. **Giữ kết quả giao dịch và làm owner nói đúng việc vừa xử lý:** dùng cartQuote/receipt hiện tại trước quảng bá ưu đãi chung; formatter recovery dùng tên món/offer khách hiểu và thông tin mua cần thiết. Không thêm truth object, model rewrite hoặc repair loop.
3. **Tư vấn phải chọn được lý do phù hợp:** query theo tiêu chí, đọc sâu ứng viên định khuyên, dùng khác biệt liên quan; không chọn từ quảng cáo rồi tự tạo công năng để hợp lý hóa. Giữ bound hiện tại, không thêm role/router hoặc generic parser.
4. **Đánh giá nguyên đoạn theo mục tiêu bán hàng:** giữ các ca giá/tồn/policy/checkout tốt làm controls; đối chiếu các ca concern/opening còn yếu. Không bắt checklist/keyword hoặc một CTA khi công cụ không làm được bước đó. Chưa tự sửa hoặc dispatch thêm model.

Chưa B GO. Review này không đóng các phần full journey, staff-image access/readback, private per-field provider flow, 12 image comparison hoặc stability còn chưa kiểm. Không sửa retroactive verdict hoặc tuyên bố một chiến dịch full39 mới đã PASS.
