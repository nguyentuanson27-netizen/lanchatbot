# Trạng thái Media Selector V2 guard r25 — 2026-07-29

## Kết quả

Realtime Worker trên page test `1198992073286645` đang chạy release
`20260729-media-selector-v2-guard-r25`, image
`lana-chatbot-app:media-selector-v2-guard-r25` và source commit
`f82d9a52a4e1163c4a2bb376f7382be03856fb69`.

- Qdrant tiếp tục làm nguồn nhận diện ảnh và rehydrate toàn bộ catalog document của mã đã nhận diện.
- Media Selector V2 là nguồn có thẩm quyền duy nhất cho attachment product-info gửi ra Messenger.
- Guard xác minh đúng tập URL do Media Selector V2 chọn cho lượt hiện tại, thay vì bắt URL phải thuộc tập `PRICE_CARD` suy ra từ payload Qdrant.
- Nếu Media Selector V2 trả `NONE`, proposal giữ text đã xác minh và không fallback sang ảnh `PRICE_CARD` cũ.
- Nếu attachment không nằm trong tập đã chọn, guard chỉ bỏ attachment và vẫn giữ text đã xác minh; không làm mất toàn bộ câu trả lời.
- Hành vi mới bị khóa bằng flag và chỉ có hiệu lực trên page test.

## Rollout

Flag `REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED` mặc định `false` trong compose.
Runtime page test đang bật `true`; page vẫn thuộc `APP`, send enabled và kill switch off.
Không có migration, không thay đổi ownership và không bật lại n8n.

Chỉ `lana-chatbot-realtime-worker` được recreate. API, delivery, Shadow, Admin, POS,
P2.3, n8n và các container khác giữ nguyên ID.

## Bằng chứng

- Pull request code: `#48`.
- Annotated tag: `20260729-media-selector-v2-guard-r25`.
- Local `pnpm check`: PASS, 1000/1000 test.
- Docker `pnpm check`: PASS, 1000/1000 test.
- Business Tools: 162/162; Worker: 292/292; targeted realtime-runner: 46/46.
- Regression tái hiện trường hợp `PRICE_CARD` cũ chọn ảnh front/side nhưng Media Selector V2 chọn ảnh `FULL_LOOK` thứ ba; worker gửi đúng URL do V2 chọn.
- Regression xác nhận V2 `NONE` không fallback ảnh cũ và guard giữ text khi loại attachment không hợp lệ.
- Worker: healthy, restart count 0, ledger `IDLE/LIVE` và heartbeat fresh.
- Qdrant: green, 917 point, ba vector `image_cutout`, `image_raw`, `product_text`.
- Inbox active 0, Outbox active 0, duplicate sequence group 0, log lỗi mới 0.
- Human Messenger test: `PENDING_NEW_POST_DEPLOY_MESSAGE`.

## Rollback

1. Recreate riêng realtime-worker với `REALTIME_MEDIA_SELECTOR_V2_GUARD_ENABLED=false`.
2. Nếu lỗi code, dùng image `lana-chatbot-app:realtime-message-format-r24` và chuyển
   `current` về `/opt/lana-chatbot/releases/20260729-realtime-message-format-r24`.
3. Không xóa Inbox, Outbox, Redis, PostgreSQL, Qdrant hoặc cache.
