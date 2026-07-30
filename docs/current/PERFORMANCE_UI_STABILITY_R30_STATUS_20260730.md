# Trạng thái ổn định giao diện và hiệu năng r30

Status: **DEPLOYED_VERIFIED_R30**

Ngày cập nhật: **2026-07-30**

## Phạm vi nguồn

- PR feature `#76` đã merge vào `main` tại
  `ca0b57efec40354bd5569ddb42d386060a4ef43f`.
- Release đã deploy: `20260730-performance-ui-stability-r30`; manifest evidence tại
  [`deploy/manifests/20260730-performance-ui-stability-r30.json`](../../deploy/manifests/20260730-performance-ui-stability-r30.json).
- Production đang chạy `/opt/lana-chatbot/releases/20260730-performance-ui-stability-r30` từ annotated tag và commit `8748de1c27e58c6e893e918ba22f4190d363cbaf`.
- Không sửa source trực tiếp trên VPS. Cutover phải dùng commit/tag đã merge từ GitHub.
- Có migration additive `0026_product_media_intake_dedupe`.
- Service đã recreate: `admin-api`, `admin-web`, `realtime-worker`; các container ngoài phạm vi giữ nguyên ID.
- Không đổi Meta Send API, Delivery, Pancake ownership, page allowlist, POS, P2.3,
  Size Chart, n8n hoặc Qdrant writer.

## Bản vá đứng giao diện Admin

Chẩn đoán được xác nhận: drawer nằm cùng cây con với `#app`, nhưng dialog runtime đặt `inert`
lên toàn bộ `#app`, nên drawer vừa mở cũng bất hoạt. Một số đường render lại không cleanup
activation cũ, làm depth bị giữ và giao diện chỉ phục hồi sau F5.

Bản vá:

- Chỉ đặt `inert` lên `.app-shell`; overlay là phần tử anh em nên vẫn tương tác được.
- Drawer và command modal có cleanup riêng, idempotent; render lại cleanup activation cũ.
- Escape đi qua nút đóng thật để click và bàn phím dùng cùng một đường cleanup.
- Focus-stack dùng token riêng, hỗ trợ cleanup ngoài thứ tự mà không lấy focus khỏi modal trên cùng.
- Background chỉ bỏ `inert` khi toàn bộ dialog đã đóng.

## C1 — xử lý song song hội thoại

- Realtime chạy mặc định `4` slot, giới hạn cứng `1..8` qua `REALTIME_CONCURRENCY`.
- PostgreSQL lease và `SKIP LOCKED` vẫn quyết định claim. Generation guard và atomic Outbox
  giữ nguyên, nên thứ tự trong một hội thoại không bị nới lỏng.
- Concurrency chỉ cho phép các hội thoại độc lập tiến hành đồng thời.
- Shutdown dùng `AbortController`; mọi slot dừng trước khi đóng runtime, Redis và database pool.
- Đây là tăng trần throughput, không phải cam kết tăng đúng 4 lần vì model, Meta và business
  adapters vẫn là giới hạn bên ngoài.

```text
REALTIME_CONCURRENCY=4
REALTIME_POLL_MS=10000
REALTIME_HEARTBEAT_MS=15000
```

## B2 — resize ảnh bằng sharp

- Admin product-media không spawn `ffmpeg`; JPEG/PNG/WebP được resize trong process bằng
  `sharp`/libvips, tự xoay EXIF, giữ tỷ lệ, không phóng lớn và dùng Lanczos3.
- Input tối đa 40 triệu pixel; cạnh đầu ra trong `320..4096`, production mặc định `1600` px.
- FIFO limiter mặc định `2`, giới hạn `1..4` qua
  `ADMIN_PRODUCT_MEDIA_RESIZE_CONCURRENCY` để tránh đỉnh RAM khi upload đồng thời.
- MIME giữ nguyên: JPEG quality 85, PNG compression 7, WebP quality 85.
- `ffmpeg` vẫn còn trong image chung vì P2.3C, nhận diện realtime và trích frame video còn dùng;
  r30 chỉ thay pipeline resize ảnh tĩnh của Admin.

## B3 — dedupe ảnh bằng PostgreSQL

- Unique key có thẩm quyền: `(brand_key, product_code, image_hash)`; Google Sheet là projection.
- Sheet cũ được backfill một lần khi process khởi động; upload bình thường không full-scan Sheet.
- Trạng thái gồm `RESERVED`, `PROJECTED`, `FAILED`. Bản `FAILED` hoặc `RESERVED` quá 15 phút
  được thu hồi atomically.
- Nếu crash sau khi ghi Sheet nhưng trước khi đánh dấu `PROJECTED`, lần thu hồi đối soát Sheet
  trước khi resize/append, nên không tạo hàng hoặc ảnh thứ hai.
- Bảng dedupe không lưu email, tên file gốc, raw image, chat hoặc PII.
- Lỗi được redaction URL/email và giới hạn độ dài trước khi lưu.
- Pool của store giới hạn `2` connection.

Migration:

```text
packages/database/migrations/0026_product_media_intake_dedupe.up.sql
packages/database/migrations/0026_product_media_intake_dedupe.down.sql
```

## B4 — giảm polling và heartbeat

- Webhook mới phát `pg_notify('lana_realtime_inbox', event_kind)` trong transaction; notification
  chỉ được giao sau commit. Webhook trùng không phát notification.
- Realtime có một connection `LISTEN` riêng và một wake promise dùng chung cho các slot idle.
- Poll 10 giây chỉ là fallback khi LISTEN mất kết nối hoặc notification bị bỏ lỡ.
- Heartbeat ghi khi đổi trạng thái và tối đa mỗi 15 giây, không còn ghi theo mỗi vòng poll.
- Listener có timeout kết nối 5 giây và được UNLISTEN/release khi shutdown.

## Bằng chứng kiểm thử cục bộ

- `pnpm check`: **PASS** — build, typecheck, test và build cuối toàn monorepo.
- Admin API: `67/67` test đạt, gồm resize thật, dedupe và crash recovery PostgreSQL ↔ Sheet.
- Database: `103/103` test đạt, gồm migration, reservation reclaim và NOTIFY guard.
- Worker: `313/313` test đạt, gồm giới hạn concurrency và wake wait dùng chung.
- Admin Web: `54/54` Vitest và `6/6` Node test đạt; production build đạt.
- Bundle trước gzip: JavaScript khoảng `132.22 KB`, CSS `39.43 KB`.
- `git diff --check`: đạt.

## Trình tự phát hành bắt buộc

1. Merge feature PR vào `main`; tạo manifest candidate từ đúng merge commit.
2. Merge manifest và tạo annotated tag `20260730-performance-ui-stability-r30`.
3. VPS chỉ fetch tag bằng deploy key read-only và materialize release mới; không sửa source.
4. Preflight read-only: symlink, container health/restart, disk/RAM, PostgreSQL và backlog.
5. Backup PostgreSQL có checksum; restore vào database tạm và chạy `up → down → up` cho 0026.
6. Build image r30 từ tag, không ghi đè image r29.
7. Apply migration 0026 trước khi start Admin API r30.
8. Recreate đúng `admin-api`, `admin-web`, `realtime-worker`; giữ nguyên container ngoài phạm vi.
9. Smoke readiness, Authentik 302, asset/MIME/404, dedupe an toàn, LISTEN/NOTIFY,
   heartbeat, Inbox/Outbox, page allowlist và canary thật được cho phép.
10. Chỉ đổi symlink `current` sau khi mọi guard đạt; hậu kiểm và ghi evidence manifest.

## Rollback

- Đưa riêng `admin-api`, `admin-web` về image r29 và `realtime-worker` về image r27.1; xác minh health trước khi đổi symlink về r29.
- Migration 0026 là additive; rollback ứng dụng giữ bảng để không mất dedupe evidence. Chỉ chạy
  down migration theo quyết định riêng sau backup.
- Không chạy hai phiên bản realtime worker song song.
- Không xóa Inbox/Outbox, `product_media_intakes`, Sheet rows, Redis, PostgreSQL, Qdrant hoặc ảnh.

## Evidence production

- Annotated tag object: `5936d7f87db7baf8b69b4f091524134a33de5f77`; tag commit và image revision:
  `8748de1c27e58c6e893e918ba22f4190d363cbaf`.
- Image: `lana-chatbot-app:performance-ui-stability-r30`, ID
  `sha256:a35de1caebb02ca84e4d7a0e39b93f66a2c2ef3cdbd07628d4358270db7a2e03`.
- Backup: `/opt/lana-chatbot/shared/backups/20260730-performance-ui-stability-r30-20260730T153838Z.dump`,
  21.849.346 byte, SHA-256 `d3366fea60203a68b488c3908bf8aa8f671c3dc453150dfe98a6613755f1060b`.
- Restore-test cách ly: baseline 0025, `UP → DOWN → UP` migration 0026 và unique dedupe smoke đều **PASS**.
- Cutover lần đầu dùng nhầm compose service `realtime` thay vì `realtime-worker`; guard dừng trước khi đổi Realtime,
  rollback Admin về r29 và trả symlink về r29 thành công. Migration 0026 additive được giữ lại.
- Cutover lần hai lúc `2026-07-30T15:54:09Z`: ba target healthy, restart count 0; readiness, RBAC,
  assets/MIME/404 và Authentik 302 đều **PASS**; symlink chỉ đổi sau tất cả guard.
- B2 production smoke: `sharp`/libvips `8.17.1` resize WebP đúng kích thước.
- B4 production smoke: một PostgreSQL listener, `REALTIME_POLL_MS=10000`, `REALTIME_CONCURRENCY=4`,
  `REALTIME_HEARTBEAT_MS=15000`; heartbeat quan sát 15–30 giây tùy thời điểm lấy mẫu.
- Canary thật sau cutover: `CUSTOMER | PROCESSED = 1`, `FAILED_PERMANENT = 0`, thời gian xử lý tối đa
  `5.101` giây; stale `PROCESSING = 0`, error line mới của ba target `= 0`.
- Rollback artifact độc lập đã tạo và kiểm tra cú pháp; rollback ứng dụng giữ migration/bảng 0026,
  không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant, Sheet hoặc ảnh.

Bằng chứng máy đọc nằm trong
[`deploy/manifests/20260730-performance-ui-stability-r30.json`](../../deploy/manifests/20260730-performance-ui-stability-r30.json).
