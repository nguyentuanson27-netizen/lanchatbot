# Wave 1 batch r21 status — 2026-07-28

## Phạm vi

Batch r21 mở đường thu thập bằng chứng production replay từ luồng app-native hiện hữu.
Nó không thay semantic matcher, không mở locked holdout, không bật n8n writer, không
tạo traffic khách giả và không thay đổi quyền gửi outbound.

## Recorded replay capture

- Realtime chỉ enqueue tin inbound cuối cùng của mỗi debounce batch.
- Chỉ áp dụng cho page canary `1198992073286645` và tin có DLP `PASSED`.
- Bản ghi dùng canonical message identity đã ẩn danh; không tạo kho transcript mới.
- Insert benchmark nằm trong savepoint và fail-open, nên lỗi bảng/quyền phụ không chặn
  customer reply.
- Retry cùng tin nhắn có thể sửa capture thiếu theo identity cũ; conflict được coi là
  capture bền vững và không nhân đôi lịch sử.
- Feature flag `REALTIME_RECORDED_REPLAY_CAPTURE_ENABLED=true` chỉ được bật sau khi
  release tag r21 đã deploy.

## Admin Simulation fallback

Admin Simulation giữ nguồn event `adminSimulation` làm ưu tiên cao nhất. Khi nguồn đó
không có, worker chỉ đọc `shadow_evaluations` thỏa tất cả điều kiện:

- `status = COMPLETED`;
- `actual_outbound_count > 0`;
- business-fact payload, proposal và guarded plan đều là JSON object;
- cùng page, conversation và lookback window.

Worker chỉ đưa SHA-256 của business facts/proposal/guard vào snapshot. Query không đọc
raw message text hoặc `actual_outbound_text_redacted`. Historical actual chỉ được gán
`REPLY`; không suy diễn `NO_REPLY`, handoff hoặc order.

## Quyền và side effect

- `lana_admin_simulation_worker`: có SELECT trên `shadow_evaluations`.
- `lana_admin_simulation_worker`: không có INSERT trên `meta_outbox`.
- `lana_shadow_worker`: không có INSERT trên `meta_outbox`.
- Shadow Worker: `APP_SEND_ENABLED=false`.
- Không có migration và không thay ownership của Meta, Pancake, POS hay n8n.

## Kiểm thử

- Database: 86/86.
- Worker: 272/272.
- Admin Simulation Worker: 10/10.
- Full repo build/typecheck: pass.
- Docker full check: pass.
- Artifact smoke trong image: pass.
- SQL fallback đã được `EXPLAIN` read-only trên production schema trước release.

## Post-deploy evidence

- PR `#40`, merge commit `5f817bbcf0cc83d39c1c0d87d76ab98a1f027606`.
- Tag/release: `20260728-wave1-recorded-replay-r21`.
- Image:
  `sha256:0a9ade489e02e700694a6f78ba4e9866eb474755ffed6d331a167815c6df1434`.
- Recreated: Realtime, Shadow, Admin API, Admin Simulation và Admin Web. Cả năm
  healthy, restart 0, error/warning mới 0; toàn VPS không có container unhealthy.
- Admin API ready 200; Admin Web health/index/static asset đều 200; public Admin route
  trả 302 sang Authentik.
- Replay capture bật; Realtime vẫn được phép gửi, Shadow vẫn bị cấm gửi.
- Simulation có SELECT cần thiết nhưng Simulation/Shadow không có quyền ghi Meta Outbox.
- Số recorded snapshot đủ điều kiện ngay sau deploy: 0. Trạng thái đúng là
  `WAITING_FOR_ELIGIBLE_TRAFFIC`; không tạo inbound giả để làm đẹp số liệu.

## Rollback evidence

Attempt đầu tiên đưa cả năm container r21 lên healthy nhưng probe quyền bị lỗi quoting.
Guard đã tự rollback về r20. Hậu kiểm xác nhận:

- đúng năm image cũ;
- tất cả healthy, restart 0;
- env và symlink về r20;
- quyền SELECT mới bị thu hồi;
- Simulation/Shadow vẫn không có quyền ghi Meta Outbox.

Sau khi sửa riêng probe, attempt 2 thành công. Backup rollback hiện hành:
`/opt/lana-chatbot/shared/.env.infrastructure.backup-20260728-wave1-recorded-replay-r21-attempt2`.
Không cần rollback migration hoặc xóa dữ liệu.

## Gate còn thiếu

Wave 1 chưa hoàn tất. Còn cần:

1. Traffic production đủ điều kiện để hình thành recorded replay set.
2. Semantic candidate đạt precision/recall/support gate trên evaluation độc lập.
3. Representative control set trước controlled promotion.
4. `ORDER_CREATED` từ acknowledgement có thẩm quyền của POS/order source-of-truth.
5. Canary ít nhất 7 ngày **và** 500 eligible conversations, đồng thời đủ minimum slice.
6. Chứng minh incorrect handoff và false-positive post-sale không regression.

Locked holdout vẫn chưa mở và semantic candidate vẫn `NOT_PROMOTED`.

Manifest: `deploy/manifests/20260728-wave1-recorded-replay-r21.json`.
