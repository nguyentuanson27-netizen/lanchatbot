# Context tư vấn: bản trình bày mới

Đã triển khai cách trình bày mới trên dữ liệu và prompt của vòng 28. Chưa chạy model. Ví dụ dùng dữ liệu tổng hợp của bộ đánh giá, chưa phải catalogue hiện hành của shop.

[Context gốc](CONTROL_CONTEXT.json) và [toàn bộ context mới](READABLE_CONTEXT.txt) là nội dung đầu vào được dựng cho tình huống khách sửa ngân sách còn 550k, đã có quần navy và nhờ chọn đồ đi làm. Mã ca chỉ nằm trong tài liệu đánh giá, không được gửi cho model.

Bản mới sắp xếp thông tin theo thứ tự:

1. Hồ sơ từng sản phẩm: thiết kế, chất liệu và căn cứ, màu, bảng size, chăm sóc, giới hạn.
2. Giá, tồn và kết quả size: nội dung và phạm vi áp dụng trước; nguồn và ràng buộc theo sau.
3. Đối tượng đã xác định, chính sách, trạng thái và biên nhận hành động.
4. Mã định danh và ràng buộc của request.
5. Nội dung truy xuất, lịch sử hội thoại và tin mới nhất của khách, tách rõ khỏi dữ liệu có thẩm quyền.

Mọi trường và giá trị trong 42 ca được giữ đủ, kể cả điều kiện chính sách, số đo còn thiếu, giới hạn phép thử và nguồn. Code sắp xếp dữ liệu; model vẫn chọn món, giải thích lý do mua và viết câu trả lời. Giá trị được mã hóa dưới dạng JSON để nội dung dữ liệu có xuống dòng không tạo được một tiêu đề mới. Verifier tiếp tục nhận đúng request JSON cũ.

| Kích thước request đo trên 42 ca | Bytes |
| --- | ---: |
| Owner gốc lớn nhất | 24,104 |
| Owner mới lớn nhất | 25,793 |
| Owner gốc trung bình | 19,388 |
| Owner mới trung bình | 20,677 |
| Verifier với draft ở giới hạn 4,096 bytes, lớn nhất | 31,022 |
| Giới hạn request đang giữ | 32,768 |

Request mới lớn hơn vì giữ đủ dữ liệu và thêm nhãn/ngắt dòng. Chưa đo token, chi phí, độ trễ hoặc chất lượng tư vấn của model với cách trình bày này.

Đã dựng 126 request cục bộ, không gọi provider và không đăng ký attempt mới. Chín test context kiểm tra việc giữ đủ dữ liệu, 84 request owner/verifier lịch sử, loại bỏ nhãn đánh giá và dữ liệu riêng tư, nội dung giống chỉ dẫn, biên nhận, giới hạn request và adapter/runner bằng mô phỏng cục bộ. Toàn bộ 164 test Node, 77 test worker và 41 test nghiệp vụ đều qua; worker typecheck, build và lint đều qua.

644 file lịch sử ngoài hai file thực thi đã sửa giữ nguyên bytes so với HEAD `a83c85a68c0c2310c6bb62f9e67b65bff5c6634d`. [Số đo và thông tin nguồn](local-measurements.json) ghi source triển khai `998fe9c5f79983bdc06149210b16eb8e1728b4ef` cùng model, prompt, schema và corpus đang giữ.

Chưa có A2/A3 runSourceSha, kết quả hoặc điểm mới. Batch 27–29 vẫn STOP. Trước một vòng gọi model mới cần đăng ký và đóng băng cách trình bày này theo quy trình hiện có.
