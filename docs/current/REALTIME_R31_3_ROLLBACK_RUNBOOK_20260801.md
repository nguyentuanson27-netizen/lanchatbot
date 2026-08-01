# Runbook rollback Realtime về r31.3

Status: **APPROVED_NOT_EXECUTED**

Ngày phê duyệt tài liệu: 2026-08-01.

Runbook này chỉ cho rollback runtime Realtime từ r32.1 về behavioral baseline r31.3. Việc merge tài liệu không đồng nghĩa outbound đã khóa, runtime đã rollback hoặc queue đã được requeue.

## 1. Artifact có thẩm quyền

- Release tag: `20260731-realtime-generation-quota-r31.3`.
- Source commit: `30dd6030a2e682cdd438f4226073fb77e4a579b7`.
- Release path: `/opt/lana-chatbot/releases/20260731-realtime-generation-quota-r31.3`.
- Image: `lana-chatbot-app:realtime-generation-quota-r31.3`.
- Image ID: `sha256:54ced1eb0a31313c0d179b71931389f47200974b73dafc93a96f4b8e2b8b79c5`.
- Manifest: [r31.3](../../deploy/manifests/20260731-realtime-generation-quota-r31.3.json).
- Incident addendum: [r32.1 containment](../../deploy/manifests/20260801-r32.1-incident-containment.json).

Nếu tag, commit, release path, image ID hoặc revision label không khớp, dừng. Không dùng image tên giống nhưng provenance khác.

## 2. Phạm vi cố định

Được phép:

- chuyển image và runtime config của `realtime-worker` về r31.3;
- đổi symlink `/opt/lana-chatbot/current` bằng guarded atomic switch sau khi mọi precheck đạt;
- giữ migration `0027_handoff_case_sla_default` vì additive và tương thích ngược;
- append audit/rollback evidence mới.

Không được phép:

- recreate API, Delivery, Admin API/Web, Shadow, Simulation, n8n, P2.3 hoặc service khác;
- rollback/xóa migration, hội thoại, audit event, Inbox, Outbox, Redis, PostgreSQL hoặc Qdrant;
- sửa source trực tiếp trong `current` hoặc `releases/*`;
- thay page allowlist, routing ownership, model ownership hoặc provider credentials;
- requeue Inbox/Outbox trong cùng thao tác rollback;
- tự mở lại outbound sau cutover.

## 3. Điều kiện bắt buộc trước runtime mutation

Mọi mục dưới đây phải có evidence. Thiếu một mục thì dừng:

1. Có yêu cầu rollback rõ ràng của owner và cửa sổ thao tác được xác nhận.
2. GitHub `main` chứa plan r32.2, Regression Shield, incident containment và runbook này.
3. Kết nối chỉ đọc tới VPS hoạt động. Ghi lại:
   - target của symlink `current`;
   - image, image ID, revision/release label và container ID của mọi service;
   - rendered compose/config của Realtime, không ghi secret;
   - health, restart count và worker ledger.
4. Chứng minh release path r31.3 sạch, đúng commit/tag và image đúng ID ở mục 1. Nếu phải materialize lại, chỉ fetch tag bằng deploy key read-only; không dùng source chưa commit.
5. Chụp snapshot Inbox/Outbox theo trạng thái, age, response group và sequence; ghi riêng hàng `SENDING`, `AMBIGUOUS`, `MANUAL_REVIEW` và `FAILED_PERMANENT`.
6. Xác nhận không có Outbox `SENDING` đang giữ lease. Nếu có, dừng để đối soát; không blind retry, cancel hoặc requeue.
7. Khóa outbound canary qua control plane được hỗ trợ. Bằng chứng phải cho thấy page `1198992073286645` có `appSendEnabled=false` hoặc `killSwitch=true`, và một dry-run send bị gate chặn trước Meta.
8. Xác nhận không có human reply/tag hoặc ownership transition đang xử lý dở.
9. Backup runtime env/compose/config ở ngoài repository; không in hoặc commit secret.
10. Xác nhận database vẫn có migration 0027 và r31.3 có thể khởi động/parse schema này mà không chạy down migration.

Waiver “page test chưa có người dùng thật” chỉ áp dụng cho docs PR và PR-A test-only. Waiver đó hết hiệu lực trước rollback hoặc bất kỳ production runtime mutation nào.

## 4. Preflight side-effect-free

Trước cutover, dùng artifact r31.3 chạy:

- image provenance/label check;
- compose render check với config đã backup;
- process start và dependency readiness không có Meta send;
- Regression Shield cho báo giá, ảnh, hai bong bóng, Voice Contract, đúng một CTA, buying intent và handoff;
- migration compatibility/parse check với schema 0027;
- kiểm tra quota `500/2.000` lượt AI theo page;
- kiểm tra model `gemini-3.5-flash-lite`;
- xác nhận Message Grouping V2, Wave 2 Strategy và Buying Signal Guard giữ cấu hình r31.3.

Không dùng một smoke test có outbound thật để thay thế preflight.

## 5. Guarded cutover

Thực hiện theo thứ tự:

1. Giữ outbound khóa và ghi timestamp bắt đầu.
2. Ghi target symlink, image và container ID trước cutover.
3. Render cấu hình r31.3 và kiểm tra chỉ `realtime-worker` nằm trong recreate plan.
4. Trỏ Realtime tới image r31.3 đã xác minh; giữ nguyên network, volume, secret reference và dependency.
5. Recreate đúng một service `realtime-worker`; không dùng tùy chọn kéo theo dependency.
6. Chờ health/readiness và heartbeat ổn định.
7. Chỉ khi worker đạt precheck mới atomic-switch symlink `current` sang release path r31.3.
8. Chụp lại container ID của toàn bộ service và chứng minh mọi non-target container không đổi.
9. Không mở outbound và không requeue.

Nếu worker không healthy, revision/image label sai, non-target container đổi hoặc queue count biến động bất thường: dừng, giữ outbound khóa và chạy mục 7.

## 6. Hậu kiểm bắt buộc

Rollback chỉ đạt `ROLLED_BACK_R31_3_OUTBOUND_LOCKED` khi có đủ:

- symlink `current` đúng release path r31.3;
- Realtime image ID/revision/release label đúng mục 1;
- chỉ Realtime container ID thay đổi;
- health/readiness xanh, restart count 0 và heartbeat tăng;
- worker mode/ledger đúng kỳ vọng nhưng send vẫn bị khóa;
- runtime quota `500/2.000`, model và feature flags đúng r31.3;
- migration 0027 vẫn hiện diện; không có down migration hoặc data deletion;
- Inbox/Outbox counts đối chiếu được với snapshot, không duplicate sequence mới;
- không có Meta send attempt/accepted mới trong cửa sổ rollback;
- các kịch bản Regression Shield side-effect-free xanh;
- log không có schema parse, missing column, permanent model-schema failure hoặc unhandled exception mới.

Không dùng trạng thái `DEPLOYED_VERIFIED` chỉ dựa trên container healthy.

## 7. Nếu rollback thất bại

- Giữ outbound khóa.
- Không requeue, xóa hoặc sửa record queue.
- Khôi phục symlink và Realtime image/config từ snapshot trước cutover.
- Chỉ recreate lại `realtime-worker`; non-target service vẫn giữ nguyên.
- Đối soát provider evidence cho mọi trạng thái `SENDING`/`AMBIGUOUS`.
- Append incident evidence mới; không sửa manifest r32.1 hoặc containment addendum đã merge.
- Nếu không thể chứng minh queue và ownership an toàn, chuyển manual review và dừng.

## 8. Evidence sau thao tác

Tạo manifest mới, ví dụ `deploy/manifests/20260801-realtime-r31.3-containment-rollback.json`, chứa tối thiểu:

- owner approval và thời gian thao tác;
- source/tag/image provenance;
- symlink, config và container IDs trước/sau;
- bằng chứng outbound lock trước/sau;
- migration/schema evidence;
- queue snapshot/delta và provider reconciliation;
- health/restart/heartbeat;
- Regression Shield và smoke evidence;
- kết quả `ROLLED_BACK_R31_3_OUTBOUND_LOCKED` hoặc failure;
- rollback-of-rollback evidence nếu có.

Manifest thực thi phải là file mới. Không sửa hoặc xóa:

- `deploy/manifests/20260731-realtime-audit-safety-r32.1.json`;
- `deploy/manifests/20260801-r32.1-incident-containment.json`.

## 9. Mở lại outbound và queue recovery

Không thuộc runbook này.

Chỉ xem xét mở outbound sau khi owner review manifest rollback, human test có kiểm soát đạt và không còn safety blocker. Requeue chỉ được lập kế hoạch sau khi r32.2 đã deploy/xác minh; từng record phải qua supersede, human ownership, blocking tag và Meta provider-evidence gate.
