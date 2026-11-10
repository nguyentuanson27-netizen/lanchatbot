# Primary B2/B3 review —6terminals và1interrupted commit readback

Raw được lưu trước chấm; chưa xem rejected drafts/verdict details của lượt này. Human acceptance=null. Cả7registered steps giữ denominator; bước7không có synthetic provider result. Các state đã commit không tự thay cho chất lượng câu khách nhận.

| Bước | Terminal | Nhận xét | Lý do |
| --- | --- | --- | --- |
| 1/stateful-open | SEND_ELIGIBLE | PARTIAL_REPLY_PURCHASE_NOT_EXECUTED | Lưu đúng eo76/mông98, trả giá499.000đ và trạng thái đặt trước của áo beM. Nhưng khách đã chọn mua, giỏ vẫn null; câu chỉ báo thông tin không thực hiện bước mua. Giọng ngắn, đọc được; chưa đạt mục tiêu thao tác. |
| 2/stateful-variant-quantity | NO_SEND | UNUSABLE_NO_SEND | Khách đổiL và lấy2chiếc nhưng không nhận tin; giỏ vẫn chưa tồn tại. Không lấy việc giỏ xuất hiện muộn ở bước4 để chấm bước2là đã thực hiện. |
| 3/stateful-quote | FALLBACK | UNUSABLE_FALLBACK | Không báo được tổng hai áo gồm ship; chỉ static fallback. Không có quote/giỏ ở bước này để khách tiếp tục mua. |
| 4/stateful-correction | SEND_ELIGIBLE | PARTIAL_STATE_SUCCESS_REPLY_NEEDS_EDIT | Đã sửa đúng eo74/mông96 và tạo được giỏ2áo beL theo lựa chọn trước. Đây là tiến triển thật. Nhưng tin khách chỉ là “Giỏ hàng đã được cập nhật, chị nhé.”: không xác nhận rõ việc sửa số đo và nghe máy móc; chưa phải phản hồi tự nhiên, sát câu vừa nhắn. Không yêu cầu đọc lại cả bộ số đo. |
| 5/stateful-private-checkout | HANDOFF | FUNCTIONAL_RECOVERY_CHECKOUT_INCOMPLETE | Private code-only path không gọi model nhưng chuyển handoff DEPENDENCY_FAILURE, không có preview/checkout hoàn tất. Giỏ đã có nên không quy do thiếu giỏ; primary chưa đọc trace để gán dependency cụ thể. Không có tin capture cho khách. |
| 6/stateful-confirm | NO_SEND | FUNCTIONAL_AUTHORITY_STOP_PURCHASE_INCOMPLETE | Sau handoff, code dừng lượt chốt với CURRENT_AUTHORITY_CHANGED và không gọi model. Đúng kiểm soát quyền; hành trình xác nhận mua vẫn chưa hoàn tất, không chấm thành bán hàng thành công. |
| 7/stateful-human-request | UNRECORDED_AFTER_HOST_INTERRUPTION | HANDOFF_COMMIT_OBSERVED_TERMINAL_UNRECORDED | Bước7bị host/tool ngắt trước khi lưu terminal và capture. Readback xác nhận HUMAN ownership/event/case/tag intent đã commit, nhưng Inbox còn PROCESSING và tag PENDING. Không đủ bằng chứng chấm final reply/delivery hoặc coi lượt hoàn tất; giữ UNKNOWN thay vì tạo outcome giả. |
