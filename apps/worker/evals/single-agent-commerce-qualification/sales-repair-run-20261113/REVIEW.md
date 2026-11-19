# Phase C · Kết quả sửa luồng tư vấn và dữ liệu đầu vào

**STOP.** Phiên sàng lọc phát triển đủ 25/25 lần thử và 45/45 lượt trên `5dfde94b11a2b55ca7a52846b241bb440ee68994`. S08 còn thiếu thông tin đặt trước trong 3/5 câu. Chưa mở 40 lần thử còn lại của bộ 13 ca.

[Lịch sử hội thoại](CONVERSATIONS.md) đã bỏ khoảng trắng cuối dòng để trình bày. [Kết quả từng lượt](RESULTS.json) giữ nguyên câu trả lời model.

## Các thay đổi đã đo

- Tính nhóm món lẻ từ BOM đã xác minh trước khi tạo mã hiển thị của từng offer. Mỗi món dùng chung được trình bày một lần, đường tra giá và tồn vẫn theo từng parent/offer. Hai ca mô phỏng có nhãn metadata và BOM xung đột giữ đúng ranh giới.
- Adapter suy ra `COMPONENT` khi model cung cấp một `componentRole` hợp lệ và bỏ trống `fitScope`. Native tool content giữ nguyên. Lời dẫn của tool yêu cầu trích đúng một số đo mỗi trường. Code vẫn kiểm đúng bằng chứng từ tin hiện tại.
- Đưa nhóm món chung và dữ kiện giá/tồn lên trước mô tả sản phẩm. Điều chỉnh hai câu trong prompt owner về tín hiệu thích món và thời điểm cần báo đặt trước.
- Rút phần ý nghĩa của kết quả thương lượng trước giỏ. Chính sách hỗ trợ riêng vẫn cần giỏ và lời xin của khách sau khi có giỏ.

## Review từng ca qua 5 lần

| Ca | Kết quả và phần còn vướng |
| --- | --- |
| J2 | 5/5 hành trình, 15/15 lượt đủ điều kiện gửi. Đọc lại DB xác nhận cả năm lần thay 56 bằng 51 kg, giữ chiều cao và ba số đo mới ở lượt 2, lưu RELAXED ở lượt 3. Engine chọn M đúng phần áo ở cả 15 lượt. Một lượt vẫn sửa tham số tool trong giới hạn. Câu chữ vẫn đọc lại chiều cao/cân nặng ở 5/5 lượt đầu, liệt kê cả cân nặng và ba vòng ở 3/5 lượt sửa số đo và có câu nói quá chắc về độ thoải mái. |
| J4 | 4/5 hành trình tới tổng 529.000đ, giỏ giữ nguyên trong cả năm lần. Lần 5 nói lấy cả bộ sẽ giúp được giảm 5%, trong khi một set là một đơn vị của ưu đãi. Verifier chặn đúng, chuyển handoff và lượt sau giữ quyền người xử lý. Bốn lượt tiếp tục đều bỏ giọng “hệ thống chưa xét” nhưng trả lời xin hỗ trợ bằng lời mời mua nhiều và hỏi màu, còn mỏng về thương lượng một áo. |
| S08 | 5/5 chọn Diệp An và đủ điều kiện gửi, 2/5 báo đặt trước. Cả năm request viết câu cuối đều có `STOCK=PRE_ORDER` cho Diệp An. Ba câu thiếu vì owner bỏ sót dữ kiện ảnh hưởng quyết định mua. Lý do chọn váy vẫn nhiều tính từ, có lượt vừa chọn xong lại đẩy quyết định về khách. |
| S15 | 5/5 gửi đúng áo be, 499.000đ và đặt trước, 0/5 hỏi chọn giữa hai set. Lần 5 vẫn thử đọc hai nguồn. Bốn câu còn nặng mô tả hoặc chưa đưa ra bước xem size cụ thể. Chấm tư vấn tiếp là hữu ích khi khách vừa nêu món thích và câu trả lời bám đúng món đó. |
| S16 | 5/5 handoff đã commit, không có tin hoặc ảnh. Ba lượt owner gọi handoff trực tiếp. Hai lượt tra đúng loại bằng chứng rồi handoff qua nhánh dependency. Đây là đối chứng thiếu nguồn ảnh, chưa xác minh luồng có ảnh khách mặc. |

## Đối chứng và giới hạn

- Replay offline sáu phép đọc từ B `f160dfa4` và C `5dfde94b` dùng cùng hash đầu vào và cùng clock. Cả sáu đều OK ở hai bản, nội dung claim khớp và readback không đổi. Đây là đối chứng hợp đồng đọc, chưa chạy lại hội thoại B trên C hay đo parity giọng văn.
- Snapshot của đợt này được đọc lại theo đồng hồ thực. So với `7b282b6c`, kết quả mô tả mức thay đổi quan sát được. Bốn thay đổi được kiểm chung và không có phép đo cô lập tác động của từng thay đổi.
- J4 có một verdict FAIL đúng. 38 câu đủ điều kiện gửi, 6 handoff và 1 NO_SEND. 126 request thật gồm 87 owner, 39 verifier, 0 lỗi generation và 0 lượt gửi live. Verifier p50 7,56 giây và p95 10,33 giây. 1.381.441 token đầu vào và 102.065 token đầu ra theo telemetry. Chi phí không có trong evidence.
- Snapshot `b96fd7c76ce2d66cf7d6e4648022fed6fdc99118c073bde7613329a758339c27`, SHA256 file registration `005575f84f110d99c7ffb3d1983c8307125a5fafa5e385a531ef6fe57fbc04c8`. Gemini 3.5 Flash Lite High và GPT-6.1 Sol High. Owner prompt `adc16558b65b3c60128605dbe762b0116c3cdc8efc3dd5ee4b4fa5266831af78`. Prompt và schema verifier ghi trong RESULTS. Năm test DB đã dọn.
- Chấm hậu kiểm bởi tác giả. Qualification mù và so sánh chính thức với C3 chưa chạy.

## Kiểm chứng

- Hai regression test tái hiện lỗi trước sửa. Nhóm focused RED→GREEN đạt 4/4.
- Worker Vitest focused đạt 364 test. Worker build, typecheck và lint exit 0. Node adapter/context/tool-result focused 103/103 sau cập nhật assertion của phần thương lượng ở `210ea0a1`.
- Đọc/đóng băng dữ liệu, capture DB test ban đầu, preflight và cả năm invocation `isolated-integration.mjs` đều exit 0. Hậu kiểm đối soát 45 lượt với request ledger, hash và nội dung tin/đầu ra verifier của chính lượt.
- `pnpm --filter @lana/worker test:evals` sau cập nhật assertion: 928 PASS, 6 FAIL, 2 SKIP. Các fail nằm ở hợp đồng/lưu trữ lịch sử V1, owner comparison, baseline schema/ngân sách tool và hai test diagnostic. Chưa ghi nhận full eval suite PASS.
