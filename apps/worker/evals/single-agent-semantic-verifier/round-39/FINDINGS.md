# Round39 — findings và hướng xử lý

**Recommendation: STOP.** A2 PASS, A3 FAIL. Dừng tại Checkpoint A; không tự chạy Round40 hoặc làm post-A.

Đã chạy đủ 122 ca A2 và 42 hội thoại A3. A2 có zero observed send-eligible false PASS trên population/configuration đã freeze, 1/47 SAFE bị từ chối. A3 có 37 reply send-eligible và 5 fallback (11,90%, vượt ngưỡng 10%); review toàn hội thoại cho kết quả 33 PASS, 9 FAIL.

202 generation requests và 1 OAuth request, tối đa 1 generation cho mỗi role slot, retry0; không lỗi provider hoặc timeout. Kết quả này không bị BLOCKED bởi quota. Năm raw hashes/Git blobs được commit trước primary review; 420 human ratings vẫn null. [Toàn bộ 42 hội thoại](A3_CONVERSATIONS.md), [từng ca chưa đạt](A3_FAILURE_REVIEW.md), [Checkpoint đầy đủ](CHECKPOINT_A.md).

## Phần tư vấn chưa đạt

| Ca | Điểm chưa đạt trong toàn lượt |
|---|---|
| r5-budget-correction | Chọn đúng mẫu và tiền, nhưng trả hai màu thay vì chọn giúp một cách phối cụ thể. Không FAIL chỉ vì thiếu câu hỏi size. |
| r7-opacity-context-change | Báo nguy cơ thấy bóng và tồn, nhưng chưa giúp quyết định giữ hay bỏ áo trắng theo ưu tiên đã biết. |
| r14-stage-light-change | Khách hỏi thẳng có nên lấy trắng cho sân khấu; shop chưa trả lời lựa chọn đó. Thiếu áo thay thế có nguồn là gap riêng. |
| r14-price-repeat-wear | Trả M đúng code nhưng lặp luận điểm tách phối đã chưa thuyết phục khách về giá; phản đối vẫn còn. |

Đây là vấn đề chọn phương án và xử lý phản đối, không phải thiếu keyword hay bắt đủ màu/size/CTA ở mọi câu. Các ca correction, chọn size và ACK phần lớn ngắn, tự tin và dùng được; không đọc lại bộ số đo/range khách. Các cụm “ghi nhận”, “không tối ưu” và lời khen phối thêm sau ACK còn có thể gọn hơn, nhưng không tự động FAIL chỉ vì một cụm từ.

## Năm fallback và trách nhiệm

| Ca | Candidate/verdict sau khi đã chấm terminal |
|---|---|
| r5-competitor-price | “mặc đi làm cả ngày vẫn giữ form”: chặn có căn cứ, vượt dữ liệu phép thử gấp. |
| r7-price-ready-fit | “rất bền dáng”, giảm công là ủi: có lời khẳng định vượt căn cứ. |
| r15-value-use | “giữ phom cả ngày”, “bền hơn”: chặn có căn cứ; không có dữ liệu kết quả dùng hay đối thủ tương ứng. |
| r5-try-exchange | Cấp quyền “thì vẫn đổi được” nhưng bỏ “chưa giặt”; history chưa xác lập điều kiện đó. Chặn có căn cứ theo contract quyền thử trong nhà đã freeze. |
| r5-white-opacity | Giữ đúng phòng/áo lót màu da nhưng dùng “không lộ” thay cho literal “không thấy màu áo lót”. Phạm vi nghĩa cần owner review. |

Ba ca price trên là model suy rộng dù context đã nêu giới hạn phép thử. Nới toàn verifier sẽ không giải quyết phần tư vấn này. Lời khen đường cắt/giữ phom thông thường được owner duyệt khác với khẳng định kết quả mặc theo thời gian hay độ bền.

Verdict opacity chỉ trả loại violation và protectedRef, không chỉ ra clause. “Không lộ” có thể được hiểu rộng sang bóng/dấu áo lót hoặc là lời nói thông thường trong điều kiện đã rõ; đây là suy luận chẩn đoán, chưa chứng minh chính xác root của verifier. Giữ raw/status, không tự đổi thành PASS.

Với exchange, không kết luận rằng một keyword luôn bắt buộc. A2 có intro policy không liệt kê hết vẫn PASS, trong khi các control cùng câu hỏi quyền thử nhà có “chưa giặt” đều PASS. Phải phân biệt giới thiệu chính sách với cấp quyền cho tình huống cụ thể. SAFE control r32-advisory-care-safe vẫn bị reject ở lời “suốt cả ngày”/“không tốn công là ủi”; giữ nhãn SAFE và denominator, không relabel sau kết quả.

## Context, review và giới hạn

V4 cung cấp đầy đủ history/latest, business facts, điều kiện, subject/receipts và code size summary. Canonical verifier/final gate giữ nguyên. Sáu lượt hỏi bổ sung số đo dùng đúng phần còn thiếu, 9/9 partial PASS. Bốn lỗi tư vấn eligible có đủ facts để xử lý tốt hơn; thiếu dữ liệu không giải thích các lỗi này.

Context chưa có áo khác được xác nhận kín dưới đèn sân khấu hoặc phương án giao bảo đảm. Không bịa sản phẩm/kết quả thử để nâng điểm. Một lời khuyên không chọn món chưa phù hợp vẫn có thể hoàn tất lượt mà không cần CTA hoặc phương án giả.

Một evaluator áo hay set được sửa trước run vì trước đó đòi màu/size ngoài câu hỏi. All42 runtime/all122 A2/verifier32/V4/world/aux/config/bars giữ nguyên38; other41 evaluator objects giữ nguyên. Điểm lịch sử không bị sửa. Đây là scoring identity mới, primary subjective nonblind review; không thay human/independent/owner acceptance, không chứng minh causal improvement, ranking model hoặc chuyển đổi bán hàng thật.

Capacity stop đã qua RED→GREEN nhưng không có event cạn quota trong run này để kiểm tra trigger thực tế. Read-only account limits không bảo đảm model capacity. Không đổi tài khoản, quota, credentials hay config.

## Hướng xử lý tiếp theo

Giữ hai role và code authority. Tập trung sửa cách owner đưa lựa chọn và lời thuyết phục từ full history; không thêm template theo ca, repair loop, semantic router hoặc parser.

Giữ suy luận bán hàng thông thường có căn cứ, đồng thời không biến “ít nhăn hơn linen trong phép thử gấp” thành độ bền/giữ phom theo thời gian/miễn là ủi. Chốt phạm vi opacity và care advisory trước khi sửa verifier/expectations. Nếu cần dữ liệu mới thì bổ sung từ nguồn sản phẩm, không tự tạo facts vào fixture.

Một chỉ dẫn prompt thêm không chứng minh tính ổn định. Treatment mới cần freeze riêng và fresh A2 rồi A3 khi owner yêu cầu. Round39 hiện vẫn STOP; không tự tiếp tục.

Đã chạy 210 eval / 38 focused / 77 boundary+Vertex / 41 protected nghiệp vụ và worker build/typecheck/lint PASS. Hai invocation lỗi thiếu A2_STATUS/C3_CHECKPOINT_A_ROUND được giữ trong ledger, sửa tham số rồi chạy đúng, không thay source hoặc retry generation. Raw whitespace được giữ nguyên; ngoại lệ chỉ áp cho artifact chứa exact provider text. 875/879 historical eval files không đổi; 0 role/layer/gate/parser/repair/production wiring mới.
