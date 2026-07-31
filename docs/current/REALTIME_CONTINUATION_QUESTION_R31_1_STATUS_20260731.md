# Trạng thái hotfix câu hỏi nối r31.1

Status: **MERGED_RELEASE_CANDIDATE_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-31**

## Phạm vi nguồn

- PR `#83` đã merge vào `main` tại `3ac1ea2ecb9034c9043957a8a4419c4b44ef03ae`.
- Release candidate: `20260731-realtime-continuation-r31.1`; manifest tại
  [`deploy/manifests/20260731-realtime-continuation-r31.1.json`](../../deploy/manifests/20260731-realtime-continuation-r31.1.json).
- Production hiện vẫn chạy `20260731-realtime-voice-hybrid-r31`; tài liệu này chưa phải bằng chứng deploy.
- Không có migration. Chỉ dự kiến recreate `realtime-worker`; mọi service khác giữ nguyên container.
- Không đổi page allowlist, routing ownership, n8n ownership, Meta delivery transport, POS,
  Qdrant writer hoặc nguồn fact có thẩm quyền.

## Hành vi câu hỏi nối

- Khi hội thoại trước mua còn mở và reply chưa có câu hỏi phù hợp, Wave 2 gắn đúng một câu hỏi nối
  theo stage và dữ liệu đang thiếu.
- Khi chưa có chiều cao/cân nặng: `Chị cao và nặng khoảng bao nhiêu để em đối chiếu size phù hợp cho mẫu này?`.
- Khi đã có số đo: không hỏi lại; dùng `Chị muốn em đối chiếu size phù hợp cho mẫu này luôn không?`.
- Reply đã có một câu hỏi giữ nguyên, không gắn câu thứ hai.
- Không thêm câu hỏi nối ở `HANDOFF`, `NO_REPLY`, `READY_TO_BUY`, `ORDER_REVIEW`, `POST_SALE`
  hoặc khi Sales Cycle đang xử lý tín hiệu mua/chốt đơn.

Form báo giá vẫn giữ đúng cấu trúc r31: bong bóng thông tin sản phẩm nhiều dòng, bong bóng câu hỏi
nối riêng, sau đó mới gửi ảnh. Tư vấn text thông thường vẫn giữ trong một bong bóng.

## Bằng chứng kiểm thử trước deploy

- Targeted regression: **83/83 PASS**.
- `pnpm check`: **PASS** toàn monorepo.
- Worker: **322/322 PASS**.
- Business Tools: **180/180 PASS**.
- Contracts: **86/86 PASS**.
- Golden transcript: **7/7 PASS**.
- `git diff --check`: **PASS**.

Regression mới xác nhận đủ bốn nhánh: thiếu số đo có câu hỏi; đã có số đo không hỏi lại; buying
signal không bị gắn CTA; reply đã có câu hỏi không sinh câu thứ hai.

## Trình tự phát hành

1. Merge hồ sơ release và tạo annotated tag `20260731-realtime-continuation-r31.1`.
2. VPS fetch tag bằng deploy key read-only, materialize thư mục release mới; không sửa source.
3. Preflight lại symlink r31, health/restart, disk/RAM, Inbox/Outbox và page allowlist.
4. Build image `lana-chatbot-app:realtime-continuation-r31.1` từ tag, không ghi đè image r31.
5. Chạy smoke side-effect-free cho CTA thiếu số đo, CTA đã có số đo và guard buying/post-sale.
6. Recreate đúng `realtime-worker`; kiểm tra health, restart, heartbeat, queue, duplicate và log lỗi.
7. Chỉ đổi symlink `current` khi mọi guard đạt; sau đó chờ human test thật, không tạo inbound giả.

## Rollback

- Rollback về release/image r31 và chỉ recreate `realtime-worker`.
- Không rollback schema; không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Evidence còn thiếu

- Release PR, release commit, annotated tag object và image digest.
- Container ID trước/sau, health/restart, smoke, heartbeat, queue/duplicate/error delta và symlink cutover.
- Human test Messenger thật cho câu hỏi giá/mã từ quảng cáo, trường hợp có/chưa có số đo, buying signal
  và hậu mãi/handoff không bị hỏi kéo dài.

Chỉ sau khi deploy và hậu kiểm đạt mới đổi status thành
**DEPLOYED_VERIFIED_R31_1_HUMAN_TEST_PENDING**.
