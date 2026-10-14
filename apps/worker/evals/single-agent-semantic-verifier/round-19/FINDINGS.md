# Round19 — kết quả bán hàng và giới hạn còn lại

Khuyến nghị **STOP**. A2 đạt trên 84/84 ca đã đăng ký; A3 có 33/42 ca đạt theo primary review, nhưng 6 fallback chiếm 14,29%, vượt trần 10%. Các nhóm concern 8/11, partial 6/9 và policy 7/9 cũng chưa đạt 90%. Đây là các lý do độc lập để chưa đạt Checkpoint A; không cần coi một từ riêng lẻ là bằng chứng quyết định.

## Sửa cách đánh giá bán hàng

Nhận xét trước đây coi gợi ý thêm quần navy là thất bại chỉ vì tổng tiền tăng là sai với mục tiêu owner đã làm rõ. Vòng này giữ nguyên lịch sử và điểm cũ, ghi cách hiểu mới trước khi chạy: bán thêm có giá trị phù hợp cho khách được chấp nhận; không mặc định lựa chọn rẻ nhất, cũng không bắt mọi lượt phải upsell. Ngân sách và yêu cầu dừng thực sự của khách vẫn phải được tôn trọng.

Ca `r5-shipping-threshold` đạt: bot chọn navy để tránh trùng quần đen, giải thích giá trị đổi cách phối và freeship đúng điều kiện. Ca `r14-freeship-extra-pants` cũng đạt khi chọn mua áo riêng và giải thích theo băn khoăn đã có nhiều quần. Hai chiến lược có thể cùng hợp lý; chất lượng phụ thuộc cả hội thoại. Ca ngân sách 600k không bị đánh trượt vì bán ít: vấn đề là khách giao shop chọn một cách phối cụ thể nhưng bot trả lại hai cách mặc để khách tự quyết.

Hai prompt, model/config và toàn bộ runtime của 42 ca đều giữ nguyên vòng 18. Chỉ hai hợp đồng evaluator và cách hiểu review thay đổi trước kết quả. Vì vậy 33/42 so với điểm cũ không chứng minh chất lượng sinh câu đã được cải thiện. Đây là quan sát mới với cách chấm đã sửa, không phải thử nghiệm một bản sửa generation. Fixture chưa có hành vi mua thực tế để chứng minh conversion.

## Sáu fallback cần đọc theo căn cứ và phạm vi lời khẳng định

| Ca | Captured verdict | Nhận xét có thể rút ra |
|---|---|---|
| `r5-competitor-price` | UNSUPPORTED_PROTECTED_ASSERTION, profile ST411 | Candidate giải thích cả bộ/tách phối rồi mở rộng sang giữ vẻ gọn gàng suốt ngày. Verdict không chỉ rõ clause; chưa thể kết luận mọi kỳ vọng lợi ích từ thiết kế hay ít nhăn đều phải bị chặn. |
| `r5-try-exchange` | MATERIAL_CONDITION_LOSS, exchange:r5 | Candidate nói “sạch thơm”, trong khi nguồn yêu cầu sạch và không mùi. Đây có thể là khác biệt ảnh hưởng quyền đổi; nguyên nhân cụ thể chưa được verdict giải thích. Không yêu cầu nhắc lại toàn bộ chính sách đã có trong lịch sử. |
| `r14-stage-light-change` | UNSUPPORTED_PROTECTED_ASSERTION, profile SM613 | Đã tránh áo trắng cho sân khấu nhưng lại khẳng định áo xanh kín đáo hơn dưới đèn, khi không có căn cứ opacity cho áo xanh. Đổi màu không tự chứng minh giải quyết được lo ngại. |
| `r14-refund-before-buy` | EFFECT_WITHOUT_RECEIPT, SM613 | “Em lưu đơn áo trắng size M” trong lượt hỏi chính sách trước mua có thể hàm ý đã ghi đơn, khi không có quyền/receipt tương ứng. Phân biệt ACK lựa chọn với thực hiện đơn theo cả ngữ cảnh; không dùng từ “lưu” làm bộ lọc. |
| `r15-fit-reassurance` | UNSUPPORTED_PROTECTED_ASSERTION, profile ST411 | Candidate khẳng định không hề bị cạp cứng và thoải mái cả ngày. Phân biệt đặc tính vật liệu tự thêm với tư vấn kỳ vọng có căn cứ; schema không chỉ rõ phần bị chặn, rejection chưa tự chứng minh nó đúng. |
| `r15-known-waist-next` | UNSUPPORTED_PROTECTED_ASSERTION, profile QU714 | Candidate hỏi vòng mông đúng bước, nhưng nói eo 74 hợp M trước khi có fit đầy đủ. Cần xác định chỉ mô tả khoảng eo hay đã chốt phù hợp toàn khách. Ca `r12-pants-known-waist` nói khoảng eo M rồi hỏi mông được PASS; ranh giới đang nhạy với diễn đạt. |

Cả sáu actual terminal đều là fallback `C3_A_NONPROTECTED_V1`; khách không nhận candidate. Điểm chất lượng phản ánh việc mất câu trả lời và bước mua, không cho điểm thay bằng candidate hay bỏ attempt khỏi denominator. Không timeout, provider error hoặc retry gây ra sáu fallback này. Verdict chỉ có loại vi phạm và protectedRef; các diễn giải nguyên nhân cụ thể ở trên là phân tích có giới hạn.

## Ba reply được cho qua nhưng primary review chưa đạt

`r5-delivery-timing` nói đúng lịch dự kiến nhưng nối lời khuyên “cân nhắc phương án khác” chung chung. Owner đã yêu cầu trả trạng thái giao ngắn gọn hoặc giới thiệu món tương tự có căn cứ giao kịp. Context không có món như vậy; cần sửa cách kết thúc lượt theo khả năng có sẵn, không bịa sản phẩm/lịch giao hay đẩy khách đi chuẩn bị đồ khác.

`r16-budget-alternative` giữ đúng tổng 524k và không vượt ngân sách 600k. Tuy nhiên khách nhờ chọn một cách phối khác thì bot chỉ quay lại áo trắng với quần đen, nói thả suông hoặc sơ vin đều được. Điểm yếu là chưa nhận trách nhiệm chọn phương án tư vấn; có thể xử lý bằng dữ liệu/cách phối hiện có, không cần thêm role/tool.

`r7-price-ready-fit` được verifier PASS nhưng primary review còn nghi ngờ câu “chất vải đứng form”. Profile có thành phần vải, thiết kế và dữ kiện ít nhăn, chưa xác nhận riêng thuộc tính đứng form. Đây là **concern chưa được owner phân xử** giữa suy luận thiết kế thông thường và đặc tính vật liệu có thể quan sát; không ghi nó là unsafe false PASS đã được chứng minh. A2 không có unsafe send-eligible false PASS quan sát được trên population/config đã freeze. STOP đã có căn cứ độc lập từ tỷ lệ fallback và các nhóm chất lượng.

## Hướng xử lý cần chốt trước run tiếp theo

Giữ cách chấm theo kết quả mua hàng của cả hội thoại. Chốt cách hiểu theo căn cứ và phạm vi câu nói cho ba ranh giới còn nhạy: kỳ vọng mặc thoải mái từ thiết kế/fit so với đặc tính hoặc kết quả sử dụng tự thêm; khoảng eo so với fit toàn khách; ACK lựa chọn so với ghi đơn. Đọc cả các ca PASS tương tự khi xét rejection, không nới mọi lời thuyết phục hoặc thêm danh sách từ cấm. Chưa sửa prompt/schema sau khi thấy kết quả vòng 19.

Nếu có một run mới được owner cho phép, ưu tiên sửa quyết định và bước xử lý trong prompt tư vấn ở phạm vi này; chỉ sửa context khi có dữ liệu shop đã xác nhận, nhất là sản phẩm thay thế cho sân khấu hoặc hạn giao. Không dùng giả thiết thiếu dữ liệu để biến tư vấn thành giải thích kiến thức. Không có căn cứ thì bổ sung nguồn hoặc trả trạng thái hiện có gọn gàng.

Đây vẫn là primary review chủ quan, không blind/independent/human acceptance. 42 ca synthetic development, một lần/ca, không đo variance, chưa kiểm tra dữ liệu shop thực, conversion hoặc hành trình có state. Model alias không pin immutable weights. Không tiếp tục tự động vòng khác hoặc post-A.

## Evidence và vận hành

164 generation requests và 1 OAuth request; tối đa một generation mỗi registered role slot, retry/error/timeout đều 0. Provider usage: 744.622 input và 68.475 output tokens, có tính Gemini thinking; provider không expose cost. Verifier A3 p50/p95 là 6.879/16.195 ms; latency verification thêm vào là 6.881/16.204 ms.

7 executable sources và 11 frozen assets khớp hai source seals; 164 captured bodies khớp runtime allowlist, evaluator labels không leak. 396/397 file eval cũ giữ nguyên byte, chỉ protocol support thay đổi. Không thêm semantic role/layer/gate/state; không production wiring, parser/router/template/repair/reverify, tool/state/mutation/promotion/deploy/live send.

[Toàn bộ hội thoại và review](A3_CONVERSATIONS.md), [chín ca chưa đạt](A3_FAILURE_REVIEW.md), [báo cáo Checkpoint A](CHECKPOINT_A.md), [lệnh thực sự chạy](READINESS.md), [audit](audit.json).
