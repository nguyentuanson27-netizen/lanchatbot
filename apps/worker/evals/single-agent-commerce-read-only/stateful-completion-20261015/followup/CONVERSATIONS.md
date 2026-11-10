# B stateful sau sửa — toàn bộ kết quả

Raw đã commit trước primary. Chỉ capture, không gửi khách thật. Không thay nhãn của batch đầu.

## 1. stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả: `SEND_ELIGIBLE / RECEIPT_BACKED_ACK`.

```text
Giỏ hàng đã được cập nhật, chị nhé.
```

Nhận xét toàn lượt: Đã lưu đúng áo be M/số lượng1 và số đo. Khách chỉ nhận câu báo giỏ nội bộ từ recovery; chưa có phản hồi bán hàng cụ thể hoặc thông tin hàng đặt trước. Đúng thao tác, chưa đạt chất lượng tư vấn.

## 2. stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả: `SEND_ELIGIBLE / PASS`.

```text
Chị đã đổi áo sang size L và cập nhật số lượng 2 chiếc trong giỏ hàng rồi ạ.
```

Nhận xét toàn lượt: Hai thao tác đã lưu đúng L và2chiếc trong cùng lượt. Câu trả lời quy việc cập nhật cho “chị” và dùng giọng báo cáo giỏ, nên chưa tự nhiên dù kết quả nghiệp vụ đúng.

## 3. stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả: `SEND_ELIGIBLE / PASS`.

```text
Tổng tiền 2 áo là 998.000đ, phí ship 30.000đ, sau khi giảm 49.900đ thì tổng thanh toán là 978.100đ chị nhé.
```

Nhận xét toàn lượt: Trả đúng tổng hai áo, phí ship, mức giảm và số phải trả978.100đ theo quote code hiện tại. Phần trình bày tiền đáp ứng đúng câu hỏi, không phải lặp lại hồ sơ khách.

## 4. stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả: `FALLBACK / FAIL`.

```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Đã sửa eo/mông thành74/96 và giữ L, nhưng khách nhận fallback cho một lời sửa thông tin đơn giản; cuộc mua bị gián đoạn.

## 5. stateful-private-checkout

Khách: [Thông tin nhận hàng giả lập, chỉ code xử lý.]

Kết quả: `HANDOFF / DEPENDENCY_FAILURE`.

Không có chat reply được capture.

Nhận xét toàn lượt: Checkout riêng tư chuyển quyền xử lý thực trong database;0request model và không có chat reply theo terminal policy. Chưa có preview/xác nhận mua thực nguồn và chưa chứng minh nhân viên đã nhận bên ngoài.

## 6. stateful-confirm

Khách: Chốt đơn cho chị nhé.

Kết quả: `NO_SEND / CURRENT_AUTHORITY_CHANGED`.

Không có chat reply được capture.

Nhận xét toàn lượt: Sau chuyển quyền HUMAN, bot không gọi model hoặc tiếp tục chốt. Đúng quyền sở hữu; giao dịch vẫn chưa hoàn tất.

## 7. stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả: `HANDOFF / CUSTOMER_REQUESTED_HUMAN`.

Không có chat reply được capture.

Nhận xét toàn lượt: Yêu cầu gặp nhân viên tạo handoff nội bộ và ngừng hội thoại bot. Silent policy không tạo chat reply; việc nhân viên xử lý chưa được đo.
