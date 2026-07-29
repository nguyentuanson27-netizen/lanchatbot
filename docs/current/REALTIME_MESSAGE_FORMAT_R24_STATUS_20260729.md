# Trạng thái định dạng mỗi câu một tin r24 — 2026-07-29

## Kết quả

Realtime Worker trên page test `1198992073286645` đang chạy release
`20260729-realtime-message-format-r24`, image
`lana-chatbot-app:realtime-message-format-r24` và source commit `b21b0f5d`.

- Mỗi dòng hoặc câu outbound được tạo thành một lần gửi Messenger riêng.
- Quy tắc nằm ở lớp Meta plan cuối nên áp dụng cho mọi phản hồi realtime, không chỉ báo giá.
- Product-info có dữ liệu chất liệu bắt đầu bằng `Chất liệu`.
- Ảnh giữ sau các câu text và tiếp tục dùng sequence/idempotency của Meta Outbox.

## Rollout

Flag `REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1` mặc định `false` trong compose.
Runtime page test đang bật `true`; page vẫn thuộc `APP`, send enabled và kill switch off.
Không có migration hoặc thay đổi owner.

Chỉ `lana-chatbot-realtime-worker` được recreate. API, delivery, Shadow, Admin, POS,
P2.3, n8n và các container khác giữ nguyên ID.

## Bằng chứng

- Pull request: `#46`.
- Annotated tag: `20260729-realtime-message-format-r24`.
- Local `pnpm check`: PASS, 998/998 test.
- Docker `pnpm check`: PASS, 998/998 test.
- Worker: 292/292; targeted realtime-runner: 46/46.
- Runtime smoke không gửi: tách đúng câu/dòng, giữ ảnh sau cùng, label chất liệu đúng.
- Worker: healthy, restart count 0, ledger `IDLE/LIVE` và heartbeat fresh.
- Inbox active 0, Outbox active 0, duplicate sequence group 0.
- Human Messenger test: `PENDING_NEW_POST_DEPLOY_MESSAGE`.

## Rollback

1. Recreate riêng realtime-worker với `REALTIME_CONVERSATIONAL_MESSAGE_FORMAT_V1=false`.
2. Nếu lỗi code, dùng image `lana-chatbot-app:media-image-delivery-r23` và chuyển
   `current` về `/opt/lana-chatbot/releases/20260729-media-image-delivery-r23`.
3. Không xóa Inbox, Outbox, Redis, PostgreSQL hoặc cache.
