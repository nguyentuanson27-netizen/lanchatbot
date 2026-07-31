# Trạng thái quota lượt AI realtime r31.3

Status: **MERGED_RELEASE_CANDIDATE_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-31**

## Phạm vi

- PR `#89` đã merge vào `main` tại `a9ff18c8f14c57503b4583abd7e16688eaf946ea`.
- Release candidate: `20260731-realtime-generation-quota-r31.3`; manifest tại
  [`deploy/manifests/20260731-realtime-generation-quota-r31.3.json`](../../deploy/manifests/20260731-realtime-generation-quota-r31.3.json).
- Production hiện vẫn chạy r31.2 với quota `10` lượt AI/giờ và `50` lượt AI/ngày cho mỗi page.
- Không migration. Chỉ dự kiến recreate `realtime-worker`; mọi service khác giữ nguyên container.

## Cấu hình mới

- `REALTIME_HOURLY_GENERATION_LIMIT`: `10` → `500`.
- `REALTIME_DAILY_GENERATION_LIMIT`: `50` → `2000`.
- Phạm vi quota giữ nguyên theo từng page.
- Chỉ lượt gọi AI được tính. Reply deterministic và số Meta message unit được tách ra không bị tính.
- Không đổi thuật toán đếm, cửa sổ thời gian, prompt, model, Wave 1, Wave 2, Sales Cycle,
  page allowlist, routing ownership, Meta transport hoặc n8n ownership.

Giới hạn code hiện cho phép tối đa `1.000` lượt/giờ và `10.000` lượt/ngày, vì vậy hai giá trị mới
nằm trong biên hợp lệ. Default an toàn trong code vẫn là `10/50`; production compose ghi đè bằng
`500/2000`.

## Bằng chứng kiểm tra trước deploy

- Local typecheck: **PASS**.
- Local tests: **PASS**.
- Local build: **PASS**.
- `git diff --check`: **PASS**.
- Không có thay đổi source TypeScript, schema database hoặc dữ liệu.

## Trình tự phát hành

1. Merge hồ sơ release và tạo annotated tag `20260731-realtime-generation-quota-r31.3`.
2. VPS fetch tag bằng deploy key read-only và materialize thư mục release mới; không sửa source.
3. Preflight r31.2, health/restart, queue, page routing và quota `10/50` đang chạy.
4. Build image `lana-chatbot-app:realtime-generation-quota-r31.3` từ tag; Docker chạy lại `pnpm check`.
5. Xác nhận compose render đúng quota `500/2000`.
6. Recreate đúng `realtime-worker`; kiểm tra quota env, health, restart, heartbeat, queue,
   duplicate và log lỗi.
7. Chỉ đổi symlink `current` khi toàn bộ guard đạt.

## Rollback

- Rollback về release/image r31.2 và quota `10/50`; chỉ recreate `realtime-worker`.
- Không rollback schema; không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Evidence còn thiếu

- Release PR, release commit, annotated tag object và image digest.
- Container ID trước/sau, quota env `500/2000`, health/restart, heartbeat, queue/duplicate/error
  delta và symlink cutover.

Chỉ sau khi deploy và hậu kiểm đạt mới đổi status thành
**DEPLOYED_VERIFIED_R31_3**.
