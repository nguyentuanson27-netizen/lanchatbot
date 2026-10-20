# Năm hội thoại có handoff — 2026-10-20

Primary khóa ở commit `a2493950` trước tool/verifier diagnosis. Agent review, không phải human adjudication. Markdown bỏ khoảng trắng cuối dòng khi hiển thị; exact text nằm trong raw.

## Ca 1 — SEND_ELIGIBLE — USABLE

Khách: Chị vừa mặc thử bộ này trong phòng khoảng năm phút, vẫn còn tem và chưa mang ra ngoài. Nếu không vừa thì shop đổi size cho chị được không?

Nội dung (SEND_ELIGIBLE_NOT_DELIVERED):

Dạ quy định đổi hàng của shop yêu cầu sản phẩm chỉ ướm bên ngoài chứ không mặc trực tiếp vào người ạ. Vì vậy trường hợp chị đã mặc thử, shop rất tiếc chưa thể hỗ trợ đổi size cho chị được dù sản phẩm vẫn còn nguyên tem và chưa mang ra ngoài.

Review: Trả lời đúng việc đã mặc vào không đủ điều kiện đổi size. Lý do liên quan; có thể gọn hơn nhưng không đổ checklist không cần thiết.

State: BOT; event/tag intent/message: 0/0/0.

## Ca 2 — HANDOFF — NEEDS_EDIT

Khách: Chị mới ướm bộ này bên ngoài thôi, chưa mặc vào. Muốn đổi sang size L thì được không em?

Nội dung (DISPATCHER_CAPTURE):

Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.

Review: Handoff thật thành công. Tin khách nhận chỉ báo đã chuyển, chưa trả lời ngắn câu đổi size và chưa có hướng dẫn đổi/trả cụ thể theo mục tiêu owner. Đây là hạn chế actual code-owned message, chưa quy cho model.

State: HUMAN; event/tag intent/message: 1/1/1.

## Ca 3 — SEND_ELIGIBLE — NEEDS_EDIT

Khách: Chị thử bộ này rồi, giờ muốn đổi size thì được không?

Nội dung (SEND_ELIGIBLE_NOT_DELIVERED):

Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ khi nhận hàng, với điều kiện sản phẩm còn nguyên tem mác, chưa giặt, chưa qua sử dụng và chỉ ướm bên ngoài không mặc vào người ạ (phí vận chuyển hai chiều là 30.000đ).

Chị cho em hỏi lúc nãy mình mới chỉ ướm bên ngoài hay đã mặc thử vào người rồi ạ?

Review: Đã hỏi đúng hành động ướm hay mặc, không tự quyết khi chưa rõ. Nhưng đọc nguyên đoạn điều kiện, thời hạn và phí không được hỏi trước câu hỏi chính; còn dài và dạng thông báo. Đây là finding cách diễn đạt, không phải sai policy hay thiếu từ điều kiện.

State: BOT; event/tag intent/message: 0/0/0.

## Ca 4 — SEND_ELIGIBLE — USABLE

Khách: Shop cho đổi size trong mấy ngày, phí đổi bao nhiêu em?

Nội dung (SEND_ELIGIBLE_NOT_DELIVERED):

Dạ, shop hỗ trợ đổi size trong vòng 15 ngày kể từ ngày nhận hàng, phí vận chuyển 2 chiều là 30.000đ chị nhé.

Review: Trả đúng15ngày/30k và mốc nhận hàng, ngắn gọn, đúng câu hỏi; không chuyển nhân viên không cần thiết.

State: BOT; event/tag intent/message: 0/0/0.

## Ca 5 — HANDOFF — NEEDS_EDIT

Khách: Đường may ở nách áo bị lỗi, chị mặc vào mới thấy. Chị nhận hôm qua, giờ shop xử lý sao em?

Nội dung (DISPATCHER_CAPTURE):

Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.

Review: Handoff thật thành công cho yêu cầu báo lỗi. Tin khách nhận chỉ báo chuyển bộ phận vận đơn, chưa có bước khách cần làm/quy trình theo hướng owner chốt. Không coi thủ tục kiểm tra/làm đơn của nhân viên là sai; phần chưa đạt là nội dung terminal còn chung chung.

State: HUMAN; event/tag intent/message: 1/1/1.

## Diagnosis sau khóa primary

- Ca 1, 3, 4: owner gọi read_policy, sau đó tạo final reply; mỗi draft đều qua verifier và final gate. Cả 3 PASS.

- Ca 2: read_policy rồi request_handoff(reason=EXCHANGE). Ca 5: model đề nghị read_policy cùng request_handoff(reason=DEFECT); handoff lấy ưu tiên theo code hiện hành. Không có model FINAL sau handoff, không có public text part đi cùng lệnh handoff. Không phải model đã viết một câu hay rồi bị verifier chặn.

- Tin “Em đã chuyển bộ phận vận đơn kiểm tra và hỗ trợ mình ngay ạ.” là AFTER_SALES_HOLDING_REPLY_V2, code-owned default. SOURCE.json không có matrix riêng. Nó được commit và dispatcher capture đúng nguyên văn ở cả 2 ca. Đổi prompt không thay được tin này. Muốn thêm kết luận/quy trình cần dùng cấu hình holdingReply theo reason hiện có; không thêm role, parser hoặc cho model tự ghi receipt/handoff text.

- Ca 3 hiểu đúng việc còn thiếu và hỏi đúng, nhưng chọn quá nhiều thông tin từ policy để nói trước câu hỏi. Không phải thiếu nguồn/đọc sai điều kiện; còn lỗi chọn ý và độ ngắn. Review mới theo ưu tiên ngắn gọn của owner, không suy một semantic regression chỉ từ việc nhãn style trước đây nhẹ hơn.

- Native tag intent được ghi trong DB test; không gọi Pancake hay có nhân viên thật phản hồi. Tin handoff được gửi qua capture transport; 3 tin SEND_ELIGIBLE còn lại chưa đi qua delivery/Meta. Không gộp chúng thành 5 live sends.
