# Trạng thái Admin Frontend FE1–FE3 r28

Status: **DEPLOYED_PRODUCTION_VERIFIED**

Ngày phát hành: **2026-07-30**

## Phạm vi

- Release: `20260730-admin-frontend-waves-r28`.
- Source commit: `e64cf9caa5cc46409eb48eb2ad51c751a61fc9fd`.
- Pull request: `#65`.
- Image: `lana-chatbot-app:admin-frontend-waves-r28`.
- Chỉ recreate `admin-api` và `admin-web`.
- Không đổi API, Realtime, Delivery, Shadow, Admin Simulation, POS, P2.3,
  Size Chart, n8n, outbound, page allowlist hoặc ownership.

## Nội dung

### FE1 — Nền tảng UX và accessibility

- Typography metadata/badge tối thiểu 12 px.
- Polling không làm mất focus, selection, scroll hoặc dữ liệu đang nhập.
- Toast có live role phù hợp; dataset shortcuts hoạt động.
- Dialog/drawer có focus trap, Escape, restore focus và inert nền.
- Native prompt/confirm được thay bằng modal có accessibility.

### FE2 — Dữ liệu và điều hướng

- Conversation search/filter chạy phía server trên projection PII-safe.
- Cursor pagination cho Conversations và Audit.
- Search/owner filter đồng bộ URL.
- Topbar lấy page scope từ identity.

### FE3 — Vận hành

- Handoff có assignee, priority, SLA, optimistic revision và idempotency.
- Transition `CLAIM`, `REASSIGN`, `RESOLVE`, `REOPEN`, `SET_PRIORITY`.
- `handoff_case_events` append-only, có audit và idempotency constraint.
- Conversation Inspector tổng hợp redacted message, Wave 2 event, evaluation,
  delivery outbox và handoff chỉ qua admin projection.

## Database

- Migration: `0025_admin_frontend_operations`.
- Migration SHA-256:
  `03ae35424838d34da5a97d366c69cc39aed3a022b6325d4ca6047635b121f854`.
- Backup:
  `/opt/lana-chatbot/backups/20260730-admin-frontend-waves-r28-predeploy.dump`.
- Backup SHA-256:
  `43cf8f2eeab994de85fa35dba3009f19aab220d94e3dd30e7acd5b388ef39593`.
- Restore-test thực hiện trên PostgreSQL 17 cô lập mạng: `up → down → up` đạt.
- Hậu kiểm production: view có đủ năm cột FE3, trigger append-only hoạt động,
  bốn quyền SELECT/UPDATE/INSERT cho Admin đều đúng.

## Kiểm thử và hậu kiểm

- Docker `pnpm check`: đạt.
- Admin API: 59/59.
- Database: 99/99.
- Worker: 299/299.
- Admin Web bundle: 120,36 KB JavaScript, 36,91 KB CSS trước gzip.
- Admin API readiness: 200.
- Admin Web health/index: 200.
- Public Admin: 302 sang Authentik.
- Admin API/Web: healthy, restart 0, error log mới 0.
- API/Realtime/Delivery: container ID không đổi, healthy, restart 0.
- Webhook Inbox: 106 `PROCESSED`.
- Meta Outbox: 39 `SENT_ACCEPTED`, 1 `MANUAL_REVIEW`, không có item active.
- Duplicate Meta sequence group: 0.

## Cutover và rollback

Lần cutover đầu được guard rollback trước khi đổi symlink vì artefact smoke gọi
nhầm `/health` và nhận 404; service bản thân vẫn healthy. Retry dùng endpoint
chính thức `/health/ready`, đạt toàn bộ guard rồi mới chuyển `current` sang r28.

Rollback giữ migration additive `0025`, recreate riêng Admin API/Web bằng image
r27.1 và chuyển symlink về release r27.1. Không xóa PostgreSQL, Redis,
Inbox/Outbox, Qdrant hoặc dữ liệu khách hàng.
