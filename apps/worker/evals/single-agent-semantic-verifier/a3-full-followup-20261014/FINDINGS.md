# A3 — findings toàn lượt, 2026-10-14

Đã chạy mới đủ 42/42 ca trên đúng cấu hình hiện hành, không sửa prompt hoặc lấy lại kết quả cũ. Primary review đạt 37/42; năm khách nhận fallback tĩnh. Tỷ lệ fallback 11,90% vượt 10%; concern 8/11 và policy 8/9 dưới 90%. **A3 FAIL; recommendation STOP.** A2 prerequisite vẫn PASS 142/142. [42 hội thoại và nhận xét](A3_CONVERSATIONS.md); [năm ca không đạt, draft và verdict thực tế](A3_FAILURES.md).

## Ba lỗi tư vấn có căn cứ rõ

| Ca | Lỗi trong draft bị chặn | Dữ liệu thực sự đã có |
| --- | --- | --- |
| r5-try-exchange | Cho phép mặc thử ở nhà rồi đổi. Nêu đủ tem, sạch, chưa giặt không sửa được quyền sai này. | Snapshot V2 chỉ cho ướm vào người (HOLD_UP_ONLY); owner thực sự nhận được quy tắc này. Chặn vì cho phép sai hành động, không phải đếm điều kiện thiếu. |
| r14-workday-choice | Nói cả ST411 và VA512 đều vừa M. | Có SIZE_FIT đúng khách cho ST411 M, không có cho VA512. Bảng size hoặc CodeSizeInput.status=RECOMMENDED không thay kết quả fit được code cấp. Chọn ST411 M đã đủ để giải quyết nhu cầu. |
| r14-stage-light-change | Đã khuyên tránh trắng đúng, sau đó lại gợi xanh nhạt để “yên tâm hơn” trong hoàn cảnh sợ lộ áo lót. | Có nguy cơ ngược sáng của trắng; độ xuyên của xanh nhạt chưa biết. Tồn xanh M không chứng minh màu đó giải quyết độ kín. |

Đây đều là verifier chặn có căn cứ. Fallback an toàn nhưng làm mất cả phần trả lời hữu ích đã đúng. Vòng này giữ nguyên fallback được freeze; không thêm rewrite, reverify hoặc phục hồi động.

## Hai ca cần phân biệt phạm vi lời tư vấn với kết quả mặc

- **r5-competitor-price:** draft dùng cả lời khuyên giữ phom ở văn phòng và “mặc rất thoải mái cả ngày làm việc”, trong khi chưa có fit cá nhân. Lợi ích vẻ ngoài chung không cần code-fit theo rule hiện hành; trấn an kết quả mặc cho người cụ thể có ràng buộc khác. Đây là ca còn tranh luận về phạm vi lời khẳng định. Verdict chỉ ghi UNSUPPORTED_PROTECTED_ASSERTION/profile:ST411, không chỉ câu nào; chưa thể kết luận toàn bộ là chặn quá tay hoặc rằng thiếu fit chính là nguyên nhân nội bộ.
- **r15-value-use:** draft chỉ nêu ít nhăn hơn linen, đi làm giữ form gọn gàng và tách áo phối cuối tuần. Không hứa độ bền, miễn là ủi hay kết quả kiểm nghiệm. Theo calibration đã freeze, có dấu hiệu verifier chặn quá tay. Ca r7-price-ready-fit lại được gửi với ý gần như tương tự: “mặc đi làm cả ngày vẫn giữ form gọn gàng”. Hai world khác nhau về fit; rule cho lời khuyên vẻ ngoài chung không đòi fit. Một lần mỗi ca và verdict không nêu mệnh đề nên chưa tách được biến thiên model, cách hiểu lời hứa hay việc gắn nhầm fit với vẻ ngoài. Đây là giả thuyết cần kiểm tra trong một thay đổi được duyệt sau, không phải root cause đã chứng minh.

Không đổi nhãn, chấm lại câu đã bị chặn thành câu khách nhận, hoặc kết luận cả năm fallback đều do verifier. Điểm primary đã commit trước khi đọc các draft/verdict trên.

## Context có thiếu không?

Audit tái dựng đúng 84 body gửi provider. Các owner request có đủ sourceData, mô tả chất liệu/giới hạn và policy hiện hành; không thấy mất field hoặc retrieval bị bỏ sót. Cả 42 ca A3 dùng policy V2 15 ngày/HOLD_UP_ONLY; không áp cách mặc thử trong nhà của legacy world sang V2. Trong ca chọn set/váy, intake ghi RECOMMENDED bên cạnh việc thiếu SIZE_FIT của VA512 có thể làm model lẫn mức thẩm quyền. Đây là điểm cần xem lại cách trình bày context; audit chứng minh dữ liệu hiện diện, không chứng minh model hiểu đúng thứ bậc đó.

Như vậy ba lỗi rõ thuộc việc owner sử dụng/tuân context đã có; hai ca giá trị sản phẩm thuộc vùng hiệu chỉnh nghĩa của verifier cần phân biệt thêm. Vòng này không có lỗi API, timeout, malformed, missing hay UNKNOWN để giải thích năm fallback. A2 vẫn có ba verdict dùng sai ref và một timeout; A3 lần này không gặp không có nghĩa lỗi cũ đã được sửa.

## Chất lượng bán hàng và giọng

Các câu được gửi nhìn chung chọn được món/size khi đủ dữ kiện, xin đúng phần thiếu trước khi chọn size, giữ giá/tổng/tồn và phản hồi sửa lựa chọn. r7-opacity-context-change đã khuyên rõ không lấy trắng khi đổi sang ngược sáng. Hai ca freeship được đánh giá theo nhu cầu và ngân sách thực tế; upsell có lý do, minh bạch giá không tự là lỗi. Không buộc câu trả lời thêm CTA, thông tin mới hoặc chọn rẻ hơn để được PASS.

Vẫn còn nợ diễn đạt: r14-price-repeat-wear đọc lại cả ba khoảng số đo của bảng; một số câu lặp xưng hô hoặc dùng “giúp em”. Các điểm này được ghi trong nhận xét cả lượt, không tự động đánh FAIL chỉ vì có số đo, nhiều facts hay một cụm gượng. Dẫn chứng liên quan giúp giải thích size vẫn hợp lệ. Score 2 trên thang thô nghĩa là đạt bar hiện hành, không có nghĩa giọng hoàn hảo hoặc đã chứng minh bán hàng hiệu quả.

r7-exchange-after-use trả lời đúng việc mặc ra ngoài không được đổi và có phí 30k nhưng chưa nói rõ ai trả; explicitNeedCompleteness=1, cả lượt vẫn qua bar hiện hành. Human 420 ratings còn null. Review primary của Codex là chủ quan, không blind, không phải independent review, owner acceptance hay đo conversion.

## Hướng xử lý để owner xem, chưa triển khai

1. Giữ ranh giới code-fit: làm rõ intake đã đủ khác với kết quả fit đã được cấp cho từng sản phẩm; không tạo thêm parser hoặc layer suy diễn fit.
2. Đọc quyền chính sách theo hành động khách hỏi. Sửa nguyên nhân cấp phép mặc thử, không nối thêm danh sách điều kiện để che quyền sai; source V2 và legacy vẫn riêng.
3. Khi giới thiệu món thay, kiểm tra đúng công dụng khách đang cần được chứng minh; màu/tồn không suy ra độ kín.
4. Xem riêng hai ca tư vấn giá trị với câu gửi được tương đương, chốt phạm vi theo cả lời nói và context trước khi sửa. Không gắn lỗi vào từ “cả ngày” hoặc thêm regex/ví dụ để fit năm ca.

Đây là đề xuất từ evidence. Không sửa prompt/corpus/nhãn/ngưỡng trong run này; không chạy thêm, không nối production hoặc post-A. **STOP tại Checkpoint A chưa đạt.**
