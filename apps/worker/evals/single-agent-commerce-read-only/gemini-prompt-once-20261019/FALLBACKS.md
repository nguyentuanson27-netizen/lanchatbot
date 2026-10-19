# Hai fallback — một tình huống đi ô tô trước đám cưới

Cả hai terminal đều MALFORMED trước semantic verifier, không phải hai verdict FAIL. Search đã tích lũy 7 runtimeProducts, vượt bound hiện hành 4. Replay kế thừa chính context ấy. Giữ nguyên cả hai outcome trong denominator16; đây là một nguyên nhân context/bound chung, không phải hai lỗi verifier độc lập.

Code trả cho khách ở cả hai lượt:

> Phần này em chưa trả lời được, chị nhé.

## Integrated B1

Khách:

> Chị đi ô tô gần 3 tiếng mới tới nơi. Mặc bộ này có dễ nhăn không em? Có mẫu nào đỡ nhăn hơn thì em chọn giúp chị nhé.

Draft owner chưa được xác minh/gửi:

> Dạ, Set Thạch Thảo dùng chất liệu tơ và ren tơ mềm bay, nên khi chị ngồi ô tô liên tục gần 3 tiếng thì ít nhiều sẽ bị hằn nếp gấp ở phần váy và áo ạ. 
> 
> Nếu chị muốn tìm mẫu ít nhăn hơn và giữ form tốt sau chuyến đi dài để vào đám cưới luôn, chị có thể tham khảo:
> - **Set Thanh Vũ** (với áo ren dệt sợi cotton) hoặc **Váy Ngọc Trâm** (ren hoa nổi kết hợp tơ ống đứng form hơn).
> - Hoặc nếu thích sự thoải mái tối đa khi ngồi xe, **Set quần Uyển Hoa** (chất thô đũi form quần short) cũng rất gọn gàng và ít lộ nếp gấp hơn váy dài.
> 
> Chị muốn em gửi chi tiết mẫu nào trong số này không ạ?

Owner2generations,1tool round,3tool calls (bao gồm chuẩn bị nguồn); verifier0. Query model là set váy và đầm; nhu cầu ít nhăn chưa nằm trong truy vấn. Draft đưa nhiều món và hỏi khách chọn tiếp dù khách nhờ shop chọn giúp. Không kết luận draft an toàn chỉ vì nguyên nhân terminal là structural bound.

## Advice replay

Draft owner chưa được xác minh/gửi:

> Set Thạch Thảo dùng chất liệu tơ Hàn và ren tơ Hàn mềm, có độ bay và rũ tự nhiên nên giữ form khá tốt, đi ô tô 3 tiếng không bị nhăn nhiều đâu chị nha. 
> 
> Nếu chị muốn tìm mẫu váy liền form đứng, ít nhăn hơn nữa khi di chuyển lâu, chị có thể tham khảo **Váy Diệp An (V168)** hoặc **Váy Ngọc Trâm (V406)** với chất liệu tơ ống và ren hoa nổi, mặc vừa gọn gàng, thanh lịch lại rất thoải mái ạ. Chị ưng mẫu nào để em tư vấn kỹ hơn nhé!

Owner1generation, verifier0. Replay không có tool; world của ca integrated đã chứa7runtimeProducts. Nhận định giữ form/không nhăn nhiều và các mẫu thay chưa được semantic verifier đánh giá trong run này; không gọi đây là false PASS hay verdict chặn quá tay.

## Kiểm nguyên nhân bằng code hiện có

hardPrecheck trên exact captured context/draft trả MALFORMED. Chỉ trong bản sao diagnostic offline, giảm runtimeProducts còn4 thì precheck trả null, giữ các phần khác. Điều này xác định nguyên nhân cấu trúc; không sửa input lịch sử, không áp bản sao vào runtime, không gọi verifier hoặc gửi lại draft. [Kết quả diagnostic](BOUNDARY_DIAGNOSIS.json). Không tăng bound hoặc sửa prompt trong vòng này.

