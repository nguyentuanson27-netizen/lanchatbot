# Giai đoạn 3 — Chu trình bán hàng

Trạng thái: đã nối production trên page test `1198992073286645`. PostgreSQL adapter, atomic inbox/outbox commit, POS/Redis catalog adapter, payment policy và realtime orchestration đều đang chạy trong release `20260723-sales-cycle-production-r6`.

## Luồng chuẩn

```text
Hỏi giá
→ facts đã xác minh
→ lấy số đo
→ tư vấn size
→ mở cart
→ xử lý do dự
→ thu đủ thông tin nhận hàng/thanh toán
→ kiểm tra lại giá, tồn, size, ETA
→ xem trước đơn
→ khách xác nhận
→ PURCHASE_CONFIRMED + tag Đã chốt đơn + chuyển nhân viên
```

`PURCHASE_CONFIRMED` chỉ có nghĩa khách đã xác nhận bản xem trước. App không được tạo hoặc ghi `ORDER_CREATED` khi chưa có mã đơn thật từ POS.

## Cart và order-intent

- Cart có TTL tối đa đúng 48 giờ; adapter không được tự kéo dài quá cửa sổ này.
- Runtime không nhận tổng tiền/ưu đãi do model hoặc caller tự tính. `CART_OPENED`, `CART_MUTATED` và `CART_READY` đều chạy qua canonical Cart engine từ dòng hàng có bằng chứng giá POS.
- Command chỉ mang content-addressed reference. Trusted ports mới được resolve cart draft, variant mutation, policy, inbound Meta message và final revalidation; payload/hash sai hoặc thiếu adapter đều fail closed.
- POS price authority bind chính xác `shopId + parentProductId + offerId`; đổi biến thể cập nhật atomically SKU, size và màu. Cart thiếu size không thể sang `READY_FOR_CONFIRMATION`.
- Mọi thay đổi dùng `cart_id + cart_version` và CAS; thay đổi sản phẩm, số lượng, màu/size, địa chỉ hoặc thanh toán làm preview cũ mất hiệu lực.
- Cart hỗ trợ offer `DIRECT`, `SET`, `COMPONENT` và `COMBO_3`.
- Trước preview phải có đủ tên, điện thoại, địa chỉ và phương thức `COD` hoặc `BANK_TRANSFER`.
- PII trong giai đoạn này thuộc lớp vận hành của cart 48 giờ; hồ sơ khách hàng dài hạn được tách sang giai đoạn riêng.
- Preview mang hash, version và revalidation của đúng cart. “Ok/chốt/lấy/đặt” ở ngoài stage `ORDER_PREVIEW` chỉ là hội thoại thông thường, không xác nhận mua.
- Confirmation retry cùng command/message là idempotent và không tạo thêm event/tag intent.
- Xác nhận mua và ảnh bill phải là inbound `CUSTOMER` đã xác minh, đúng page/hội thoại và xảy ra sau preview/confirmation tương ứng. Runtime tự sinh confirmation ID/idempotency key từ cart version + Meta message ID.
- Cổng `SalesCycleStateRepositoryV1` bắt buộc ghi state và intent tạo side effect trong cùng transaction CAS; lệnh thua race không được phát tag, payment instruction hay outbox.
- Transaction effect chứa nguyên `PancakeTagCommandV2`, handoff decision/provenance, confirmation và payment-message idempotency; adapter không được suy diễn lại payload sau commit.

## Negotiation

- Model chỉ trả structured intent/evidence; engine deterministic chọn `READY`, `HESITANT` hoặc `CAUTIOUS`.
- `READY`: không nhượng bộ thêm.
- `HESITANT`: freeship.
- `CAUTIOUS`: freeship + 20.000đ.
- Giảm 5% từ hai đơn vị sản phẩm cha vẫn được cộng với hai mức nhượng bộ; freeship luôn dedupe.
- Khách bớt món làm cart tăng version và policy được chạy lại. Nếu không còn đủ hai sản phẩm, giảm 5% tự mất.
- Retry cùng event/objection không nâng thêm bậc; hai tiến trình đồng thời phải CAS trên `stateVersion` và `cartVersion`.

## Revalidation và handoff

- Ngay trước xác nhận, runtime kiểm tra lại bốn nhóm: giá, tồn, size và ETA.
- `CONFIRM_PURCHASE` không được mang kết quả revalidation từ model/caller; runtime tự gọi trusted revalidation port.
- Bất kỳ nhóm nào `CHANGED`, `STALE` hoặc `MISSING` đều dừng xác nhận, im lặng, tag `Nhân viên` và handoff có reason code/provenance.
- Hậu mãi vẫn gửi đúng một câu giữ chân rồi tag `Vận Đơn`.
- Ảnh bill chuyển khoản không phải bằng chứng thanh toán. Bot không xác minh tiền và chuyển nhân viên xử lý.
- Handoff malformed/failure chạy fail-closed bằng `DEPENDENCY_FAILURE`; model không được chọn tag hay chính sách nhắn khách.

## Chuyển khoản

- Tài khoản ngân hàng, chủ tài khoản, hướng dẫn và URL QR phải đến từ payment policy có version và thời hạn hiệu lực.
- Source không hard-code thông tin production; runtime chỉ render policy đã xác minh.
- Payment policy production đã được chủ shop chốt: MB Bank, số tài khoản `118619999`, chủ tài khoản `CÔNG TY TNHH QUỐC TẾ THƯƠNG MẠI LAS`; ảnh QR phải được upload thành asset nội bộ có URL/version trước khi nối adapter production.
- Sau `PURCHASE_CONFIRMED`, nếu khách chọn chuyển khoản, runtime trả text có cấu trúc và QR; sau đó chuyển quyền cho nhân viên.

## Trạng thái production

1. `sales_cycle_states` lưu encrypted envelope, revision/CAS và TTL 48 giờ; `sales_cycle_events` là append-only.
2. Conversation state, sales state, funnel event, Meta Outbox và Pancake tag intent được commit atomically.
3. POS snapshot thật cấp BOM/giá/tồn/size/fulfillment qua Redis; Qdrant không được dùng làm nguồn giá hoặc tồn.
4. Runtime Policy Resolver đang đọc 4 artifact `PUBLISHED`, gồm `PAYMENT_POLICY`.
5. Realtime và POS snapshot worker đang chạy image `lana-chatbot-app:sales-cycle-production-r6`, chỉ page test được phép outbound.
6. Smoke test Docker production đạt 71/71; n8n không bị restart hoặc thay ownership trong release này.
