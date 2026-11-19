# Phase C — review hai lần sửa giọng và rollback, 19/11/2026

Hoàn tác lượt sửa gần nhất `089dde39`, gồm mục Giọng chat, formatter preview checkout và harness mới. Khôi phục toàn bộ `apps/` và `packages/` về nội dung ở `8810904e`, bản trước lượt sửa này. Kế hoạch đã duyệt và cả hai bộ kết quả được giữ trong lịch sử PR. Hai lượt được review là sửa dữ liệu thương lượng P1/P2 ngày 18/11 và sửa mục Giọng chat ngày 19/11.

## Kết quả hai lượt

| Lượt | Phép đo | Bằng chứng |
| --- | --- | --- |
| **18/11 — P1/P2 trên `7fb18936`** | Gỡ lời văn quy trình khỏi một số field owner và sửa cách biểu diễn lựa chọn chưa xác định. Giữ cùng prompt. | 1/6 ca đích đạt giọng, thắng ròng −3. Chỉ 4/8 cặp thực sự thay wire. Hai lượt sau mở giỏ và hai control có request giống hệt. Lần thắng duy nhất xảy ra trên input giống hệt. |
| **19/11 — sửa Giọng chat trên `089dde39`** | Giữ cùng dữ liệu, lời các lượt trước và tool trace. Chỉ thay system prompt trong đối chứng. | Cả hai nhánh đều đạt 6/6 theo cờ giọng. Bản sửa 0 thắng, 1 thua, 5 hòa ở ca đích. Ngoặc vẫn 4/6 ở mỗi nhánh. S04 bỏ điều kiện đặt trước ở cả hai. Preview checkout đạt kiểm tra riêng. |

Hai phép đo dùng nhóm ca và tiêu chí chấm khác nhau. Chúng cho thấy các lỗi vẫn xảy ra sau mỗi thay đổi, chưa đo mức cải thiện ổn định qua nhiều lần sinh. Cả hai đều là replay của lời đáp chưa qua verifier. [Lượt 18/11](evidence/c3-support-source-screen-20261118/REPORT.md) · [Lượt 19/11](evidence/c3-chat-priority-screen-20261119/REPORT.md).

## Nguyên nhân gốc và bằng chứng

**1. Phần chuẩn bị lời đáp còn đưa nhiều cách trình bày cho cùng một quyết định.**

- **P06 hỏi tổng ba món.** Wire chứa cả `openingQuote.text` dựng sẵn “SD023 hiện có giá 989.000đ. Size: S, M, L” và `preCartQuote` có tổng đúng 1.019.000đ. Hai bản chọn giá bộ làm câu chính, chèn tổng vào ngoặc rồi nói size. Bản sửa dùng chỉ dẫn “giá hoặc tổng tiền” nhưng cả hai con số đều đã xác minh. Việc phân biệt câu nào trả đúng lượt vẫn phụ thuộc vào model khi nhìn đồng thời bản giá có sẵn và kết quả tổng.
- **S04 hỏi màu khác.** Trong captured request, trắng có `IN_STOCK`, be có `PRE_ORDER` ở đủ S–XL, theo từng tuple của đúng áo lẻ. Cùng wire còn có trạng thái tổng hợp của offer và thẻ giá/size. Cả hai draft lấy tên màu và bỏ điều kiện mua của màu be. Full native trước đó từng trả đủ trên ca này. Điều đó xác nhận có dữ liệu và cách dùng đúng, còn tác động của cách sắp xếp nguồn cần đối chứng riêng.
- **S15 thích màu be rồi cảm ơn.** `read_product` cũng đưa `openingQuote.text` chứa giá và danh sách size, dù khách chỉ nói thích màu be rồi cảm ơn. Câu model tiếp tục theo thói quen báo giá và mở thêm việc phối đồ. Luồng hiện dựng được thẻ giá từ `firstContact` và bằng chứng giá của offer, không cần câu khách là hỏi giá. Đây là một đường cụ thể mà dữ liệu có thể kéo lệch trọng tâm.

**2. Hai bản sửa để lại cùng việc cho model tự quyết ở bước viết cuối.**

- P1/P2 loại phần `meaning` khỏi vài projection và bỏ nhãn suy diễn khách chưa chọn mua. Ở các input đổi wire, model vẫn có prompt nghiệp vụ, hướng dẫn tool và lịch sử về lúc mở giỏ/xét hỗ trợ. Hai câu mở đầu vẫn đẩy việc thêm giỏ sang khách. Một câu J4 hứa “mức hỗ trợ tốt nhất” khi chưa xét. Một câu J4 chỉ báo giá rồi hỏi màu, để lửng yêu cầu xin hỗ trợ. Đây là lựa chọn nội dung ở draft, không có bằng chứng verifier đã cho gửi các câu đó.
- Lượt 19/11 bỏ ngoại lệ rộng của ngoặc, đồng thời bỏ câu dặn trực tiếp chỉ nói phần mới và không lặp lời mời chốt. **J4/T3** đã có đúng tổng 499.000đ trong tool, và trong history có đúng câu mời chọn màu để lên đơn. Draft mới dùng lại cả câu chốt. **J2/T2** nhận kết quả engine M và vẫn nhận toàn bộ hồ sơ năm số đo, kèm tin khách vừa sửa. Draft mới đọc lại ba số đo trong ngoặc. Hai phép đo xác nhận đâu là dữ kiện có sẵn và câu nào model chọn. Chúng chưa cô lập mức ảnh hưởng riêng của lệnh cũ, thẻ dữ liệu và history.

**3. Chấm mù nhận ra thiếu dữ kiện lớn, nhưng điểm giọng còn rộng hơn mục tiêu bán hàng.**

Ngày 18/11, một lỗi control đến từ việc judge đòi ảnh ở replay chữ và một lỗi khác đến từ đánh giá độ vừa. Kết luận STOP vẫn đứng vì nhóm đích yếu và có lời hứa vượt căn cứ. Ngày 19/11, judge chấp nhận P06 có tổng trong ngoặc và J2 đọc lại nhiều số đo. Với S08, judge ưu tiên bản có Odette sẵn hàng như phương án nếu cần gấp. Chi tiết này giúp khách ra quyết định, nên cần giữ khả năng nêu phương án thay thế khi có đánh đổi thật. Chấm giọng phải xét câu chính đã đáp việc khách đang cần, thông tin nào làm đổi quyết định và câu hỏi nào thực sự giúp mua.

Điểm cần cô lập trong phép kiểm kế tiếp là thứ tự và vai trò dữ kiện ở lần viết câu cuối, dùng cùng input để đo riêng thẻ báo giá, kết quả tổng và điều kiện bán theo đúng lựa chọn. Dữ liệu chuẩn của verifier, thẩm quyền giá/tồn/size và form báo giá ads có ảnh là các điều kiện đối chiếu. Hai lượt hiện có cho thấy dấu ngoặc là biểu hiện của việc xếp nội dung phụ lên trước hoặc đẩy ý chính xuống dưới. Chúng chưa chứng minh một cách trình bày nguồn cụ thể sẽ sửa ổn định.

[Source dựng thẻ báo giá](../../apps/worker/src/single-agent-commerce-read-only-tools.ts#L487) · [Đường xây kết quả tổng tiền](../../apps/worker/src/single-agent-commerce-quote.ts#L218) · [Giới hạn nhiệm vụ verifier](../../apps/worker/evals/single-agent-commerce-read-only/prompts/verifier.vi.txt#L4).

## Kiểm rollback

So sánh Git xác nhận nội dung `apps/` và `packages/` trùng `8810904e`. Build worker, lint, dataset boundary, 516 test worker và 122 test eval đều qua. Lượt review dùng log và wire đã có, 0 lượt gọi model mới. Trạng thái Phase C là STOP.
