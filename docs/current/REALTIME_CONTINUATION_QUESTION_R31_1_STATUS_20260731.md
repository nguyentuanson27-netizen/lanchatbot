# Trạng thái hotfix câu hỏi nối r31.1

Status: **DEPLOYED_VERIFIED_R31_1_HUMAN_TEST_PENDING**

Ngày cập nhật: **2026-07-31**

## Phạm vi nguồn

- PR `#83` đã merge vào `main` tại `3ac1ea2ecb9034c9043957a8a4419c4b44ef03ae`.
- Release: `20260731-realtime-continuation-r31.1`, source commit
  `0ce9399c9badf65848c0b7040ddbef546ae34cf6`, annotated tag object
  `faeb17573ac687701b71d652ead99cacfc0634c1`; manifest tại
  [`deploy/manifests/20260731-realtime-continuation-r31.1.json`](../../deploy/manifests/20260731-realtime-continuation-r31.1.json).
- Production đang trỏ tới r31.1. Chỉ `realtime-worker` được recreate; Admin API/Web, API, Delivery,
  Shadow, POS và mọi worker dữ liệu giữ nguyên container.
- Không có migration; production tiếp tục ở schema `0026_product_media_intake_dedupe`.
- Không đổi page allowlist, routing ownership, n8n ownership, Meta delivery transport, POS,
  Qdrant writer hoặc nguồn fact có thẩm quyền.

## Hành vi câu hỏi nối

- Khi hội thoại trước mua còn mở và reply chưa có câu hỏi phù hợp, Wave 2 gắn đúng một câu hỏi nối
  theo stage và dữ liệu đang thiếu.
- Khi chưa có chiều cao/cân nặng: `Chị cao và nặng khoảng bao nhiêu để em đối chiếu size phù hợp cho mẫu này?`.
- Khi đã có số đo: không hỏi lại; dùng `Chị muốn em đối chiếu size phù hợp cho mẫu này luôn không?`.
- Reply đã có một câu hỏi giữ nguyên, không gắn câu thứ hai.
- Không thêm câu hỏi nối ở `HANDOFF`, `NO_REPLY`, `READY_TO_BUY`, `ORDER_REVIEW`, `POST_SALE`
  hoặc khi Sales Cycle đang xử lý tín hiệu mua/chốt đơn.

Form báo giá vẫn giữ đúng cấu trúc r31: bong bóng thông tin sản phẩm nhiều dòng, bong bóng câu hỏi
nối riêng, sau đó mới gửi ảnh. Tư vấn text thông thường vẫn giữ trong một bong bóng.

## Bằng chứng kiểm thử trước deploy

- Targeted regression: **83/83 PASS**.
- `pnpm check`: **PASS** toàn monorepo.
- Worker: **322/322 PASS**.
- Business Tools: **180/180 PASS**.
- Contracts: **86/86 PASS**.
- Golden transcript: **7/7 PASS**.
- `git diff --check`: **PASS**.

Regression mới xác nhận đủ bốn nhánh: thiếu số đo có câu hỏi; đã có số đo không hỏi lại; buying
signal không bị gắn CTA; reply đã có câu hỏi không sinh câu thứ hai.

## Bằng chứng deploy production

- VPS fetch annotated tag bằng deploy key read-only và materialize working tree sạch tại
  `/opt/lana-chatbot/releases/20260731-realtime-continuation-r31.1`; không sửa source trong `current`.
- Docker build chạy lại `pnpm check` trong Linux và tạo image
  `lana-chatbot-app:realtime-continuation-r31.1`, ID
  `sha256:a5028c9f99211d000ff8ce9a45a1f03f617ea82a6a50577b5f6296b406ad5cce`.
- Smoke side-effect-free đạt cho ba nhánh: thiếu số đo có đúng một câu hỏi, đã có số đo không hỏi
  lại và buying signal không bị gắn câu hỏi kéo dài.
- Cutover lúc `2026-07-31T00:36:34Z`; chỉ Realtime Worker đổi container từ
  `e243d8c2…` sang `aac8b34e…`. Mọi container ngoài phạm vi giữ nguyên ID.
- Runtime xác nhận `REALTIME_RELEASE_ID=20260731-realtime-continuation-r31.1`,
  `REALTIME_MESSAGE_GROUPING_V2=true`, `VERTEX_MODEL_NAME=gemini-3.5-flash-lite`, Wave 2 và
  Buying Signal Guard tiếp tục bật.
- Realtime `IDLE/LIVE`, send enabled, healthy, restart `0`; heartbeat age khi cutover `11` giây và
  postcheck tăng thêm `15` giây.
- Inbox active `0`, Outbox active `0`, duplicate sequence `0`, failed permanent sau cutover `0`
  và log lỗi mới `0`.
- Page `1198992073286645` vẫn `APP`, send enabled, kill switch off; public Admin trả `302` sang
  Authentik. Admin API/Web vẫn healthy trên image r30; API/Delivery giữ image r27.1.
- Symlink `current` chỉ chuyển sang r31.1 sau khi toàn bộ guard đạt. Rollback artifact về r31 đã
  chuẩn bị sẵn; không rollback schema hoặc xóa dữ liệu.

## Rollback

- Rollback về release/image r31 và chỉ recreate `realtime-worker`.
- Không rollback schema; không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Human test còn thiếu

- Từ cutover đến postcheck chưa có inbound khách mới (`customer_processed=0`). Đây là trạng thái chờ
  hợp lệ, không phải lỗi runtime.
- Cần human test Messenger thật cho câu hỏi giá/mã từ quảng cáo, trường hợp có/chưa có số đo, buying
  signal và hậu mãi/handoff không bị hỏi kéo dài.
- Không tạo inbound giả. Kết quả human test sẽ được ghi evidence riêng sau khi bạn thử trên page test.

Runtime r31.1 đã deploy và hậu kiểm kỹ thuật đạt; xác nhận nghiệp vụ cuối vẫn ở trạng thái
**HUMAN_TEST_PENDING**.
