# Trạng thái ổn định giao diện và hiệu năng r30

Status: **MERGED_RELEASE_CANDIDATE_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-30**

## Phạm vi nguồn

- PR feature `#76` đã merge vào `main` tại
  `ca0b57efec40354bd5569ddb42d386060a4ef43f`.
- Release candidate: `20260730-performance-ui-stability-r30`; manifest tại
  [`deploy/manifests/20260730-performance-ui-stability-r30.json`](../../deploy/manifests/20260730-performance-ui-stability-r30.json).
- Production vẫn chạy `20260730-admin-fe4-r29`; tài liệu này chưa phải bằng chứng deploy.
- Không sửa source trực tiếp trên VPS. Cutover phải dùng commit/tag đã merge từ GitHub.
- Có migration additive `0026_product_media_intake_dedupe`.
- Service dự kiến recreate: `admin-api`, `admin-web`, `realtime`.
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
8. Recreate đúng `admin-api`, `admin-web`, `realtime`; giữ nguyên container ngoài phạm vi.
9. Smoke readiness, Authentik 302, asset/MIME/404, dedupe an toàn, LISTEN/NOTIFY,
   heartbeat, Inbox/Outbox, page allowlist và canary thật được cho phép.
10. Chỉ đổi symlink `current` sau khi mọi guard đạt; hậu kiểm và ghi evidence manifest.

## Rollback

- Đưa riêng `admin-api`, `admin-web`, `realtime` về image/release r29 và xác minh health trước
  khi đổi symlink về r29.
- Migration 0026 là additive; rollback ứng dụng giữ bảng để không mất dedupe evidence. Chỉ chạy
  down migration theo quyết định riêng sau backup.
- Không chạy hai phiên bản realtime worker song song.
- Không xóa Inbox/Outbox, `product_media_intakes`, Sheet rows, Redis, PostgreSQL, Qdrant hoặc ảnh.

## Evidence còn thiếu

- Manifest PR, tag object và image digest.
- Backup checksum và restore-test production.
- Container ID trước/sau, health/restart, smoke/canary và error-line delta.
- Xác nhận symlink production cùng hậu kiểm độc lập.

Chỉ khi đủ evidence mới đổi status thành **DEPLOYED_VERIFIED_R30**.
