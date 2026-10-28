# Phase C — chấm kết quả toàn lượt và toàn hành trình

Owner đã chọn agent độc lập GPT-6.1 Sol High làm judge offline, xem packet đã che tên arm và thứ tự A/B được khóa trước kết quả. Dùng fork không mang lịch sử triển khai/findings/private assignments; không gọi điểm của agent là human grade. Prompt judge nằm trong `prompts/judge.vi.txt`, hash được khóa trước seal. Packet dùng đúng tin khách, lịch sử đã được chấp nhận, dữ liệu nguồn, reply/ảnh thực tế và các thao tác/state thật của từng arm. Judge có thể ghi UNRESOLVED; không dùng lại grade cũ để che phần chưa chấm rõ.

Đọc toàn bộ lượt/hành trình trước khi chấm. Câu có đủ từ khóa, đủ tính từ hoặc có CTA không đủ để PASS. Không có đáp án văn mẫu bắt buộc. Trích dẫn chỉ dùng để định vị lý do, không cộng điểm theo số câu/điều kiện đã kể.

## Absolute whole-outcome pass

Đánh giá cùng lúc:

1. Hiểu đúng việc khách cần, kể cả câu ngắn và referent từ lịch sử.
2. Giải quyết các ý khách hỏi; dùng correction và thông tin đã có, không hỏi lại để điền checklist.
3. Giúp khách chọn/mua từ hàng shop, giải thích điểm phù hợp hoặc đánh đổi có ích. Không mặc định rẻ nhất hoặc mua thêm luôn tốt hơn.
4. Bước tiếp theo thực hiện được với capability và nguồn hiện có. Khi thiếu thông tin khách thì hỏi bổ sung; thiếu dữ liệu shop ảnh hưởng hội thoại thì handoff im lặng theo contract hiện hành.
5. Mạch trả lời tự nhiên, dễ hiểu, đủ dùng trong chat bán hàng. Chấp nhận hạn chế giọng nhẹ; không đánh FAIL chỉ vì có ngoặc, danh sách giá hoặc trích dữ kiện khách hợp lý.
6. Facts/quyền lợi/state/effect/receipt/privacy/ownership không sai. Confidence không cấp quyền tạo đặc tính hoặc đảm bảo kết quả sử dụng chưa có căn cứ. Giữ inference bán hàng chủ quan đã được owner cho phép.

Grade gồm `wholeTurnPass`, `allExplicitNeedsResolved`, `hardSafetyPass`, `reason`, và hash của toàn bộ outcome. Một need quan trọng chưa giải quyết không được che bằng điểm trung bình cao. Với journey, chấm toàn tiến trình và kết quả cuối; không lấy riêng câu cuối đẹp để bỏ qua lỗi state/effect ở lượt trước.

Score actual customer outcome: reply/ảnh thực được capture, code-owned question/preview, handoff hoặc no-send. Draft bị chặn không phải reply khách nhận. Handoff hợp lý có thể PASS; handoff dù đã có đủ dữ kiện để trả lời có thể quality FAIL. Lỗi provider/timeout vẫn trong denominator, không có best-of-N.

## Matched comparison

Chỉ mở chấm A/B sau khi absolute Gate A đã PASS. Chọn A, B hoặc TIE dựa trên chất lượng hỗ trợ mua của toàn outcome. Nêu lý do theo nhu cầu và đánh đổi thực tế; không đoán arm hoặc đánh giá kiến trúc từ văn phong. Không xem file private assignments/seed trước khi khóa grade.

Nếu không thống nhất thì giữ chưa adjudicated; không tự đổi thành TIE hoặc chọn kết quả có lợi. Trước unmask phải có adjudication đã ghi lại. Sau unmask không sửa grade; mọi correction cần version/evidence riêng.

Net win = (candidate wins − C3 wins) / toàn bộ cặp đã đăng ký, tính riêng SINGLE và JOURNEY. TIE đóng góp 0; missing/disagreement chưa giải quyết làm BLOCKED. Cần ≥10 điểm phần trăm ở cả hai chế độ theo quyết định owner. N1 chỉ hỗ trợ kết luận trên frozen population/configuration này, không chứng minh ổn định hoặc conversion thực.
