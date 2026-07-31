# Trạng thái quota lượt AI realtime r31.3

Status: **DEPLOYED_VERIFIED_R31_3**

Ngày cập nhật: **2026-07-31**

## Phạm vi

- PR cấu hình `#89` đã merge tại `a9ff18c8f14c57503b4583abd7e16688eaf946ea`.
- PR release `#90` đã merge tại `30dd6030a2e682cdd438f4226073fb77e4a579b7`.
- Release: `20260731-realtime-generation-quota-r31.3`, annotated tag object
  `da6239238dccf5d1d2b8d3dc47c9e6f3a67252a0`; manifest tại
  [`deploy/manifests/20260731-realtime-generation-quota-r31.3.json`](../../deploy/manifests/20260731-realtime-generation-quota-r31.3.json).
- Production đang trỏ tới r31.3. Chỉ `realtime-worker` được recreate; mọi service khác giữ nguyên container.
- Không migration; production tiếp tục ở schema `0026_product_media_intake_dedupe`.

## Cấu hình đã live

- `REALTIME_HOURLY_GENERATION_LIMIT`: `500`.
- `REALTIME_DAILY_GENERATION_LIMIT`: `2000`.
- Phạm vi quota giữ nguyên theo từng page.
- Chỉ lượt gọi AI được tính. Reply deterministic và số Meta message unit được tách ra không bị tính.
- Không đổi thuật toán đếm, cửa sổ thời gian, prompt, model, Wave 1, Wave 2, Sales Cycle,
  page allowlist, routing ownership, Meta transport hoặc n8n ownership.

Default an toàn trong code vẫn là `10/50`; production compose ghi đè bằng `500/2000`. Hai giá trị
mới nằm trong biên runtime `1.000/10.000`.

## Bằng chứng kiểm tra trước deploy

- Local typecheck: **PASS**.
- Local tests: **PASS**.
- Local build: **PASS**.
- Docker `pnpm check`: **PASS**.
- `git diff --check`: **PASS**.
- Không có thay đổi source TypeScript, schema database hoặc dữ liệu.

## Bằng chứng deploy production

- VPS fetch annotated tag bằng deploy key read-only và materialize working tree sạch tại
  `/opt/lana-chatbot/releases/20260731-realtime-generation-quota-r31.3`; không sửa source trong `current`.
- Docker tạo image `lana-chatbot-app:realtime-generation-quota-r31.3`, ID
  `sha256:54ced1eb0a31313c0d179b71931389f47200974b73dafc93a96f4b8e2b8b79c5`.
- Smoke side-effect-free của r31.2 tiếp tục PASS.
- Compose render guard xác nhận quota `500/2000` trước khi recreate worker.
- Cutover lúc `2026-07-31T03:33:08Z`; chỉ Realtime Worker đổi container từ
  `c3b5b411…` sang `a510d435…`. Mọi container ngoài phạm vi giữ nguyên ID.
- Container live xác nhận trực tiếp `REALTIME_HOURLY_GENERATION_LIMIT=500` và
  `REALTIME_DAILY_GENERATION_LIMIT=2000`.
- Runtime giữ `gemini-3.5-flash-lite`, Wave 2, Buying Signal Guard, page allowlist và
  message grouping như r31.2.
- Realtime `IDLE/LIVE`, send enabled, healthy, restart `0`; heartbeat age khi cutover `11` giây
  và postcheck tăng thêm `15` giây.
- Inbox active `0`, Outbox active `0`, duplicate sequence `0`, failed permanent sau cutover `0`
  và log lỗi mới `0`.
- Page `1198992073286645` vẫn `APP`, send enabled, kill switch off; public Admin trả `302`
  sang Authentik.
- Symlink `current` chỉ chuyển sang r31.3 sau khi toàn bộ guard đạt.

## Rollback

- Rollback về release/image r31.2 và quota `10/50`; chỉ recreate `realtime-worker`.
- Không rollback schema; không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Rollback artifact đã chuẩn bị nhưng không phải thực thi.

r31.3 đã deploy và hậu kiểm đạt trạng thái **DEPLOYED_VERIFIED_R31_3**.
