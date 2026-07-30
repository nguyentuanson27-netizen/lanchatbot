# Trạng thái Voice Contract V2 và Hybrid Buying Intent r31

Status: **MERGED_RELEASE_CANDIDATE_NOT_DEPLOYED**

Ngày cập nhật: **2026-07-31**

## Phạm vi nguồn

- PR `#79` đã merge vào `main` tại `88e001d9b199450e373e77a5c487f1dcd15c8a0c`.
- PR bổ sung heading sản phẩm `#80` đã merge tại
  `534e35a999f19aa5043dde2019cf59173bea5107`.
- Release candidate: `20260731-realtime-voice-hybrid-r31`; manifest tại
  [`deploy/manifests/20260731-realtime-voice-hybrid-r31.json`](../../deploy/manifests/20260731-realtime-voice-hybrid-r31.json).
- Production hiện vẫn chạy `20260730-performance-ui-stability-r30`; tài liệu này chưa phải bằng chứng deploy.
- Không có migration. Chỉ dự kiến recreate `realtime-worker`; Admin API/Web, API, Delivery,
  Shadow, POS và các worker dữ liệu giữ nguyên container.
- Không đổi page allowlist, routing ownership, n8n ownership, Meta delivery transport, POS,
  Qdrant writer hoặc nguồn fact có thẩm quyền.

## Voice Contract V2

- Phản hồi tư vấn thường ưu tiên hai câu, tổng khoảng 25–45 từ; có thể tối đa ba câu khi cần
  giải thích chính sách, size hoặc băn khoăn.
- Câu đầu trả lời trực tiếp điều khách vừa hỏi. Chỉ thêm một chi tiết hữu ích hoặc trấn an có
  căn cứ; tối đa một câu hỏi để chuyển bước.
- Không mở đầu máy móc bằng “Em hiểu”, “Em ghi nhận”, “Cảm ơn chị đã chia sẻ” trong tư vấn
  trước mua. Không lặp “Dạ”, “chị yên tâm”, “chuẩn form” hoặc câu quảng cáo sáo rỗng.
- Không ép tiếng lóng, không dùng cam kết sản phẩm khi catalog/policy không có bằng chứng.
- Text tư vấn thông thường được giữ trong một Meta Outbox unit, không còn tách từng câu thành
  nhiều bong bóng. Order summary, hướng dẫn chuyển khoản và attachment vẫn tuân theo block
  nghiệp vụ riêng.

## Form báo giá sản phẩm

Khi sản phẩm và giá đã được xác minh, Lana gửi:

1. Bong bóng thứ nhất gồm một khối nhiều dòng:
   - loại/tên sản phẩm và mã theo catalog, kèm giá VND đầy đủ;
   - `Chất liệu:` nếu có dữ liệu đã xác minh;
   - `Form dáng:` nếu có dữ liệu đã xác minh;
   - `Size:` từ POS snapshot nếu có.
2. Bong bóng thứ hai là bước tiếp theo theo ngữ cảnh: xin chiều cao/cân nặng nếu còn thiếu,
   hoặc xác nhận sẽ dùng số đo đã có để tư vấn size.
3. Ảnh đã qua Media Selector V2 được gửi sau hai bong bóng text.

Title catalog chỉ có loại và mã như `SET VÁY SV2447` được hiển thị tự nhiên thành
`Set váy SV2447`, không rút lại thành `Mẫu SV2447`. Nếu catalog không có loại/tên thật,
runtime dùng `mẫu + mã` và không tự suy đoán.

Nếu không xác định được sản phẩm cho câu hỏi mã/giá/quảng cáo hoặc ý định mua, runtime handoff
im lặng. Chỉ khi có nhiều ứng viên đã xác minh mới được hỏi khách chọn đúng mẫu.

## Hybrid Buying Intent có guard

Structured model output bổ sung:

- `decision`: `NONE | CONSIDERING | COMMITTED | NEGATED`;
- `requestedAction`: `NONE | OPEN_CART | ADD_TO_CART | SET_QUANTITY | PROCEED_TO_PAYMENT`;
- `quantity`, `evidenceText`, `confidence`.

Model evidence chỉ được dùng để mở/thay đổi giỏ khi đồng thời đạt tất cả điều kiện:

- có product context đã xác minh;
- `decision=COMMITTED` và action nằm trong allowlist;
- confidence tối thiểu `0.90`;
- `evidenceText` xuất hiện chính xác trong tin khách;
- câu không phải câu hỏi thông tin, phủ định hoặc do dự.

Deterministic buying signal vẫn có quyền ưu tiên. `NEGATED`, `CONSIDERING`, thiếu product context,
evidence sai hoặc confidence thấp không tạo side effect. Quantity từ model chỉ được dùng sau cùng
guard này. Contract vẫn backward-compatible khi model output cũ chưa có `buyingIntent`.

## Bằng chứng kiểm thử trước deploy

- `pnpm install --frozen-lockfile`: **PASS**.
- `pnpm check`: **PASS** — build, typecheck, test và build cuối toàn monorepo.
- Worker: `322/322` test đạt.
- Business Tools: `178/178` test đạt.
- Contracts: `86/86` test đạt.
- Golden transcript: `7/7` đạt.
- Regression có long-tail buying, quantity, negation, informational question, unresolved-product
  handoff, form báo giá hai bong bóng, title loại sản phẩm và grouping V2.
- `git diff --check`: **PASS**.

## Trình tự phát hành

1. Merge hồ sơ release và tạo annotated tag `20260731-realtime-voice-hybrid-r31`.
2. VPS fetch tag bằng deploy key read-only, materialize thư mục release mới; không sửa source.
3. Preflight lại symlink r30, health/restart, disk/RAM, Inbox/Outbox và page allowlist.
4. Build image `lana-chatbot-app:realtime-voice-hybrid-r31` từ tag, không ghi đè image r30.
5. Runtime smoke không gửi Messenger, sau đó recreate đúng `realtime-worker`.
6. Kiểm tra process health, restart count, queue, duplicate sequence, error-line delta và public Admin
   vẫn trả 302 sang Authentik.
7. Chỉ đổi symlink `current` khi mọi guard đạt; sau đó chờ human test từ page
   `1198992073286645`, không tạo inbound giả.

## Rollback

- Rollback ứng dụng về release/image r30 và chỉ recreate `realtime-worker`.
- `REALTIME_MESSAGE_GROUPING_V2=false` có thể tắt grouping hai bong bóng mới, nhưng rollback đầy đủ
  Voice Contract và Hybrid Buying Intent phải dùng image r30.
- Không rollback schema, không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Evidence còn thiếu

- Release PR, annotated tag object, release commit và image digest.
- Container ID trước/sau, health/restart, smoke, queue/duplicate/error delta và symlink cutover.
- Human test Messenger thật sau deploy cho báo giá, long-tail buying, negation và unresolved product.

Chỉ khi đủ evidence mới đổi status thành **DEPLOYED_VERIFIED_R31**.
