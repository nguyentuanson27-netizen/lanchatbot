# Phase B — tư vấn cảm nhận và lời khẳng định về sản phẩm

Ngày2026-10-16. Quyết định owner sau lượt offer-read: hai nháp từng fallback về sân khấu/inner và độ thoáng ngoài trời được owner chấp nhận trong đúng ngữ cảnh đó; hai reply concern qua verifier cần sửa giọng. Tài liệu làm rõ hướng sửa B, supersede cách chặn rộng hơn về cảm giác mặc trong prompt B hiện tại. Không sửa verdict, prompt, điểm hay nguồn đã freeze của bất kỳ run A/B nào. A vẫn OWNER_BYPASS; chưa có acceptance bán hàng/live.

## Ranh giới theo điều khách được dẫn tới tin

Khả năng kiểm chứng là dấu hiệu giúp phân loại lời nói, không phải tiêu chí duy nhất. Một cảm nhận khó đo vẫn có thể vô lý, trái dữ liệu hoặc hứa quá mức. Một nhận xét khách có thể nhìn thấy như vẻ thanh lịch lại thường là đánh giá thẩm mỹ, không cần biến thành kết quả kiểm nghiệm. Xét cả câu hỏi, lời khuyên, điều kiện, lời nhấn mạnh và hệ quả mua hàng; không tìm một từ để cấp PASS/FAIL.

| Nội dung đang nói | Mức căn cứ và giới hạn |
| --- | --- |
| Giá, tồn, màu/size bán được, chất liệu, thành phần, lớp lót, kết cấu và tính năng cụ thể | Cần nguồn đúng món/biến thể và còn hiệu lực. Không được tạo một chi tiết mới để thuyết phục. Kết quả chọn size vẫn cần code-fit đúng hồ sơ; lựa chọn size do khách tự chọn không tự là lời shop xác nhận fit. |
| Phong cách, phối đồ, độ điệu, vẻ gọn/chỉn chu và sự phù hợp dịp mặc | Cho phép suy luận tư vấn từ thiết kế và hoàn cảnh, kể cả nói tự tin hoặc nhấn mạnh thông thường. Không cần phép thử riêng cho nhận định thẩm mỹ. Có thể có nhiều lựa chọn hợp lý; review xem lý do có giúp khách quyết định, không ép một đáp án mẫu. |
| Cảm giác mềm, nhẹ, thoáng, dễ chịu dự kiến | Cho phép dựa vào chất liệu/thiết kế và nhu cầu, không mặc định cần SIZE_FIT hoặc thử mặc riêng cho nhận xét độ thoáng. Nếu lời nói thực sự chốt độ vừa/chật của cơ thể khách thì cần code-fit. Không bịa vật liệu hay kết quả đã đo để làm nền. |
| Nguy cơ có thể xảy ra và cách phối thông thường để xử lý | Cảnh báo hợp lý từ vật liệu/hoàn cảnh và gợi ý lớp mặc/phối đồ được phép; chưa có phép thử không có nghĩa món đã được chứng minh có khuyết điểm. Lời trấn an thông thường không tự thành chứng nhận kết quả. |
| Kết quả vật lý hoặc mức bảo đảm có thể đối chiếu rõ | Cần nguồn tương ứng khi cam kết độ che phủ cụ thể, chống nắng/chống nước, không nhăn/không phai sau sử dụng/giặt, thông số nhiệt, độ bền, hoặc hiệu quả cho mọi người/điều kiện. Không dùng lời cảm nhận hoặc chữ có thể để lách việc đang tạo thêm đặc tính. Gợi một màu/món khác như giải pháp chắc chắn cho độ kín cũng cần căn cứ đúng thuộc tính. |

Hai nháp owner đã duyệt không tự cấp quyền cho mọi câu có cùng từ. Ở ca sân khấu, tư vấn nguy cơ từ vải nhẹ cùng lớp mặc trong là giải pháp phối thông thường, không phải tuyên bố đo được độ xuyên hoặc chứng minh một màu khác kín. Ở ca ngoài trời, nguồn đã nêu vải mềm/thoáng; lời trấn an về cảm giác mặc trong đoạn đó được chấp nhận. Không mở rộng thành bảo đảm không đổ mồ hôi, một mức hạ nhiệt, chống tia UV hay thoải mái bất kể điều kiện. Không tiếp tục bắt hai nháp đó sửa chỉ để thêm giọng dè dặt.

## Chất lượng lời tư vấn

Lấy facts từ mô tả, không chép nhịp quảng cáo của mô tả. Trả điều khách đang cần quyết định, dùng từ như đang nhắn với khách và giải thích điểm liên quan. Một chuỗi lời khen không giải thích được đánh đổi giữa hai lựa chọn. Relevant fact có thể nhắc lại để tạo tin tưởng; không đọc lại cả hồ sơ/ngân sách. Không cấm upsell hợp lý, không bắt mọi lượt kết thúc bằng hỏi mua hoặc xin size.

Verifier chỉ kiểm protected semantics theo ranh giới trên. Giọng tự nhiên, chất lượng chọn món và bước tiếp do review cả actual customer outcome đánh giá. Không đưa tiêu chí giọng thành một gate chặn protected semantics. Giữ một owner, tối đa một verifier, code authority và final gate; không thêm parser/regex/template, rewrite/repair/reverify hoặc role ngữ nghĩa mới.

## Áp dụng và kiểm chứng

Baseline còn lại18B1+7stateful được thu đủ trước khi sửa. [Scope và evidence](../../apps/worker/evals/single-agent-commerce-read-only/offer-read-completion-20261016/SCOPE.md), [kế hoạch sửa chung](../../apps/worker/evals/single-agent-commerce-read-only/offer-read-completion-20261016/FIX_PLAN.md). Chỉ áp dụng prompt B sau collection; kiểm tra hash/request projection/bounds bằng các test hiện có. Unit test chỉ chứng minh contract/code, không chứng minh verifier đã hiểu nghĩa hay lời tư vấn đã tự nhiên hơn. Candidate sửa chưa có provider evidence mới. Không kế thừa A2/A3 PASS, không tự chạy một round hoặc mở live.
