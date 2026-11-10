# Findings — nguyên bản prompt Gemini, mỗi ca một lần

Đã hoàn tất16/16slots tại source `3cff648b0cfce3b68ed5b9d72a2f34fc37f18977`. Vòng này chưa cho thấy văn phong tự nhiên hơn bản ghép trước. Nghiệp vụ của hành trình mua đúng, nhưng lời owner vẫn nhiều phần cập nhật hồ sơ, lời mời chung chung và mô tả mang nhịp quảng cáo. Hai fallback có nguyên nhân cấu trúc context, không phải semantic verifier chặn tư vấn. Không quy chênh lệch điểm thành tác động nhân quả của prompt: N1, live source và một case đã đổi hoàn cảnh.

## Căn cứ đã đọc

[Toàn bộ16actual outcomes và lịch sử](CONVERSATIONS_AND_REVIEW.md), primary khóa tại `ac6870c1` trước rejected-draft/verdict diagnosis. Review7USABLE/6NEEDS_EDIT/2UNUSABLE/1ownership control; đây là nhận xét whole-turn, không phải bộ đếm keyword hoặc điểm chứng nhận. USABLE vẫn có thể có polish. Những ca cố ý thiếu nguồn không bị chấm thiếu thông tin như lỗi model; finding ở lời trả lời và bước tiếp thực sự có thể làm.

## 1. Hai fallback do context vượt bound

Ở ca đi xe trước đám cưới, hai search theo “set váy” và “đầm” tích lũy bảy sản phẩm, trong khi hardPrecheck chỉ nhận tối đa bốn runtimeProducts. Owner đã sinh FINAL nhưng code trả MALFORMED trước verifier. Advice replay dùng chính context bảy sản phẩm, nên bị cùng nguyên nhân. Verifier requests ở cả hai lượt bằng0.

Đã kiểm offline: exact capture/draft → MALFORMED; chỉ giảm runtimeProducts còn4 trên bản sao diagnostic → null, giữ các phần khác. Không dùng bản sao để chạy verifier, gửi lại, sửa raw hoặc tuyên bố draft an toàn. [Diagnostic](BOUNDARY_DIAGNOSIS.json), [hai draft](FALLBACKS.md).

Root cause trực tiếp là contract tích lũy kết quả search không khớp bound context hiện hữu. Đây là một lỗi context với hai outcome phụ thuộc, không phải hai lỗi model/verifier độc lập. Sửa về sau cần xử lý cách giữ nguồn trong bound và giữ căn cứ cho món được chọn ở tool/context hiện hữu; không chữa bằng ví dụ riêng, regex hoặc tăng vô hạn giới hạn.

Draft chưa được gửi còn có vấn đề bán hàng: integrated đưa nhiều món rồi hỏi khách muốn xem món nào dù khách nhờ shop chọn; query chưa mang nhu cầu ít nhăn. Replay khuyên giữ món cũ theo suy luận chất liệu rồi lại đưa hai món thay. Những nhận định hiệu quả chưa có verdict trong run này, không gọi chúng là false PASS hoặc chặn quá tay.

## 2. Nguyên bản prompt ngắn hơn nhưng lời chat vẫn chưa tốt

Owner prompt từ13.469bytes xuống9.195bytes; byte count là identity/quan sát, không phải mục tiêu chất lượng. Hai câu concern vẫn dùng chuỗi ren mềm/form nhẹ/độ rũ/thanh thoát/bay bổng/sang để phủ nhận nỗi lo nhiều ren và nhắc ngân sách. Một câu kéo thành ba đoạn. Vấn đề là lý do chưa giúp khách nhìn rõ quyết định mua; không phải cứ nhắc giá/ngân sách hoặc dùng tính từ là lỗi.

Hai câu partial-source không bịa giá/tồn nhưng chuyển sang “thông tin ... chưa có sẵn trên hệ thống” và “chị thông cảm”. Không cần bắt model tạo giá hay hứa báo lại để bù nguồn thiếu; phần cần sửa là cách nói và việc chuyển từ mô tả hàng sang phản hồi đúng cuộc chat.

Ở hành trình mua, ACK thêm/đổi giỏ đúng nhưng nối hai lần lời mời xem thêm/chốt chung chung, và nhắc lại đặt trước khi trạng thái không đổi. Câu sửa số đo vẫn “em đã cập nhật ... eo74 và mông96 ... vẫn được giữ nguyên trong giỏ”. Không có nhận xét fit sai như lượt cũ, nhưng giọng hồ sơ chưa được giải quyết. Đây là bản Gemini đầy đủ; không phải phép đo hiệu quả của bullet correction ở9fae4aa9 vì bullet đó không nằm nguyên dạng trong prompt lần này.

Không có căn cứ kết luận chỉ cần thêm câu “hãy nói tự nhiên” hoặc cắt tiếp prompt sẽ sửa được những hành vi này. Prompt hiện đã dặn tránh đọc mô tả/lặp dữ kiện và không nhắc lại đặt trước; hành vi vẫn xuất hiện. Những giả thuyết về thói quen model, cách biểu diễn nguồn và ưu tiên nhiệm vụ cần được phân biệt với nguyên nhân đã chứng minh; không tự chạy vòng sửa tiếp từ finding này.

## 3. Một lỗi lộ thuật ngữ nội bộ ở advice replay

Integrated trả áo lẻ929k/cả bộ1.065k đúng, cả hai có STOCK=IN_STOCK. Replay cùng context lại gọi lựa chọn thứ hai là “Bản composite”. Giá đúng nhưng khách không biết mua được những gì. Đây là lỗi diễn đạt lựa chọn, không phải giá sai hoặc thiếu nguồn. Verifier PASS phù hợp với việc nó không chấm độ tự nhiên; PASS không là chứng nhận câu bán hàng tốt.

Integrated lần này tìm đúng mã và đọc được giá. Một mẫu thành công chưa chứng minh đã sửa lỗi mã kèm tên ở vòng trước; tool/runtime không đổi. Không đánh đồng sampling lần này với fix contract exact/discovery.

## 4. Phần giao dịch giữ được, formatter vẫn cứng

Mở áo/be/M → đổi L/hai chiếc → tổng978.100đ → sửa eo/mông và giữ L → mời checkout → private preview → xác nhận mua đều đúng trong hành trình duy nhất. Cần phân biệt ba việc: đúng lựa chọn, đủ trải nghiệm mua và văn phong tốt; không lấy việc state đúng làm kết luận cả ba cùng đạt.

Private checkout không gọi model; database thử nghiệm đã drop. Preview và câu “ghi nhận xác nhận mua hàng” vẫn do code dựng, nên giống vòng trước. Bảng tiền/lựa chọn giúp khách kiểm đơn, không nên bỏ vì có dạng liệt kê. Sửa prompt không thể thay nhãn SV2447/BE hoặc lời dẫn trong formatter. Handoff chỉ chứng minh chuyển ownership/ghi nhận theo code, không chứng minh nhân viên đã phục vụ hoặc đã có đơn POS.

## Kết quả và giới hạn

34generation requests =24owner +10verifier; mỗi generation một upstream request, retry0, timeout/provider error0.10draft sống sót hard precheck đều qua verifier,10PASS và10exact-text matches. Hai draft dừng do context không hợp lệ chưa được xác minh. Không có A2/adversarial population mới trong run này, không suy số PASS thành chứng nhận an toàn.

Giữ recommendation STOP readiness; không tự sửa runtime, rollback prompt hoặc mở vòng tiếp. Hướng có căn cứ là sửa contract nguồn/context và formatter, giữ quyền tư vấn đã được owner chấp nhận, rồi kiểm chất lượng lựa chọn và giọng theo toàn bộ hội thoại. Không thêm role/gate hoặc tiếp tục nhồi ví dụ để khớp bốn ca.
