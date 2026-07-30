# Trạng thái triển khai Admin Frontend FE4

Status: **DEPLOYED_VERIFIED_R29**

Ngày cập nhật: **2026-07-30**

## Phạm vi nguồn

- PR `#72` đã merge vào `main` tại `7fbe6fde49633dd5e9cab78e039412fee0f7f149`.
- PR release manifest `#74`; merge commit/tag commit
  `e7114c637b3d1c4732f6b257d6240f434011cd08`.
- Annotated tag và production release: `20260730-admin-fe4-r29`.
- Image: `lana-chatbot-app:admin-fe4-r29`
  (`sha256:113fd4cc0cb5167ef46e20d477eb590085af4fe303f7a9dfa45469f7321f4d1b`).
- Manifest production:
  [`deploy/manifests/20260730-admin-fe4-r29.json`](../../deploy/manifests/20260730-admin-fe4-r29.json).
- Không migration; không sửa dữ liệu production.
- Không đổi outbound, Meta Send API, Pancake ownership, page allowlist, Realtime,
  Delivery, POS, P2.3, Size Chart, n8n hoặc Qdrant writer.

## Nội dung FE4

### Meta Ads funnel

- Thêm mục `Ads` độc lập trong Admin Web.
- API `/admin/v1/ad-acquisition/summary` trả hai cửa sổ cùng độ dài: kỳ hiện tại
  và kỳ trước.
- Hiển thị tử số, mẫu số, tỷ lệ và chênh lệch tỷ lệ của từng bước.
- Có các chiều ngày, ad, post, product, meaningful label, barrier, playbook,
  derivation version và attribution touch.
- `NO_RESPONSE_1H/24H` được ghi rõ là analytics-only; không tạo outbound.
- Store chỉ đọc `admin_acquisition_sessions_v`, view không chứa customer hash,
  raw message hoặc raw event metadata.
- Bước cuối vẫn là `purchase_confirmed` với nhãn “Khách xác nhận mua”; FE4 không
  tạo hoặc suy diễn `CONVERTED`/`ORDER_CREATED` trước acknowledgement từ POS.

### Media Pipeline

- Màn hình `Ảnh sản phẩm` hiển thị pipeline:
  `PENDING_AI → PENDING_REVIEW → APPROVED/REJECTED → ACTIVE → Qdrant`.
- Hiển thị checksum, duplicate flag, lần xử lý gần nhất và lỗi đã loại URL/email.
- Retry chỉ được backend cho phép khi hàng hiện tại là `ERROR` và lỗi thuộc nhóm
  tạm thời như timeout, HTTP 429/5xx hoặc kết nối reset.
- Retry giữ nguyên intake ID, checksum và image ID; chỉ cập nhật chính hàng đó về
  `PENDING_AI`. Gọi lặp sau khi thành công là idempotent và không ghi thêm.
- Hàng trùng checksum, đã approved/published hoặc lỗi không retryable bị từ chối.
- Upload vẫn ghi `MEDIA_PURPOSE=AI_AUTO`, `STATUS=PENDING_AI`; không ghi thẳng
  Qdrant và không ghi `MANUAL_OVERRIDE`.

### Dataset Adjudication

- Nút “Cần phân xử” gọi endpoint thật và chuyển item sang
  `ADJUDICATION_REQUIRED` bằng optimistic revision.
- Hàng đợi phân xử tách khỏi hàng đợi review thường, có RBAC adjudicator,
  claim/release lease và progress riêng.
- Lease của item phân xử giữ nguyên trạng thái `ADJUDICATION_REQUIRED`, nên reload
  không làm item biến mất khỏi queue đang xử lý.
- Mọi lần chuyển sang phân xử ghi event `ADJUDICATE` append-only; thao tác review
  tiếp tục dùng audit before/after hiện có.
- Blind mode lọc machine annotation ở server cho đến khi reviewer đã tạo pass
  HUMAN/ADJUDICATOR của chính mình. Adjudication queue được reveal có chủ đích.
- FE chỉ nhận `redacted_text`; không trả raw transcript, ciphertext hoặc raw PII.
- Export chỉ chọn `ACCEPTED`, `EDITED`, `ADJUDICATED`; holdout lock không đổi.

## API mới/thay đổi

| Method | Route | Bảo vệ |
|---|---|---|
| `GET` | `/admin/v1/ad-acquisition/summary?lookback_hours=` | Authenticated Admin + page scope; PII-free view |
| `GET` | `/admin/v1/product-media/pipeline` | `OWNER` hoặc `EDITOR` |
| `POST` | `/admin/v1/product-media/pipeline/:id/retry` | `OWNER` hoặc `EDITOR`; backend retry guard |
| `GET` | `/admin/v1/dataset-projects/:id/queue?adjudication=true` | `ADJUDICATOR` trở lên |
| `POST` | `/admin/v1/dataset-items/:id/adjudication` | `ANNOTATOR` đang giữ lease + revision hợp lệ |
| `POST` | `/admin/v1/dataset-items/:id/release` | `ANNOTATOR` trở lên; chỉ owner của lease |

## Bằng chứng kiểm thử trước review

- Admin API typecheck: đạt.
- Admin API: `65/65` test đạt.
- Admin Web typecheck: đạt.
- Admin Web: `50/50` Vitest và `6/6` Node test đạt.
- Database: `100/100` test đạt.
- Admin Web production build: đạt; bundle trước gzip khoảng `131,76 KB`
  JavaScript và `39,43 KB` CSS.
- Monorepo build và typecheck: đạt trong lượt `pnpm check`.
- Lượt test toàn repo sau sửa: đạt bằng `pnpm -r test`, gồm cả Worker `311/311`.
- Lượt test toàn repo đầu phát hiện một kỳ vọng SQL cũ của `nextReviewItem`; test
  đã được cập nhật để xác nhận queue thường loại `ADJUDICATION_REQUIRED`, sau đó
  database test đạt `100/100` và toàn bộ pha test monorepo đạt.

## VPS preflight và phạm vi cutover

Preflight read-only ngay trước cutover:

- `/opt/lana-chatbot/current` trỏ tới release r28.
- Admin API/Web healthy, restart `0`.
- P2.3C redacted image healthy, restart `0`.
- Disk dùng `41%`; available memory khoảng `11,8 GiB`.

Cutover chỉ recreate `admin-api` và `admin-web`. API, Realtime, Delivery,
Admin Control, Admin Simulation, PostgreSQL và P2.3C không bị recreate.

## Production verification

- Annotated tag được fetch bằng read-only deploy key; release worktree sạch và đúng commit.
- Docker build chạy toàn bộ `pnpm check` thành công.
- Admin API `/health/ready`: PASS; database, product media và dataset review đều ready.
- Admin Web index, JS/CSS MIME và asset 404: PASS.
- Ads current/previous funnel API: PASS.
- Media Pipeline API: PASS.
- Dataset index, adjudication capability và RBAC route: PASS.
- Public Admin trả `302` tới Authentik.
- Admin API/Web healthy, restart `0`; new error line count `0`.
- Container ID API, Realtime và Delivery giữ nguyên.
- Symlink `current` chỉ chuyển sang r29 sau khi toàn bộ guard đạt.
- Hậu kiểm độc lập lần hai: `FE4_POSTCHECK=PASS`.
- P2.3C publisher vẫn healthy, restart `0`.

Production evidence: **PASS**.

## Rollback

- Script: `/opt/lana-chatbot/shared/release-artifacts/20260730-admin-fe4-r29-rollback.sh`.
- Khôi phục riêng Admin API/Web về image r28 rồi chuyển symlink về release r28.
- Không down migration vì r29 không có migration.
- Không xóa acquisition event, manual image intake, annotation/audit,
  Inbox/Outbox, Redis, PostgreSQL hoặc Qdrant.
