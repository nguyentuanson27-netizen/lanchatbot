# Trạng thái Voice Contract V2 và Hybrid Buying Intent r31

Status: **DEPLOYED_VERIFIED_R31_HUMAN_TEST_PENDING**

Ngày cập nhật: **2026-07-31**

## Phạm vi nguồn

- PR `#79` đã merge vào `main` tại `88e001d9b199450e373e77a5c487f1dcd15c8a0c`.
- PR bổ sung heading sản phẩm `#80` đã merge tại
  `534e35a999f19aa5043dde2019cf59173bea5107`.
- Release: `20260731-realtime-voice-hybrid-r31`, source commit
  `7286cec6fee81ae8d7d5894a4d706499be17184a`, annotated tag object
  `5e546fb82c8edee9fb70784239c97364b5ef22ef`; manifest tại
  [`deploy/manifests/20260731-realtime-voice-hybrid-r31.json`](../../deploy/manifests/20260731-realtime-voice-hybrid-r31.json).
- Production đang trỏ tới release r31. Chỉ `realtime-worker` được recreate; Admin API/Web, API, Delivery,
  Shadow, POS và các worker dữ liệu giữ nguyên container.
- Không có migration; production tiếp tục ở schema `0026_product_media_intake_dedupe`.
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

## Bằng chứng deploy production

- VPS fetch annotated tag bằng deploy key read-only và materialize working tree sạch; không sửa source
  trong `current`.
- Docker build chạy lại `pnpm check` trong Linux và tạo image
  `lana-chatbot-app:realtime-voice-hybrid-r31`, ID
  `sha256:de99faab9922ae1746f9461814414d9b07c811d0ed2c8bf16c791211022f82ff`.
- Smoke side-effect-free đạt cho title `Set váy + mã`, grouping `TEXT → TEXT → IMAGE`, long-tail
  buying có product context và hai nhánh bị chặn: thiếu product context, câu hỏi giá.
- Cutover lúc `2026-07-30T18:35:24Z`; chỉ container `realtime-worker` đổi từ
  `7a56e8a7…` sang `e243d8c2…`. Mọi container ngoài phạm vi giữ nguyên ID.
- Runtime mới xác nhận `REALTIME_RELEASE_ID=20260731-realtime-voice-hybrid-r31`,
  `REALTIME_MESSAGE_GROUPING_V2=true`, `VERTEX_MODEL_NAME=gemini-3.5-flash-lite`, Wave 2 và
  Buying Signal Guard tiếp tục bật.
- Realtime `IDLE/LIVE`, send enabled, healthy, restart `0`; heartbeat age khi cutover `11` giây và
  postcheck tăng thêm `15` giây.
- Inbox active `0`, Outbox active `0`, duplicate `reply_plan_id + sequence_no` bằng `0`, failed
  permanent sau cutover `0` và log lỗi mới `0`.
- Page `1198992073286645` vẫn `APP`, send enabled, kill switch off; public Admin trả `302` sang
  Authentik. Admin API/Web vẫn healthy trên image r30; API/Delivery giữ image r27.1.
- Symlink `current` chỉ chuyển sang r31 sau khi toàn bộ guard đạt. Rollback artifact về r30 đã chuẩn
  bị sẵn; không rollback schema hoặc xóa dữ liệu.

## Rollback

- Rollback ứng dụng về release/image r30 và chỉ recreate `realtime-worker`.
- `REALTIME_MESSAGE_GROUPING_V2=false` có thể tắt grouping hai bong bóng mới, nhưng rollback đầy đủ
  Voice Contract và Hybrid Buying Intent phải dùng image r30.
- Không rollback schema, không xóa Inbox/Outbox, Redis, PostgreSQL, Qdrant hoặc dữ liệu hội thoại.
- Không chạy hai Realtime Worker đồng thời.

## Human test còn thiếu

- Từ cutover đến postcheck chưa có inbound khách mới (`customer_processed=0`). Đây là trạng thái chờ
  hợp lệ, không phải lỗi runtime.
- Cần human test Messenger thật cho báo giá hai bong bóng, tư vấn thường một bong bóng, long-tail
  buying, quantity, negation, câu hỏi giá không mở giỏ và sản phẩm không xác định handoff im lặng.
- Không tạo inbound giả. Kết quả human test sẽ được ghi evidence riêng sau khi bạn thử trên page test.

Runtime r31 đã deploy và hậu kiểm kỹ thuật đạt; xác nhận nghiệp vụ cuối vẫn ở trạng thái
**HUMAN_TEST_PENDING**.
