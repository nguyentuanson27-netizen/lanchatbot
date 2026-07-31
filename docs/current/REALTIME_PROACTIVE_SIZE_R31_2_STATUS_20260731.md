# Trạng thái tư vấn size chủ động r31.2

Status: **MERGED_RELEASE_CANDIDATE_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-31**

## Phạm vi nguồn

- PR `#86` đã merge vào `main` tại `abb37e5c8380929162a5e0ae9efb1ac7964dd4d9`.
- Release candidate: `20260731-realtime-proactive-size-r31.2`; manifest tại
  [`deploy/manifests/20260731-realtime-proactive-size-r31.2.json`](../../deploy/manifests/20260731-realtime-proactive-size-r31.2.json).
- Production hiện vẫn chạy `20260731-realtime-continuation-r31.1`; tài liệu này chưa phải bằng chứng deploy.
- Không có migration. Chỉ dự kiến recreate `realtime-worker`; mọi service khác giữ nguyên container.
- Không đổi page allowlist, routing ownership, n8n ownership, Meta delivery transport, POS,
  Qdrant writer hoặc nguồn fact có thẩm quyền.

## Hành vi tư vấn size

- Khi hồ sơ đã có đủ chiều cao và cân nặng, bot không hỏi khách có muốn tư vấn size hay không.
  Runtime gọi Size Engine deterministic ngay và gắn kết quả size vào phản hồi sản phẩm.
- Khi chỉ thiếu cân nặng, bot chỉ hỏi cân nặng; khi chỉ thiếu chiều cao, bot chỉ hỏi chiều cao.
  Khi thiếu cả hai, bot mới hỏi cả chiều cao và cân nặng.
- Nếu Size Engine cần thêm số đo hoặc sở thích độ ôm/rộng theo bảng size của đúng sản phẩm,
  bot chỉ hỏi thông tin còn thiếu do engine trả về.
- Nếu không có bảng size đã xác minh, bot handoff an toàn với lý do
  `BUSINESS_FACT_UNAVAILABLE`; không đoán size và không phát outbound sai.
- Wave 2 không gắn thêm CTA xin phép tư vấn size sau khi hồ sơ đã đủ số đo.
- Các câu “đối chiếu size” và “chị muốn em tư vấn size luôn không?” được loại khỏi runtime/prompt.

Giá, tồn, bảng size và kết quả tư vấn tiếp tục do nguồn deterministic đã xác minh quyết định;
model không được tự tạo business fact.

## Bằng chứng kiểm thử trước deploy

- Targeted regression: **84/84 PASS**.
- `pnpm check`: **PASS** toàn monorepo.
- Worker: **323/323 PASS**.
- Business Tools: **180/180 PASS**.
- Contracts: **86/86 PASS**.
- Golden transcript: **7/7 PASS**.
- `git diff --check`: **PASS**.

Regression mới xác nhận: hồ sơ `160 cm / 53 kg` với bảng size xác minh được tư vấn ngay size M;
reply không còn “đối chiếu” hoặc hỏi xin phép tư vấn; thiếu bảng size xác minh chuyển `HANDOFF`.

## Trình tự phát hành

1. Merge hồ sơ release và tạo annotated tag `20260731-realtime-proactive-size-r31.2`.
2. VPS fetch tag bằng deploy key read-only, materialize thư mục release mới; không sửa source.
3. Preflight r31.1, health/restart, disk/RAM, Inbox/Outbox và page allowlist.
4. Build image `lana-chatbot-app:realtime-proactive-size-r31.2` từ tag, không ghi đè image r31.1.
5. Chạy smoke side-effect-free cho đủ số đo, thiếu từng trường và thiếu bảng size xác minh.
6. Recreate đúng `realtime-worker`; kiểm tra health, restart, heartbeat, queue, duplicate và log lỗi.
7. Chỉ đổi symlink `current` khi mọi guard đạt; sau đó chờ human test thật, không tạo inbound giả.

## Rollback

- Rollback về release/image r31.1 và chỉ recreate `realtime-worker`.
- Không rollback schema; không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Evidence còn thiếu

- Release PR, release commit, annotated tag object và image digest.
- Container ID trước/sau, health/restart, smoke, heartbeat, queue/duplicate/error delta và symlink cutover.
- Human test Messenger thật cho sản phẩm có bảng size và đủ/thiếu số đo; kiểm tra handoff khi
  không có bảng size đã xác minh.

Chỉ sau khi deploy và hậu kiểm đạt mới đổi status thành
**DEPLOYED_VERIFIED_R31_2_HUMAN_TEST_PENDING**.
