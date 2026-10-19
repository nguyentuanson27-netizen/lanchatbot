# Findings — selective sales voice run

Recommendation: STOP readiness. Completed 48/48 outcomes and 9/9 jobs. No automatic fix or further model run.

## 1. Giọng owner chưa cải thiện ổn định

Cả sáu câu concern vẫn nhắc ngân sách900k và bám chuỗi ren mềm/form nhẹ/độ rũ/nhã nhặn. Chúng trả đúng băn khoăn và giá, nên không bị đánh FAIL chỉ vì lặp một cụm từ; nhưng vẫn có nhịp catalog. Prompt mới đã nói không đọc lại ngân sách để chứng minh hiểu, song chỉ dẫn này chưa chuyển thành hành vi ổn định trong mẫu này. Không suy ra thiếu thêm một câu cấm là root cause, không tiếp tục nhồi ví dụ để đạt bài kiểm tra.

Các lời xác nhận do owner sinh đều dùng đúng vai em/shop, không còn hai câu đảo chủ thể như vòng trước. Đây là quan sát có ích nhưng chưa chứng minh tác động nhân quả: mỗi ca ba lần, dữ liệu live và sampling khác nhau.

## 2. Tìm theo mã đang có xung đột contract, không phải lỗi giọng

B1 rep1/rep2 gọi search_products với query “áo dài SD375”: trả AMBIGUOUS và ba mẫu khác. Rep2 tiêu thêm lượt tìm “SD375” để MATCHED rồi không còn lượt đọc giá; reply bảo khách chờ dù không có executor. Rep3 gọi “SD375” ngay, MATCHED rồi read_product và trả929k/1.065k đúng.

Instruction đang yêu cầu giữ cả loại trang phục trong tên; đường tìm kiếm lại xử lý truy vấn có mã kèm loại đồ khác với mã đơn. Hai lượt integrated chưa có giá truyền nguyên hạn chế ấy sang hai advice captures: không có tool trong replay thì owner không thể tạo lại giá. Không tính bốn outcome này thành bốn lỗi suy luận độc lập; không dùng chúng để kết luận prompt mới làm model mất khả năng viết.

Hướng tiếp theo: đối chiếu contract exact identity/discovery ở tool hiện hữu, kiểm trực tiếp cùng mã và tên có mã. Chọn nguồn nhận diện rõ ràng rồi dùng cùng đường exact lookup; không chữa bằng ví dụ SD375 trong prompt hoặc regex theo từng mã.

## 3. Sáu fallback sân khấu vẫn thuộc ranh giới tư vấn/đặc tính

Cả ba integrated và ba replay đều FAIL. Có nguồn mô tả các món thay, nhưng owner suy thêm độ dày, độ kín hoặc lời giải cho ánh đèn cụ thể. Khánh Trang được mô tả thô boi phối ren mềm nhẹ; không có thuộc tính “dày dặn”. Ngọc Trâm có váy yếm hai lớp, không có dữ kiện độ dày hay che phủ dưới đèn đó. Diệp An có mô tả hai lớp/kín đáo; cần phân biệt lời khuyên lựa chọn thông thường với hứa đã giải quyết rủi ro khách hỏi. Advice3 còn nói thêm áo trong “là xử lý được”.

Verifier trả kind/ref, không trả giải thích đầy đủ; các nguyên nhân ở đây là đối chiếu người review với draft/source. Không coi mọi cảnh báo chất liệu hoặc mọi đề xuất món thay là sai. Đây không phải lỗi do mất phép thử cho mọi lợi ích hoặc do thiếu keyword. Lượt sửa chỉ đổi giọng owner, giữ nguyên ranh giới verifier, nên không có căn cứ kỳ vọng tự giải quyết bất đồng này.

Hướng tiếp theo: thống nhất nghĩa được phép với đúng nguồn và hoàn cảnh trước khi đổi hành vi; nếu thiếu dữ kiện sản phẩm quyết định lựa chọn, bổ sung nguồn tương ứng. Giữ quyền tư vấn tự tin và suy luận thẩm mỹ; không tự hợp thức hóa thuộc tính vật lý mới hoặc bắt mọi tư vấn có test riêng.

## 4. Giữ size khách chọn bị biến thành nhận xét độ vừa

Stateful rep2 correction đã ghi eo74/mông96, giữ L/hai áo đúng. Draft lại thêm “Chị giữ size L như vậy là chuẩn ạ!” dù lượt này không có SIZE_FIT. Verifier chặn, khách nhận fallback. Phân biệt việc mua đúng lựa chọn với đánh giá fit đã có trong prompt; lỗi tiếp diễn dù không thiếu số đo/state write.

Hướng tiếp theo: rà context và kết quả tool đang khiến lời xác nhận bị viết thành đánh giá fit; giữ việc xác nhận thao tác và kết quả recommend_size có scope riêng. Không thêm câu mẫu theo đúng số đo của bài kiểm tra.

## 5. Một câu hệ thống do readback/recovery, không phải owner

Stateful rep3 đổi L/hai áo: draft owner tự nhiên và verifier PASS. Final gate thấy offers:SV2447 đổi sourceVersion/observedAt/expiresAt và factSnapshotVersion trong lúc chạy; nội dung availableOffers không đổi. Draft cũ không được dùng. Code trả receipt-backed current-cart summary với màu BE và “Giỏ hiện có2 sản phẩm…”.

Đây là nguồn trực tiếp của câu giọng hệ thống trong ca này. Không kết luận state sai, không nới freshness gate; định dạng recovery và preview/confirmation thuộc code formatter. Preview vẫn có mã sản phẩm/màu, confirmation vẫn “ghi nhận xác nhận mua hàng”; sửa owner prompt không thay các câu đó.

## Hướng xử lý có căn cứ sau vòng này

Ưu tiên contract tìm mã và tách rõ lời owner với lời code trong đánh giá giọng. Với owner, giữ bản sửa nhỏ để làm đối chứng; đánh giá riêng nguồn mô tả mang giọng catalog và nghĩa tư vấn đang tranh luận trước khi sửa tiếp. Không rollback hoặc chỉnh prompt tự động từ một tỷ lệ tổng hợp, không tăng corpus/repetition hay chạy thêm nếu chưa có yêu cầu mới.
