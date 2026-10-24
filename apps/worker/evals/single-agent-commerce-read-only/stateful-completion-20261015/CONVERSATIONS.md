# B stateful — toàn bộ kết quả khách nhận được

Primary whole-terminal review; nguồn raw đã commit trước khi chấm. Bộ gửi chỉ ghi vào capture, không gửi khách thật.

## 1. stateful-open

Khách: Chị lấy riêng áo Thạch Thảo màu be, size M nhé. Eo chị 76, mông 98.

Kết quả: `FALLBACK / FAIL`.

```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Khách đã chọn áo/màu/size rõ, nhưng chỉ nhận fallback; chưa tạo được giỏ. Số đo đã lưu là tiến bộ nội bộ, chưa hoàn thành yêu cầu mua.

## 2. stateful-variant-quantity

Khách: Đổi áo sang L cho chị, lấy hai chiếc nhé.

Kết quả: `FALLBACK / FAIL`.

```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Khách đổi size và số lượng nhưng vẫn nhận fallback, không có giỏ hiện tại hoặc bước xử lý dùng được.

## 3. stateful-quote

Khách: Hai áo cả phí ship là bao nhiêu em?

Kết quả: `FALLBACK / BUDGET`.

```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Khách hỏi tổng hai áo cả ship nhưng không nhận được giá hoặc bước giải quyết cụ thể; giỏ vẫn chưa tồn tại.

## 4. stateful-correction

Khách: Số đo lúc nãy chị nhắn nhầm, eo 74, mông 96 nhé. Chị vẫn lấy size L.

Kết quả: `FALLBACK / BUDGET`.

```text
Phần này em chưa trả lời được, chị nhé.
```

Nhận xét toàn lượt: Code đã sửa eo/mông đúng, nhưng khách chỉ nhận fallback, lựa chọn size L và giao dịch chưa tiến lên.

## 5. stateful-private-checkout

Khách: [Thông tin nhận hàng giả lập, chỉ code xử lý; không gửi model.]

Kết quả: `HANDOFF / DEPENDENCY_FAILURE`.

Không có chat reply được capture.

Nhận xét toàn lượt: Đã chuyển quyền xử lý khi checkout không thực hiện được; cả hai model nhận0request. Đây là recovery đúng, không phải hoàn tất mua hàng.

## 6. stateful-confirm

Khách: Chốt đơn cho chị nhé.

Kết quả: `NO_SEND / CURRENT_AUTHORITY_CHANGED`.

Không có chat reply được capture.

Nhận xét toàn lượt: Quyền đã chuyển HUMAN nên không tiếp tục gọi model/gửi bot. Đúng quyền sở hữu; yêu cầu chốt vẫn chờ nhân viên.

## 7. stateful-human-request

Khách: Cho chị gặp nhân viên shop nhé.

Kết quả: `HANDOFF / CUSTOMER_REQUESTED_HUMAN`.

Không có chat reply được capture.

Nhận xét toàn lượt: Yêu cầu gặp nhân viên được chuyển quyền xử lý theo policy; không có chat reply trong capture. Chưa chứng minh nhân viên đã nhận/xử lý ngoài hệ thống thử.
