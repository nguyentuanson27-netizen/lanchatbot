# Size Chart + ProductFactsV2 canary

## Phạm vi

Release này chỉ áp dụng cho page test `1198992073286645`.

- Không dùng n8n cho Size Chart, ProductFactsV2 hoặc Media Selector V2.
- `image_registry` là danh sách ảnh đầu vào; PostgreSQL Admin là nguồn chuẩn của bảng size đã duyệt.
- POS tiếp tục là nguồn chuẩn duy nhất cho BOM, giá và tồn.
- Qdrant chỉ cung cấp hồ sơ sản phẩm và ảnh đã duyệt.
- Model không được xác minh bảng size, chọn biến thể, tạo giá/tồn hoặc quyết định ưu đãi.

## Size Chart app-native

```text
image_registry
→ lọc SIZE_GUIDE/SIZE_CHART
→ tải và resize ảnh trong app worker
→ Vertex trích xuất JSON có schema
→ chỉ nhận measurement_basis=BODY và confidence đạt ngưỡng
→ tạo SIZE_CHART DRAFT trong PostgreSQL
→ admin VALIDATE → APPROVE
→ APPROVE gắn bằng chứng VERIFIED
→ Runtime Policy Resolver
→ Size Engine
```

Các ảnh đo thành phẩm (`GARMENT`), ảnh không rõ (`UNKNOWN`) hoặc confidence thấp
không được đưa vào runtime. Cùng `MA_SP + IMAGE_HASH + extractor version` chỉ tạo
một extraction; chạy lại không tạo bản trùng.

## Sửa lỗi runtime

- Hồ sơ coi chiều cao+cân nặng hoặc đủ ba vòng là dữ liệu cơ thể hợp lệ.
- Nhận cả tiếng Việt có dấu/không dấu và cách viết `kg`, `ký`, `ky`.
- Size/màu chỉ được lấy từ chữ khách nhập; giá trị model không phải bằng chứng.
- Một tin tối đa ba mã giữ nguyên từng mã, kể cả mã không tìm thấy.
- Mỗi mã nhận đúng nhóm fact trong vế câu của nó, không áp một intent chung.
- ProductFactsV2 được dựng từ POS snapshot + Qdrant + policy đã duyệt ngay trong
  realtime; lỗi dựng V2 không được thay đổi nguồn giá/tồn V1 hiện hành.
- Media Selector V2 chọn ảnh đúng loại/thành phần. Thiếu ảnh thì nói rõ không có
  và tiếp tục bước bán hàng bằng fact đã xác minh; không lấy ảnh loại khác thay thế.

## Funnel

Admin tổng hợp theo hội thoại trong cửa sổ mặc định 48 giờ:

```text
FACTS_PRESENTED
→ SIZE_RECOMMENDED
→ CART_OPENED
→ PREVIEW_CREATED
→ CONFIRM_PURCHASE / PURCHASE_CONFIRMED
```

Endpoint: `GET /admin/v1/sales-funnel/summary?page_id=...&lookback_hours=48`.

## Gate phát hành

1. Migration `0020` phải backup và restore-test `up → down → up`.
2. Full build/typecheck/test trong image release phải đạt.
3. Bộ `30 deterministic Messenger canary scenarios` phải đạt đủ 30/30.
4. Smoke đọc Redis/POS, Qdrant, Runtime Policy và Meta token phải đạt.
5. Chỉ recreate các service thay đổi; không restart n8n hoặc service ngoài phạm vi.
6. Sau cutover theo dõi tối thiểu `100` inbound đã xử lý hoặc `48 giờ`, điều kiện
   nào đến sau theo quyết định vận hành. Không dùng replay để thay bằng chứng live.
7. Trong canary không được có gửi ảnh sai loại, báo size từ chart chưa VERIFIED,
   duplicate Inbox/Outbox hoặc mở outbound ngoài page test.

## Rollback

- Đổi realtime/admin về image release trước.
- Dừng riêng `size-chart-extractor`.
- Không xóa Inbox, Outbox, Redis, hồ sơ khách, sales-cycle state hoặc extraction audit.
- Migration `0020` là additive; có thể giữ nguyên khi rollback code. Chỉ chạy down
  khi restore-test/chính sách release yêu cầu và không có artifact cần bảo toàn.
