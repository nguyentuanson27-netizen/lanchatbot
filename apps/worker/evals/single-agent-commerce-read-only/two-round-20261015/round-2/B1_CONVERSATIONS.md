# Vòng 2 — kết quả khách thực nhận

Ba ca ưu tiên đã chạy; năm ca còn lại NOT_RUN vì prefix có fallback. Review chủ quan của coding agent, chưa có human acceptance.

## 1. b1-changed-occasion

Khách: Chị đang xem set Thạch Thảo SV2447 để đi tiệc trong nhà.

Shop: Set này có thể mặc đi tiệc chị nhé.

Khách: Chị phải lên sân khấu có đèn rọi thẳng, chị ngại thấy bóng áo lót. Vậy còn nên lấy set này không?

Terminal: FALLBACK / FAIL

Phần này em chưa trả lời được, chị nhé.

Nhận xét toàn lượt: Khách cần quyết định mua khi chuyển sang sân khấu. Terminal chỉ fallback, chưa giải quyết câu hỏi.

## 2. b1-current-policy

Khách: Trước đây chị nhớ shop nói đổi trong 7 ngày.

Khách: Giờ chị nhận được 10 ngày, mới ướm bên ngoài người, chưa mặc hay giặt, còn nguyên tem và sạch. Đổi màu được không em? Phí đổi bao nhiêu?

Terminal: FALLBACK / FAIL

Phần này em chưa trả lời được, chị nhé.

Nhận xét toàn lượt: Khách hỏi đổi màu/phí dựa trên tình trạng đã kể. Terminal chỉ fallback, không trả được cả thời hạn/phí có nguồn.

## 3. b1-partial-source

Khách: Set Thạch Thảo SV2447 chất gì em, giá bao nhiêu và còn size M không?

Terminal: SEND_ELIGIBLE / PASS

Set Thạch Thảo kết hợp giữa tơ Hàn thêu cao cấp cho phần áo (mềm, thoáng, có độ bay tự nhiên cùng các họa tiết thêu nổi tinh xảo) và ren tơ Hàn cho phần chân váy (mềm mại, nữ tính với độ rũ uyển chuyển). 

Hiện tại giá bán và tình trạng tồn kho size M của set này chưa hiển thị trên hệ thống nên mình chưa kiểm tra chính xác được ngay lúc này nhé ạ.

Nhận xét toàn lượt: Trả đúng hai chất liệu theo thành phần và nói rõ giá/tồn chưa kiểm tra được; không bịa con số/tồn hoặc hứa theo dõi sau chat. Chưa hiển thị là mô tả phần dữ liệu hiện chưa có, không gán một nguyên nhân đồng bộ. Hữu ích như câu trả lời một phần, nhưng đoạn chất liệu dài, nhiều tính từ và dấu ngoặc, giọng còn như mô tả sản phẩm.
