# Trạng thái triển khai Admin Frontend FE4

Status: **MERGED_RELEASE_CANDIDATE_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-30**

## Phạm vi nguồn

- PR `#72` đã merge vào `main` tại `7fbe6fde49633dd5e9cab78e039412fee0f7f149`.
- Release candidate: `20260730-admin-fe4-r29`.
- Production hiện hành vẫn là `20260730-admin-frontend-waves-r28`.
- Manifest release candidate:
  [`deploy/manifests/20260730-admin-fe4-r29.json`](../../deploy/manifests/20260730-admin-fe4-r29.json).
- Chưa tạo tag hoặc cutover; production evidence vẫn đang chờ xác thực VPS.
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

## VPS trước thay đổi

Kiểm tra read-only trước khi sửa source:

- `/opt/lana-chatbot/current` trỏ tới release r28.
- Admin API/Web healthy, restart `0`.
- P2.3C redacted image healthy, restart `0`.
- Disk khoảng `45%`; available memory khoảng `11 GiB`.

Không có file, service, symlink, database hoặc cấu hình nào trên VPS bị thay đổi
trong quá trình thực hiện FE4.

## Smoke và cutover còn thiếu

Các mục sau chỉ thực hiện sau khi PR được review/merge và có yêu cầu deploy rõ ràng:

1. Tạo tag và release manifest gắn đúng merge commit/image.
2. Build image Admin API/Web mới từ GitHub source.
3. Smoke nội bộ health/readiness, FE4 API, asset MIME/404 và public Authentik 302.
4. Smoke RBAC cho Ads, Media retry và Dataset adjudication bằng dữ liệu an toàn.
5. Xác nhận Admin API/Web restart `0`; service ngoài phạm vi không recreate.
6. Chỉ chuyển symlink `current` sau khi toàn bộ guard đạt.

Production evidence hiện là **EVIDENCE_PENDING** vì FE4 chưa deploy.

## Rollback dự kiến

- Rollback image riêng `admin-api` và/hoặc `admin-web` về r28.
- Chuyển symlink về release r28 sau health/smoke.
- Không down migration vì FE4 không có migration.
- Không xóa acquisition event, manual image intake, annotation/audit,
  Inbox/Outbox, Redis, PostgreSQL hoặc Qdrant.
