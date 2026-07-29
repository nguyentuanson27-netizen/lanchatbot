# Trạng thái Realtime trả lời có dấu và tách câu r26.2 — 2026-07-29

## Kết quả

Page test duy nhất `1198992073286645` đang chạy release
`20260729-realtime-accented-split-r26.2`, source commit
`a4ea57b51e5ada5084330dcb71fea05f24138dbd` và image
`lana-chatbot-app:realtime-accented-split-r26.2`.

Chỉ `realtime-worker` được recreate. API, delivery, Shadow, Admin, POS, P2.3,
Size Chart và n8n giữ nguyên container. Wave 2, Cutout-first, clarification,
Gemini reranker, ProductFactsV2, Media Selector V2, exact-code catalog
rehydration và toàn bộ ownership hiện hành không thay đổi.

## Sửa lỗi

- Prompt của proposal, grounded reply và grounded draft bắt buộc trả tiếng Việt
  đầy đủ dấu Unicode; không sao chép cách viết không dấu từ transcript.
- Product-info do model trả về nếu khớp mẫu cũ không dấu sẽ bị guard thay bằng
  proposal deterministic đã xác minh.
- Câu chứa mã sản phẩm tự nhiên, ví dụ “xin giá SV2447”, được nhận là ý định hỏi
  giá thay vì chỉ nhận mã đứng riêng.
- `REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1=true`: mọi câu/dòng text trở thành
  một Meta Outbox unit riêng cho toàn bộ hội thoại, không chỉ câu báo giá.
- Dòng chất liệu chỉ được tạo khi catalog có dữ liệu đã xác minh và bắt đầu bằng
  `Chất liệu`.
- Luồng tìm sản phẩm không đổi: Qdrant nhận diện/rehydrate, Media Selector V2
  chọn attachment; r26.2 chỉ sửa contract ngôn ngữ, intent mã sản phẩm và bảo
  đảm flag định dạng hội thoại được bật.

## Bằng chứng

- Pull request: `#53`; annotated tag:
  `20260729-realtime-accented-split-r26.2`.
- Git bundle SHA-256:
  `f305733f672f849f37a0611611cc5cd040580d539f2a262ae965e458925f8524`.
- Release checkout sạch; compose SHA-256:
  `40cb9e34809eda1266abd2b9709ec1bd1af2db4ab4af7df00a3abbb42f0303ff`.
- Local và Docker `pnpm check` PASS; toàn monorepo 1.012/1.012 test,
  Worker 293/293 và targeted regression 66/66.
- Realtime healthy, restart 0, ledger `IDLE/LIVE`, log mới 0 dòng và lỗi mới 0.
- Page `APP`, send enabled, kill switch off; Webhook Inbox, Meta Outbox và
  Pancake Outbox active đều 0; ambiguous recent 0 và duplicate
  `reply_plan_id + sequence_no` bằng 0.
- Smoke trong image, không gửi Messenger: bốn câu tạo bốn text unit; câu chứa mã
  tự nhiên cho intent `PRICE`; guard nhận đúng reply product-info không dấu.
- Runtime xác nhận `REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1=true` và
  `REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED=true`; các flag Wave 1–3 khác giữ
  nguyên.

## Cutover và rollback

Lần cutover đầu tiên bị guard bằng chứng container ID tĩnh chặn sau khi recreate.
Script tự động rollback thành công về r26.1; không có lỗi ứng dụng, không mất
Inbox/Outbox và không service ngoài realtime bị thay đổi. Lần hai dùng container
ID động, toàn bộ guard đạt và cutover thành công.

Rollback application về r26.1 đã chuẩn bị tại `/tmp/r26-2-rollback.sh`, SHA-256
`b7b973a6b8a8caf3e5d98bece06cb0773f4319a0f9cc004214feec403ad04043`;
syntax check PASS. Env backup là
`/opt/lana-chatbot/shared/.env.infrastructure.backup-20260729-realtime-accented-split-r26.2-attempt2`.
Không cần rollback migration hoặc xóa Inbox, Outbox, Redis, PostgreSQL hay Qdrant.
Script này không được chạy sau cutover thành công.

## Human test

Human test Messenger đang ở trạng thái `PENDING_NEW_POST_DEPLOY_MESSAGE`.
Không tạo inbound giả và không coi smoke nội bộ là bằng chứng giao diện Messenger.
Cần gửi một câu hỏi tự nhiên có mã sản phẩm trên page test để xác nhận đồng thời:
tiếng Việt có dấu, mỗi câu là một bong bóng riêng, dòng `Chất liệu` đúng mẫu và
ảnh sản phẩm vẫn được gửi sau text.
