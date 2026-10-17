# Vòng 1 — kết quả khách thực nhận

Ba ca ưu tiên đã chạy; năm ca còn lại NOT_RUN vì prefix có fallback. Đây là review chủ quan của coding agent, chưa có human acceptance.

## 1. b1-changed-occasion

Khách: Chị đang xem set Thạch Thảo SV2447 để đi tiệc trong nhà.

Shop: Set này có thể mặc đi tiệc chị nhé.

Khách: Chị phải lên sân khấu có đèn rọi thẳng, chị ngại thấy bóng áo lót. Vậy còn nên lấy set này không?

Terminal: FALLBACK / FAIL

Phần này em chưa trả lời được, chị nhé.

Nhận xét toàn lượt: Khách hỏi có nên lấy set để lên sân khấu. Terminal chỉ là fallback, chưa giúp quyết định hoặc đưa lý do có căn cứ.

## 2. b1-current-policy

Khách: Trước đây chị nhớ shop nói đổi trong 7 ngày.

Khách: Giờ chị nhận được 10 ngày, mới ướm bên ngoài người, chưa mặc hay giặt, còn nguyên tem và sạch. Đổi màu được không em? Phí đổi bao nhiêu?

Terminal: FALLBACK / FAIL

Phần này em chưa trả lời được, chị nhé.

Nhận xét toàn lượt: Khách hỏi đổi màu và phí theo tình trạng đã nêu. Terminal chỉ là fallback, mất cả phần thời hạn/phí có thể trả từ nguồn.

## 3. b1-partial-source

Khách: Set Thạch Thảo SV2447 chất gì em, giá bao nhiêu và còn size M không?

Terminal: SEND_ELIGIBLE / PASS

Set váy Thạch Thảo được làm từ sự kết hợp giữa áo tơ Hàn thêu cao cấp và chân váy ren tơ Hàn mềm mại, mang lại cảm giác bay bổng, nhẹ nhàng với các họa tiết thêu nổi tinh tế. 

Hiện tại hệ thống bên mình chưa tra cứu được giá và tình trạng tồn kho chính xác của size M bạn nha.

Nhận xét toàn lượt: Trả được chất liệu có nguồn và nói rõ giá/tồn chưa tra được; không bịa giá, tồn hoặc hứa theo dõi sau chat. Đủ hữu ích trong giới hạn nguồn hiện tại. Còn dài, nhiều tính từ và đổi cách xưng hô sang bạn; ghi là hạn chế giọng, không biến thành lỗi an toàn.
