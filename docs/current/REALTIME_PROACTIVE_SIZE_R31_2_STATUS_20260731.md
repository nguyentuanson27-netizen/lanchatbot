# Trạng thái tư vấn size chủ động r31.2

Status: **DEPLOYED_VERIFIED_R31_2_HUMAN_TEST_PENDING**

Ngày cập nhật: **2026-07-31**

## Phạm vi nguồn

- PR tính năng `#86` đã merge tại `abb37e5c8380929162a5e0ae9efb1ac7964dd4d9`.
- PR release `#87` đã merge tại `9fdc049252ce08cb84ee31f8691a22c9e033b956`.
- Release: `20260731-realtime-proactive-size-r31.2`, annotated tag object
  `f5a71652c2fec6c8f2739ecd3fcad68cc5357fef`; manifest tại
  [`deploy/manifests/20260731-realtime-proactive-size-r31.2.json`](../../deploy/manifests/20260731-realtime-proactive-size-r31.2.json).
- Production đang trỏ tới r31.2. Chỉ `realtime-worker` được recreate; Admin API/Web, API,
  Delivery, Shadow, POS và mọi worker dữ liệu giữ nguyên container.
- Không có migration; production tiếp tục ở schema `0026_product_media_intake_dedupe`.
- Không đổi page allowlist, routing ownership, n8n ownership, Meta delivery transport, POS,
  Qdrant writer hoặc nguồn fact có thẩm quyền.

## Hành vi tư vấn size

- Khi hồ sơ đã có đủ chiều cao và cân nặng, bot không hỏi khách có muốn tư vấn size hay không.
  Runtime gọi Size Engine deterministic ngay và gắn kết quả size vào phản hồi sản phẩm.
- Khi chỉ thiếu cân nặng, bot chỉ hỏi cân nặng; khi chỉ thiếu chiều cao, bot chỉ hỏi chiều cao.
  Khi thiếu cả hai, bot mới hỏi cả chiều cao và cân nặng.
- Nếu Size Engine cần thêm số đo hoặc sở thích độ ôm/rộng theo bảng size của đúng sản phẩm,
  bot chỉ hỏi thông tin còn thiếu do engine trả về.
- Nếu không có bảng size đã xác minh, bot handoff an toàn với lý do
  `BUSINESS_FACT_UNAVAILABLE`; không đoán size và không phát outbound sai.
- Wave 2 không gắn thêm CTA xin phép tư vấn size sau khi hồ sơ đã đủ số đo.
- Các câu “đối chiếu size” và “chị muốn em tư vấn size luôn không?” đã được loại khỏi runtime/prompt.

Giá, tồn, bảng size và kết quả tư vấn tiếp tục do nguồn deterministic đã xác minh quyết định;
model không được tự tạo business fact.

## Bằng chứng kiểm thử trước deploy

- Targeted regression: **84/84 PASS**.
- `pnpm check`: **PASS** toàn monorepo.
- Worker: **323/323 PASS**.
- Business Tools: **180/180 PASS**.
- Contracts: **86/86 PASS**.
- Golden transcript: **7/7 PASS**.
- `git diff --check`: **PASS**.

Regression mới xác nhận: hồ sơ `160 cm / 53 kg` với bảng size xác minh được tư vấn ngay size M;
reply không còn “đối chiếu” hoặc hỏi xin phép tư vấn; thiếu bảng size xác minh chuyển `HANDOFF`.

## Bằng chứng deploy production

- VPS fetch annotated tag bằng deploy key read-only và materialize working tree sạch tại
  `/opt/lana-chatbot/releases/20260731-realtime-proactive-size-r31.2`; không sửa source trong `current`.
- Docker build chạy lại `pnpm check` trong Linux và tạo image
  `lana-chatbot-app:realtime-proactive-size-r31.2`, ID
  `sha256:7342a5bb34df9f5e64236c53025d1a1b5e2f0634a5bfbc7143ee5fe01a8d5263`.
- Smoke side-effect-free đạt cho năm guard: thiếu chiều cao, thiếu cân nặng, đủ số đo tư vấn size M,
  Wave 2 không gắn CTA dư và thiếu bảng size xác minh thì handoff fail-closed.
- Cutover lúc `2026-07-31T02:35:08Z`; chỉ Realtime Worker đổi container từ
  `aac8b34e…` sang `c3b5b411…`. Mọi container ngoài phạm vi giữ nguyên ID.
- Runtime xác nhận `REALTIME_RELEASE_ID=20260731-realtime-proactive-size-r31.2`,
  `REALTIME_MESSAGE_GROUPING_V2=true`, `VERTEX_MODEL_NAME=gemini-3.5-flash-lite`, Wave 2 và
  Buying Signal Guard tiếp tục bật.
- Realtime `IDLE/LIVE`, send enabled, healthy, restart `0`; heartbeat age khi cutover `11` giây
  và postcheck tăng thêm `15` giây.
- Inbox active `0`, Outbox active `0`, duplicate sequence `0`, failed permanent sau cutover `0`
  và log lỗi mới `0`.
- Page `1198992073286645` vẫn `APP`, send enabled, kill switch off; public Admin trả `302` sang
  Authentik. Admin API/Web vẫn healthy trên image r30; API/Delivery giữ image r27.1.
- Symlink `current` chỉ chuyển sang r31.2 sau khi toàn bộ guard đạt. Rollback artifact về r31.1 đã
  chuẩn bị sẵn; không rollback schema hoặc xóa dữ liệu.

## Rollback

- Rollback về release/image r31.1 và chỉ recreate `realtime-worker`.
- Không rollback schema; không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Human test còn thiếu

- Từ cutover đến postcheck chưa có inbound khách mới (`customer_processed=0`). Đây là trạng thái chờ
  hợp lệ, không phải lỗi runtime.
- Cần human test Messenger thật cho sản phẩm có bảng size và đủ/thiếu số đo; kiểm tra handoff khi
  không có bảng size đã xác minh.
- Không tạo inbound giả. Kết quả human test sẽ được ghi evidence riêng sau khi bạn thử trên page test.

Runtime r31.2 đã deploy và hậu kiểm kỹ thuật đạt; xác nhận nghiệp vụ cuối vẫn ở trạng thái
**HUMAN_TEST_PENDING**.
