# Trạng thái Wave 2 + Gemini 3.5 Flash-Lite r26.1 — 2026-07-29

## Kết quả

Page test duy nhất `1198992073286645` đang chạy 100% release
`20260729-wave2-strategy-gemini35-r26.1`, source commit
`0fb115ee564f751894611e6196bdef3d4365b036` và image
`lana-chatbot-app:wave2-strategy-gemini35-r26.1`.

- Wave 2 chạy trực tiếp trên production test page; không có Human Test Mode riêng.
- Runtime phân loại nhu cầu, rào cản, yếu tố quyết định và chiến lược theo stage playbook.
- Mỗi lượt chỉ được thêm tối đa một CTA phù hợp stage. Deterministic business guard vẫn là lớp quyết định cuối cho fact, offer, media, checkout, handoff và outbound.
- `POST_SALE` không đi qua chiến lược bán hàng Wave 2 và không được mở checkout mới.
- Admin chỉ đọc các dimension Wave 2 đã giới hạn; không đọc raw transcript, raw event metadata hoặc PII khách.
- Cross-sell không tự chạy khi chưa có quan hệ phối đồ đã duyệt; hệ thống fail-closed thay vì dùng similarity để đoán.

## Model

Mọi vị trí Gemini Flash-Lite đang hoạt động hoặc được định nghĩa trong release đã đổi từ
`gemini-3.1-flash-lite` sang `gemini-3.5-flash-lite`:

- proposal/reply realtime;
- Shadow evaluation;
- Media AI reranker;
- P2.3B image metadata;
- Size Chart extraction;
- các workflow n8n P2.3 export trong source.

Credential production đã gọi thành công model mới với cả prompt tối giản và structured
output schema. Model code được đối chiếu với tài liệu chính thức của Google:
<https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite>.

## Database và rollback

- Backup production:
  `/opt/lana-chatbot/backups/20260729-wave2-strategy-gemini35-r26-predeploy.dump`.
- SHA-256:
  `5242e68f56c2f11ca03bbf2d350836f652c2058ab147e28c0ea84f62f80dee46`.
- Restore-test migration `0023_wave2_strategy_metrics`: `up → down → up` PASS.
- Rollback giữ nguyên owner `lana_app` và ACL của `admin_conversation_events_v`.
- Production hiện ở migration `0023_wave2_strategy_metrics`, có đúng bảy cột Wave 2.
- Application rollback về r25 không cần rollback schema và không xóa dữ liệu.

## Bằng chứng

- Pull request tính năng: `#50`; hotfix rollback phát hiện trong restore-test: `#51`.
- Annotated tag: `20260729-wave2-strategy-gemini35-r26.1`.
- Git bundle SHA-256:
  `13fb8adcd70477be8ae3a3ecbbc53272c10d37329ed46bb5837e9b4eda1c8069`.
- Local và Docker `pnpm check`: PASS, 1.011/1.011 test.
- Business Tools 168/168, Contracts 82/82, Database 88/88, Dataset Review 60/60,
  Worker 292/292.
- Sáu service có healthcheck đều healthy; Size Chart running; cả bảy restart count 0.
- Admin API ready 200, Admin Web index 200, public route 302 sang Authentik.
- Page `ACTIVE/APP`, send enabled, kill switch off; Realtime `IDLE/LIVE`, Shadow send false.
- Meta Outbox active 0, Webhook Inbox active 0, Pancake Outbox active 0 và duplicate
  Meta sequence group 0.
- Wave 2 metric lúc chụp bằng 0 vì chưa có human message mới sau cutover.

## Human test và giới hạn

Human test Messenger toàn Wave 1 + Wave 2 đang ở trạng thái
`PENDING_FIRST_POST_DEPLOY_HUMAN_MESSAGE`. Không tạo inbound giả và không coi smoke
nội bộ là bằng chứng trải nghiệm Messenger.

Các nhánh cần dữ liệu thật vẫn fail-closed: cross-sell/cặp phối đồ chưa bật khi chưa có
catalog relation đã duyệt; `ORDER_CREATED` vẫn cần acknowledgement từ POS/order
source-of-truth; semantic promotion và representative control set tiếp tục là gate đánh
giá, không được suy diễn từ vài lượt test thủ công.

## Rollback

1. Phục hồi
   `/opt/lana-chatbot/shared/.env.infrastructure.backup-20260729-wave2-strategy-gemini35-r26.1`.
2. Recreate bảy service bằng các image r25/r21/r16 trước release và đặt
   `REALTIME_WAVE2_STRATEGY_V1=false`.
3. Chuyển `current` về
   `/opt/lana-chatbot/releases/20260729-media-selector-v2-guard-r25`.
4. Không xóa Inbox, Outbox, Redis, PostgreSQL, Qdrant hoặc backup.
