# Gửi ảnh sản phẩm sau nhận diện r23 — trạng thái 2026-07-29

## Kết quả

Release `20260729-media-image-delivery-r23` đang LIVE 100% trên page test
`1198992073286645`. Chỉ `realtime-worker` được recreate; app tiếp tục là owner duy nhất của
page và n8n không được bật lại làm writer.

- PR code: `#44`.
- Merge commit: `a962b4662128f3dc73b45d2e1491d7cb62baf35b`.
- Tag: `20260729-media-image-delivery-r23`.
- Image: `lana-chatbot-app:media-image-delivery-r23`.
- Image ID: `sha256:a7661b006a3dac6da1a7861d9085740aa08131a95bccca4e8031c06c1600ab2a`.
- Release path: `/opt/lana-chatbot/releases/20260729-media-image-delivery-r23`.
- Rollback path: `/opt/lana-chatbot/releases/20260728-media-cutout-ai-r22`.

Source được chuyển bằng Git bundle đầy đủ từ annotated tag, xác minh SHA-256 và
`git bundle verify`, rồi clone thành release directory sạch. Không sửa source trực tiếp trên VPS.

## Nguyên nhân đã sửa

Nhận diện SD395 trước đây đã thành công nhưng proposal chỉ tạo Outbox text vì ba điều kiện nối tiếp:

1. Ảnh `FRONT + FULL_SET/VAY` bị chiếu thành `FRONT`, nên request `FULL_LOOK` không chọn được asset.
2. Media Selector V2 có outcome nhưng selection rỗng vẫn làm nhánh legacy bị bỏ qua.
3. Product đi ra từ một candidate image có thể chỉ mang payload của một point, chưa đủ toàn bộ ảnh catalog.

r23 thay đổi như sau:

- `CLOSEUP` được xét trước; kế tiếp `FULL_SET/VAY → FULL_LOOK`; sau đó mới tới `FRONT/BACK/SIDE`.
- Selection V2 chỉ được dùng khi có ít nhất một URL; rỗng thì fallback sang
  `verifiedImageUrls(product, "PRICE_CARD")`.
- Sau khi nhận diện mã, runner exact-match lại mã và Qdrant adapter scroll/tổng hợp các point cùng mã
  thành document catalog. Document chỉ được nhận nếu normalized code vẫn trùng mã đã nhận diện.
- Nếu bước rehydrate lỗi, match đã xác minh không bị xóa; runtime giữ product candidate cũ để fail-soft.

## Kiểm thử và hậu kiểm

- Local `pnpm check`: PASS.
- Docker `pnpm check` trong quá trình build trên VPS: PASS.
- Toàn monorepo: 997/997 test.
- Worker: 291/291 test.
- Regression mới xác minh:
  - `FULL_SET/VAY` thành `FULL_LOOK`;
  - `CLOSEUP` không bị hạ ưu tiên;
  - V2 rỗng fallback ảnh verified;
  - media recognition rehydrate exact catalog và tạo `TEXT` trước `IMAGE`.
- Smoke read-only trong container live với SD395:
  - exact catalog rehydration: PASS;
  - tổng số ảnh catalog: 10;
  - ảnh verified: 10;
  - ảnh verified `FULL_LOOK`: 1;
  - fallback khi V2 rỗng: PASS.
- Realtime worker: healthy, restart 0, log lỗi mới 0.
- Worker ledger: `IDLE`, `LIVE`, send enabled, last error `NONE`.
- Page: owner `APP`, send enabled, kill switch tắt.
- Inbox active: 0; Outbox active: 0; duplicate reply-plan/sequence: 0.
- ID của mọi container ngoài realtime-worker không đổi.

Không có inbound hoặc Outbox mới trong 15 phút hậu kiểm. Vì vậy trạng thái human test Messenger là
`PENDING_NEW_POST_DEPLOY_IMAGE`; smoke nội bộ không được dùng để khẳng định Meta đã gửi ảnh thực tế.

## Human test tiếp theo

Gửi lại một ảnh SD395 hoặc SD443 qua Messenger page test, rồi kiểm tra:

- nhận diện đúng mã;
- proposal tạo hai unit cùng reply plan: `TEXT sequence 0`, `IMAGE sequence 1`;
- delivery chấp nhận cả hai, không tạo duplicate khi Meta replay webhook;
- ảnh gửi ra là ảnh verified toàn bộ trang phục, không phải payload ảnh point bị thiếu;
- không tái dùng `currentProductId` cũ khi khách gửi ảnh mới.

## Rollback

Nếu phát hiện lỗi:

1. Recreate riêng realtime-worker bằng `lana-chatbot-app:media-cutout-ai-r22`.
2. Chuyển symlink `current` về `/opt/lana-chatbot/releases/20260728-media-cutout-ai-r22`.
3. Không restart API, delivery, Shadow, Admin, POS, P2.3 hoặc n8n.
4. Không xóa Inbox, Outbox, Redis, PostgreSQL hoặc cache.

Manifest: `deploy/manifests/20260729-media-image-delivery-r23.json`.
