# Review toàn bộ rerun 19 fallback và 4 prerequisite

Đã đọc đủ 23 lượt: câu hỏi/lịch sử, actual customer capture, committed state, draft bị chặn và captured provider/tool requests. Ưu tiên actual outcome trước draft. Đánh giá theo việc giúp khách mua hợp lý, trả lời đúng trọng tâm, dùng context và giọng chat; không chấm theo keyword hoặc số điều kiện được nhắc. Đây là review thủ công của agent, N1, không blind hoặc independent panel.

**19 target: 15 dùng được, 3 cần sửa tư vấn/giọng, 1 fallback.** Bốn prerequisite dùng được ở actual outcome, nhưng một lượt dựa vào code recovery sau verifier FAIL. “Dùng được” vẫn có thể cần gọt câu; không có nghĩa đã đạt toàn bộ tiêu chuẩn chất lượng Phase B.

## Đánh giá từng lượt

Số thứ tự khớp [CONVERSATIONS.md](CONVERSATIONS.md). Trạng thái SEND_ELIGIBLE là kết quả runtime, tách khỏi nhận xét chất lượng dưới đây.

| # | Case | Loại | Đánh giá actual whole turn |
| --- | --- | --- | --- |
| 1 | b1-changed-occasion | Target | **Cần sửa.** Có đổi sang món khác, nhưng dùng “mềm, có độ bay” để kết luận “rất dễ bị hằn nếp”, rồi quảng bá SQ675 hạn chế nhăn tốt hơn. Lý do chưa vững, đoạn sau dài và lệch sang thiết kế/ren/thanh lịch. Query `set` rồi `váy` quá rộng so với tiêu chí ít nhăn; lượt tìm thứ hai bị PRODUCT_BOUND. PASS không làm lời khuyên này thuyết phục hơn. |
| 2 | b1-partial-source-v2 | Target | **Dùng được, cần gọt giọng.** Trả chất liệu/dáng và không bịa giá/tồn. POS_UNAVAILABLE là fault đã đăng ký, không phải bot bỏ quên nguồn có sẵn. “Chưa có sẵn trên hệ thống” là cách nói nội bộ nên bỏ; không yêu cầu bịa bước kiểm tra/handoff vì B1 không có công cụ đó. |
| 3 | b1-price-v2 | Target | **Dùng được.** Giá cả bộ 799k, đúng phần khách hỏi, ngắn và tự nhiên. Không cần thêm CTA để đủ rubric. |
| 4 | b1-component-stock-v2 | Target | **Dùng được.** Đúng chân váy lẻ, size M, tồn và giá 449k. Không nhầm giá cả set hoặc bắt khách hỏi lại. |
| 5 | b1-search-read-v2 | Target | **Dùng được, có phần thừa nhẹ.** Tìm đúng Khánh Trang và giá set 999k. Giới thiệu mua lẻ 499k là lựa chọn thật, không phải lỗi an toàn; câu hỏi cuối mở thêm quyết định mà khách chưa cần. Không coi mọi bán thêm là lỗi. |
| 6 | b1-buying-concern-v2 | Target | **Cần sửa.** Khách hỏi có nên lấy cả bộ khi quen đồ trơn. Bot mở đầu khen hợp, sau đó nói có thể quá nhiều chi tiết, rồi đẩy lựa chọn áo/váy lẻ về cho khách. Chưa chốt được shop nghiêng hướng nào và vì sao; dài do bảo vệ cả ba hướng, không chỉ do nhiều tính từ. |
| 7 | b1-policy-used-v2 | Target | **Dùng được.** Hiểu mặc thử 5 phút vẫn khác ướm bên ngoài theo policy hiện hành; trả thẳng không đổi size được. Không đếm thêm “sạch/không mùi/chưa giặt” hoặc yêu cầu lặp lại policy để cho điểm. |
| 8 | b1-changed-occasion-v3 | Target | **Dùng được, cần gọt giọng.** Đổi lời khuyên theo hoàn cảnh mới: chọn áo lẻ cho buổi gặp khách, giữ chân váy ren cho tiệc. Có quyết định và lý do phân biệt; đoạn “thướt tha mềm mại/chuyên nghiệp” dài hơn cần thiết. Không tự nhận khách đã có quần/chân váy được đề xuất phối. |
| 9 | b1-current-policy-v3 | Target | **Dùng được.** Dùng policy hiện hành 15 ngày thay trí nhớ 7 ngày của khách, trả thời hạn và phí 30k đúng nguồn. Ngữ cảnh chỉ mở xem/cất lại; không tự giả định khách đã vi phạm điều kiện chưa nói, cũng không bắt kể đủ toàn bộ điều kiện mới cho qua. Đây chưa phải receipt duyệt hồ sơ đổi hàng. |
| 10 | b1-partial-source-v3 | Target | **Dùng được, cần gọt giọng.** Trả được chất liệu, không bịa giá/tồn khi POS_UNAVAILABLE. “Chị tham khảo chất liệu trước giúp em nhé” không giúp xử lý nhu cầu mua; bỏ phần đệm này. Không gán thiếu dữ liệu mô phỏng thành lỗi model hoặc yêu cầu đọc lại vô ích. |
| 11 | b1-price-v3 | Target | **Dùng được.** Báo đúng giá nguyên set 799k, đủ và gọn. |
| 12 | b1-component-stock-v3 | Target | **Dùng được.** Đúng áo lẻ size M, tồn và giá 499k. |
| 13 | b1-search-read-v3 | Target | **Dùng được, cần gọt giọng.** Tìm đúng SQ223, giá và các cách mua có nguồn. “Cả bộ có quần” giống nhãn dữ liệu hơn tiếng shop. Danh sách ngắn để phân biệt giá không tự là lỗi liệt kê; vấn đề là cách gọi món và phần lựa chọn thêm có cần ở lượt này hay không. |
| 14 | b1-buying-concern-v3 | Target | **Dùng được, cần gọt giọng.** Chọn áo lẻ vì khách đã có chân váy đen và muốn mặc lại; đúng quyết định bán hàng, không cần mua set chỉ vì còn ngân sách. Câu sau nhắc lại ngân sách rồi dồn tính từ, nhưng chưa phá quyết định chính. |
| 15 | b1-policy-used-v3 | Target | **Dùng được.** Từ chối đổi vì đã cắt tem và giặt, đúng tình huống. Không cho đổi rồi mới đọc điều kiện, không hỏi thêm dữ kiện không thể đổi kết luận. |
| 16 | sales-discovery-advice:need | Target | **Fallback, chưa phục vụ được việc mua.** Khách chỉ nhận “Phần này em chưa trả lời được”. Draft đã chọn món dưới ngân sách nhưng cam kết “không lo bị bó bụng” từ description form nhẹ; chưa có cấu tạo eo/độ ôm tương ứng. Provider chỉ trả lỗi/ref, không trả span; xác định mệnh đề nghi vấn là chẩn đoán của reviewer. Không đủ cơ sở gọi đây hoàn toàn là chặn quá tay. |
| 17 | stateful-open | Prerequisite | **Dùng được.** Thêm đúng áo be M khách chọn, receipt/capture có thật; báo PRE_ORDER đúng nguồn. Không đọc lại ba vòng hoặc biến size khách chọn thành bảo đảm fit. |
| 18 | stateful-variant-quantity | Prerequisite | **Dùng được, cần gọt giọng.** Đổi đúng L và 2 chiếc, giữ màu. “Cập nhật số lượng” hơi giống phần mềm nhưng nội dung xác nhận đúng hai thao tác khách vừa nhờ. |
| 19 | stateful-quote | Target | **Dùng được, cần gọt giọng.** Tổng đúng 978.100đ; phần ngoặc giải thích 998k - 49,9k + 30k có ý nghĩa. Có thể đưa tổng và mức giảm gọn hơn, không coi dấu ngoặc hoặc việc tách tiền tự là lỗi. |
| 20 | stateful-correction | Target | **Cần sửa giọng.** Code lưu đúng 74/96, giữ 2 áo L, không có lỗi state/fit. Nhưng khách sửa thông tin nền lại nhận báo cáo “đã ghi nhận... vẫn được giữ nguyên”, trong khi prompt đã yêu cầu đáp nhận lời khi lựa chọn không đổi. Đây là lỗi diễn đạt, không phải ghi sai hồ sơ hay nhắc số đo sai. |
| 21 | negotiation-cart-setup | Prerequisite | **Dùng được, cần gọt giọng.** Thêm đúng áo be M, PRE_ORDER có nguồn. “Hàng đặt trước (pre-order)” lặp hai ngôn ngữ không cần thiết. |
| 22 | negotiation-price-objection | Prerequisite | **Actual dùng được nhờ code recovery; owner draft cần sửa.** Code đã áp ưu đãi 30k và trả đúng tổng 499k. Draft của owner bỏ qua ưu đãi vừa áp, quay về báo đơn giá và mời mua thêm để giảm 5%; còn tự thêm “thêu nổi thủ công”. Khách không nhận draft này: verifier FAIL rồi native receipt summary được capture. Lời summary còn cơ học, nhưng không xóa kết quả ưu đãi đã làm. |
| 23 | negotiation-total-control | Target | **Dùng được, cần gọt giọng.** Trả đúng 499k cả ship, giải thích 499k + 30k - 30k; không ghi thêm objection/concession. Có thể đưa tổng lên đầu thay vì kể phép tính dài. |

## Finding và root cause có bằng chứng

### 1. Giảm fallback chủ yếu do quota hết lỗi

17 target từng lỗi quota nay PASS. Không có prompt/model/runtime fix mới giữa hai lượt; chỉ bổ sung selector eval để dừng đúng ca. Hai semantic fallback cũ: một fresh draft nay PASS, một vẫn FAIL. Vì vậy không thể lấy 19 → 1 fallback để kết luận khả năng tư vấn đã tiến bộ tương ứng hoặc verifier đã ổn định.

Toàn bộ lượt thực chạy có 2 verdict FAIL: opening và prerequisite thương lượng. Chỉ có 1 terminal fallback vì code recovery xử lý được lượt thương lượng. Không giấu FAIL thứ hai khỏi denominator hoặc gọi code recovery là owner/verifier PASS.

### 2. Owner chọn lý do và dùng công cụ chưa bám điểm quyết định mua

- Ca 1 cần ít nhăn: query `set` rồi `váy`; lượt tìm thứ hai bị PRODUCT_BOUND. Các kết quả search chứa nhiều mô tả quảng cáo. SQ675 không có lời xác nhận trực tiếp “hạn chế nhăn” trong description đã đọc, còn SQ634 có. Khả năng trộn lợi ích giữa candidate là **giả thuyết**, chưa chứng minh chỉ từ final draft; điều xác nhận được là lời khẳng định mạnh hơn dữ liệu trực tiếp của món đang được chọn.
- Ca 16 đã search “bộ áo quần đi làm”, rồi đọc cùng lúc SQ2447, SQ748 và V406 (váy). SQ748 bị SUBJECT_BOUND; hai read khác OK. Đọc nhiều ứng viên/offer làm tiêu tốn bound nhưng không làm rõ cấu tạo eo của món được khuyên.
- Không gọi những reject này là provider lỗi hoặc code hỏng. Bound đang từ chối đúng; trace chỉ chứng minh tool use chưa hiệu quả, không chứng minh nới bound sẽ làm lời khuyên tốt hơn.
- Ca 6 dùng lời khen chất liệu để tránh chọn một hướng mua. Cả nguồn lẫn prompt đã cho phép mua lẻ, nên không thể đổ cho thiếu quyền tư vấn hoặc thiếu câu “shop phải chọn”.

### 3. Có ca thiếu thông tin; cũng có ca đủ thông tin nhưng owner bỏ qua

**Thiếu:** ca 16 có nhiều câu tơ mềm/form nhẹ/thanh lịch, chưa có đặc điểm eo đủ để bảo đảm không bó bụng. Không cần thêm phép thử riêng cho mọi hoàn cảnh; cần thông tin sản phẩm liên quan đến tiêu chí khách đang chọn, ví dụ cấu tạo eo/phom thực tế nếu nguồn shop có. Không biến “form nhẹ” thành “không bó”. SQ748 có lưng chun nhưng là quần short: cũng không tự coi đó chắc chắn là phương án đi làm phù hợp.

**Đã đủ nhưng không dùng:** sau record_negotiation ở ca 22, captured OWNER_REQUEST có `NEGOTIATION_UPDATED` receipt và `state.cartQuote` version 2: subtotal 499k, discount 30k, ship 30k, total 499k. Tool response cũng báo operation OK. Owner vẫn không nói ưu đãi này. Đây không phải code chưa cấp số tiền; owner đặt policy bán thêm chung lên trước kết quả thao tác hiện tại. Tool response chưa chứa trực tiếp quote, nhưng fresh context có đầy đủ, nên chưa đủ bằng chứng gọi đó là nguyên nhân duy nhất.

**Thiếu có chủ đích:** ca 2 và 10 đăng ký POS_UNAVAILABLE. Không tính việc không báo được giá/tồn là lỗi hallucination hoặc retrieval bỏ sót; đánh giá khả năng trả phần đã biết và không hứa khả năng không có.

### 4. Prompt đã có hướng dẫn giọng; thiếu thêm câu cấm không phải lời giải thích chính

Prompt hiện hành đã yêu cầu: chọn một hướng, bỏ ý không giúp quyết định, không kể lỗi hệ thống, không báo cáo lưu hồ sơ khi lựa chọn không đổi, không tự thêm kỹ thuật sản xuất. Ca 6/20/22 vẫn vi phạm tương ứng.

Giọng kém tự nhiên tập trung ở **ý định của đoạn trả lời**:

- Muốn bảo vệ mọi phương án nên đoạn tư vấn dài, nhiều “tuy nhiên/nếu chị vẫn...” và cuối cùng trả lựa chọn về cho khách.
- Chép phong cách description có nhiều tính từ thay cho một lý do mua cụ thể.
- Báo cách phần mềm xử lý thay cho điều khách cần biết.

Không dùng danh sách từ cấm, cấm nhắc thông tin khách, cấm ngoặc/danh sách hoặc bắt mọi tin theo số câu cố định. Ca 8/14 nhắc context để chọn đúng hướng là có ích; ca 13/19 có cấu trúc phân biệt giá là hợp lý. Vấn đề là phần nào thực sự giúp quyết định ở đúng lượt đó.

### 5. Code giữ giao dịch tốt hơn owner giữ lời tư vấn ở mẫu này

Các thao tác cart/profile, tổng tiền, giá, tồn và quyền đổi hàng ở những ca đã kiểm đều có readback khớp; không quan sát thấy mất màu, đổi size trái ý, nhân đôi ưu đãi hoặc thông báo thao tác không có receipt. Đây là kết luận trên các case đã chạy, không phải đảm bảo toàn hệ thống ổn định.

Recovery ở ca 22 chứng minh giá trị cụ thể: giữ ưu đãi 30k đã commit khi draft hỏng. Nhưng text code còn “Giỏ của chị: 1 áo (mẫu Set váy...)”, đọc giống biên bản. Nếu chỉnh, nên chỉnh formatter hiện có bằng quote/offer label đã xác nhận; không thêm một model rewrite hoặc recovery framework.

## Hướng xử lý tiếp theo

1. **Ưu tiên kết quả thao tác thật.** Với thương lượng và cập nhật giỏ, dùng quote hiện hành đã cấp để nói ngay khách được gì; sau đó mới cân nhắc bán thêm. Kiểm cả owner reply và actual recovery, không chỉ unit PASS hoặc đúng phép tính.
2. **Chọn món trước khi đọc sâu.** Giữ tiêu chí quyết định trong query; đọc offer của ứng viên thực sự định khuyên, không đọc mọi sản phẩm trả về hoặc đổi query sang nhóm quá rộng. Giữ bound hiện tại; không thêm router/planner model hoặc tăng tool loop để cứu hai trace.
3. **Bổ sung/chuẩn hóa phần dữ liệu liên quan của sản phẩm.** Dùng nguồn shop cho cấu tạo/phom/đặc điểm liên quan; giảm lời quảng cáo trong view tư vấn và giữ canonical facts. Không thêm một nguồn “chân lý tư vấn” hoặc test cho từng lời khen; không dựng dữ kiện để fit benchmark.
4. **Chỉnh giọng theo việc của lượt, không theo keyword.** Ca sửa số đo chỉ cần nhận lời và giữ lựa chọn; ca khách nhờ chọn phải chọn được một hướng cùng lý do; ca hỏi tổng trả tổng trước. Chưa có bằng chứng rằng thêm vài ví dụ/câu cấm vào prompt dài sẽ giải quyết được các lỗi này.
5. **Giữ kết quả review và kiểm đúng giới hạn.** Chưa tự sửa/rerun, chưa nới verifier chỉ để loại fallback. Ca 1 cần xem lại cường độ suy luận dù đã PASS; ca 16/22 cần đối chiếu đúng thiếu căn cứ, không áp một luật “cấm suy luận chất liệu”. Các ca đơn giản đang tốt là regression controls nếu có vòng sửa được owner yêu cầu.

Các finding ở full39 trước không được tự đóng: lượt này chỉ chạy lại 19 fallback và 4 prerequisite, không kiểm lại toàn bộ giọng gallery, handoff hoặc 12 thử ảnh.
