# Chẩn đoán sau primary whole-terminal review

Run source `d9d96e4b2f035941f8ac0afa2ac25d5536da8f1c`; raw commit `58ca01e43036d6635ae55c493aae5944635ebd65` trước primary commit `eddcfc641cc7828ce4880e47a211b4f7a8f836ed`. Không sửa lại primary labels sau khi đọc draft bị chặn và tool trace.

## Từng ca lỗi

| Ca | Quan sát thực tế | Phần gây lỗi/giới hạn |
| --- | --- | --- |
| 1. Tạo giỏ | Owner gọi `apply_customer_state` với `WAIST_CM/HIPS_CM`, bị từ chối; vòng sau sửa thành `measurements.WAIST_CM/HIPS_CM` và lưu76/98. Đọc sản phẩm lần đầu không chọn món lẻ nên nhận SET_VAY; vòng sau mới đọc AO và gọi `recommend_size`, nhận `NO_VERIFIED_CHART`. Không gọi `add_to_cart`. Draft vẫn khẳng định be/M có sẵn và mặc thoải mái theo số đo. | Owner dùng sai field, mất một vòng sửa input, tiếp tục tư vấn fit thay vì thực hiện lựa chọn đã có. Tồn116 là tổng offer AO, không chứng minh chính be/M. Verifier FAIL trỏ STOCK và product; chặn lời fit thiếu căn cứ là phù hợp với kết quả size engine. |
| 2. Đổi L, lấy hai | Giỏ vẫn rỗng. Owner chỉ đọc sản phẩm hai lần, đầu tiên thiếu AO nên không có facts; lần sau AO/be/L cho giá499k và PRE_ORDER/0. Không gọi tool tạo/sửa giỏ. Draft nêu hai áo998k. Verifier FAIL trỏ PRICE. | Owner không thực hiện mutation. Trusted context chỉ có đơn giá, chưa có quote cho giỏ; phép nhân499k×2 tự nó đúng. Verdict không có giải thích tự do, nên chưa kết luận chính xác verifier phản đối phần đơn giá/tạm tính hay tổng thanh toán. Không ghi đây là lỗi cộng tiền sai hoặc tự khẳng định verifier chặn đúng/sai. |
| 3. Báo tổng cả ship | Owner đọc sản phẩm hai lần, lại đi từ SET_VAY sang AO. Ở generation3 vẫn trả tool `quote_cart` khi prepared request đã có `functionCallingConfig.mode=NONE` và hết hai tool rounds. Tool đó không được chạy; không có final draft/verifier. | Lựa chọn tool và lịch sử giỏ rỗng làm câu hỏi tiền không được đáp ứng trong budget. Đây là `BUDGET`, không phải verifier FAIL. Chưa thể đánh giá kết quả quote nếu giỏ đã tồn tại. |
| 4. Sửa số đo | Owner lại dùng bare `WAIST_CM/HIPS_CM`, rồi sửa path và lưu74/96 ở revision3. Generation3 bị `OWNER_REQUEST_BOUND` tại builder, `BEFORE_PROVIDER_DISPATCH`, providerRequests0. Không có final draft hoặc verifier. | Hợp đồng field dễ bị model dùng sai, cộng mô tả sản phẩm và tool history làm body sau serialization vượt32768bytes. Lỗi client đã được log rõ; không phải401/429/5xx hay verifier chặn ACK. |
| 5–6. Checkout và chốt | Giỏ chưa tồn tại sau bốn lượt trên; private code path chuyển handoff. Lượt chốt sau đó NO_SEND/`CURRENT_AUTHORITY_CHANGED`, zero model request. | Hành trình mua đã đứt từ trước. Handoff/no-send giữ quyền xử lý đúng nhưng không chứng minh checkout/preview nguồn thật đã hoàn thành. Không gán ETA là nguyên nhân quan sát của batch này. |
| 7. Gặp nhân viên | Owner gọi `request_handoff`; terminal HANDOFF, không có chat text/capture reply. | Kiểm soát handoff nội bộ hoạt động; chưa chứng minh nhân viên đã nhận/phản hồi qua hệ thống bên ngoài. |

## Phân tách root cause

- **Owner/task execution:** zero `add_to_cart`, `change_cart_item` hoặc `confirm_purchase` calls trong toàn batch. Vì vậy không có mutation giỏ bị guard P1/P2 từ chối để giải thích việc giỏ rỗng. Owner lặp lỗi field dù schema khai báo đúng enum; `AUTO` không tạo ra bảo đảm model tuân schema. Cả hai lần model sửa path thì profile đều commit thành công.
- **Context/client:** parent loop chặn request input ở32768bytes, adapter còn thêm projection/declarations rồi kiểm tra body32768bytes lần nữa. Trong ca4, body wire bị chặn trước dispatch; byte count chính xác của body bị từ chối không được giữ, không tự đặt một con số. Prepared body generation3 của ca1 là31542bytes, đã gần trần. Mô tả sản phẩm dài được lặp trong tool history; lần đọc mặc định sai offer làm tốn thêm budget/context.
- **Verifier:** chỉ có hai final drafts đến verifier, đều FAIL. Ca1 có căn cứ độc lập cho việc chặn fit và biến tồn aggregate thành exact variant. Ca2 chỉ có kind/ref PRICE, chưa đủ lời giải thích để phân xử chắc phạm vi tổng tiền. Hai fallback còn lại không do verifier. Không có send-eligible reply trong mẫu này; không suy ra bảo đảm an toàn từ việc không gửi gì.
- **Receipt/transaction fix:** profile receipt mới đã xuất hiện trong request verifier của ca1, với CUSTOMER_STATE_UPDATED và profile revision2. Draft đó thất bại vì nội dung khác; ca4 chưa tới verifier. Do đó đã quan sát truyền receipt qua context thật, chưa chứng minh verifier chấp nhận đúng câu ACK mục tiêu. P1/P2 đã qua test PostgreSQL và re-review; không thấy chúng gây từ chối giỏ trong batch này.

## Việc nên xử lý ở một task sau

1. Sửa sự không khớp giữa cách model gọi tool và contract thật: field/profile path, lựa chọn AO so với cả set, và hành động mua cần tool nào. Đánh giá interface/provider schema và public state đang cấp cho owner trước khi bổ sung thêm đoạn prompt.
2. Đo budget trên đúng body sẽ gửi; giảm dữ liệu mô tả/history lặp ở continuation trong khi giữ đủ facts, refs, binding và receipt. Không giải quyết lỗi này bằng việc loại attempt hoặc tăng vòng gọi sau khi đã thấy kết quả.
3. Kiểm tra lại ranh giới đơn giá/tạm tính/tổng thanh toán của ca2 bằng chính toàn bộ draft và trusted context; chưa đổi nhãn hoặc nới verifier từ một verdict không có rationale.
4. Khi tạo giỏ/quote/correction đã chạy được trong budget, mới đo tiếp checkout nguồn thật và câu trả lời ACK của receipt. Batch này không tự chứng minh các chặng đó.

Đây là đề xuất dựa trên trace, chưa triển khai sửa hoặc chạy thêm batch. Cùng prompt/model vẫn có N1 variance và nguồn công khai được refresh; không quy kết mức giảm chất lượng cho hai bản sửa transaction chỉ từ so sánh tổng số PASS.
