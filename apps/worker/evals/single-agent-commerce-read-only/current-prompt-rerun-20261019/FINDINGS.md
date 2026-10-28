# Findings — chạy lại prompt hiện hành

16/16lượt đã hoàn tất, cùng prompt/runtime/model/config/case của vòng trước. Review vẫn7USABLE; số fallback tăng2→3. Chưa có cải thiện ổn định về tư vấn hoặc giọng. Đây là một mẫu chạy mới, không phải kết quả của một bản fix mới hoặc bằng chứng nhân quả từ chênh lệch điểm.

## Hai lỗi context lặp lại

Ca đi xe trước đám cưới vẫn tích lũy7runtimeProducts trong context, vượt bound4. Integrated và advice replay cùng MALFORMED trước verifier; không có verifier request cho hai draft ấy. Offline diagnostic chỉ giảm mảng trên bản sao7→4 thì hardPrecheck trả null. Không dùng bản sao để chạy lại hoặc coi draft an toàn.

Runtime không đổi nên lỗi có thể tái diễn dù câu tư vấn khác. Root cause trực tiếp tiếp tục là contract tích lũy kết quả tool không khớp bound context. Cần xử lý tại nơi giữ/chọn nguồn trong bound đã có, không thêm luật ngôn ngữ, regex hoặc chỉ tăng bound để mẫu này qua. Vòng này chỉ đo lại, không thực hiện fix.

Draft integrated lần này chọn một mẫu Thanh Vũ, tập trung hơn draft nhiều lựa chọn ở vòng trước; nhưng chưa được xác minh/gửi, và lý do chuyển sang đặc điểm áo khi nỗi lo vừa nói ở chân váy. Replay vẫn đưa nhiều mẫu và một lời trấn an không lo nhăn. Không biến cải thiện lựa chọn trong draft thành cải thiện actual customer outcome.

## Fallback mới: suy từ chưa biết thành shop có bán

Advice partial-source viết: “Shop có hỗ trợ lấy riêng chân váy ạ.”. Verifier trả UNCERTAIN/violations[]. Trong exact owner wire, trusted.products[0].availableOffers=null; nguồn mô tả chân váy không xác nhận lựa chọn bán. Model đã nhận dấu hiệu unknown rõ ràng, không phải dữ liệu bán lẻ được xác nhận nhưng bị code bỏ khỏi request.

Đây là một câu mới trong run, thuộc nhóm lỗi đã gặp là suy từ thiết kế/thiếu nguồn thành quy định bán hàng. Nguồn POS của ca này được cố ý làm unavailable để kiểm cách trả lời một phần. Không chấm việc model không lấy được giá/tồn là lỗi; phần sai là tự xác nhận khả năng mua lẻ khi chưa có căn cứ.

Provider không trả giải thích chi tiết cho UNCERTAIN; nhận định ở trên là đối chiếu người review với draft/source. Không quy verdict cho cụm “hệ thống”, tính từ thẩm mỹ hoặc giọng bán hàng. Không tự sửa verifier từ kết quả này. [Đủ ba draft và terminal](FALLBACKS.md), [diagnostic/source](BOUNDARY_DIAGNOSIS.json).

## Giọng và quyết định mua vẫn yếu

- Câu correction vẫn đọc lại eo/mông rồi nói đã cập nhật và giữ nguyên trong giỏ, giống biên bản xử lý. State/receipt đúng nhưng chưa là lời tiếp nhận tự nhiên.
- ACK không còn cùng hai câu mời xem thêm như lần trước, nhưng nhắc lại đặt trước và mở bảng tiền ở cả hai tin đầu. Thông tin tiền thay đổi có ích; khi khách hỏi lại tổng thì trả lại là đúng. Không cấm mọi việc nhắc thông tin theo kiểu đếm từ.
- Concern integrated ngắn hơn bản ba đoạn trước, nhưng vẫn dùng ren mềm/form nhẹ/độ rũ để phủ nhận lo nhiều ren. Replay khuyên cả bộ rồi lại đưa cả áo và chân váy như cách tiết chế ren, chưa giúp khách chọn rõ hoặc biết phối phần nào.
- Lookup integrated gọi áo/nguyên bộ rõ, trả đúng giá. Replay vẫn dùng “Bản AO / Bản COMPOSITE”, nặng hơn bản trước chỉ có “composite”. Đây là lỗi diễn đạt loại bán, không phải giá sai. Cùng context có thể được nói rõ, nhưng hành vi model chưa ổn định.
- Preview và “ghi nhận xác nhận mua hàng” do formatter code dựng nên giữ giọng cũ. Thay mẫu chạy/prompt không thay được những câu ấy.

## Những phần vẫn làm được

Một hành trình giữ đúng áo/be/M → L/hai chiếc → quote978100 → sửa74/96, giữ L → actual checkout invitation → private preview → xác nhận mua. Không thêm kết luận fit. Private checkout0model requests; test DB đã drop. Handoff control đúng ownership; không phải bằng chứng nhân viên đã phục vụ hoặc đơn POS đã tạo.

Hai lần integrated gần nhất đều tra đúng giá SD375, nhưng chưa có fix exact/discovery nên không kết luận lỗi mã kèm tên đã được giải quyết. Giá không bịa trong ca thiếu nguồn; finding ở giọng và lời xác nhận bán lẻ của replay.

Giữ STOP readiness. Ưu tiên có căn cứ vẫn là contract nguồn/context và nhãn/formatter khách đọc, rồi chất lượng lựa chọn và giọng. Không thêm ví dụ benchmark, gate, role hoặc tự mở vòng tiếp. Vòng này không sửa prompt/runtime, không live send/deploy.
